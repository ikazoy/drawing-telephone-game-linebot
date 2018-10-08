const createError = require('http-errors');
const express = require('express');
const line = require('@line/bot-sdk');

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

async function handleText(message, replyToken, source) {
  const { text } = message;
  const liffUrl = 'line://app/1613121893-RlAO1NqA';
  if (/^url$/.test(text)) {
    return replyText(replyToken, liffUrl);
  }
  return replyText(replyToken, message.text);
}

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  switch (event.type) {
    case 'message': {
      const { message } = event;
      console.log(event.message.type);
      switch (event.message.type) {
        case 'text': {
          console.log('this is case text');
          return handleText(message, event.replyToken, event.source);
        }
        // case 'image': {
        //   return handleImage(message, event.replyToken);
        // }
        // case 'video': {
        //   return handleVideo(message, event.replyToken);
        // }
        // case 'audio': {
        //   return handleAudio(message, event.replyToken);
        // }
        // case 'location': {
        //   return handleLocation(message, event.replyToken);
        // }
        // case 'sticker': {
        //   return handleSticker(message, event.replyToken);
        // }
        default: {
          console.log('this is default');
          throw new Error(`Unknown message: ${JSON.stringify(message)}`);
        }
      }
    }
    default: {
      return Promise.resolve(null);
    }
  }
  // return replyText(event.replyToken, event.message.text);
}

// const cookieParser = require('cookie-parser');
// const logger = require('morgan');
// const sassMiddleware = require('node-sass-middleware');

// const indexRouter = require('./routes/webhook');
// const saveImageRouter = require('./routes/lineWebhook');

const app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');

// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(sassMiddleware({
//   src: path.join(__dirname, 'public'),
//   dest: path.join(__dirname, 'public'),
//   indentedSyntax: true, // true = .sass and false = .scss
//   sourceMap: true,
// }));
// app.use(express.static(path.join(__dirname, 'public')));

app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const result = await req.body.events.map(handleEvent);
    res.json(result);
  } catch (err) {
    console.log(err);
  }
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
// app.use((err, req, res, next) => {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

module.exports = app;
