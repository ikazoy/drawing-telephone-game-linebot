const express = require('express');
const s3Lib = require('../libs/s3Util');
const sendNext = require('../libs/sendNext');

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
// 入力パラメータ
// bundleId, GameId, nextIndex
// 出力
// JSON (message object for LINE)
router.get('/nextmessage', async (req, res, next) => {
  // TODO: validate params
  const { bundleId, nextIndex } = req.query;
  const result = await sendNext.sendNext(bundleId, nextIndex);
  let response;
  console.log('result', result);
  if (result != null) {
    response = res.json({
      success: true,
      publicMessage: result.publicMessage,
    });
  } else {
    response = res.json({
      error: true,
    });
  }
  return response;
});

// TODO: change name of endpoint for more commoness
router.post('/saveimage', async (req, res, next) => {
  let params;
  // save image
  if (req.body.image) {
    const { image } = req.body;
    const imageBuffer = decodeBase64Image(image);
    params = {
      ContentType: imageBuffer.type,
      Body: imageBuffer.data,
      ACL: 'public-read',
    };
  } else if (req.body.text) {
    const { text } = req.body;
    params = {
      Body: text,
      ACL: 'public-read',
    };
  } else {
    const response = res.json({
      success: false,
      message: 'invalid parameter: text or image parameter is required.',
    });
    return response;
  }
  // TODO: check if bundleId and gameId exists
  await s3.putObject(
    Object.assign(
      params,
      s3Lib.bucketKeyParam(req.body.bundleId, req.body.gameId, req.body.currentIndex, req.body.userId),
    ),
    (err, data) => {
      let response;
      if (err) {
        console.log('err on liff.js putObject', err);
        response = res.json({
          success: false,
          message: err,
        });
      } else {
        console.log('data on liff.js putObject', data);
        response = res.json({
          success: true,
          filePath: s3Lib.buildObjectUrl(req.body.bundleId, req.body.gameId, req.body.currentIndex, req.body.userId),
        });
      }
      return response;
    },
  );
});

module.exports = router;
