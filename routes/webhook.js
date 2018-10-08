const express = require('express');
const line = require('@line/bot-sdk');
// eslint-disable-next-line
const accessToken = 'zalOO+LpQQWo8KN2h95blVhNLvSVGV125IkoDTf8csP0Voh+pEWVnuU8Lp7wlnDPS5Eh8fiJxIADJ7BqdWYJ9PgwlY7zrlgOBH0R/+ONuEgI8iOqX6xZAsDG+YdVA6UXSshdIAL4ARvgsNw7rcq1lQdB04t89/1O/w1cDnyilFU=';
const secret = 'ff5eef101f21d689cd30b26319d4c12f';
const config = {
  channelAccessToken: accessToken,
  channelSecret: secret,
};

const router = express.Router();

router.post('/webhook', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

module.exports = router;
