const _ = require('underscore');
const lineLib = require('./line');
const themes = require('./themes');

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
};
