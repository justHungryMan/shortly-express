var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var session = require('express-session')

var redis        = require('redis');
var session      = require('express-session');
var redisStore   = require('connect-redis')(session);

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

// Redis session store
var redis        = require('redis');
var session      = require('express-session');
var redisStore   = require('connect-redis')(session);

var app = express();


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Session store
app.use(cookieParser("6B5AB77062FE3D565FBF7A253AD99BEC"));

var sessionSettings = {
  key: "C1D28AD5AEE9ECA839086C399A21C210",
  store: new redisStore(),
  secret: "2E0D558EBAE31E93BC4C92FCDDBE3F6F",
  cookie: {
    path: '/'
  },
  resave: false,
  saveUninitialized: false
};

app.use(session(sessionSettings));



// HOME
app.get('/', function(req, res) {
  if (!req.session.username) {
    res.render('login', {message: "You must be logged in to access this resource"});
  } else {
    res.redirect('/create');
  }
});

// SIGN UP
app.get('/signup', function(req, res) {
  if (req.session.username) {
    res.redirect('/create');
  } else {
    res.render('signup', {message: ""});
  }
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if (username.match(/^[a-zA-Z0-9]{1,32}$/)) {
    new User({username: username}).fetch().then(function(found) {
      if (found) {
        res.render('signup', {message: "Username already exists"});
      } else {
        Users.create({
          username: username,
          password: password,
        })
        .then(function(newLink) {
          req.session["username"] = username;
          res.redirect("/create");
        });
      }
    })
  } else {
    res.render('signup', {message: "Only 32 alphanumeric characters max please"});
  }

  /*
  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
  */
});

// CREATE SHORT.LY
app.get('/create', function(req, res) {
  if (!req.session.username) {
    res.render('login', {message: "You must be logged in to access this resource"});
    console.log(req.session);
  } else {
    res.render('index');
  }
});

// LOGIN //
app.post('/login', function(req, res) {
  console.log(req.body);
});

app.get('/login', function(req, res) {
  if (!req.session.username) {
    res.render('login', {message: ""});
  } else {
    res.redirect('/create');
  }
});

// LOGOUT //
app.get('/logout', function(req, res) {
  if (req.session.username) {
    delete req.session["username"];
    res.render('login', {message: "You've been logged out"});
  } else {
    res.redirect('/login');
  }
});


// LINKS //
app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
