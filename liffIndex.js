require('dotenv').config();
const awsServerlessExpress = require('aws-serverless-express');
const app = require('./liffApp');

const server = awsServerlessExpress.createServer(app);
exports.handler = (event, context) => {
  console.log('in liffIndex', JSON.stringify(event).size);
  awsServerlessExpress.proxy(server, event, context);
};
