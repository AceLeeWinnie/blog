var mongodb = require('./db');

function Comment(name, day, title, com) {
  this.name = name;
  this.day = day;
  this.title = title;
  this.com = com;
}

Comment.prototype.save = function(cb) {
  var self = this
  mongodb(function (db) {
    db.collection('posts')
      .update({
        'name': self.name,
        'time.day': self.day,
        'title': self.title
      },{ $push:
        {'comments': self.com}
      }, function (err) {
        db.close();
        if (err) {return cb(err)}
        cb(null)
      })
  })
};

module.exports = Comment
