const dynamodb = require('serverless-dynamodb-client');
const AWS = require('aws-sdk');
const dynamodbUpdateExpression = require('dynamodb-update-expression');

AWS.config.update({
  region: 'ap-northeast-1',
});

// const docClient = dynamodb.doc;
const docClient = new AWS.DynamoDB.DocumentClient();
const extractBundleId = source => source.groupId || source.roomId;

const latestGame = async (bundleId) => {
  const params = {
    TableName: process.env.GAMES_DYNAMODB_TABLE,
    Key: {
      BundleId: bundleId,
    },
  };
  try {
    const result = await docClient.get(params).promise();
    if (result.Item) {
      console.log('item', result.Item);
      return result.Item;
    }
  } catch (err) {
    console.error(err);
  }
  return null;
};

const latestBundleIdOfUser = async (userId) => {
  const params = {
    TableName: process.env.USERS_DYNAMODB_TABLE,
    Key: {
      UserId: userId,
    },
    AttributesToGet: [
      'BundleId',
    ],
    ConsistentRead: false,
    ReturnConsumedCapacity: 'NONE',
  };
  try {
    const result = await docClient.get(params).promise();
    if (result.Item) {
      return result.Item.BundleId;
    }
  } catch (err) {
    console.error(err);
  }
  return null;
};

const addUserToGame = async (bundleId, userId, displayName) => {
  if (await latestGame(bundleId) == null) {
    const now = new Date();
    const createParams = {
      TableName: process.env.GAMES_DYNAMODB_TABLE,
      Key: {
        BundleId: bundleId,
      },
      UpdateExpression: 'set #createdAt = :now',
      ExpressionAttributeNames: {
        '#createdAt': 'CreatedAt',
      },
      ExpressionAttributeValues: {
        ':now': now.toISOString(),
      },
    };
    let res;
    try {
      res = await docClient.update(createParams).promise();
    } catch (err) {
      console.log('ERROR', err);
    }
  }
  const addUserParams = {
    TableName: process.env.GAMES_DYNAMODB_TABLE,
    Key: {
      BundleId: bundleId,
    },
    ReturnValues: 'ALL_NEW',
    UpdateExpression: 'set #usersIds = list_append(if_not_exists(#usersIds, :emptyList), :userIdList), #uid2dpn = list_append(if_not_exists(#uid2dpn, :emptyList), :uid2dpn)',
    ConditionExpression: 'NOT contains(#usersIds, :userId)',
    ExpressionAttributeNames: {
      '#usersIds': 'UsersIds',
      '#uid2dpn': 'UserId2DisplayNames',
    },
    ExpressionAttributeValues: {
      ':emptyList': [],
      ':userIdList': [userId],
      ':userId': userId,
      ':uid2dpn': [{
        [userId]: displayName,
      }],
    },
  };
  let res;
  try {
    res = await docClient.update(addUserParams).promise();
  } catch (err) {
    if (err.code && err.code === 'ConditionalCheckFailedException') {
      console.debug(`addUserToGame is skipped because the user ${userId} is already added to game in ${bundleId}. `);
    } else {
      console.log('ERROR', err);
    }
    res = false;
  }
  return res;
};

const putLatestBundleId = async (userId, bundleId) => {
  const params = {
    TableName: process.env.USERS_DYNAMODB_TABLE,
    Item: {
      UserId: userId,
      BundleId: bundleId,
    },
  };
  return docClient.put(params).promise();
};

const updateGame = async (bundleId, updateValues) => {
  // https://stackoverflow.com/questions/43791700/whats-the-simplest-way-to-copy-an-item-from-a-dynamodb-stream-to-another-table
  // https://www.npmjs.com/package/dynamodb-data-types
  const updateExpression = dynamodbUpdateExpression.getUpdateExpression({}, updateValues);
  const params = Object.assign({
    TableName: process.env.GAMES_DYNAMODB_TABLE,
    Key: {
      BundleId: bundleId,
    },
  }, updateExpression);
  let res;
  try {
    res = await docClient.update(params).promise();
  } catch (err) {
    console.log('ERROR', err);
  }
  return res;
};

// move a record from "games" to "old-games" table
const stashEndedGame = async (bundleId) => {
  const lg = await latestGame(bundleId);
  const delteParams = {
    TableName: process.env.GAMES_DYNAMODB_TABLE,
    Key: {
      BundleId: bundleId,
    },
  };
  docClient.delete(delteParams, async (err, data) => {
    if (err == null) {
      const putParams = {
        TableName: process.env.OLD_GAMES_DYNAMODB_TABLE,
        Item: lg,
      };
      try {
        await docClient.put(putParams).promise();
      } catch (e) {
        console.log('ERROR', e);
      }
    } else {
      console.log('ERROR', err);
    }
  });
};

module.exports = {
  extractBundleId,
  putLatestBundleId,
  latestBundleIdOfUser,
  latestGame,
  addUserToGame,
  stashEndedGame,
  updateGame,
};
