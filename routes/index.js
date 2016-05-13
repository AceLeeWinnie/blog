var crypto = require('crypto');
var util = require('util');
var fs = require('fs');
var multiparty = require('multiparty');
var User = require('../modules/user.js');
var Post = require('../modules/post.js');
var Comment = require('../modules/comment.js')

var checkLogin = function (req, res, next) {
  if (!req.session.user) {
    req.flash('error', '未登录');
    res.redirect('/login');
  }
  next();
}

var checkNotLogin = function (req, res, next) {
  if (req.session.user) {
    req.flash('error', '已登录');
    res.redirect('back');
  }
  next();
}

module.exports = function (app) {
  app.get('/', function(req, res, next) {
    var page = req.query.p?parseInt(req.query.p):1;
    Post.getTen(null, page, function (err, posts, total) {
      if (err) {
        posts = [];
      }
      res.render('index', {
        title: '主页',
        user: req.session.user,
        page: page,
        isFirstPage: (page-1)===0,
        isLastPage: ((page-1)*10+posts.length)===total,
        posts: posts,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    })
  });

  app.get('/reg', checkNotLogin);
  app.get('/reg', function(req, res, next) {
    res.render('reg', {
      title: '用户注册',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/reg', checkNotLogin);
  app.post('/reg', function(req, res, next) {
    var name = req.body.name;
    var password = req.body.password;
    var password_repeat = req.body.password_repeat;
    var email = req.body.email;
    if (password !== password_repeat) {
      req.flash('error', '两次密码输入不一致');
      return res.redirect('/reg');
    }
    var md5 = crypto.createHash('md5');
    password = md5.update(password).digest('hex');
    var newUser = new User({
      name: name,
      password: password,
      email: email
    })
    User.get(newUser.name, function (err, user) {
      if (user) {
        req.flash('error', '用户已经存在');
        return res.redirect('/reg');
      }
      newUser.save(function (err, user) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/reg');
        }
        req.session.user = user;
        req.flash('success', '注册成功');
        return res.redirect('/');
      })
    })
  });

  app.get('/login', checkNotLogin);
  app.get('/login', function(req, res, next) {
    res.render('login', {
      title: '登录',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/login', checkNotLogin);
  app.post('/login', function(req, res, next) {
    var md5 = crypto.createHash('md5');
    var password = md5.update(req.body.password).digest('hex');
    User.get(req.body.name, function (err, user) {
      if (!user) {
        req.flash('error', '用户不存在');
        return res.redirect('/login');
      }
      if (user.password !== password) {
        req.flash('error', '密码错误');
        return res.redirect('/login');
      }
      req.session.user = user;
      req.flash('success', '登录成功');
      res.redirect('/');
    })
  });

  app.get('/post', checkLogin);
  app.get('/post', function(req, res, next) {
    res.render('post', {
      title: '发表文章',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    })
  });

  app.post('/post', checkLogin);
  app.post('/post', function(req, res, next) {
    var user = req.session.user;
    var title = req.body.title.trim();
    // console.log('post name', user);
    var tags = [req.body.tag1, req.body.tag2, req.body.tag3];
    var post = new Post(user.name, user.avator, title, req.body.content, tags);
    post.save(function (err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      req.flash('success', '发布成功');
      res.redirect('/');
    })
  });

  app.get('/logout', checkLogin);
  app.get('/logout', function(req, res, next) {
    req.session.user = null;
    req.flash('success', '退出成功');
    res.redirect('/');
  });

  app.get('/upload', checkLogin);
  app.get('/upload', function (req, res) {
    res.render('upload', {
      title: '上传文件',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    })
  })

  app.post('/upload', checkLogin);
  app.post('/upload', function (req, res, next) {
    var form = new multiparty.Form();

    form.parse(req, function(err, fields, files) {
      for(var key in files) {
        var file = files[key]
        file.forEach(function (ele, index) {
          if (ele.size === 0) {
            fs.unlinkSync(ele.path);
          } else {
            var target_path = './public/images/'+ele.originalFilename;
            fs.renameSync(ele.path, target_path);
          }
        })
      }
      req.flash('success', '文件上传成功');
      return res.redirect('/upload');
    });
  });

  app.get('/u/:name', function (req, res) {
    var page = req.query.p?parseInt(req.query.p):1;
    User.get(req.params.name, function (err, user) {
      if (!user) {
        req.flash('error', '用户不存在');
        return res.redirect('/');
      }
      Post.getTen(user.name, page, function (err, posts, total) {
        if (err) {
          req.flash('error', err)
          return res.redirect('/')
        }
        res.render('user', {
          title: user.name,
          posts: posts,
          user: req.session.user,
          page: page,
          isFirstPage: (page-1)===0,
          isLastPage: ((page-1)*10+posts.length)===total,
          success: req.flash('success').toString(),
          error: req.flash('error').toString()
        })
      })
    })
  })

  app.get('/u/:name/:day/:title', function (req, res) {

    var name = req.params.name;
    var day = req.params.day;
    var title = req.params.title;
    var user = req.session.user;
    Post.getOne(name, day, title, function (err, post) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/')
      }
      // var flag = 1;
      // if (post.reprint_info) {
      //   if (user && user.name!==post.name) {
      //     if ((post.reprint_info.reprint_from !== undefined)&&(post.reprint_info.reprint_from.name !== undefined)) {
      //       flag = 0
      //     }
      //     if (post.reprint_info.reprint_to !== undefined) {
      //       post.reprint_info.reprint_to.forEach(function (reprint_to, index) {
      //         if (user.name===reprint_to.name) {
      //           flag = 0;
      //         }
      //       });
      //     }
      //   }
      // } else {
      //   flag = 0
      // }
      // console.log('flag', flag);
      res.render('article', {
        title: title,
        post: post,
        user: user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  })

  app.post('/u/:name/:day/:title', function (req, res) {
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth()+1;
    month = month < 10 ? '0'+month : month;
    var day = date.getDate();
    day = day < 10 ? '0'+day : day;
    var hours = date.getHours() < 10 ? '0'+date.getHours() : date.getHours();
    var minute = date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes()
    var time = year +'-'+ month +'-'+ day +' '+ hours +':'+minute;

    var md5 = crypto.createHash('md5');
    var email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex');
    var avator = 'https://secure.gravatar.com/avatar/'+email_MD5+'?s=36';
    // console.log('/u/:name/:day/:title', avator, req.body.email);
    var comment = {
      name: req.body.name,
      avator: avator,
      email: req.body.email,
      website: req.body.website,
      time: time,
      content: req.body.content
    };

    var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
    newComment.save(function (err) {
      if (err) {
        req.flash('error', err)
        return res.redirect('back');
      }
      req.flash('success', '留言成功');
      res.redirect('back');
    })
  })

  app.get('/edit/:name/:day/:title', checkLogin);
  app.get('/edit/:name/:day/:title', function (req, res) {
    var user = req.session.user;
    Post.edit(user.name, req.params.day, req.params.title, function (err, post) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      // console.log('post', post);
      res.render('edit', {
        title: '编辑',
        post: post,
        user: user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  });

  app.post('/edit/:name/:day/:title', checkLogin);
  app.post('/edit/:name/:day/:title', function (req, res) {
    var user = req.session.user;
    var url = '/u/'+req.params.name+'/'+req.params.day+'/'+encodeURIComponent(req.params.title);
    // url = encodeURIComponent(url);
    console.log('url', url, req.params.title);
    Post.update(user.name, req.params.day, req.params.title, req.body.post, function (err) {
      if (err) {
        req.flash('error', err);
        return res.redirect(url);
      }
      console.log('url', url);
      req.flash('success', '修改成功');
      return res.redirect(url);
    })
  });

  app.get('/remove/:name/:day/:title', checkLogin);
  app.get('/remove/:name/:day/:title', function (req, res) {
    var user = req.session.user;
    Post.remove(user.name, req.params.day, req.params.title, function (err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      req.flash('success', '删除成功');
      res.redirect('/');
    })
  });

  app.get('/reprint/:name/:day/:title', checkLogin);
  app.get('/reprint/:name/:day/:title', function (req, res) {
    Post.edit(req.params.name, req.params.day, req.params.title, function (err, post) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      var user = req.session.user;
      var reprint_from = {
        name: post.name,
        day: post.time.day,
        title: post.title
      }
      var reprint_to = {
        name: user.name,
        avator: user.avator
      }
      Post.reprint(reprint_from, reprint_to, function (err, post) {
        if (err) {
          req.flash('error', err);
          return res.redirect('back');
        }
        req.flash('success', '转载成功');
        var url = '/u/'+post.name+'/'+post.time.day+'/'+encodeURIComponent(post.title);
        res.redirect(url);
      })
    });
  });

  app.get('/archive', function (req, res) {
    Post.getArchive(function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('archive', {
        title: '存档',
        posts: posts,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  });

  app.get('/tags', function (req, res) {
    Post.getTags(function (err, tags) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('tags', {
        title: '标签',
        tags: tags,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  });

  app.get('/tags/:tag', function (req, res) {
    var tag = req.params.tag;
    var user = req.session.user;
    Post.getTag(tag, function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('tag', {
        title: 'TAG:'+tag,
        posts: posts,
        user: user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  });

  app.get('/search', function (req, res) {
    var keyword = req.query.keyword;
    var user = req.session.user;
    Post.search(keyword, function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('search', {
        title: 'SEARCH:'+keyword,
        posts: posts,
        user: user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  });

  app.get('/links', function (req, res) {
    var user = req.session.user;
    res.render('links', {
      title: '友情链接',
      user: user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    })
  });

  app.use(function(req, res, next) {
    res.render('404');
  });

}
