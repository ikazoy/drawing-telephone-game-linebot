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

module.exports = {
  config,
  replyText,
  pushMessage,
  getMemberProfile,
};
