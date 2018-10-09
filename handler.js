// yarn run sls invoke local --function triggeredBySavedImage -p s3Object-event.json
const aws = require('aws-sdk');
const firestore = require('./libs/firestore');
const lineLib = require('./libs/line');
const s3Lib = require('./libs/s3');

module.exports.triggeredBySavedImage = (event, context, callback) => {
  const changedObject = event.Records[0].s3.object;
  const objectKey = changedObject.key;
  const regex = /(\w+)\/([0-9]+)-(\w+)\.(\w+)/;
  const regexResult = objectKey.match(regex);
  const [str, bundleId, indexOfImage, userId, prefix] = regexResult;
  // R0424f09e0bd8f1fc7c7e99d260933373/0-Uceb4ceddcf7c2f2a508aa245469320e9.jepg
  console.log('objectKey', objectKey);
  const lambda = new aws.Lambda();
  const payload = {
    bundleId,
    nextIndex: Number(indexOfImage) + 1,
  };
  const opts = {
    FunctionName: 'liff-test-dev-sendNext',
    Payload: JSON.stringify(payload),
  };
  lambda.invoke(opts, (err, data) => {
    if (err) {
      console.log(`error : ${err}`);
      callback(err, null);
    } else if (data) {
      const response = {
        statusCode: 200,
        // body: JSON.parse(data.Payload)
        body: '{"msg": "success"}',
      };
      callback(null, response);
    }
  });
};

const questionType = nextIndex => ((nextIndex % 2 === 0) ? 'drawing' : 'guessing');

// yarn run sls invoke local --function sendNext -p sendNext-event.json
module.exports.sendNext = async (event, context, callback) => {
  const { bundleId, nextIndex } = event;
  const gameDocRef = firestore.latestGameDocRef(`${bundleId}-game`);
  const docSnapshot = await gameDocRef.get();
  if (docSnapshot.exists) {
    // 1. 次の順番のユーザーにメッセージを送る
    const data = await docSnapshot.data();
    // TODO: data.ordersの要素数がnextIndexより少ない場合は最後の回答とする
    const currentUserIndex = data.orders[nextIndex - 1];
    const nextUserIndex = data.orders[nextIndex];
    const currentUserId = data.usersIds[currentUserIndex];
    const nextUserId = data.usersIds[nextUserIndex];
    const nextUserDisplayName = Object.values(data.userId2DisplayName[nextUserIndex])[0];
    const currentUserDisplayName = Object.values(data.userId2DisplayName[currentUserIndex])[0];
    let publicMessage;
    const { s3 } = s3Lib;
    const suffix = (questionType(nextIndex - 1) === 'drawing') ? 'jpeg' : 'txt';
    const fileKey = `${bundleId}/${nextIndex - 1}-${currentUserId}.${suffix}`;
    const params = {
      Bucket: s3Lib.bucketName,
      Key: fileKey,
    };
    console.log('params', params);
    const s3Object = await s3.getObject(params);
    if (questionType(nextIndex) === 'drawing') {
      const theme = s3Object.Body.toString();
      lineLib.pushMessage(nextUserId, `${currentUserDisplayName}から回ってきたお題は${theme}です。\n以下のURLをクリックして60秒以内に絵を描いてください。\n${lineLib.buildLiffUrl(bundleId, nextUserId, nextIndex)}`);
      publicMessage = `${currentUserDisplayName}が回答しました。${nextUserDisplayName}はお題に沿って絵を描いてください。`;
    } else if (questionType(nextIndex) === 'guessing') {
      const imageUrl = `${s3Lib.s3BaseUrl}/${s3Lib.bucketName}/${fileKey}`;
      console.log('imageUrl', imageUrl);
      lineLib.pushMessage(nextUserId, `${currentUserDisplayName}が描いた絵はこちらです。何の絵に見えますか？`);
      // TODO: pushMessageを画像メッセージに対応
      lineLib.client.pushMessage(nextUserId, [
        {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        },
      ]);
      publicMessage = `${currentUserDisplayName}が絵を描き終わりました。${nextUserDisplayName}は絵を見て予想してください`;
    }
    console.log('publicMessage', publicMessage);
    // 2. 全体にメッセージを送る
    lineLib.pushMessage(bundleId, publicMessage);
    // 3. firestoreの情報をupdate
    await gameDocRef.update({
      currentIndex: nextIndex,
    });
    const userDocRef = firestore.usersDocRef(nextUserId);
    await userDocRef.set({
      bundleId,
    });
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
//                     "name": "drawing-telephone-game-linebot-images",
//                     "ownerIdentity": {
//                         "principalId": "A2K64DQMCGBP71"
//                     },
//                     "arn": "arn:aws:s3:::drawing-telephone-game-linebot-images"
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
