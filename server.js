const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/cross');
var db = mongoose.connection;
var User = require('./dbschemas/user.js');

db.on('error', console.error.bind(console, 'MongoDB connection error!'));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/js",  express.static(__dirname + '/html/js'));
app.use("/css",  express.static(__dirname + '/html/css'));

app.get('/', function(req, res) {
	var sessionid = req.cookies.sessionid;
	if (sessionid){
		User.findOne({'sessionid' : sessionid}, function(err, result){
			if (result){
				res.send("Witaj, jestes zalogowany, twoja sesja trwa");	
			}
			else {
				res.redirect('/login');
			}
		});
	} else {
		res.redirect('/login');
	}
});

app.listen(3000, function(){
	console.log('App listening on port 3000');
});


app.get('/login', function(req, res) {
	var cookie = null;//req.cookies.sessionid;
	if (cookie){
		res.send("You got session running, redirection to main page should happen");
	} else {
		res.sendFile(__dirname + '/html/login.html');
	}
});

app.post('/login', function(req, res) {
	//TODO compare it with MongoDB, if found redirect to main page
	//if not found send error
	User.findOne({'username' : req.body.email, 'password' : req.body.password}, function(err, result){
		if (result){
			var cookie = req.cookies.sessionid;
			var randomNumber=Math.random().toString();
			randomNumber=randomNumber.substring(2,randomNumber.length);
			result.sessionid = randomNumber;
			result.save();
			res.cookie('sessionid',randomNumber, { maxAge: 900000, httpOnly: true });
			res.json({ok:true})
		} else {
			res.send('Błędny nick i hasło!');
		}
	})
});

app.post('/register', function(req, res){
	var responseMessage;
	if (req.body.email && req.body.password){
		User.findOne({'username' : req.body.email}, function(err, result){
			if (result){
				console.log('User exists!');
				res.send('Uzytkownik o takim nicku już istnieje!');
			} else {
				new User({username : req.body.email, password : req.body.password}).save(function (err, thisUser){
					if (err) {
						console.error(err);
						res.json('Blad zapisu w bazie, spróbuj ponownie');
					} else {
						res.json({ok:true});
					}
				})
			}
		})
		
	}
	else {
		res.send("Coś poszło nie tak, spróbuj ponownie.");
	}
});

app.all('/logout', function(req, res) {
	if (req.cookies.sessionid){
		res.clearCookie('sessionid');
	} else {
		res.send('Brak sesji do wygaszenia');
	}
});

