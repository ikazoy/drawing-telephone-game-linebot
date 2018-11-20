const aws = require('aws-sdk');

const invokeSendNext = async (bundleId, nextIndex) => {
  const Lambda = new aws.Lambda();
  const payload = {
    bundleId,
    nextIndex,
  };
  const opts = {
    FunctionName: `liff-test-${process.env.NODE_ENV}-sendNext`,
    Payload: JSON.stringify(payload),
  };
  let res;
  try {
    console.log(opts);
    res = await Lambda.invoke(opts).promise();
    console.log('res on invokeSendNext', res);
  } catch (err) {
    console.log(`error on invokeSendNext:${err}`);
    return {
      err,
    };
  }
  return res;
};

module.exports = {
  invokeSendNext,
};
