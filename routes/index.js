var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var passport = require('passport');
var jwt = require('express-jwt');

var auth = jwt({secret: 'SECRET', userProperty: 'payload'});

var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


/* Posts Routes */
router.get('/posts', function(req, res, next) {
  Post.find(function(err, posts){
    if(err){ return next(err); }
    res.json(posts);
  });
});

router.post('/posts', auth, function(req, res, next) {
  var post = new Post(req.body);
  post.author = req.payload.username;
  post.save(function(err, post){
    if(err){ return next(err); }

    res.json(post);
  });
});

router.param('post', function(req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function (err, post){
    if (err) { 
      console.log("mpike"); 
      return next(err); 
    }
    if (!post) { return next(new Error('can\'t find post')); }

    req.post = post;
    return next();
  });
});

router.get('/posts/:post', function(req, res, next) {
  req.post.populate('comments', function(err, post) {
    if (err) { return next(err); }

    res.json(post);
  });
});


router.put('/posts/:post/upvote', auth, function(req, res, next) {
  req.post.upvote(function(err, post){
    if (err) { return next(err); }
    res.json(post);
  });
});

/* Comments Routes */
router.post('/posts/:post/comments', auth, function(req, res, next) {
  var comment = new Comment(req.body);
  comment.post = req.post;
  comment.author = req.payload.username;

  comment.save(function(err, comment){
    if(err){ return next(err); }

    req.post.comments.push(comment);
    req.post.save(function(err, post) {
      if(err){ return next(err); }
      console.log(comment);
      res.json(comment);
    });
  });
});

router.param('comment', function(req, res, next, id) {
  var query = Comment.findById(id);

  query.exec(function (err, comment){
    if (err) { return next(err); }
    if (!comment) { return next(new Error('can\'t find comment')); }

    req.comment = comment;
    return next();
  });
});

router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
  req.comment.upvote(function(err, comment){
    if (err) { return next(err); }
    res.json(comment);
  });
});

/* User Routes */
router.post('/register', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  var user = new User();

  user.username = req.body.username;

  user.setPassword(req.body.password)

  user.save(function (err){
    if(err){ return next(err); }

    return res.json({token: user.generateJWT()})
  });
});

router.post('/login', function(req, res, next){
  console.log(req.body)
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  passport.authenticate('local', function(err, user, info){
    if(err){ return next(err); }

    if(user){
      return res.json({token: user.generateJWT()});
    } else {
      console.log(info) 
      return res.status(401).json(info);
    }
  })(req, res, next);
});


router.get('/users',function(req, res, next){
  console.log(req.payload)
  User.find(function(err, users){
    if(err){ return next(err); }
    res.json(users);
  });
});
 
/* Facebook Routes */
router.get('/auth/facebook', 
  passport.authenticate('facebook', { scope : ['email'], return_scopes: true }));


// handle the callback after facebook has authenticated the user
router.get('/auth/facebook/callback', function(req, res, next){
    passport.authenticate('facebook', {
        session: false,
        failureRedirect : '/'
    },function(err, user,info){
      res.json({token: user.generateJWT()});
    })(req, res, next);
  }
);

// route for logging out
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.post('/loginGeneral', function(req, res, next){
  res.redirect("auth/facebook")
});


module.exports = router;