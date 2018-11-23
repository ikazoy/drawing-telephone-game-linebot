const express = require('express');
const JSON = require('circular-json');
const s3Lib = require('../libs/s3Util');
const firestore = require('../libs/firestore');
const sendNext = require('../libs/sendNext');
const util = require('../libs/util');

const { s3 } = s3Lib;

const router = express.Router();

function decodeBase64Image(dataString) {
  const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  const response = {};

  if (matches.length !== 3) {
    console.error('Invalid input string');
  }

  response.type = matches[1];
  if (matches[1] !== 'image/png') {
    console.error('image file is not png format.');
  }
  response.data = Buffer.from(matches[2], 'base64');

  return response;
}

router.get('/liff', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.post('/swaptheme', async (req, res, next) => {
  const latestGame = await firestore.latestGame(req.body.bundleId);
  const resp = util.canChangeTheme(req.body.userId, latestGame);
  if (resp.error) {
    let reply;
    switch (resp.error) {
      case 'maximum times reached': {
        reply = 'テーマを変えられる回数が上限に達しています。';
        break;
      }
      case 'not first player': {
        reply = 'テーマを変えられるのは最初のプレイヤーだけです。';
        break;
      }
      default: {
        reply = 'エラーが発生しました。';
        break;
      }
    }
    return res.json({
      success: false,
      message: reply,
    });
  }
  console.log('let swap');
  const updatedLatestGame = await firestore.swapTheme(latestGame);
  console.log('updatedLatestGame', updatedLatestGame);
  if (updatedLatestGame.Theme == null) {
    return res.json({
      success: false,
      message: 'エラーが発生しました',
    });
  }
  return res.json({
    success: true,
    theme: updatedLatestGame.Theme,
  });
});

router.get('/latestgame', async (req, res, next) => {
  const {
    bundleId, userId, currentIndex, gameId,
  } = req.query;
  const latestGame = await firestore.latestGame(bundleId);
  const imageUrl = s3Lib.buildObjectUrl(bundleId, gameId, currentIndex, userId);
  // 現存のゲームに回答済みの場合
  if (latestGame && latestGame.CurrentIndex > currentIndex) {
    return res.json({
      game: latestGame,
      imageUrl,
    });
  } if (latestGame) {
    return res.json({
      game: latestGame,
    });
  }
  // 古い場合
  return res.json({
    imageUrl,
  });
});
// 入力パラメータ
// bundleId, GameId, nextIndex
// 出力
// JSON (message object for LINE)
router.get('/nextmessage', async (req, res, next) => {
  // TODO: validate params
  const { bundleId, nextIndex } = req.query;
  console.log('bundleId', bundleId);
  console.log('nextIndex', nextIndex);
  const result = await sendNext.sendNext(bundleId, nextIndex);
  let response;
  console.log('result', JSON.stringify(result.publicMessage));
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
  const s3Param = Object.assign(
    params,
    s3Lib.bucketKeyParam(req.body.bundleId, req.body.gameId, req.body.currentIndex, req.body.userId),
  );
  // TODO: check if bundleId and gameId exists
  await s3.putObject(
    s3Param,
    (err, data) => {
      let response;
      if (err) {
        console.log('err on liff.js putObject', err);
        delete s3Param.Body;
        console.log('s3Param', JSON.stringify(s3Param));
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
