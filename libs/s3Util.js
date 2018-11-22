const aws = require('aws-sdk');
const util = require('./util');

const s3Service = new aws.S3({ apiVersion: '2006-03-01', region: 'ap-northeast-1' });
const bucketName = `drawing-telephone-game-linebot-images-${process.env.NODE_ENV}`;
const s3BaseUrl = 'https://s3-ap-northeast-1.amazonaws.com';

const fileKey = (bundleId, gameId, targetIndex, submitterUserId) => {
  const fileName = `${targetIndex}-${submitterUserId}`;
  return `${bundleId}/${gameId}/${fileName}.${util.fileSuffix(targetIndex)}`;
};

const buildObjectUrl = (bundleId, gameId, targetIndex, submitterUserId) => `${s3BaseUrl}/${bucketName}/${fileKey(bundleId, gameId, targetIndex, submitterUserId)}`;
const bucketKeyParam = (bundleId, gameId, targetIndex, submitterUserId) => ({
  Bucket: bucketName,
  Key: fileKey(bundleId, gameId, targetIndex, submitterUserId),
});
const getObject = async (bundleId, gameId, targetIndex, submitterUserId) => {
  const params = bucketKeyParam(bundleId, gameId, targetIndex, submitterUserId);
  return s3Service.getObject(params).promise();
};

module.exports = {
  s3: s3Service,
  bucketName,
  s3BaseUrl,
  buildObjectUrl,
  bucketKeyParam,
  getObject,
};
