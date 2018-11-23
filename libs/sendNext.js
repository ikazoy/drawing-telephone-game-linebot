const firestore = require('./firestore');
const s3Lib = require('./s3Util');
const util = require('./util');
const quickReply = require('./line/quickReply');

const sendNext = async (bundleId, nextIndex, skipped) => {
  const latestGame = await firestore.latestGame(bundleId);
  let publicMessage;
  const nextUserIndex = latestGame.Orders[nextIndex];
  const nextUserId = latestGame.UsersIds[nextUserIndex];
  // nextIndex = 0 is a special case: the first user is skipped by the command
  if (nextIndex === 0) {
    publicMessage = util.buildGameMessage(latestGame, nextIndex, latestGame.Theme, skipped);
    await firestore.putLatestBundleId(nextUserId, bundleId);
    return {
      publicMessage,
    };
  }
  const currentUserIndex = latestGame.Orders[nextIndex - 1];
  const currentUserId = latestGame.UsersIds[currentUserIndex];
  if (nextIndex >= latestGame.UsersIds.length) {
    // 人数分終了
    const currentUserDisplayName = (currentUserIndex >= 0) ? Object.values(latestGame.UserId2DisplayNames[currentUserIndex])[0] : '';
    await firestore.updateGame(bundleId, { Status: 'done' });
    if (util.questionType(nextIndex) === 'drawing') {
      publicMessage = [{
        type: 'text',
        text: `${currentUserDisplayName}さんが回答しました。以上でゲームは終了です🖐\n結果発表を見る場合は「結果発表」と送信してください📢`,
        quickReply: {
          items: [quickReply.announce],
        },
      }];
    } else if (util.questionType(nextIndex) === 'guessing') {
      publicMessage = [{
        type: 'text',
        text: `${currentUserDisplayName}さんが絵を描き終わりました。以上でゲームは終了です🖐\n結果発表を見る場合は「結果発表」と送信してください📢`,
        quickReply: {
          items: [quickReply.announce],
        },
      }];
    }
  } else {
    // 1. 次の順番のユーザーにメッセージを送る
    // const nextUserDisplayName = Object.values(latestGame.UserId2DisplayNames[nextUserIndex])[0];
    if (util.questionType(nextIndex) === 'drawing') {
      const s3Object = await s3Lib.getObject(bundleId, latestGame.GameId, nextIndex - 1, currentUserId);
      const theme = s3Object.Body.toString();
      publicMessage = util.buildGameMessage(latestGame, nextIndex, theme);
    } else if (util.questionType(nextIndex) === 'guessing') {
      const imageUrl = s3Lib.buildObjectUrl(bundleId, latestGame.GameId, nextIndex - 1, currentUserId);
      publicMessage = util.buildGameMessage(latestGame, nextIndex, imageUrl);
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
  sendNext,
};
