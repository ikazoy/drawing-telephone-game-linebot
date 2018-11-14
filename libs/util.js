const lineLib = require('./line');

const questionType = targetIndex => ((targetIndex % 2 === 0) ? 'drawing' : 'guessing');
const fileSuffix = targetIndex => ((targetIndex % 2 === 0) ? 'jpeg' : 'txt');
const firstUserId = (latestGame) => {
  const [firstPlayerUserId] = Object.keys(latestGame.UserId2DisplayNames[latestGame.Orders[0]]);
  return firstPlayerUserId;
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
// const buildFirstPrivateMessage = latestGame => `お題: 「${latestGame.Theme}」\nクリックしてから60秒以内に絵を書いてください。\n${lineLib.buildLiffUrl(latestGame.BundleId, latestGame.GameId, firstUserId(latestGame), 0)}`;
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
      text: 'クリックしてから60秒以内に絵を描いてください。',
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

module.exports = {
  questionType,
  fileSuffix,
  firstUserId,
  buildFirstPublicMessage,
  buildFirstPrivateMessage,
};
