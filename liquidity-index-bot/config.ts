import * as puppeteer from "puppeteer-core"

export type Pair = {
    filePath: string
    sheetId: string
    width: number
    height: number
    clip: puppeteer.BoundingBox
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
            filePath: "xrpmxn.png",
            sheetId: "1pZ2POpljERK-oV3rusaCmq58U2badn5i9WOCIP9Wtmg",
            width: 1400,
            height: 1050,
            clip: { x: 70, y: 190, width: 1300, height: 800 },
        },
        XRPAUD: {
            filePath: "xrpaud.png",
            sheetId: "134Likrs0FWvQosyHlx2Z6JvUhCpY1uLI1ujT9dfkhmc",
            width: 1400,
            height: 1050,
            clip: { x: 70, y: 190, width: 1300, height: 800 },
        },
        XRPPHP: {
            filePath: "xrpphp.png",
            sheetId: "11n81l3KBNEFUnx7PB7L-5ITjUjQGih9Tr7giVoDG-Wc",
            width: 1400,
            height: 1050,
            clip: { x: 70, y: 190, width: 1300, height: 800 },
        },
        XRPEUR: {
            filePath: "xrpeur.png",
            sheetId: "1O-aYsBe3MBG5lVnaFb8FeyNzPyeYEygRORWL2xspfc0",
            width: 1400,
            height: 1050,
            clip: { x: 70, y: 190, width: 1300, height: 800 },
        }
    } as Pairs,
    cryptoCompareApiKey: process.env.CRYPTO_COMPARE_API_KEY
}
