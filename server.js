const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');


app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/js",  express.static(__dirname + '/html/js'));
app.use("/css",  express.static(__dirname + '/html/css'));

app.get('/', function(req, res) {
	res.send("Hello World");
});

app.listen(3000, function(){
	console.log('App listening on port 3000');
});

app.get('/login', function(req, res) {
	console.log(req.cookies);
	var cookie = req.cookies.sessionid;
	if (cookie){
		res.send("You got session running, redirection to main page should happen");
	} else {
		res.sendFile(__dirname + '/html/login.html');
	}
});

app.post('/login', function(req, res) {
	//TODO compare it with MongoDB, if found redirect to main page
	//if not found send error
	var responseMessage = 'You attempted to log but functionality doesnt work yet. ';
	var cookie = req.cookies.sessionid;
	if (cookie === undefined){
		var randomNumber=Math.random().toString();
		randomNumber=randomNumber.substring(2,randomNumber.length);
		res.cookie('sessionid',randomNumber, { maxAge: 900000, httpOnly: true });
		responseMessage += "Cookie created successfully.";
	} 
	res.send(responseMessage);

});

app.post('/register', function(req, res){
	var responseMessage;
	if (req.body.email && req.body.password){
		res.json({ok:true});
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

