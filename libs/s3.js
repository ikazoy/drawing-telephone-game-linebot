const aws = require('aws-sdk');
const util = require('./util');

const s3 = new aws.S3({ apiVersion: '2006-03-01', region: 'ap-northeast-1' });
const bucketName = 'drawing-telephone-game-linebot-images';
const s3BaseUrl = 'https://s3-ap-northeast-1.amazonaws.com';

function fileKey(bundleId, targetIndex, submitterUserId) {
  const fileName = `${targetIndex}-${submitterUserId}`;
  return `${bundleId}/${fileName}.${util.fileSuffix(targetIndex)}`;
}

const buildObjectUrl = (bundleId, targetIndex, submitterUserId) => `${s3BaseUrl}/${bucketName}/${fileKey(bundleId, targetIndex, submitterUserId)}`;
const bucketKeyParam = (bundleId, targetIndex, submitterUserId) => ({
  Bucket: bucketName,
  Key: fileKey(bundleId, targetIndex, submitterUserId),
});
const getObject = async (bundleId, targetIndex, submitterUserId) => {
  const params = bucketKeyParam(bundleId, targetIndex, submitterUserId);
  return s3.getObject(params).promise();
};
module.exports = {
  s3,
  bucketName,
  s3BaseUrl,
  buildObjectUrl,
  bucketKeyParam,
  getObject,
};
