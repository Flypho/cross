const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/cross');
var db = mongoose.connection;
var User = require('./dbschemas/user.js');
var Crossword = require('./dbschemas/crossword.js');
var fs = require('fs');

app.set('view engine', 'html');

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
				fs.readFile(__dirname + '/html/crosswords.html', 'utf8', function(err, html){
					if(err){
						res.send('There was an error loading your view!');
					}else{
						generateTable(result.relatedCrosswords, function(result){
							html = html.replace("replacementbody", result);
							res.send(html);
						});
						//res.send('Table has been generated!');
						//res.sendFile(__dirname + '/html/crosswords.html');
					}
				});
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

app.get('/crossword/:id', function(req, res){
	var cookie = req.cookies.sessionid;
	if (cookie){
		res.sendFile(__dirname + '/html/addWord.html');
	} else{
		res.redirect('/login');
	}
});

app.post('/crossword', function(req, res){
	var crossWord = {};
	var examples = ['akin', 'reduce', 'city', 'issued', 'rapid', 'tabs', 'pencil', 'travel', 'elect', 'easily', 'leave', 'exam'];
	examples.sort(function(a, b){
		return b.length - a.length;
	});
	crossWord = putWordIntoCrossWord(crossWord, examples[0], 0, 0, false);
	for (var i = 1; i < examples.length; i++){
		var matches = checkRepeatedLetters(crossWord, examples[i]);
		if (matches.length > 0){
			for (var j = 0; j < matches.length; j++){
				var putVertical = false;
				var x = matches[j][0];
				var y = matches[j][1];
				if (typeof crossWord[x+1][y] === 'string'){
					putVertical = true;
				}
				crossWord = putWordIntoCrossWord(crossWord, examples[i], x, y, putVertical);
			}
		}
	}
	printCrossWord(crossWord);
	res.send('Hello crossword');
});

app.get('/addcrossword', function(req, res){
	var cookie = req.cookies.sessionid;
	if (cookie){
		res.sendFile(__dirname + '/html/addcrossword.html');
	} else {
		res.send('Permission denied');
	}
})

app.post('/addcrossword', function(req, res){
	var cookie = req.cookies.sessionid;
	if (cookie){
		new Crossword({'title' : req.body.title, 'tags' : req.body.tags}).save(function (err, thisCrossword){
			if (err) {
				console.error(err);
				res.json('Blad zapisu w bazie, spróbuj ponownie');
			} else {
				User.findOne({'sessionid' : cookie}, function(err, result){
					if (result){
						result.relatedCrosswords.push(thisCrossword.id);
						result.save();
						res.redirect('/');
					} else {
						res.send('Nie znaleziono takiego uzytkownika, blad bazy danych!');
					}
				})
			}
		})
		console.log('Dodano poprawnie nowa krzyzowke');
	} else {
		res.send('Brak istniejącej sesji, zaloguj się ponownie');
	}
});


app.get('/addword', function(req, res){
	var cookie = req.cookies.sessionid;
	if (cookie){
		var crosswordId = req.body.crossid;
		if (crosswordId){
			Crossword.findById(crosswordId, function(err, thisCrossword){
				if (err){
					res.json('Blad bazy danych');
				} else {
					var word, descriptionHint, audioHint, fotoHint;
					descriptionHint = audioHint = fotoHint = undefined;
					if (req.body.descriptionhint){
						descriptionHint = req.body.descriptionhint;
					}
					if (req.body){}
				}
		})
		}
	}
});

app.post('/uploadaudio', function(req, res){
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
	res.write('<input type="file" name="filetoupload"><br>');
	res.write('<input type="submit">');
	res.write('</form>');
	return res.end();
})


app.get('/login', function(req, res) {
	var cookie = req.cookies.sessionid;
	if (cookie){
		res.redirect('/');
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
			res.cookie('sessionid',randomNumber, { maxAge: 999999999999, httpOnly: true });
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
		res.redirect('/login');
	} else {
		res.send('Brak sesji do wygaszenia');
	}
});

function checkRepeatedLetters(crossWordArray, stringToMatch){
	var arrayOfMatches = [];
	for (var i = 0; i < crossWordArray.length; i++){
		var row = crossWordArray[i];
		for (var j = 0; j < row.length; j++){
			for (var index = 0; index < stringToMatch.length; index++){
				if (crossWordArray[i][j] == stringToMatch[index]){
					arrayOfMatches.push([i, j]);
				}
			}
		}
	}
	return arrayOfMatches;
}

function putWordIntoCrossWord(crossWordArray, wordToPut, startX, startY, vertical){
	for (var i = 0; i < wordToPut.length; i++){
		crossWordArray[startX][startY] = wordToPut[i];
		if (vertical)
			startY++;
		else 
			startX++;
	}
	return crossWordArray;
	//przepisz wszystko na mape bo z tymi jebanymi arrayami w JSie chuj mnie strzeli ja pierdole zajebalbym tego cwela, ktory to wymyslil
}

function printCrossWord(crossWordArray){
	console.log('Printing');
	for (var i = 0; i < crossWordArray.length; i++){
		for (var j = 0; j < crossWordArray.length; j++){
			console.log(crossWordArray[i][j]);
			console.log('\t');
			if (i == crossWordArray.length - 1)
				console.log('\n');
		}
	}
}

function generateTable(relatedCrosswordsIds, callback){
	var table = '<h1 class="responstable" align="center">Moje krzyżówki<h1>' +
	'<table align="center" style="width:50%" id="crosswordlist">' +
	'<tr>' +
	'<th>Tytuł</th>' +
	'<th>Tagi</th>' +
	'</tr>';
	var size = relatedCrosswordsIds.length;
	var dbArray = [];

	function checkStatus(){
		if (dbArray.length != relatedCrosswordsIds.length){
			return false;
		} else {
			return true;
		}
	}

	function prepareStringTable(){
		dbArray = dbArray.sort(function(a, b) {
   		if (a[0] < b[0]) return -1;
   		if (a[0] > b[0]) return 1;
   		return 0;
 		});
		for (var i = 0; i < dbArray.length; i++){
			if (!dbArray[i][1])
				dbArray[i][1] = 'brak';
			else {
				//tag = JSON.stringify(tag);
				dbArray[i][1] = dbArray[i][1].replace(/['"]+/g, '');
			}
			var attachement = '<tr>' +
			'<td>' + '<a href="' +'crossword/' + dbArray[i][2] + '">' + dbArray[i][0] + '</a>' + '</td>'+
			'<td>' + dbArray[i][1] + '</td>'+
			'</tr>';
			table += attachement;
		}
		table += '</table>';
		return table;
	}

	if (relatedCrosswordsIds.length == 0){
		callback(table + '</table>');
	}

	for (var i = 0; i < relatedCrosswordsIds.length; i++){
		Crossword.findById(relatedCrosswordsIds[i], function(err, thisCrossword){
			if (err){
				dbArray.push(['error', 'error', 'error']);
			} else {
				dbArray.push([thisCrossword.title, JSON.stringify(thisCrossword.tags), thisCrossword.id]);
				//titles.push(thisCrossword.title);
				//tags.push(JSON.stringify(thisCrossword.tags));
				//ids.push(thisCrossword.id);
				if (checkStatus()){
					callback(prepareStringTable());
				}
			}
		});
	}
}

