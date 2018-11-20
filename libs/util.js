const _ = require('underscore');
const lineLib = require('./line');
const firestore = require('./firestore');
const themes = require('./themes');
const s3Lib = require('./s3');
const quickReply = require('./line/quickReply');

const questionType = targetIndex => ((targetIndex % 2 === 0) ? 'drawing' : 'guessing');
const fileSuffix = targetIndex => ((targetIndex % 2 === 0) ? 'jpeg' : 'txt');
const firstUserId = (latestGame) => {
  const [firstPlayerUserId] = Object.keys(latestGame.UserId2DisplayNames[latestGame.Orders[0]]);
  return firstPlayerUserId;
};
const firstUserDisplayName = (latestGame) => {
  const [firstPlayerUserId] = Object.values(latestGame.UserId2DisplayNames[latestGame.Orders[0]]);
  return firstPlayerUserId;
};

const buildGameMessage = (latestGame, nextIndex, payload) => {
  const nextOrder = latestGame.Orders[nextIndex];
  const userDisplayName = Object.values(latestGame.UserId2DisplayNames[nextOrder])[0];
  const nextUserId = Object.keys(latestGame.UserId2DisplayNames[nextOrder])[0];
  const liffUrl = lineLib.buildLiffUrl(latestGame.BundleId, latestGame.GameId, nextUserId, nextIndex, payload);
  // NOTE: text最大文字数に注意（titleまたは画像ありの場合60文字、両方なしの場合160文字）
  // https://developers.line.biz/ja/reference/messaging-api/#template-messages
  const qT = questionType(nextIndex);
  let altText;
  let text;
  if (qT === 'drawing') {
    altText = `${userDisplayName}さんにお絵かき伝言ゲームのお題が届いています`;
    text = `${userDisplayName}さんにお絵かき伝言ゲームのお題が届いています。クリックしてから60秒以内に絵を描いてください。`;
  } else if (qT === 'guessing') {
    altText = `${userDisplayName}さんは絵を見て推測してください`;
    text = `${userDisplayName}さんは絵を見て推測してください`;
  }
  return {
    type: 'template',
    altText,
    template: {
      type: 'buttons',
      imageAspectRatio: 'rectangle',
      imageSize: 'contain',
      text,
      actions: [
        {
          type: 'uri',
          label: 'お絵かき開始',
          uri: liffUrl,
        },
      ],
    },
  };
};

const buildFirstPublicMessage = (latestGame, opts) => {
  // 順番をユーザー名順に
  const orderedPlayers = latestGame.Orders.map(o => Object.values(latestGame.UserId2DisplayNames[o])[0]);
  const messages = [
    `${orderedPlayers[0]}さんにお題を送信しました。
60秒以内に絵を書いてください。

(万が一メッセージが届かない場合は、私と友達になっているかどうか確認してください。
友達になっていなかった場合は「終了」と送信してから、ゲームを再度やり直してください。`,
  ];
  if (!opts || !opts.retry) {
    messages.unshift(`ゲームを開始します。\n\n順番はこちらです。\n${orderedPlayers.join('\n')}`);
  }
  return messages;
};
const buildFirstPrivateMessage = (latestGame) => {
  const liffUrl = lineLib.buildLiffUrl(latestGame.BundleId, latestGame.GameId, firstUserId(latestGame), 0);
  return {
    type: 'template',
    altText: 'お絵かき伝言ゲームのお題が届いています',
    template: {
      type: 'buttons',
      // thumbnailImageUrl: thumbnail_url,
      imageAspectRatio: 'rectangle',
      imageSize: 'contain',
      title: `お題:${latestGame.Theme}`,
      text: 'クリックしてから60秒以内に絵を描いてください。お題の意味が万が一わからない場合は「チェンジ」と送信することでお題を変更できます。（最大2回まで）',
      actions: [
        {
          type: 'uri',
          label: 'お絵かき開始',
          uri: liffUrl,
        },
      ],
    },
  };
};
const canChangeTheme = (userId, latestGame) => {
  const maximumThemeUpdatedTimes = 2;
  if (userId === firstUserId(latestGame)) {
    if (latestGame.ThemeUpdatedTimes && latestGame.ThemeUpdatedTimes >= maximumThemeUpdatedTimes) {
      return {
        error: 'maximum times reached',
      };
    }
    return true;
  }
  return {
    error: 'not first player',
  };
};
const pickTheme = () => themes[_.random(0, themes.length - 1)];

const sendNext = async (bundleId, nextIndex) => {
  console.log('bundleId', bundleId);
  console.log('process', process.env);
  const latestGame = await firestore.latestGame(bundleId);
  let nextUserId;
  let publicMessage;
  // nextIndex = 0 is a special case: the first user is skipped by the command
  if (nextIndex === 0) {
    publicMessage = buildFirstPublicMessage(latestGame);
    await firestore.putLatestBundleId(nextUserId, bundleId);
    return {
      publicMessage,
    };
  }
  const currentUserIndex = latestGame.Orders[nextIndex - 1];
  const currentUserId = latestGame.UsersIds[currentUserIndex];
  const currentUserDisplayName = (currentUserIndex >= 0) ? Object.values(latestGame.UserId2DisplayNames[currentUserIndex])[0] : '';
  if (latestGame.CurrentIndex + 1 >= latestGame.UsersIds.length) {
    // 人数分終了
    await firestore.updateGame(bundleId, { Status: 'done' });
    if (questionType(nextIndex) === 'drawing') {
      publicMessage = {
        type: 'text',
        text: `${currentUserDisplayName}さんが回答しました。以上でゲームは終了です。結果発表を見る場合は「結果発表」と送信してください。`,
        quickReply: {
          items: [quickReply.announce],
        },
      };
    } else if (questionType(nextIndex) === 'guessing') {
      publicMessage = {
        type: 'text',
        text: `${currentUserDisplayName}さんが絵を描き終わりました。以上でゲームは終了です。結果発表を見る場合は「結果発表」と送信してください。`,
        quickReply: {
          items: [quickReply.announce],
        },
      };
    }
  } else {
    // 1. 次の順番のユーザーにメッセージを送る
    const nextUserIndex = latestGame.Orders[nextIndex];
    nextUserId = latestGame.UsersIds[nextUserIndex];
    const nextUserDisplayName = Object.values(latestGame.UserId2DisplayNames[nextUserIndex])[0];
    if (questionType(nextIndex) === 'drawing') {
      const s3Object = await s3Lib.getObject(bundleId, latestGame.GameId, nextIndex - 1, currentUserId);
      const theme = s3Object.Body.toString();
      // privateMessage = `${currentUserDisplayName}さんから回ってきたお題は「${theme}」です。\n以下のURLをクリックして60秒以内に絵を描いてください。\n${lineLib.buildLiffUrl(bundleId, latestGame.GameId, nextUserId, nextIndex)}`;
      // publicMessage = `${currentUserDisplayName}さんが回答しました。${nextUserDisplayName}さんはお題に沿って絵を描いてください。`;
      publicMessage = buildGameMessage(latestGame, nextIndex, theme);
    } else if (questionType(nextIndex) === 'guessing') {
      const imageUrl = s3Lib.buildObjectUrl(bundleId, latestGame.GameId, nextIndex - 1, currentUserId);
      publicMessage = buildGameMessage(latestGame, nextIndex, imageUrl);
      console.log('imageUrl', imageUrl);
      // privateMessage = [
      //   `${currentUserDisplayName}さんが描いた絵はこちらです。何の絵に見えますか？`,
      //   {
      //     type: 'image',
      //     originalContentUrl: imageUrl,
      //     previewImageUrl: imageUrl,
      //   },
      // ];
      // publicMessage = `${currentUserDisplayName}さんが絵を描き終わりました。${nextUserDisplayName}さんは絵を見て予想してください`;
    }
    // 2. firestoreの情報をupdate
    await firestore.updateGame(bundleId, { CurrentIndex: nextIndex });
    await firestore.putLatestBundleId(nextUserId, bundleId);
  }
  return {
    publicMessage,
  };
};

module.exports = {
  questionType,
  fileSuffix,
  firstUserId,
  firstUserDisplayName,
  buildFirstPublicMessage,
  buildFirstPrivateMessage,
  buildGameMessage,
  canChangeTheme,
  pickTheme,
  sendNext,
};
