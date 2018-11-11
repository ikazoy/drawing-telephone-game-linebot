const createError = require('http-errors');
const express = require('express');
const line = require('@line/bot-sdk');
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
  const latestGame = await firestore.latestGame(bundleId);
  if (latestGame) {
    return (latestGame.UsersIds[latestGame.Orders[latestGame.CurrentIndex]] === userId && latestGame.CurrentIndex != null && latestGame.CurrentIndex % 2 === 1);
  }
  return false;
}

async function handleText(message, replyToken, source) {
  const { text } = message;
  console.log('source', source);
  if (/^url$/.test(text)) {
    return lineLib.replyText(replyToken, lineLib.buildLiffUrl());
  } if (/^ヘルプ$/.test(text)) {
    const helpText = `コマンド一覧
参加：ゲームに参加することができます。
開始：参加登録されているメンバーでゲームを開始します。
終了：現在進行中のゲームを強制終了し、参加者をリセットします。
スキップ：順番を1つ飛ばして次のプレイヤーに移ります。（ゲーム開始後のみ有効）
結果発表：全員の順番が終了した際に結果発表を開始します。（ゲーム終了直後のみ有効）
次へ：次のプレイヤー分の結果発表に移ります。（ゲーム終了後の結果発表中のみ有効）
ヘルプ：コマンド一覧を確認できます。`;
    return lineLib.replyText(replyToken, helpText);
  } if (/^参加$/.test(text)) {
    if (source.type === 'user') {
      return lineLib.replyText(replyToken, 'グループもしくはルームでのみ有効です。');
    }
    const bundleId = firestore.extractBundleId(source);
    const latestGame = await firestore.latestGame(bundleId);
    if (latestGame && latestGame.CurrentIndex > -1) {
      return lineLib.replyText(replyToken, 'ゲーム続行中です。終了する場合は"終了"と送信してください。');
    }
    // update userlist
    const sourceUserProfile = await lineLib.getMemberProfile(source.userId, bundleId, source.type);
    const res = await firestore.addUserToGame(
      bundleId,
      source.userId,
      sourceUserProfile.displayName,
    );
    let displayNames = [];
    if (latestGame && latestGame.UserId2DisplayNames) {
      displayNames = latestGame.UserId2DisplayNames.map(el => Object.values(el)[0]);
    }
    if (res) {
      displayNames.push(sourceUserProfile.displayName);
    }
    // set users collection
    await firestore.putLatestBundleId(source.userId, firestore.extractBundleId(source));
    return lineLib.replyText(replyToken, `参加を受け付けました。参加者が揃ったら「開始」と送信してください。\n\n現在の参加者一覧\n${displayNames.join('\n')}`);
  }
  if (/^結果発表$/.test(text) || /^次へ$/.test(text)) {
    const bundleId = firestore.extractBundleId(source);
    const latestGame = await firestore.latestGame(bundleId);
    const currentAnnounceIndex = latestGame.CurrentAnnounceIndex;
    const theme = latestGame.Theme;
    if (latestGame === null || latestGame.Status !== 'done') {
      return lineLib.replyText(replyToken, '結果発表できるゲームが見つかりませんでした。');
    }
    // 結果発表開始
    if (currentAnnounceIndex === undefined) {
      const currentIndex = 0;
      const firstPlayerUserId = latestGame.UsersIds[latestGame.Orders[currentIndex]];
      const firstPlayerDisplayName = latestGame.UserId2DisplayNames[latestGame.Orders[currentIndex]][firstPlayerUserId];
      // 「次へ」を待たずにいきなりindex = 0の絵を送る
      const imageUrl = s3Lib.buildObjectUrl(
        firestore.extractBundleId(source),
        latestGame.GameId,
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
      await firestore.updateGame(bundleId, { CurrentAnnounceIndex: 1 });
    } else if (currentAnnounceIndex > 0) {
      // 結果発表中
      const targetPlayerUserId = latestGame.UsersIds[latestGame.Orders[currentAnnounceIndex]];
      const targetPlayerDisplayName = latestGame.UserId2DisplayNames[latestGame.Orders[currentAnnounceIndex]][targetPlayerUserId];
      const messages = [];
      let additionalMessage;
      if (util.questionType(currentAnnounceIndex) === 'drawing') {
        const imageUrl = s3Lib.buildObjectUrl(
          firestore.extractBundleId(source),
          latestGame.GameId,
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
        const s3Object = await s3Lib.getObject(bundleId, latestGame.GameId, currentAnnounceIndex, targetPlayerUserId);
        const answeredTheme = s3Object.Body.toString();
        messages.push(`${targetPlayerDisplayName}さんはこの絵を「${answeredTheme}」だと答えました。`);
        additionalMessage = '最初のお題は最後の人まで正しく伝わったでしょうか？';
      }
      await firestore.updateGame(bundleId, { CurrentAnnounceIndex: currentAnnounceIndex + 1 });
      if (latestGame.UsersIds.length <= currentAnnounceIndex + 1) {
        await firestore.stashEndedGame(firestore.extractBundleId(source));
        // ありがとうメッセージ
        messages.push(`以上で結果発表は終了です。\n${additionalMessage}\n\n新しいお題で遊ぶには、各参加者が「参加」と送信した後に、「開始」と送信してください。`);
      }
      return lineLib.replyText(replyToken, messages);
    }
  }
  if (/^終了$/.test(text)) {
    await firestore.stashEndedGame(firestore.extractBundleId(source));
    return lineLib.replyText(replyToken, 'ゲームを終了しました。再度ゲームを始める場合は、各参加者が「参加」と送信した後に、「開始」と送信してください。');
  } if (/^開始$/.test(text)) {
    if (source.type === 'user') {
      return lineLib.replyText(replyToken, 'グループもしくはルームで遊んでください。');
    }
    // TODO: validate
    // 2人以上でないとエラー

    // 順番、テーマ決め
    const bundleId = firestore.extractBundleId(source);
    const latestGame = await firestore.latestGame(bundleId);
    let playersNum;
    if (!latestGame) {
      return lineLib.replyText(replyToken, 'エラーが発生しました。');
    }
    // すでにゲーム中の場合
    if (latestGame.CurrentIndex > -1) {
      return lineLib.replyText(replyToken, 'ゲーム続行中です。終了する場合は"終了"と送信してください。');
    }
    // 人数を取得
    const uids2dn = latestGame.UserId2DisplayNames;
    if (uids2dn == null) {
      playersNum = 0;
    } else {
      playersNum = uids2dn.length;
    }
    // 順番、お題を決定（範囲を作成、シャッフル)
    const orders = _.shuffle(Array.from(Array(playersNum).keys()));
    const theme = themes[_.random(0, themes.length - 1)];
    // 保存
    const param = {
      Orders: orders,
      CurrentIndex: 0,
      Theme: theme,
    };
    await firestore.updateGame(bundleId, param);
    // 順番をユーザー名順に
    const orderedPlayers = orders.map(o => Object.values(uids2dn[o])[0]);
    const [firstPlayerUserId] = Object.keys(uids2dn[orders[0]]);
    console.log(latestGame);
    lineLib.pushMessage(firstPlayerUserId, `お題: 「${theme}」\nクリックしてから60秒以内に絵を書いてください。\n${lineLib.buildLiffUrl(bundleId, latestGame.GameId, firstPlayerUserId, 0)}`);
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
    const latestGame = await firestore.latestGame(bundleId);
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
        s3Lib.bucketKeyParam(bundleId, latestGame.GameId, latestGame.CurrentIndex, source.userId),
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

async function handleFollow(replyToken) {
  console.log('follow!!');
  const onFollowMessage = `友達追加ありがとうございます。
私は複数人のトークグループやルームでお絵かき伝言ゲームを楽しむためのお手伝いをします。
一緒にゲームを遊びたい友人や家族とグループを作成して、私を招待してください。`;
  return lineLib.replyText(replyToken, onFollowMessage);
}

async function handleJoin(replyToken) {
  console.log('join!!');
  const onJoinMessage = `ゲームに参加したい人は「参加」と送信してください。
参加者が揃ったら「開始」と送信してください。
万が一ゲームを途中で終了したい、やり直したい場合「終了」と送信してください。
詳しい使い方を見るには「ヘルプ」と送信してください。`;
  return lineLib.replyText(replyToken, onJoinMessage);
}


function handleEvent(event) {
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
          return Promise.resolve(null);
        }
      }
    }
    case 'follow': {
      return handleFollow(event.replyToken);
    }
    case 'join': {
      return handleJoin(event.replyToken);
    }
    default: {
      return Promise.resolve(null);
    }
  }
  // return replyText(event.replyToken, event.message.text);
}

const app = express();

app.post('/webhook', line.middleware(lineLib.config), (req, res) => {
  // try {
  //   const result = req.body.events.map(await handleEvent);
  //   res.json(result);
  // } catch (err) {
  //   console.log(err);
  // }
  // Promise
  //   .all(req.body.events.map(handleEvent))
  //   .then(result => res.json(result));

  // 受信したメッセージイベントを処理
  const promises = req.body.events.map((event) => {
    const promise = handleEvent(event);
    return promise;
  });

  // メッセージごとの処理はPromiseで実行
  Promise
    .all(promises)
    .then((value) => {
      // 処理が全て正常終了すれば、HTTP STATUS CODE 200を返す
      res.json({ success: true });
    })
    .catch((error) => {
      // 異常終了があれば、HTTP STATUS CODE 500を返す
      console.log('Error!: ', error);
      return res.status(500).json({});
    });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

module.exports = app;
