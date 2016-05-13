var express = require('express');
var path = require('path');
var session = require('express-session');
var fs = require('fs');
// 会话中间件
var MongoStore = require('connect-mongo')(session);
var settings = require('./setting.js');
// 页面通知
var flash = require('connect-flash');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var accessLog = fs.createWriteStream('access.log', {flag: 'a'});
var errorLog = fs.createWriteStream('error.log', {flag: 'a'});

var app = express();

// webpack server
// if(process.env.NODE_ENV === 'dev') {
//   require('./webpackdev.server')(app)
// }

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(flash());

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// 保存会话
app.use(session({
  secret: settings.cookieSecret,
  key: settings.db,
  resave: false,
  saveUninitialized: true,
  cookie: {maxAge: 1000 * 60 * 60 * 24 * 36},
  store: new MongoStore({
    url: settings.url
  })
}))
app.use(express.static(path.join(__dirname, 'public')));

app.use(logger('combined', {stream: accessLog}))
// webpack server
// app.get('/', function(req, res) {
//   res.sendFile(__dirname + '/index.html');
// })
routes(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
  // res.render('404');
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
module.exports = app;
