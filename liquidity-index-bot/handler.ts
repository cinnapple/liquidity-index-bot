import { S3 } from "aws-sdk";
import 'source-map-support/register';
import * as rp from "request-promise"
import * as Twitter from "twitter"
import * as chromium from "chrome-aws-lambda"
import * as puppeteer from "puppeteer-core"
import { config, Pair } from "./config"

type Params = {
  pairConfig: Pair,
  sheetData: {
    CurrentDate: string
    Today: string
    AllTimeHigh: string
    Title: string
    DataUrl: string
  }
}

const s3 = new S3();
const twitterClient = new Twitter({ ...config.twitter });

export const configure = async (input: string) => {
  const pairs = input.split(",")
  console.log(pairs)
  const paramsArray = pairs.map(pair => ({
    pairConfig: config.pairs[pair],
    sheetData: undefined,
    previousTweet: undefined
  }))
  console.log(paramsArray)
  return {
    statusCode: 200,
    body: paramsArray
  };
}

export const takeScreenshot = async (params: Params) => {
  console.log(params)
  const url = `https://docs.google.com/spreadsheets/u/2/d/${params.pairConfig.sheetId}/`;
  let browser: puppeteer.Browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: params.pairConfig.width, height: params.pairConfig.height });
    await page.goto(url);
    await page.waitFor(5000);
    const buf = await page.screenshot({ clip: params.pairConfig.clip });
    await s3.upload({ Body: buf, Bucket: config.s3_bucket_name, Key: params.pairConfig.filePath }).promise()
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

export const getSheetData = async (params: Params) => {
  console.log(params)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${params.pairConfig.sheetId}/values/Aggregate!A1:D100?key=${config.googleApiKey}`;
  const res = JSON.parse(await rp.get(url))
  params.sheetData = {
    CurrentDate: res.values.find(r => r.includes("Current Date"))[3],
    Today: res.values.find(r => r.includes("Today"))[3],
    AllTimeHigh: res.values.find(r => r.includes("All Time High"))[3],
    Title: res.values.find(r => r.includes("Title"))[2],
    DataUrl: res.values.find(r => r.includes("DataUrl"))[2]
  }
  return {
    statusCode: 200,
    body: params
  }
}

export const tweet = async (paramsArray: any[]) => {
  console.log(`paramsArray: ${JSON.stringify(paramsArray)}`)

  const previousTweet = {
    tweetId: undefined,
    userName: undefined
  }

  for (let results of paramsArray) {

    console.log(`results: ${JSON.stringify(results)}`)

    const params: Params = results[1].body
    console.log(`params: ${JSON.stringify(params)}`)

    const imageData = await s3.getObject({ Bucket: config.s3_bucket_name, Key: params.pairConfig.filePath }).promise()
    const mediaData = imageData.Body.toString('base64')
    const status = [
      params.sheetData.Title,
      `Day progress: ${Math.round((new Date().getUTCHours() / 24) * 100)}%`,
      `Today so far: ${params.sheetData.Today}`,
      `All Time High: ${params.sheetData.AllTimeHigh}`,
      `Data: ${params.sheetData.DataUrl}`
    ].join("\r\n");
    console.log(status)

    if (!config.doTweet) {
      console.log("Configured not to tweet. Exiting.")
      return {
        statusCode: 200,
        body: JSON.stringify(params)
      }
    }

    // upload the media
    const mediaResult = await twitterClient.post(`media/upload`, { media_data: mediaData });
    console.log(`Successfully uploaded the screenshot. Result: ${JSON.stringify(mediaResult)}`);

    // tweet about it
    const tweetData = {
      status,
      media_ids: mediaResult.media_id_string,
      in_reply_to_status_id: undefined
    }
    if (previousTweet.tweetId) {
      tweetData.in_reply_to_status_id = previousTweet.tweetId
      tweetData.status = `@${previousTweet.userName}${tweetData.status}`
    }
    console.log(`posting ${JSON.stringify(tweetData)}`)
    const result = await twitterClient.post("statuses/update", {
      status,
      media_ids: mediaResult.media_id_string,
    });
    console.log(`Successfully tweeted. Result: ${JSON.stringify(result)}`);

    previousTweet.tweetId = result.id_str
    previousTweet.userName = result.user.screen_name

  }

  return {
    statusCode: 200,
    body: "ok"
  }

}

export const proxyCryptoCompare = async (params) => {
  console.log(params)
  const url = `${params.queryStringParameters.url}&api_key=${config.cryptoCompareApiKey}` 
  console.log(url)
  const res = JSON.parse(await rp.get(url))
  console.log(res)
  return {
    statusCode: 200,
    body: JSON.stringify(res.Data) 
  }
}

