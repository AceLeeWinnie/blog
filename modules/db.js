var setting = require('../setting.js');
var MongoClient = require('mongodb').MongoClient;

var connectionInstance;
module.exports = function (cb) {
  MongoClient.connect(setting.url, function(err, db) {
    console.log('mongo db connect');
    if (err) throw new Error(err);
    connectionInstance = db;
    cb(db);
  });
}

