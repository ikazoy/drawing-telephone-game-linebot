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
  res.render('index', { title: 'Express' });
});

router.post('/saveimage', async (req, res, text) => {
  const { image } = req.body;
  const directory = req.body.bundleId || 'noBundleId';
  const fileName = (req.body.currentIndex) ? (`${req.body.currentIndex}-${req.body.userId}`) : 'noIndex';
  const imageBuffer = decodeBase64Image(image);
  console.log('imageBuffer', imageBuffer);
  // TODO: bucket nameをserverless.ymlと共通化する
  // https://serverless.com/framework/docs/providers/aws/guide/variables#reference-variables-in-javascript-files
  // TODO: bucketのアクセス権限を治す
  // const bucketName = 'drawing-telephone-game-linebot-images-test';
  const bucketName = 'drawing-telephone-game-linebot-images';
  const fileKey = `${directory}/${fileName}.jpeg`;
  const params = {
    Bucket: bucketName,
    Key: fileKey,
    ContentType: imageBuffer.type,
    Body: imageBuffer.data,
    // TODO: fix me
    ACL: 'public-read',
  };
  await s3.putObject(params, (err, data) => {
    let response;
    if (err) {
      console.log('err on liff.js putObject', err);
      response = res.json({
        success: false,
      });
    } else {
      console.log('data on liff.js putObject', data);
      response = res.json({
        success: true,
        filePath: `https://s3-ap-northeast-1.amazonaws.com/${bucketName}/${fileKey}`,
      });
    }
    return response;
  });
});

module.exports = router;
