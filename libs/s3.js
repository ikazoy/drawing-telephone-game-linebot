const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01', region: 'ap-northeast-1' });
const bucketName = 'drawing-telephone-game-linebot-images';
const s3BaseUrl = 'https://s3-ap-northeast-1.amazonaws.com';

module.exports = {
  s3,
  bucketName,
  s3BaseUrl,
};
