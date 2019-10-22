const puppeteer = require("puppeteer");
const twitter = require("twitter");
const fs = require("fs");
require("dotenv").config();
process.env.tweet = process.env.tweet === true || process.env.tweet === "true";

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
  await page.screenshot({ path: filePath, clip });
  console.log(`Successfully took a screenshot`);
};

const tweet = async file => {
  const data = fs.readFileSync(file);

  // upload the media
  const media = await twitterClient.post(`media/upload`, { media: data });
  console.log(`Successfully uploaded the screenshot`);

  // tweet about it
  await twitterClient.post("statuses/update", {
    status: shortUrl,
    media_ids: media.media_id_string
  });
  console.log(`Successfully tweeted`);
};

const run = () =>
  withBrowser(takeScreenshot).then(success => success && process.env.tweet && tweet(filePath));

setInterval(run, intervalMins * 60 * 1000);
setImmediate(run);
