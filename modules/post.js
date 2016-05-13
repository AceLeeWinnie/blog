var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, avator, title, post, tags) {
    this.name = name;
    this.avator = avator;
    this.title = title;
    this.post = post;
    this.tags = tags;
}

Post.prototype.save = function(cb) {
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth()+1;
  month = month < 10 ? '0'+month : month;
  var day = date.getDate();
  day = day < 10 ? '0'+day : day;
  var hours = date.getHours() < 10 ? '0'+date.getHours() : date.getHours();
  var minute = date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes()
  var time = {
    date: date,
    year: year,
    month: year +'-'+ month,
    day: year +'-'+ month +'-'+ day,
    minute: year +'-'+ month +'-'+ day +' '+ hours +':'+minute
  }

  var post = {
    name: this.name,
    avator: this.avator,
    time: time,
    title: this.title,
    post: this.post,
    tags: this.tags,
    comments: [],
    reprint_info: {},
    pv: 0
  }

  mongodb(function (db) {
    db.collection('posts').insert(post, function (err, res) {
      db.close();
      return err ? cb(err) : cb(null);
    })
  })
};

Post.getAll = function (name, cb) {
  var query = {};
  if (name) {
    query.name = name;
  }
  mongodb(function (db) {
    db.collection('posts')
      .find(query)
      .sort({time: -1})
      .toArray(function (err, doc) {
        db.close();
        if (err) {return cb(err)}
        doc.forEach(function (d) {
          d.post = markdown.toHTML(d.post);
        })
        return cb(null, doc);
      })
  })

}

Post.getTen = function (name, page, cb) {
  var query = {};
  if (name) {
    query.name = name;
  }
  mongodb(function (db) {
    db.collection('posts').count(query, function (err, total) {
      db.collection('posts')
        .find(query)
        .skip((page-1)*10)
        .limit(10)
        .sort({time: -1})
        .toArray(function (err, doc) {
          db.close();
          if (err) {return cb(err)}
          doc.forEach(function (d) {
            d.post = markdown.toHTML(d.post);
            d.comments && d.comments.forEach(function(com) {
              com.content = markdown.toHTML(com.content);
            })
          })
          return cb(null, doc, total);
        })
    })
  })

}

Post.getOne = function (name, day, title, cb) {
  var query = {
    "name": name,
    "time.day": day,
    "title": title
  }
  mongodb(function (db) {
    var collection = db.collection('posts')
    collection.findOne(query, function (err, doc) {
      if (err) {
        db.close();
        return cb(err)
      }
      if (doc) {
        collection.update(query, {
          $inc: {
            'pv': 1
          }
        }, function (err) {
          db.close();
          if (err) {
            return cb(err)
          }
          doc.post = markdown.toHTML(doc.post);
          doc.comments && doc.comments.forEach(function(com) {
            com.content = markdown.toHTML(com.content);
          });
          return cb(null, doc);
        })
      }
    })
  })

}

Post.edit = function (name, day, title, cb) {
  mongodb(function (db) {
    db.collection('posts')
      .findOne({
        "name": name,
        "time.day": day,
        "title": title
      }, function (err, doc) {
        db.close();
        if (err) {return cb(err)}
        cb(null, doc);
      })
  })
}

Post.update = function (name, day, title, post, cb) {
  mongodb(function (db) {
    db.collection('posts')
      .update({
        'name': name,
        'time.day': day,
        'title': title,
      }, {
        $set: {post: post}
      }, function (err) {
        db.close();
        if (err) {return cb(err)}
        cb(null)
      });
  })
}

Post.remove = function (name, day, title, cb) {
  mongodb(function (db) {
    var collection = db.collection('posts');
    collection.findOne({
      'name': name,
      'time.day': day,
      'title': title,
    }, function (err, doc) {
      if (err || !doc) {
        db.close();
        return cb(err);
      }
      collection
        .remove({
          'name': name,
          'time.day': day,
          'title': title,
        }, {
          w: 1
        }, function (err) {
          if (err) {
            db.close();
            return cb(err)
          }
          var reprint_from = '';
          if (doc.reprint_info.reprint_from) {
            reprint_from = doc.reprint_info.reprint_from;
          }
          if (reprint_from !== '') {
            collection.update({
              'name': reprint_from.name,
              'time.day': reprint_from.day,
              'title': reprint_from.title
            }, {
              $pull: {
                'reprint_info.reprint_to': {
                  'name': name,
                  'day': day,
                  'title': title
                }
              }
            }, function (err) {
              db.close();
              if (err) {
                return cb(err);
              }
              cb(null);
            });
          } else {
            db.close();
            cb(null);
          }
        });
    })
  })
}

Post.getArchive = function (cb) {
  mongodb(function (db) {
    db.collection('posts')
      .find({},{
        'name': 1,
        'time': 1,
        'title': 1,
      })
      .sort({
        time: -1
      })
      .toArray(function (err, docs) {
        db.close();
        if (err) {return cb(err)}
        cb(null, docs);
      });
  })
}

Post.getTags = function (cb) {
  mongodb(function (db) {
    db.collection('posts')
      .distinct('tags', function (err, docs) {
        db.close();
        if (err) {return cb(err)}
        cb(null, docs.filter(function (d) {
          return d!=='';
        }));
      });
  })
}

Post.getTag = function (tag, cb) {
  mongodb(function (db) {
    db.collection('posts')
      .find({
        'tags': tag
      }, {
        'name': 1,
        'time': 1,
        'title': 1
      })
      .sort({
        time: -1
      })
      .toArray(function (err, docs) {
        db.close();
        if (err) {return cb(err)}
        cb(null, docs);
      })
  })
}

Post.search = function (keyword, cb) {
  var pattern = new RegExp('^.*'+keyword+'.*$', 'i');
  mongodb(function (db) {
    db.collection('posts')
      .find({
        title: pattern
      }, {
        'name': 1,
        'time': 1,
        'title': 1
      })
      .sort({
        time: -1
      })
      .toArray(function (err, docs) {
        db.close();
        if (err) {
          return cb(err)
        }
        cb(null, docs);
      })
  })
}

Post.reprint = function (reprint_from, reprint_to, cb) {
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth()+1;
  month = month < 10 ? '0'+month : month;
  var day = date.getDate();
  day = day < 10 ? '0'+day : day;
  var hours = date.getHours() < 10 ? '0'+date.getHours() : date.getHours();
  var minute = date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes()
  var time = {
    date: date,
    year: year,
    month: year +'-'+ month,
    day: year +'-'+ month +'-'+ day,
    minute: year +'-'+ month +'-'+ day +' '+ hours +':'+minute
  }
  mongodb(function(db) {
    var collection = db.collection('posts');
    var query = {
      'name': reprint_from.name,
      'time.day': reprint_from.day,
      'title': reprint_from.title
    }
    collection.findOne(query, function (err, doc) {
      if (err) {
        db.close();
        return cb(err);
      }
      delete doc._id;

      doc.name = reprint_to.name;
      doc.avator = reprint_to.avator;
      doc.time = time;
      doc.title = (doc.title.search(/[转载]/)>-1)?doc.title:'[转载]'+doc.title;
      doc.comments = [];
      doc.reprint_info = {'reprint_from': reprint_from};
      doc.pv = 0;
      db.collection('posts').update(query, {
        $push: {
          'reprint_info.reprint_to': {
            'name': doc.name,
            'day': time.day,
            'title': doc.title
          }}
      }, function(err) {
        if (err) {
          db.close();
          return cb(err);
        }
        collection.insert(doc, function(err, res){
          db.close();
          // console.log('reprint post', res);
          return err?cb(err):cb(null, res.ops[0]);
        })
      })
    })
  })
}
module.exports = Post;
