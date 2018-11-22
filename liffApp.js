const createError = require('http-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
// const cookieParser = require('cookie-parser');
// const logger = require('morgan');
// const sassMiddleware = require('node-sass-middleware');

const indexRouter = require('./routes/liff');
// const saveImageRouter = require('./routes/lineWebhook');

const app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));

// app.use(logger('dev'));
// app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ limit: '8mb', extended: true }));
app.use(bodyParser.json({
  limit: '8mb',
}));
app.use(bodyParser.text({
  limit: '8mb',
}));
app.use(bodyParser.raw({
  limit: '8mb',
}));
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log('err in liffApp', JSON.stringify(err));

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err,
  });
});

module.exports = app;
