const line = require('@line/bot-sdk');
// TODO: hide this
// eslint-disable-next-line
const accessToken = process.env.LINE_ACCESS_TOKEN;
const secret = process.env.LINE_SECRET;
const config = {
  channelAccessToken: accessToken,
  channelSecret: secret,
};
const client = new line.Client(config);

function serialize(obj) {
  return `?${Object.keys(obj).reduce((a, k) => { a.push(`${k}=${encodeURIComponent(obj[k])}`); return a; }, []).join('&')}`;
}

const construcMessage = (message) => {
  let constructedMessage;
  if (typeof message === 'object') {
    if (message.type === 'image') {
      constructedMessage = {
        type: message.type,
        originalContentUrl: message.originalContentUrl,
        previewImageUrl: message.previewImageUrl,
      };
    }
  } else if (typeof message === 'string' || typeof message === 'number') {
    constructedMessage = {
      type: 'text',
      text: message,
    };
  }
  return constructedMessage;
};

const replyText = (token, messages) => {
  const ms = Array.isArray(messages) ? messages : [messages];
  let res;
  try {
    res = client.replyMessage(
      token,
      ms.map(element => construcMessage(element)),
    );
  } catch (err) {
    console.log(err);
  }
  return res;
};

const pushMessage = (to, messages) => {
  const ms = Array.isArray(messages) ? messages : [messages];
  let res;
  try {
    res = client.pushMessage(
      to,
      ms.map(element => construcMessage(element)),
    );
  } catch (err) {
    console.log(err);
  }
  return res;
};

const getMemberProfile = async (memberId, bundleId, type) => {
  let profile;
  if (type === 'group') {
    profile = await client.getGroupMemberProfile(bundleId, memberId);
  } if (type === 'room') {
    profile = await client.getRoomMemberProfile(bundleId, memberId);
  }
  return profile;
};
const buildLiffUrl = (bundleId, userId, currentIndex) => {
  const liffUrl = process.env.LIFF_URL;
  const params = {};
  if (bundleId != null) {
    params.bundleId = bundleId;
  }
  if (userId != null) {
    params.userId = userId;
  }
  if (currentIndex != null) {
    params.currentIndex = currentIndex;
  }
  return `${liffUrl}${serialize(params)}`;
};


module.exports = {
  config,
  client,
  replyText,
  pushMessage,
  getMemberProfile,
  buildLiffUrl,
};
