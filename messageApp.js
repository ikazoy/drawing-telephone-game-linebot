const createError = require('http-errors');
const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');
const _ = require('underscore');
const s3Lib = require('./libs/s3');
const util = require('./libs/util');
const themes = require('./libs/themes');

const firestore = require('./libs/firestore');
const lineLib = require('./libs/line');


async function isGuessingAnswerer(bundleId, userId) {
  if (bundleId == null || userId == null) {
    return false;
  }
  const gameDocRef = firestore.latestGameDocRef(`${bundleId}-game`);
  const docSnapshot = await gameDocRef.get();
  if (docSnapshot.exists) {
    const data = await docSnapshot.data();
    return (data.usersIds[data.orders[data.currentIndex]] === userId && data.currentIndex != null && data.currentIndex % 2 === 1);
  }
  return false;
}

async function handleText(message, replyToken, source) {
  console.log('message', message);
  console.log('source', source);
  const { text } = message;
  if (/^url$/.test(text)) {
    return lineLib.replyText(replyToken, lineLib.buildLiffUrl());
  } if (/^参加$/.test(text)) {
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
    // set users collection
    const userDocRef = firestore.usersDocRef(source.userId);
    await userDocRef.set({
      bundleId: firestore.extractBundleId(source),
    });
    return lineLib.replyText(replyToken, `参加を受け付けました。\n\n現在の参加者一覧\n${displayNames.join('\n')}`);
  }
  if (/^結果発表$/.test(text) || /^次へ$/.test(text)) {
    const gameDocRef = firestore.doneGameDocRefFromSource(source);
    const docSnapshot = await gameDocRef.get();
    const data = await docSnapshot.data();
    const { currentAnnounceIndex, theme } = data;
    if (!theme || !docSnapshot.exists) {
      return lineLib.replyText(replyToken, '結果発表できるゲームが見つかりませんでした。再度最初からおためしください。');
    }
    // 結果発表開始
    if (currentAnnounceIndex === undefined) {
      const currentIndex = 0;
      const firstPlayerUserId = data.usersIds[data.orders[currentIndex]];
      const firstPlayerDisplayName = data.userId2DisplayName[data.orders[currentIndex]][firstPlayerUserId];
      // 「次へ」を待たずにいきなりindex = 0の絵を送る
      const imageUrl = s3Lib.buildObjectUrl(
        firestore.extractBundleId(source),
        currentIndex,
        firstPlayerUserId,
      );
      lineLib.replyText(replyToken, [
        `それでは結果発表です\n\nお題は「${theme}」でした！`,
        `${firstPlayerDisplayName}さんが描いた絵はこちら`,
        {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        },
        '「次へ」と送信すると、次の人の絵もしくは回答を見ることができます。',
      ]);
      gameDocRef.update({ currentAnnounceIndex: 1 });
    } else if (currentAnnounceIndex > 0) {
      // 結果発表中
      const targetPlayerUserId = data.usersIds[data.orders[currentAnnounceIndex]];
      const targetPlayerDisplayName = data.userId2DisplayName[data.orders[currentAnnounceIndex]][targetPlayerUserId];
      const messages = [];
      let additionalMessage;
      if (util.questionType(currentAnnounceIndex) === 'drawing') {
        const imageUrl = s3Lib.buildObjectUrl(
          firestore.extractBundleId(source),
          currentAnnounceIndex,
          targetPlayerUserId,
        );
        messages.push(`${targetPlayerDisplayName}さんが描いた絵はこちら`);
        messages.push({
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        });
        additionalMessage = '最後の絵はどうでしたか？みんなで点数をつけてみると面白いかもしれませんよ。';
      } else if (util.questionType(currentAnnounceIndex) === 'guessing') {
        const s3Object = await s3Lib.getObject(firestore.extractBundleId(source), currentAnnounceIndex, targetPlayerUserId);
        const answeredTheme = s3Object.Body.toString();
        messages.push(`${targetPlayerDisplayName}さんはこの絵を「${answeredTheme}」だと答えました。`);
        additionalMessage = '最初のお題は最後の人まで正しく伝わったでしょうか？';
      }
      gameDocRef.update({ currentAnnounceIndex: currentAnnounceIndex + 1 });
      if (data.usersIds.length <= currentAnnounceIndex + 1) {
        // 結果発表終了のためfirestore上のデータを移動
        const oldGameCollectionRef = firestore.oldGameCollectionRef(`${(firestore.extractBundleId(source))}-game`);
        oldGameCollectionRef.add(data);
        gameDocRef.delete();
        // ありがとうメッセージ
        messages.push(`以上で結果発表は終了です。\n${additionalMessage}\n\n新しいお題で遊ぶには、各参加者が「参加」と送信した後に、「開始」と送信してください。`);
      }
      return lineLib.replyText(replyToken, messages);
    }
  }
  if (/^終了$/.test(text)) {
    // TODO: 終了
    const gameDocRef = firestore.latestGameDocRefFromSource(source);
    return lineLib.replyText(replyToken, 'ゲームを終了しました');
  } if (/^開始$/.test(text)) {
    if (source.type === 'user') {
      return lineLib.replyText(replyToken, 'グループもしくはルームで遊んでください');
    }
    // TODO: validate
    // 2人以上でないとエラー

    // 順番、テーマ決め
    const gameDocRef = firestore.latestGameDocRefFromSource(source);
    const docSnapshot = await gameDocRef.get();
    let playersNum;
    if (!docSnapshot.exists) {
      return lineLib.replyText(replyToken, 'エラーが発生しました。');
    }
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
    // 順番、お題を決定（範囲を作成、シャッフル)
    const orders = _.shuffle(Array.from(Array(playersNum).keys()));
    const theme = themes[_.random(0, themes.length - 1)];
    // 保存
    gameDocRef.update({
      orders,
      currentIndex: 0,
      theme,
    });
    // 順番をユーザー名順に
    const orderedPlayers = orders.map(o => Object.values(uids2dn[o])[0]);
    const [firstPlayerUserId] = Object.keys(uids2dn[orders[0]]);
    console.log('orderedPlayers', orderedPlayers);
    lineLib.pushMessage(firstPlayerUserId, `お題: 「${theme}」\nクリックしてから60秒以内に絵を書いてください。\n${lineLib.buildLiffUrl(firestore.extractBundleId(source), firstPlayerUserId, 0)}`);
    const messages = [
      `ゲームを開始します。\n\n順番はこちらです。\n${orderedPlayers.join('\n')}`,
      `${orderedPlayers[0]}さんにお題を送信しました。\n60秒以内に絵を書いてください`,
    ];
    return lineLib.replyText(replyToken, messages);
  }
  // 回答の場合
  if (source.type === 'user') {
    const bundleId = await firestore.latestBundleIdOfUser(source.userId);
    const resGuessingAnswerer = await isGuessingAnswerer(bundleId, source.userId);
    if (!resGuessingAnswerer) {
      return lineLib.replyText(replyToken, '回答者になってからもう一度お答えください。');
    }
    // s3にtextfileを保存
    console.log('now the user is guessing answerer');
    const currentIndex = await firestore.currentIndex(bundleId);
    // TODO: bucket nameをserverless.ymlと共通化する
    // https://serverless.com/framework/docs/providers/aws/guide/variables#reference-variables-in-javascript-files
    // TODO: bucketのアクセス権限を治す
    const params = {
      Body: text,
      ACL: 'public-read',
    };
    await s3Lib.s3.putObject(
      Object.assign(
        params,
        s3Lib.bucketKeyParam(bundleId, currentIndex, source.userId),
      ),
      (err, data) => {
        if (err) {
          console.log('err on liff.js putObject', err);
          // response = res.json({
          //   success: false,
          // });
        } else {
          console.log('data on liff.js putObject', data);
          // response = res.json({
          //   success: true,
          //   filePath: `${s3Lib.s3BaseUrl}/${s3Lib.bucketName}/${fileKey}`,
          // });
        }
      },
    );
    return lineLib.replyText(replyToken, '回答ありがとうございました');
  }
  return 1;
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

const app = express();

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

module.exports = app;
