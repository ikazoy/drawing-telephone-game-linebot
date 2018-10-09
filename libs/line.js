const line = require('@line/bot-sdk');
// TODO: hide this
// eslint-disable-next-line
const accessToken = 'pa0zKktb+fZeGVzo3oYS7NfCn6H3973uf31ScxpNA9bdSS1/yaia1Fe9NKce+B9PMYs8rCOZaR8PUab6Y7wweF3HWmCkuP/LPCHxD7aUIq5z/+fIIyodhDbMGS/9aIKIr+pTv6UGbseDyti/kATTOwdB04t89/1O/w1cDnyilFU=';
const secret = '48ffdf7cb5eeb0f5bd8323b94f501780';
const config = {
  channelAccessToken: accessToken,
  channelSecret: secret,
};
const client = new line.Client(config);

function serialize(obj) {
  return `?${Object.keys(obj).reduce((a, k) => { a.push(`${k}=${encodeURIComponent(obj[k])}`); return a; }, []).join('&')}`;
}

const replyText = (token, texts) => {
  const ts = Array.isArray(texts) ? texts : [texts];
  return client.replyMessage(
    token,
    ts.map(text => ({ type: 'text', text })),
  );
};

const pushMessage = (to, texts) => {
  const ts = Array.isArray(texts) ? texts : [texts];
  return client.pushMessage(
    to,
    ts.map(text => ({ type: 'text', text })),
  );
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
  const liffUrl = 'line://app/1613121893-RlAO1NqA';
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
