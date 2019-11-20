import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from "aws-sdk"
import 'source-map-support/register';

const dynamoDb = new DynamoDB.DocumentClient()
const tableName = process.env.DYNAMODB_TABLE 

interface IDataSchema {
  id: number, // id (YYYYMMDD) 
  h: number,  // daily high 
  l: number,  // daily low 
  v: number   // daily volume
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

export const getList: APIGatewayProxyHandler = async (_event, _context) => {
  const params: DynamoDB.DocumentClient.ScanInput = {
    TableName: tableName 
  }

  const data = await dynamoDb.scan(params).promise()

  return {
    statusCode: 200,
    body: JSON.stringify(data.Items) 
  }
}