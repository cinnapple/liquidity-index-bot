const puppeteer = require("puppeteer");
const twitter = require("twitter");
const fs = require("fs");
const https = require("https");
require("dotenv").config();
const doTweet = process.env.tweet === true || process.env.tweet === "true";

const url =
  "https://docs.google.com/spreadsheets/u/2/d/1pZ2POpljERK-oV3rusaCmq58U2badn5i9WOCIP9Wtmg/";
const shortUrl = "https://bit.ly/2MCAbp6";
const filePath = "out/pic.png";
const intervalMins = 60 * 3; // every 3 hours
const clip = {
  x: 70,
  y: 190,
  width: 1300,
  height: 800
};

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
    await action(browser);
    return true;
  } catch (e) {
    // don't handle the error - we'd rather want to keep trying
    console.log(e);
    return false;
  } finally {
    browser.close();
  }
};

const takeScreenshot = async browser => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1050 });
  await page.goto(url);
  await page.waitFor(5000);
  await page.screenshot({ path: filePath, clip });
  console.log(`Successfully took a screenshot`);
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

const tweet = async (file, status) => {
  console.log("Tweeting...");
  const data = fs.readFileSync(file);

  // upload the media
  const media = await twitterClient.post(`media/upload`, { media: data });
  console.log(`Successfully uploaded the screenshot`);

  // tweet about it
  await twitterClient.post("statuses/update", {
    status,
    media_ids: media.media_id_string
  });
  console.log(`Successfully tweeted`);
};

const run = () => {
  withBrowser(async browser => {
    const values = await Promise.all([takeScreenshot(browser), getSheetData()]);
    const data = values[1];
    const status = `Today so far: ${data.Today}\r\nAll Time High: ${data.AllTimeHigh}\r\n${shortUrl}`;
    console.log(status);
    if (doTweet) {
      tweet(filePath, status);
    }
  });
};

setInterval(run, intervalMins * 60 * 1000);
setImmediate(run);
