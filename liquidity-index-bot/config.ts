import * as puppeteer from "puppeteer-core"

export type Pair = {
    title: string
    filePath: string
    sheetId: string
    width: number
    height: number
    clip: puppeteer.BoundingBox
    dataUrl: string
}

export type Pairs = {
    [name: string]: Pair
}

export const config = {
    doTweet: process.env.TWEET === "true",
    s3_bucket_name: process.env.S3_BUCKET_NAME,
    twitter: {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token_key: process.env.ACCESS_TOKEN_KEY,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    },
    googleApiKey: process.env.GOOGLE_API_KEY,
    pairs: {
        XRPMXN: {
            title: `Liquidity Index for Bitso XRP/MXN (28-day moving trend)`,
            filePath: "xrpmxn.png",
            sheetId: "1pZ2POpljERK-oV3rusaCmq58U2badn5i9WOCIP9Wtmg",
            width: 1400,
            height: 1050,
            clip: { x: 70, y: 190, width: 1300, height: 800 },
            dataUrl: "https://bit.ly/2MCAbp6",
        },
        XRPPHP: {
            title: `Liquidity Index for Coinph XRP/PHP (28-day moving trend)`,
            filePath: "xrpphp.png",
            sheetId: "11n81l3KBNEFUnx7PB7L-5ITjUjQGih9Tr7giVoDG-Wc",
            width: 1400,
            height: 1050,
            clip: { x: 70, y: 190, width: 1300, height: 800 },
            dataUrl: "https://bit.ly/38rRr9E",
        }
    } as Pairs
}
