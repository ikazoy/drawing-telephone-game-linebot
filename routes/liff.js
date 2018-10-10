const express = require('express');
const s3Lib = require('../libs/s3');

const { s3 } = s3Lib;

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
  const imageBuffer = decodeBase64Image(image);
  console.log('imageBuffer', imageBuffer);
  const params = {
    ContentType: imageBuffer.type,
    Body: imageBuffer.data,
    ACL: 'public-read',
  };
  await s3.putObject(
    Object.assign(params, s3Lib.bucketKeyParam(req.body.bundleId, req.body.currentIndex, req.body.userId)),
    (err, data) => {
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
          filePath: s3Lib.buildObjectUrl(req.body.bundleId, req.body.currentIndex, req.body.userId),
        });
      }
      return response;
    },
  );
});

module.exports = router;
