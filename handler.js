require('dotenv').config();
const firestore = require('./libs/firestore');
const lineLib = require('./libs/line');
const s3Lib = require('./libs/s3');
const util = require('./libs/util');
const lambda = require('./libs/lambda');
const quickReply = require('./libs/line/quickReply');

// yarn run sls invoke local --function triggeredBySavedImage -p s3Object-event.json
module.exports.triggeredBySavedImage = async (event, context, callback) => {
  const changedObject = event.Records[0].s3.object;
  // actual example of objectKey
  // Rd4ae3efbe814c9219965368a7932d7a7/20181110T07%3A22%3A04.222Z/0-Uceb4ceddcf7c2f2a508aa245469320e9.jpeg
  const objectKey = changedObject.key;
  const regex = /(\w+)\/(.+)\/([0-9]+)-(\w+)\.(\w+)/;
  const regexResult = objectKey.match(regex);
  const [str, bundleId, gameId, indexOfImage, userId, prefix] = regexResult;
  const nextIndex = Number(indexOfImage) + 1;
  const res = await lambda.invokeSendNext(bundleId, nextIndex);
  if (res.err) {
    console.log(`error : ${res.err}`);
    callback(res.err, null);
  } else if (res) {
    const response = {
      statusCode: 200,
      body: '{"msg": "success"}',
    };
    callback(null, response);
  }
};

// yarn run sls invoke local --function sendNext -p sendNext-event.json
module.exports.sendNext = async (event, context, callback) => {
  const { bundleId, nextIndex } = event;
  const latestGame = await firestore.latestGame(bundleId);
  const currentUserIndex = latestGame.Orders[nextIndex - 1];
  const currentUserId = latestGame.UsersIds[currentUserIndex];
  const currentUserDisplayName = (currentUserIndex >= 0) ? Object.values(latestGame.UserId2DisplayNames[currentUserIndex])[0] : '';
  let nextUserId;
  let publicMessage;
  let privateMessage;
  // nextIndex = 0 is a special case: the first user is skipped by the command
  if (latestGame.CurrentIndex + 1 >= latestGame.UsersIds.length && nextIndex !== 0) {
    // 人数分終了
    await firestore.updateGame(bundleId, { Status: 'done' });
    if (util.questionType(nextIndex) === 'drawing') {
      publicMessage = {
        type: 'text',
        text: `${currentUserDisplayName}さんが回答しました。以上でゲームは終了です。結果発表を見る場合は「結果発表」と送信してください。`,
        quickReply: {
          items: [quickReply.announce],
        },
      };
    } else if (util.questionType(nextIndex) === 'guessing') {
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
    if (util.questionType(nextIndex) === 'drawing') {
      if (nextIndex === 0) {
        publicMessage = util.buildFirstPublicMessage(latestGame);
        privateMessage = util.buildFirstPrivateMessage(latestGame);
      } else {
        const s3Object = await s3Lib.getObject(bundleId, latestGame.GameId, nextIndex - 1, currentUserId);
        const theme = s3Object.Body.toString();
        privateMessage = `${currentUserDisplayName}さんから回ってきたお題は「${theme}」です。\n以下のURLをクリックして60秒以内に絵を描いてください。\n${lineLib.buildLiffUrl(bundleId, latestGame.GameId, nextUserId, nextIndex)}`;
        publicMessage = `${currentUserDisplayName}さんが回答しました。${nextUserDisplayName}さんはお題に沿って絵を描いてください。`;
      }
    } else if (util.questionType(nextIndex) === 'guessing') {
      const imageUrl = s3Lib.buildObjectUrl(bundleId, latestGame.GameId, nextIndex - 1, currentUserId);
      console.log('imageUrl', imageUrl);
      privateMessage = [
        `${currentUserDisplayName}さんが描いた絵はこちらです。何の絵に見えますか？`,
        {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        },
      ];
      publicMessage = `${currentUserDisplayName}さんが絵を描き終わりました。${nextUserDisplayName}さんは絵を見て予想してください`;
    }
    // 2. firestoreの情報をupdate
    await firestore.updateGame(bundleId, { CurrentIndex: nextIndex });
    await firestore.putLatestBundleId(nextUserId, bundleId);
  }
  if (publicMessage !== null) {
    lineLib.pushMessage(bundleId, publicMessage);
  }
  if (privateMessage !== null) {
    lineLib.pushMessage(nextUserId, privateMessage);
  }

  const response = {
    statusCode: 200,
    // body: JSON.parse(data.Payload)
    body: '{"msg": "success"}',
  };
  callback(null, response);
};

// {
//     "Records": [
//         {
//             "eventVersion": "2.0",
//             "eventSource": "aws:s3",
//             "awsRegion": "ap-northeast-1",
//             "eventTime": "2018-10-09T12:54:45.070Z",
//             "eventName": "ObjectCreated:Put",
//             "userIdentity": {
//                 "principalId": "AWS:AIDAIUTQUI344BUBU6SUS"
//             },
//             "requestParameters": {
//                 "sourceIPAddress": "36.12.66.133"
//             },
//             "responseElements": {
//                 "x-amz-request-id": "14185EABDD15B32C",
//                 "x-amz-id-2": "+VCetVG1XkpOtD/1aUivqil9IehTxq4Tf4Tj3vNb186soIOEn4gEhvOWIr8qaOjGWiXmVW8WAsE="
//             },
//             "s3": {
//                 "s3SchemaVersion": "1.0",
//                 "configurationId": "a18dfb55-20fd-4be2-8452-ee868be513a2",
//                 "bucket": {
//                     "name": "drawing-telephone-game-linebot-images-development",
//                     "ownerIdentity": {
//                         "principalId": "A2K64DQMCGBP71"
//                     },
//                     "arn": "arn:aws:s3:::drawing-telephone-game-linebot-images-development"
//                 },
//                 "object": {
//                     "key": "R0424f09e0bd8f1fc7c7e99d260933373/0-Uceb4ceddcf7c2f2a508aa245469320e9.jepg",
//                     "size": 14074,
//                     "eTag": "b14c52f400933750362131ea55ceecc0",
//                     "sequencer": "005BBCA514F8F98DBB"
//                 }
//             }
//         }
//     ]
// }
