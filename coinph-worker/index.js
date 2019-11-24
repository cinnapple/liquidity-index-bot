const config = {
    wsUrl: "wss://api-cx.coins.asia/ws-api/",
    redisUrl: process.env.redisUrl,
    redisPort: process.env.redisPort,
    redisKey: process.env.redisKey,
    postApi: process.env.postApi,
    updateInterval: process.env.updateInterval
}
Object.keys(config).forEach(key => {
    if (!config[key]) {
        throw `Config key not set for ${key}. You must set it properly in .env file`
    }
})

const ReconnectingWebSocket = require("reconnecting-websocket")
const ws = new ReconnectingWebSocket(config.wsUrl, [], { WebSocket: require("ws") })
const request = require("request")
const Redis = require("ioredis")
const redis = new Redis(config.redisPort, config.redisUrl)

const dailyDataDefault = {
    Seq: Number.MIN_SAFE_INTEGER,
    Date: null,
    High: Number.MIN_SAFE_INTEGER,
    Low: Number.MAX_SAFE_INTEGER,
    Open: 0,
    Close: 0,
    Volume: 0
}

const tryParseMessage = (msg) => {
    const res = JSON.parse(JSON.parse(msg.data).o)

    // if failed to get a proper response, try reconnect.
    if (res.length === 0) {
        return null
    }

    return res[0];
}

const updateData = async (res) => {
    try {
        const [seq, id, qt, px, timestamp] = res
        const utcDate = new Date(timestamp).toISOString().split("T")[0]
        let dailyData = JSON.parse(await redis.get(config.redisKey)) || { ...dailyDataDefault }

        // if the sequence is the same, do not update the data
        if (seq === dailyData.Seq) {
            console.log(`Same sequence ${seq}.`)
            return
        }

        // if date has changed, update the previous day's closing, and reset the values for today.
        if (dailyData.Date && dailyData.Date !== utcDate) {
            postData()
            dailyData = {
                ...dailyDataDefault,
                Open: px
            }
        }

        // update the data.
        dailyData.Seq = seq
        dailyData.Date = utcDate
        dailyData.High = (dailyData.High < px) ? px : dailyData.High
        dailyData.Low = (dailyData.Low > px) ? px : dailyData.Low
        dailyData.Close = px;
        dailyData.Volume += qt;

        await redis.set(config.redisKey, JSON.stringify(dailyData))

    } catch (err) {
        console.log(err)
    }
}

const postData = async () => {

    const dailyData = JSON.parse(await redis.get(config.redisKey))

    if (dailyData) {
        console.log(`Posting the daily summary...`)

        const data = {
            id: parseInt(dailyData.Date.replace(new RegExp('-', 'g'), '')),
            high: dailyData.High,
            low: dailyData.Low,
            open: dailyData.Open,
            close: dailyData.Close,
            volume: dailyData.Volume
        }

        request.post(
            config.postApi,
            { json: data },
            (err, res, body) => {
                if (res && res.statusCode !== 200) {
                    console.log(`An error occurred while posting daily summary ${JSON.stringify(data)} to the storage api ${config.postApi}. Reason: ${body.message}`)
                    return
                }
                console.log(`Successfully posted the daily summary ${data.id}`)
            }
        )
    }
}

ws.addEventListener('message', (msg) => {
    let res;
    try {
        if (!(res = tryParseMessage(msg))) {
            throw "Invalid response. Reconnecting..."
        }
        updateData(res)
    } catch (err) {
        console.log(err)
        ws.reconnect(-1, err)
    }
})

ws.addEventListener('error', console.log)

ws.addEventListener('open', () => {
    console.log("connected")
    const frame = {
        m: 0,
        i: 0,
        n: "SubscribeTrades",
        o: JSON.stringify({ "OMSId": 1, "InstrumentId": 8, "IncludeLastCount": 1 })
    }
    ws.send(JSON.stringify(frame));
})

// update with the latest daily summary every 15 mins...
setInterval(postData, 60 * 1000 * config.updateInterval)
