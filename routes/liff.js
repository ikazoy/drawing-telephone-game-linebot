const express = require('express');
const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01', region: 'ap-northeast-1' });

const router = express.Router();

function decodeBase64Image(dataString) {
  const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  const response = {};

  if (matches.length !== 3) {
    console.error('Invalid input string');
  }

  response.type = matches[1];
  if (matches[1] !== 'image/jpeg') {
    console.error('image file is not jpeg format.');
  }
  response.data = Buffer.from(matches[2], 'base64');

  return response;
}

router.get('/liff', (req, res, next) => {
  console.log(req);
  res.render('index', { title: 'Express' });
});

router.post('/saveimage', async (req, res, text) => {
  console.log(req.body);
  const image = req.body.image;
  const directory = req.body.bundleId || 'noBundleId';
  const fileName = req.body.currentIndex || 'noIndex';
  const imageBuffer = decodeBase64Image(image);
  console.log('imageBuffer', imageBuffer);
  // TODO: bucket nameをserverless.ymlと共通化する
  // https://serverless.com/framework/docs/providers/aws/guide/variables#reference-variables-in-javascript-files
  // TODO: bucketのアクセス権限を治す
  const bucketName = 'drawing-telephone-game-linebot-images-test';
  const params = {
    Bucket: bucketName,
    Key: `${directory}/${fileName}`,
    ContentType: imageBuffer.type,
    Body: imageBuffer.data,
    ACL: 'public-read-write',
  };
  await s3.putObject(params, (err, data) => {
    if (err) {
      console.log('err on liff.js putObject', err);
    } else {
      console.log('data on liff.js putObject', data);
    }
  });
});

module.exports = router;
