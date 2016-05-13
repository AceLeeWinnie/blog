var mongodb = require('./db');
var crypto = require('crypto');

function User(user) {
    this.name = user.name,
    this.password = user.password,
    this.email = user.email
}



User.prototype.save = function(cb) {
  var md5 = crypto.createHash('md5');
  var email_MD5 = md5.update(this.email.toLowerCase()).digest('hex');
  var avator = 'https://secure.gravatar.com/avatar/'+email_MD5+'?s=36';
  console.log('user', avator);
  var user = {
    name: this.name,
    password: this.password,
    email: this.email,
    avator: avator
  }

  mongodb(function (db) {
    db.collection('users').insert(user, function (err, res) {
      db.close();
      return err?cb(err):cb(null, user);
    })
  })
};

User.get = function (name, cb) {
  mongodb(function (db) {
    db.collection('users').findOne({name: name}, function (err, user) {
        db.close();
        return err ? cb(err) : cb(null, user);
    });

  })
}

module.exports = User;
