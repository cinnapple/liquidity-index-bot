import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB, S3 } from "aws-sdk"
import 'source-map-support/register';
import { addDays, startOfToday } from "date-fns"
import * as csv from "csvtojson"

const dynamoDb = new DynamoDB.DocumentClient()
const s3 = new S3();
const tableName = process.env.DYNAMODB_TABLE
const tableName_toMigrate = process.env.DYNAMODB_TABLE_NEW

interface IDataSchema {
  id: number, // id (YYYYMMDD) 
  high: number,
  low: number,
  open: number,
  close: number,
  volume: number
}

interface ICsvSchema {
  Date: string,
  Open: string,
  High: string,
  Low: string,
  Close: string,
  "Volume (XRP)": string
}


export const update: APIGatewayProxyHandler = async (_event, _context) => {
  const data: IDataSchema = JSON.parse(_event.body)
  console.log(data)

  const params: DynamoDB.DocumentClient.PutItemInput = {
    TableName: tableName,
    Item: data
  }

  await dynamoDb.put(params).promise()

  return {
    statusCode: 200,
    body: "ok"
  }
}

const _getList = async (recordNum?: number) => {

  let filter = {}

  if (recordNum) {
    const cutoffDate = addDays(startOfToday(), -recordNum).toISOString()
    const cutoffDateParam = parseInt(cutoffDate.split("T")[0].replace(new RegExp('-', 'g'), ''))
    filter = {
      FilterExpression: "#date >= :date",
      ExpressionAttributeNames: { "#date": "date" },
      ExpressionAttributeValues: {
        ":date": cutoffDateParam
      }
    }
  }

  const params: DynamoDB.DocumentClient.ScanInput = {
    TableName: tableName,
    ...filter
  }

  const data = await dynamoDb.scan(params).promise()
  data.Items.sort((a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0)
  return data.Items
}

export const getList: APIGatewayProxyHandler = async (_event, _context) => {
  const recordNum = parseInt(_event.queryStringParameters.recordNum)
  const records = await _getList(recordNum)
  return {
    statusCode: 200,
    body: JSON.stringify(records)
  }
}

export const migrate: APIGatewayProxyHandler = async (_event, _context) => {
  const oldRecords = await _getList()

  for (let r of oldRecords) {

    console.log(`processing record#${r.id}`)
    const params: DynamoDB.DocumentClient.PutItemInput = {
      TableName: tableName_toMigrate,
      Item: {
        ...r,
        date: r.id
      }
    }

    await dynamoDb.put(params).promise()
  }

  return {
    statusCode: 200,
    body: "ok"
  }
}

export const importFromCsv: APIGatewayProxyHandler = async (_event, _context) => {

  return new Promise<any>(async (resolve) => {

    const s3Data = (_event as any).Records[0].s3
    const bucket = s3Data.bucket.name
    const key = s3Data.object.key
    console.log(`File is ${bucket}:${key}`)
    const data = await s3.getObject({ Bucket: bucket, Key: key }).promise()
    const rows: ICsvSchema[] = await csv({ output: "json" }).fromString(data.Body.toString())

    let count = 0;
    const intervalKey = setInterval(() => {
      console.log(`processing record#${count}`)
      const r = rows[count++]
      const utcDate = new Date(r.Date).toISOString().split("T")[0]
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: tableName,
        Item: {
          id: parseInt(utcDate.replace(new RegExp('-', 'g'), '')),
          open: parseFloat(r.Open),
          close: parseFloat(r.Close),
          high: parseFloat(r.High),
          low: parseFloat(r.Low),
          volume: parseFloat(r["Volume (XRP)"])
        } as IDataSchema
      }

      dynamoDb.put(params).promise()

      if (count === rows.length) {
        clearInterval(intervalKey)
        resolve({
          statusCode: 200,
          body: "ok"
        })
      }
    }, 500)

  })

}
