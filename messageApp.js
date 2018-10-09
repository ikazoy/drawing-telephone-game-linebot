const createError = require('http-errors');
const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');
const _ = require('underscore');

const firestore = require('./libs/firestore');
const lineLib = require('./libs/line');


function serialize(obj) {
  return `?${Object.keys(obj).reduce((a, k) => { a.push(`${k}=${encodeURIComponent(obj[k])}`); return a; }, []).join('&')}`;
}

function buildLiffUrl(bundleId, userId, currentIndex) {
  const liffUrl = 'line://app/1613121893-RlAO1NqA';
  const params = {};
  if (bundleId != null) {
    params.bundleId = bundleId;
  }
  if (userId != null) {
    params.userId = userId;
  }
  if (currentIndex != null) {
    params.currentIndex = currentIndex;
  }
  return `${liffUrl}${serialize(params)}`;
}

async function handleText(message, replyToken, source) {
  console.log('message', message);
  console.log('source', source);
  const { text } = message;
  if (/^url$/.test(text)) {
    return lineLib.replyText(replyToken, buildLiffUrl());
  }
  if (/^参加$/.test(text)) {
    if (source.type === 'user') {
      return lineLib.replyText(replyToken, 'グループもしくはルームで遊んでください');
    }
    // 処理
    const gameDocRef = firestore.latestGameDocRefFromSource(source);
    const docSnapshot = await gameDocRef.get();
    if (docSnapshot.exists) {
      const data = await docSnapshot.data();
      // すでにゲーム中の場合
      if (data.currentIndex > -1) {
        return lineLib.replyText(replyToken, 'ゲーム続行中です。終了する場合は"終了"と送信してください。');
      }
    }
    // update userlist
    const sourceUserProfile = await lineLib.getMemberProfile(source.userId, firestore.extractBundleId(source), source.type);
    const userId2DisplayName = {};
    userId2DisplayName[source.userId] = sourceUserProfile.displayName;
    await gameDocRef.set({
      usersIds: admin.firestore.FieldValue.arrayUnion(source.userId),
      userId2DisplayName: admin.firestore.FieldValue.arrayUnion(userId2DisplayName),
    }, { merge: true });
    let displayNames = [];
    // NOTE: doen't accept method chain
    // const uids2dn = await gameDocRef.get().get('userId2DisplayName');
    const docSnapshot2 = await gameDocRef.get();
    const uids2dn = docSnapshot2.get('userId2DisplayName');
    if (uids2dn != null) {
      displayNames = uids2dn.map(el => Object.values(el)[0]);
    }
    return lineLib.replyText(replyToken, `参加を受け付けました。\n\n現在の参加者一覧\n${displayNames.join('\n')}`);
  }
  // TODO: 終了
  if (/^終了$/.test(text)) {
    const gameDocRef = firestore.latestGameDocRefFromSource(source);
    return lineLib.replyText(replyToken, 'ゲームを終了しました');
  }
  if (/^開始$/.test(text)) {
    if (source.type === 'user') {
      return lineLib.replyText(replyToken, 'グループもしくはルームで遊んでください');
    }
    // TODO: validate
    // 2人以上でないとエラー

    // 順番決め
    const gameDocRef = firestore.latestGameDocRefFromSource(source);
    const docSnapshot = await gameDocRef.get();
    let playersNum;
    let orderedPlayers;
    let firstPlayerUserId;
    if (docSnapshot.exists) {
      const data = await docSnapshot.data();
      // すでにゲーム中の場合
      if (data.currentIndex > -1) {
        return lineLib.replyText(replyToken, 'ゲーム続行中です。終了する場合は"終了"と送信してください。');
      }
      // 人数を取得
      const uids2dn = data.userId2DisplayName;
      if (uids2dn == null) {
        playersNum = 0;
      } else {
        playersNum = uids2dn.length;
      }
      // 順番を決定（範囲を作成、シャッフル)
      const orders = _.shuffle(Array.from(Array(playersNum).keys()));
      console.log('orders', orders);
      // 保存
      gameDocRef.update({
        orders,
        currentIndex: 0,
      });
      // 順番をユーザー名順に
      orderedPlayers = orders.map(o => Object.values(uids2dn[o])[0]);
      [firstPlayerUserId] = Object.keys(uids2dn[orders[0]]);
    }
    console.log('orderedPlayers', orderedPlayers);
    // TODO: お題を取得
    lineLib.pushMessage(firstPlayerUserId, `お題はこちら: ハチドリ\nクリックしてから60秒以内に絵を書いてください。\n${buildLiffUrl(firestore.extractBundleId(source), source.userId, 0)}`);
    const messages = [
      `ゲームを開始します。\n\n順番はこちらです。\n${orderedPlayers.join('\n')}`,
      `${orderedPlayers[0]}さんにお題を送信しました。\n60秒以内に絵を書いてください`,
    ];
    return lineLib.replyText(replyToken, messages);
  }
  return lineLib.replyText(replyToken, message.text);
}

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  switch (event.type) {
    case 'message': {
      const { message } = event;
      console.log(event.message.type);
      switch (event.message.type) {
        case 'text': {
          console.log('this is case text');
          return handleText(message, event.replyToken, event.source);
        }
        // case 'image': {
        //   return handleImage(message, event.replyToken);
        // }
        // case 'video': {
        //   return handleVideo(message, event.replyToken);
        // }
        // case 'audio': {
        //   return handleAudio(message, event.replyToken);
        // }
        // case 'location': {
        //   return handleLocation(message, event.replyToken);
        // }
        // case 'sticker': {
        //   return handleSticker(message, event.replyToken);
        // }
        default: {
          console.log('this is default');
          throw new Error(`Unknown message: ${JSON.stringify(message)}`);
        }
      }
    }
    default: {
      return Promise.resolve(null);
    }
  }
  // return replyText(event.replyToken, event.message.text);
}

// const cookieParser = require('cookie-parser');
// const logger = require('morgan');
// const sassMiddleware = require('node-sass-middleware');

// const indexRouter = require('./routes/webhook');
// const saveImageRouter = require('./routes/lineWebhook');

const app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');

// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(sassMiddleware({
//   src: path.join(__dirname, 'public'),
//   dest: path.join(__dirname, 'public'),
//   indentedSyntax: true, // true = .sass and false = .scss
//   sourceMap: true,
// }));
// app.use(express.static(path.join(__dirname, 'public')));

app.post('/webhook', line.middleware(lineLib.config), async (req, res) => {
  try {
    const result = await req.body.events.map(handleEvent);
    res.json(result);
  } catch (err) {
    console.log(err);
  }
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
// app.use((err, req, res, next) => {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

module.exports = app;
