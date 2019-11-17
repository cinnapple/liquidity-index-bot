import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3 } from "aws-sdk";
import 'source-map-support/register';
import * as rp from "request-promise"
import * as Twitter from "twitter"
import * as chromium from "chrome-aws-lambda"
import * as puppeteer from "puppeteer-core"

type SheetData = {
  CurrentDate: string
  Today: string
  AllTimeHigh: string
}

const _config = {
  doTweet: process.env.TWEET === "true",
  s3_bucket_name: process.env.S3_BUCKET_NAME,
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  google_api_key: process.env.GOOGLE_API_KEY,
  filePaht: "screenshot.png",
  sheetId: "1pZ2POpljERK-oV3rusaCmq58U2badn5i9WOCIP9Wtmg",
}

const _s3 = new S3();

export const takeScreenshot: APIGatewayProxyHandler = async (_event, _context) => {
  const url = `https://docs.google.com/spreadsheets/u/2/d/${_config.sheetId}/`;
  const clip = {
    x: 70,
    y: 190,
    width: 1300,
    height: 800
  };
  let browser: puppeteer.Browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1050 });
    await page.goto(url);
    await page.waitFor(5000);
    const buf = await page.screenshot({ clip });
    await _s3.upload({ Body: buf, Bucket: _config.s3_bucket_name, Key: _config.filePaht }).promise()
    return {
      statusCode: 200,
      body: "ok"
    };
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

export const getSheetData: APIGatewayProxyHandler = async (_event, _context) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${_config.sheetId}/values/Aggregate!A1:D100?key=${_config.google_api_key}`;
  const res = JSON.parse(await rp.get(url))
  const data: SheetData = {
    CurrentDate: res.values.find(r => r.includes("Current Date"))[3],
    Today: res.values.find(r => r.includes("Today"))[3],
    AllTimeHigh: res.values.find(r => r.includes("All Time High"))[3]
  }
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  }
}

export const tweet: APIGatewayProxyHandler = async (sheetDataJson, _context) => {
  const twitterClient = new Twitter({
    consumer_key: _config.consumer_key,
    consumer_secret: _config.consumer_secret,
    access_token_key: _config.access_token_key,
    access_token_secret: _config.access_token_secret
  });

  const imageData = await _s3.getObject({ Bucket: _config.s3_bucket_name, Key: _config.filePaht }).promise()
  const mediaData = imageData.Body.toString('base64')
  const data: SheetData = JSON.parse(sheetDataJson as any)
  const status = [
    "Liquidity Index for Bitso XRP/MXN (28-day moving trend)",
    `Day progress: ${Math.round((new Date().getUTCHours() / 24) * 100)}%`,
    `Today so far: ${data.Today}`,
    `All Time High: ${data.AllTimeHigh}`,
    `Data: https://bit.ly/2MCAbp6`
  ].join("\r\n");

  if (!_config.doTweet) {
    return {
      statusCode: 200,
      body: "Configured not to tweet. Exiting."
    }
  }

  // upload the media
  const mediaResult = await twitterClient.post(`media/upload`, { media_data: mediaData });
  console.log(`Successfully uploaded the screenshot`);

  // tweet about it
  await twitterClient.post("statuses/update", {
    status,
    media_ids: mediaResult.media_id_string
  });
  console.log(`Successfully tweeted`);

  return {
    statusCode: 200,
    body: "ok"
  }

}
