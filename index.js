const puppeteer = require("puppeteer");
const twitter = require("twitter");
const fs = require("fs");
const https = require("https");
require("dotenv").config();
const doTweet = process.env.tweet === true || process.env.tweet === "true";
const intervalMins = 60 * 3; // every 3 hours
const twitterClient = new twitter({
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token_key: process.env.access_token_key,
  access_token_secret: process.env.access_token_secret
});

const withBrowser = async action => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=en-US,en"]
  });
  try {
    return await action(browser);
  } catch (e) {
    // don't handle the error - we'd rather want to keep trying
    console.log(e);
    return false;
  } finally {
    await browser.close();
  }
};

const takeScreenshot = async browser => {
  const filePath = "out/pic.png";
  const url =
    "https://docs.google.com/spreadsheets/u/2/d/1pZ2POpljERK-oV3rusaCmq58U2badn5i9WOCIP9Wtmg/";
  const clip = {
    x: 70,
    y: 190,
    width: 1300,
    height: 800
  };
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1050 });
  await page.goto(url);
  await page.waitFor(5000);
  await page.screenshot({ path: filePath, clip });
  console.log(`Successfully took a screenshot`);
  return filePath;
};

const getSheetData = async () => {
  return new Promise((resolve, reject) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/1pZ2POpljERK-oV3rusaCmq58U2badn5i9WOCIP9Wtmg/values/Aggregate!A1:D100?key=${process.env.google_api_key}`;
    const req = https.get(url, res => {
      let body = "";
      res.on("data", d => {
        body += d;
      });
      res.on("end", () => {
        const res = JSON.parse(body);
        console.log(res);
        const obj = {
          CurrentDate: res.values.find(r => r.includes("Current Date"))[3],
          Today: res.values.find(r => r.includes("Today"))[3],
          AllTimeHigh: res.values.find(r => r.includes("All Time High"))[3]
        };
        obj["ATHUpdated"] = obj.Today === obj.AllTimeHigh;
        resolve(obj);
      });
    });

    req.on("error", error => {
      reject(error);
    });

    req.end();
  });
};

const delay = async nSecs => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, nSecs * 1000);
  });
};

const tweet = async (filePath, data) => {
  const msgDayProgress = `Day progress: ${Math.round(
    (new Date().getUTCHours() / 24) * 100
  )}%`;
  const msgTodaySofar = `Today so far: ${data.Today}`;
  const msgAllTimeHigh = `All Time High: ${data.AllTimeHigh}`;
  const msgShortUrl = `https://bit.ly/2MCAbp6`;
  const status = [
    msgDayProgress,
    msgTodaySofar,
    msgAllTimeHigh,
    msgShortUrl
  ].join("\r\n");
  console.log(`File -> ${filePath}`);
  console.log(`Status -> ${JSON.stringify(status)}`);

  if (!doTweet) {
    return;
  }

  let again = true;
  while (again) {
    let retryCount = 0;
    try {
      console.log("Tweeting...");
      const data = fs.readFileSync(filePath);

      // upload the media
      const media = await twitterClient.post(`media/upload`, { media: data });
      console.log(`Successfully uploaded the screenshot`);

      // tweet about it
      await twitterClient.post("statuses/update", {
        status,
        media_ids: media.media_id_string
      });
      console.log(`Successfully tweeted`);
      again = false;
    } catch (err) {
      console.log(`Failed to tweet...`);
      retryCount++;
    }

    if (retryCount > 5) {
      console.log(`Exceeded the retry threshold...`);
      again = false;
    } else {
      // wait for 5 seconds to retry.
      await delay(5);
    }
  }
};

const run = async () => {
  const [filePath, data] = await Promise.all([
    withBrowser(takeScreenshot),
    getSheetData()
  ]);
  await tweet(filePath, data);
};

setInterval(run, intervalMins * 60 * 1000);
setImmediate(run);
