const dynExp = require('@aws/dynamodb-expressions');

const AWS = require('aws-sdk');
const dynamodbUpdateExpression = require('dynamodb-update-expression');
const util = require('./util');

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
    console.error('error on latestGame', err);
    console.error('params', params);
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

function buildGameId(isoString) {
  return isoString.replace(/-/g, '');
}

const addUserToGame = async (bundleId, userId, displayName) => {
  const lg = await latestGame(bundleId);
  if (lg == null) {
    const now = new Date();
    const createdAt = now.toISOString();
    const createParams = {
      TableName: process.env.GAMES_DYNAMODB_TABLE,
      Key: {
        BundleId: bundleId,
      },
      UpdateExpression: 'set #createdAt = :now, #gameId = :gameId',
      ExpressionAttributeNames: {
        '#createdAt': 'CreatedAt',
        '#gameId': 'GameId',
      },
      ExpressionAttributeValues: {
        ':now': createdAt,
        ':gameId': buildGameId(createdAt),
      },
    };
    try {
      await docClient.update(createParams).promise();
    } catch (err) {
      console.log('ERROR on Dynamodb update in create phase of addUserToGame', err);
      console.log('createParams', createParams);
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
      console.log('ERROR on Dynamodb update in add phase of addUserToGame', err);
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
  console.log('updateGame start', updateValues);
  let updateExpression;
  // const original = {};
  // const modified = updateValues;
  const expr = new dynExp.UpdateExpression();
  const attributes = new dynExp.ExpressionAttributes();

  // eslint-disable-next-line
  for (const [key, value] of Object.entries(updateValues)) {
    console.log(`${key} ${value}`);
    expr.set(key, value);
  }
  console.log('updateExpression', updateExpression);
  const params = {
    TableName: process.env.GAMES_DYNAMODB_TABLE,
    Key: {
      BundleId: bundleId,
    },
    UpdateExpression: expr.serialize(attributes),
    ExpressionAttributeNames: attributes.names,
    ExpressionAttributeValues: attributes.values,
  };
  let res;
  console.log('updateGame', params);
  try {
    res = await docClient.update(params).promise();
    console.log('updateGame res', res);
  } catch (err) {
    console.log('ERROR', err);
  }
  return res;
};

// move a record from "games" to "old-games" table
const stashEndedGame = async (bundleId) => {
  const lg = await latestGame(bundleId);
  if (lg == null) {
    return;
  }
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
        console.log('ERROR on Dynamodb put in stashEndedGame', e);
        console.log('putParams', putParams);
      }
    } else {
      console.log('ERROR on Dynamodb delte in stashEndedGame', err);
      console.log('deleteParams', delteParams);
    }
  });
};

const skipCurrentUser = async (bundleId) => {
  const lg = await latestGame(bundleId);
  // currentIndex means who is in turn currently in 'Orders' array
  const currentIndex = lg.CurrentIndex;
  // Orders array contains indecies of 'UsersIds' indecies according to actual 'order'
  // e.g. UsersIds: ['bob', 'alice', 'john'] / Orders: [1, 2, 0]
  // -> Order of users to answer is 'alice', 'john', 'bob'
  const currentUserIndex = lg.Orders[currentIndex];
  // remove the skipped item from these 3 arrays
  lg.Orders.splice(currentIndex, 1);
  const newOrders = lg.Orders.map(o => ((o > currentUserIndex) ? o - 1 : 0));
  // NOTE: splice returns 'array' consists of deleted items
  const deletedUserId = lg.UsersIds.splice(currentUserIndex, 1);
  const deletedUser = lg.UserId2DisplayNames.splice(currentUserIndex, 1);
  const updateValues = {
    Orders: newOrders,
    UsersIds: lg.UsersIds,
    UserId2DisplayNames: lg.UserId2DisplayNames,
  };
  // TODO: replace this with 'aws-labs' module as updateGame method
  const updateExpression = dynamodbUpdateExpression.getUpdateExpression({}, updateValues);
  const params = Object.assign({
    TableName: process.env.GAMES_DYNAMODB_TABLE,
    Key: {
      BundleId: bundleId,
    },
  }, updateExpression);
  try {
    await docClient.update(params).promise();
  } catch (err) {
    console.log('ERROR', err);
    return false;
  }
  return {
    userId: Object.keys(deletedUser[0])[0],
    displayName: Object.values(deletedUser[0])[0],
  };
};

const swapTheme = async (game) => {
  const prevTheme = game.Theme;
  const prevTimes = Number(game.ThemeUpdatedTimes) || 0;
  let newTheme;
  while (newTheme === undefined || prevTheme === newTheme) {
    newTheme = util.pickTheme();
  }
  const updateValues = {
    Theme: newTheme,
    ThemeUpdatedTimes: prevTimes + 1,
  };
  // TODO: replace this with 'aws-labs' module as updateGame method
  const updateExpression = dynamodbUpdateExpression.getUpdateExpression({}, updateValues);
  const params = Object.assign({
    TableName: process.env.GAMES_DYNAMODB_TABLE,
    Key: {
      BundleId: game.BundleId,
    },
  }, updateExpression);
  try {
    await docClient.update(params).promise();
  } catch (err) {
    console.log('ERROR', err);
    return false;
  }
  return Object.assign(game, updateValues);
};

// TODO: 実装
const isGameMaster = async (bundleId, userId) => true;

module.exports = {
  extractBundleId,
  putLatestBundleId,
  latestBundleIdOfUser,
  latestGame,
  addUserToGame,
  stashEndedGame,
  updateGame,
  skipCurrentUser,
  swapTheme,
  isGameMaster,
};
