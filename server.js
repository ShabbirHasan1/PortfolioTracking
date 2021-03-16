// Import Dependencies
var http = require('http');
var express = require('express');
var morgan = require("morgan");
var cookieParser = require("cookie-parser");
var expressSession = require("express-session");
var redis = require('redis')
var request = require("request");
var passport = require('passport');
var passportSocketIo = require("passport.socketio");
var flash = require('connect-flash');
var bodyParser = require('body-parser')
require('./config/passport.js')(passport);
var axios = require('axios').default;
var events = require('events');
var em = new events.EventEmitter()
var RedisStore = require('connect-redis')(expressSession)
var redisClient = redis.createClient()
var sessionStore = new RedisStore({ client: redisClient })

// Initialize express app and set port
var port = process.env.PORT || 8080;
var app = express();
var server = http.Server(app);

//Set Express middleware
app.use(morgan('dev'));
app.use(cookieParser());
app.use(expressSession({
	store: sessionStore,
	secret: 'anystringoftext',
	saveUninitialized: true,
	resave: true}));
app.use(passport.initialize());
app.use(passport.session());// persistent login sessions
app.use(flash());// use connect-flash for flash messages stored in session
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json())
app.set('view engine', 'ejs');

//Set up socket.io
var io = require("socket.io")(server, {pingTimeout: 60000});
io.use(passportSocketIo.authorize({
	cookieParser: cookieParser,
	key: 'connect.sid',
	secret: 'anystringoftext',
	store: sessionStore,
	passport: passport}))

//Require routing logic and python server startup
var pythonServer = require('./app/startPythonServer.js')(em);
// pythonServer.startPythonServer()
pythonServer.startPythonServerMock()
var dataStreamer = require('./app/dataStreamer.js')(io, em)
dataStreamer.initStreamer()
require('./app/routes.js')(app, passport, em, dataStreamer);

//serve static files
app.use('/css', express.static(__dirname + '/views/css'));
app.use('/js', express.static(__dirname + '/views/js'))
app.use('/pageViews', express.static(__dirname + '/viwes/pageViews'))

//scheduled job for recalculating accounts eveyday at 12:00 am
var scheduler = require('./config/updateDataOnDateChange')(em)

//Start server
// em.on("Python Server Started", function(data){
// 	server.listen(port);
// 	console.log("Server running on port: " + port);
// 	process.on('uncaughtException', function(error){
// 		console.log(error)
// 		pythonServer.shutdownPythonServer()
// 		process.exit(1)
// 	})
// })

server.listen(port);
console.log("Server running on port: " + port);