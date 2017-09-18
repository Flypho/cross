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
var GuestCrossword = require('./dbschemas/guestcrossword.js');
var Word = require('./dbschemas/word.js');
var fs = require('fs');
var formidable = require('express-formidable');
var uploadDir = __dirname + '/uploads';
var formidableMiddleware = formidable({
	uploadDir: uploadDir
});
var path = require('path');
var zlib = require('zlib');


if (!fs.existsSync(uploadDir)){
	fs.mkdirSync(uploadDir);
}



app.set('view engine', 'html');

db.on('error', console.error.bind(console, 'MongoDB connection error!'));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/js",  express.static(__dirname + '/html/js'));
app.use("/css",  express.static(__dirname + '/html/css'));
app.use("/uploads",  express.static(__dirname + '/uploads'));

app.get('/', function(req, res) {
	var sessionid = req.cookies.sessionid;
	if (sessionid){
		User.findOne({'sessionid' : sessionid}, function(err, result){
			if (result){
				fs.readFile(__dirname + '/html/crosswords.html', 'utf8', function(err, html){
					if(err){
						res.send('There was an error loading your view!');
					}else{
						generateCrosswordTable(result.relatedCrosswords, function(result){
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

app.get('/servepicture/:id', function(req, res){
	var fileId = req.params.id;
	fs.readFile(__dirname + '/uploads/' + fileId, function(err, file){
		if (err){
			res.send('Error');
		} else {
			res.contentType('image/jpg');
			res.end(file, 'binary');
		}
	});
})

app.get('/serveaudio/:id', function(req, res){
	var fileId = req.params.id;
	fs.readFile(__dirname + '/uploads/' + fileId, function(err, file){
		if (err){
			res.send('Error');
		} else {
			res.contentType('audio/mpeg');
			res.end(file, 'binary');
		}
	});
})

app.listen(3000, function(){
	console.log('App listening on port 3000');
});

app.get('/test', function(req, res){
	var src = __dirname + '/uploads/upload_faa08d279576c9de04b4a33fe13f1356';
	var html = '<html><body>' + '<img class="logo" src="'+ src + '" alt="My_Logo">' + '</body></html>';
	res.send(html);
});

app.get('/crossword/:id', function(req, res){
	var cookie = req.cookies.sessionid;
	var crossId = req.params.id;
	if (cookie){
		Crossword.findById(crossId, function(err, result){
			if (result){
				fs.readFile(__dirname + '/html/addword.html', 'utf8', function(err, html){
					if(err){
						res.send('There was an error loading your view!');
					}else{
						generateWordsTable(result.wordIds, function(result){
							html = html.replace("replacementbody", result);
							res.send(html);
						});
					}
				});
			}
			else {
				res.redirect('/login');
			}
		});
	} else{
		res.redirect('/login');
	}
});

app.get('/hint/:id', function(req, res){
	var cookie = req.cookies.sessionid;
	var wordId = req.params.id;
	if (cookie){
		getHintPanel(wordId, function(result){
			res.send(result);
		})
	}
});

app.post('/crossword/:id', formidableMiddleware, function(req, res){
	var cookie = req.cookies.sessionid;
	var crossId = req.params.id;
	console.log()
	if (cookie){
		if (req.fields){
			var word = req.fields.word.toUpperCase();
			var hint = req.fields.hint;
			var picture = null;
			var audio = null;
			if (req.files.picture){
				picture = path.basename(req.files.picture.path);
			}
			if (req.files.audio){
				audio = path.basename(req.files.audio.path);
			}
			new Word({'word' : word, 'hint' : hint, 'picture' : picture, 'audio' : audio }).save(function (err, thisWord){
				if (err) {
					console.error(err);
					res.status(500).send('Blad bazy danych');
				} else {
					Crossword.findById(crossId, function(err, thisCrossword){
						if (err){
							console.log(err);
							res.status(500).send('Something broke!');
						}
						else if (thisCrossword){
							thisCrossword.wordIds.push(thisWord.id);
							thisCrossword.save();
							generateWordsTable(thisCrossword.wordIds, function(result){
								res.send(result);
							});
						} else {
							console.log(crossId);
							res.status(500).send('Nie znaleziono takiej krzyżówki!');
						}
					})
				}
			})
		} else {;
			res.status(500).send('Something broke!');
		}
	} else {
		res.redirect('/login');
	}
});

app.delete('/crossword/:id', function(req, res){
	var cookie = req.cookies.sessionid;
	var crossId = req.params.id;
	if (cookie){
		if (req.body.wordId){
			Crossword.findById(crossId, function(err, thisCrossword){
				if (err){
					console.log(err);
					res.status(500).send('Blad bazy danych');
				} else if (thisCrossword) {
					var index = thisCrossword.wordIds.indexOf(req.body.wordId);
					if (index < 0){
						res.status(500).send('Nie znaleziono słowa');
					} else {
						if (thisCrossword.wordIds.length == 1){
							thisCrossword.wordIds = [];
							thisCrossword.save();
						} else {
							console.log('Before splice ' + thisCrossword.wordIds);
							thisCrossword.wordIds.splice(index, 1);
							console.log('After splice ' + thisCrossword.wordIds);
							thisCrossword.save();
						}
						generateWordsTable(thisCrossword.wordIds, function(result){
							console.log(result);
							res.send(result);
						});
					}
				} else {
					res.status(500).send('Blad bazy danych, brak danych w bazie');
				}
			})
		} else {
			res.status(500).send('Cos poszlo nie tak, spróbuj jeszcze raz');
		}
	} else {
		res.redirect('/login');
	}
})

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

app.post('/verifyword', function(req, res){
	var wordId = req.body.wordid;
	var word = req.body.word.toUpperCase();
	if (!word || !wordId){
		res.status(500).send('Nieznany błąd');
	} else {
		Word.findById(wordId, function(err, thisWord){
			if (err){
				res.status(500).send('Błąd bazy danych');
			} else {
				if (thisWord.word == word){
					res.send('ok');
				} else{
					res.send('not');
				}
			}
		});
	}
})

app.get('/play/:id', function(req, res){
	var wordsArray = ['TABLESPOONFUL', 'DINGALING', 'ICE', 'TESTATOR', 'AGHA', 'PESTER', 'QUIFFS', 'OURS', 'CONGRESS', 'LIKEASHOT', 'ZAP', 'MASSIFCENTRAL',
	'TAINT', 'PROBLEM', 'BREASTSTROKES', 'ENDGAMES', 'WADI', 'PINION', 'GOTHIC', 'OVAL', 'TUNGSTEN', 'FRIDGEFREEZER', 'LOGJAMS', 'SEPAL'];
	var wordIds;
	var crosswordId = req.params.id;
	getCrosswordWordIds(crosswordId, function(result){
		if (result == -1){
			res.send('Error loading your crossword, sorry');
		} else {
			getWordsFromIdArray(result, function(words){
				if (words.length < 5){
					res.send('<html><head> \n' +
                        '\n' +
                        '<script>\n' +
                        'function goBack() {\n' +
                        '    window.history.back();\n' +
                        '}\n' +
                        '</script> ' +
						'<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"' +
						' integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">' +
						'</head>' +
						'<body>Wpisałeś zbyt mało słów, powiększ listę słów do co najmniej 5  <button class="btn btn-info" onclick="goBack()">Powrót</button></body></html>');
				} else {
					var crossAndIdArray = generateCrosswordArray(words);
					fs.readFile(__dirname + '/html/play.html', 'utf8', function(err, html){
						if(err){
							res.send('There was an error loading your view!');
						}else{
							var table = generatePlayableCrossword(crossAndIdArray);
							html = html.replace("TU MA BYĆ KRZYŻÓWKA", table);
							getCrosswordTitle(crosswordId, function(result){
								html = html.replace("CrosswordTitle", result);
								res.send(html);
							});
							//res.send(html);
						}
					});
				}
			})
		}
	});
});

app.post('/savecrossword', function(req, res){
	var crosswordTable = req.body.table;
	var deflated = zlib.deflateSync(crosswordTable).toString('base64');
	new GuestCrossword({'table' : deflated}).save(function (err, savedTable){
		if (err) {
			console.error(err);
			res.status(500).send('Blad bazy danych');
		} else {
			res.send('http://localhost:3000/playguest/' + savedTable.id);
		}
	});
})

app.get('/playguest/:id', function(req, res){
	var crosswordId = req.params.id;
	GuestCrossword.findById(crosswordId, function(err, result){
		if (err){
			res.send(err)
		} else {
			var tableString = zlib.inflateSync(new Buffer(result.table, 'base64')).toString();
			fs.readFile(__dirname + '/html/play.html', 'utf8', function(err, html){
				if(err){
					res.send('There was an error loading your view!');
				}else{
					html = html.replace("TU MA BYĆ KRZYŻÓWKA", tableString);
					html = html.replace("CrosswordTitle", "Krzyżówka gościa");
					res.send(html);
				}
			});
		}
	});
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
				});
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

function generateCrosswordTable(relatedCrosswordsIds, callback){
	var table = '<h1 class="responstable" align="center">Moje krzyżówki<h1>' +
	'<table align="center" style="width:50%" id="crosswordlist">' +
	'<tr>' +
	'<th>Tytuł</th>' +
	'<th>Tagi</th>' +
	'<th>Graj</th>' +
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
			'<td>' + '<a href="/play/' + dbArray[i][2] + '" class="btn btn-info" role="button">Graj</a>' + '</td>' +
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

function generateWordsTable(relatedWordsIds, callback){
	var table = 
	'<table class="table" align="center" style="width:50%" id="wordslist">' +
	'<tr>' +
	'<th>Hasło</th>' +
	'<th>Podpowiedź</th>' +
	'<th>Obrazek</th>' +
	'<th>Media</th>' +
	'<th>Usuń</th>' +
	'</tr>';
	var size = relatedWordsIds.length;
	var dbArray = [];

	function checkStatus(){
		if (dbArray.length != relatedWordsIds.length){
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
			var picture = 'brak';
			var audio = 'brak';
			if (dbArray[i][2]){
				picture = '<img src="/uploads/' + dbArray[i][2] + '" alt="twój_obrazek" style="width:50px; height:50px;">';
			}
			if (dbArray[i][3]){
				audio = '<audio src="/uploads/' + dbArray[i][3] +'" preload controls></audio>';
			}
			var attachement = '<tr>' +
			'<td>' + dbArray[i][0] + '</td>'+
			'<td>' + dbArray[i][1] + '</td>'+
			'<td>' + picture + '</td>'+
			'<td>' + audio + '</td>'+
			'<td>' + '<button type="button" class="btn btn-primary deletewordbutton"' + ' id="' + dbArray[i][4] + '">Usuń</button>' + '</td>' +
			'</tr>';
			table += attachement;
		}
		table += '</table>';
		return table;
	}

	if (relatedWordsIds.length == 0){
		callback(table + '</table>');
	}

	for (var i = 0; i < relatedWordsIds.length; i++){
		Word.findById(relatedWordsIds[i], function(err, thisWord){
			if (err){
				dbArray.push(['error', 'error', 'error', 'error']);
			} else {
				dbArray.push([thisWord.word, thisWord.hint, thisWord.picture, thisWord.audio, thisWord.id]);
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

function generatePlayableCrossword(crossAndIdArray){
	var crosswordArray = crossAndIdArray[0];
	var idArray = crossAndIdArray[1];
	var height = crosswordArray.length;
	var width = crosswordArray[0].length;
	var table = '<table id="playablecrossword">';
	var tableInsides = '';
	for (var i = 0; i < height; i++){
		tableInsides += '<tr>';
		for (var j = 0; j < width; j++){
			if (crosswordArray[i][j] == '_'){
				tableInsides += '<td bgcolor="#D3D3D3">' + ' ' + '</td>';
			} else {
				var classString = "cell ";
				for (var k = 0; k < idArray[i][j].length; k++){
					classString = classString.concat(idArray[i][j][k] + ' ');
				}
				tableInsides += '<td style="text-transform: uppercase" class="' + classString + '">' + '&nbsp;' + '</td>'; //'&nbsp;'
			}
		}
		tableInsides += '</tr>';
	}
	table = table + tableInsides + '</table>';
	return table;
}

function getRandomChar() {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return possible.charAt(Math.floor(Math.random() * possible.length));
}

function generateCrosswordArray(wordsArray){
	wordsArray.sort(function(a, b){
		if(a.word.length < b.word.length) return 1;
		if(a.word.length > b.word.length) return -1;
		return 0;
	});
	var width = wordsArray[0].word.length;
	var height = width + 3;
	var crosswordArray = matrix(height, width, '_');
	var idArray = matrix (height, width, 0);
	var startingRow = Math.floor(crosswordArray.length/2);
	var startingColumn = Math.floor(crosswordArray[0].length/2 - wordsArray[0].word.length/2);
	insertWordIntoArray(wordsArray[0].word, crosswordArray, startingRow, startingColumn, false, idArray, wordsArray[0]._id);
	for (var i = 1; i < wordsArray.length; i++){
		var intersections = findPossibleIntersections(wordsArray[i].word, crosswordArray);
		evaluateIntersectionQuality(wordsArray[i].word, crosswordArray, intersections);
		if (intersections.length > 0){
			intersections = filterIntersections(intersections);
			if (intersections.length > 0){
				var coordinates = calculateStartingCoordinates(wordsArray[i].word, intersections);
				insertWordIntoArray(wordsArray[i].word, crosswordArray, coordinates[0], coordinates[1], coordinates[2], idArray, wordsArray[i]._id);
			}
		}
	}
	//printCrosswordArray(crosswordArray);
	return [crosswordArray, idArray];
}

function printCrosswordArray(crosswordArray){
	var height = crosswordArray.length;
	var width = crosswordArray[0].length;
	var result = '';

	for (var i = 0; i < height; i++){
		for (var j = 0; j < width; j++){
			result += crosswordArray[i][j];
			if (j == width - 1){
				result += '\n';
			} else {
				result += ' ';
			}
		}
	}
	console.log(result);
}

function matrix( rows, cols, defaultValue){
	var arr = [];
	for(var i=0; i < rows; i++){
		arr.push([]);
		arr[i].push( new Array(cols));
		for(var j=0; j < cols; j++){
			arr[i][j] = defaultValue;
		}
	}
	return arr;
}


function insertWordIntoArray(word, crosswordArray, startingRow, startingColumn, down, idArray, id){
	var height = crosswordArray.length;
	var width = crosswordArray[0].length;
	//console.log('DIMENSIONS ' + 'height: ' + height + ' width ' + width);
	if (down){
		if (startingRow + word.length > height){
			return -1;
		} else {
			for (var i = 0; i < word.length; i++){
				crosswordArray[startingRow + i][startingColumn] = word[i];
				if (idArray[startingRow + i][startingColumn] != 0){
					idArray[startingRow + i][startingColumn].push(id);
				} else {
					idArray[startingRow + i][startingColumn] = [id];
				}
			}
		}
	} else {
		if (startingColumn + word.length > width){
			return -1;
		} else {
			for (var i = 0; i < word.length; i++){
				crosswordArray[startingRow][startingColumn + i] = word[i];
				if (idArray[startingRow][startingColumn + i] != 0){
					idArray[startingRow][startingColumn + i].push(id);
				} else {
					idArray[startingRow][startingColumn + i] = [id];
				}
			}
		}
	}
}

function findPossibleIntersections(word, crosswordArray){
	var height = crosswordArray.length;
	var width = crosswordArray[0].length;
	var results = [];
	for (var letterIndex = 0; letterIndex < word.length; letterIndex++) {
		for (var row = 0; row < height; row++){
			for (var column = 0; column < width; column++){
				if (crosswordArray[row][column] == word[letterIndex]){
					results.push([letterIndex, row, column, checkIntersectionOrientation(crosswordArray, row, column)]);
				}
			}
		}
	}
	return results;
}

function evaluateIntersectionQuality(word, crosswordArray, intersectionsArray){
	var testLog = false;
	if (word == 'ZAP'){
		testLog = true;
	}
	var height = crosswordArray.length;
	var width = crosswordArray[0].length;
	for (var i = 0; i < intersectionsArray.length; i ++){
		var intersectionRow = intersectionsArray[i][1];
		var intersectionColumn = intersectionsArray[i][2];
		var intersectionWordIndex = intersectionsArray[i][0];
		var crossIntersection = false;
		if (intersectionsArray[i][3] == 'cross'){
			crossIntersection = true;
		}
		var startingRow, startingColumn, endRow, endColumn;
		if (intersectionWordIndex == 0){
			startingRow = intersectionRow;
			startingColumn = intersectionColumn;
		} else if (crossIntersection){
			startingRow = intersectionRow;
			startingColumn = intersectionColumn - intersectionWordIndex;
		} else {
			startingRow = intersectionRow - intersectionWordIndex;
			startingColumn = intersectionColumn;
		}

		if (crossIntersection){
			endRow = startingRow;
			endColumn = startingColumn + word.length - 1;
		} else {
			endRow = startingRow + word.length - 1;
			endColumn = startingColumn;
		}

		if (startingRow < 0 || endRow >= height || startingColumn < 0 || endColumn >= width){
			intersectionsArray[i].push(-1);
		} else {
			var qualityValue = 0;
			if (intersectionWordIndex != 0 && intersectionWordIndex != word.length - 1){
				qualityValue++;
			}
			var firstValue = -1;
			var secondValue = 1;
			var specialCase = false;

			if (crossIntersection){
				var startingRowIndex1 = startingRow + firstValue;
				var startingRowIndex2 = startingRow + secondValue;
				var endRowIndex1 = endRow + firstValue;
				var endRowIndex2 = endRow + secondValue;
				if (testLog){
					//console.log('INDICES READ CROSS: ' + startingRowIndex1 + ',' + startingColumn + ' ' + startingRowIndex2 + ',' + startingColumn + ' ' + endRowIndex1 + ',' + endColumn + ' ' + endRowIndex2 + ',' + endColumn);
				}
				if (startingRowIndex1 < 0 || startingRowIndex1 > height - 1 || endRowIndex1 < 0 || endRowIndex1 > height - 1){
					startingRowIndex1 = startingRowIndex2;
					endRowIndex1 = endRowIndex2;
				} else if (startingRowIndex2 < 0 || startingRowIndex2 > height - 1 || endRowIndex2 < 0 || endRowIndex2 > height - 1){
					startingRowIndex2 = startingRowIndex1;
					endRowIndex2 = endRowIndex1;
				}
				if (((crosswordArray[startingRowIndex1][startingColumn] != '_' || crosswordArray[startingRowIndex2][startingColumn] != '_')) || 
					((endRow != height-1 && endRow != 0) && 
						(crosswordArray[endRowIndex1][endColumn] != '_' || crosswordArray[endRowIndex2][endColumn] != '_')) ||
					((startingColumn != 0 && crosswordArray[startingRow][startingColumn-1] != 0) || (endColumn != width - 1 && crosswordArray[endRow][endColumn+1] != '_'))){
					qualityValue = -1;
			} else {
				for (var j = startingColumn; j < endColumn; j++){
					if (crosswordArray[startingRow][j] != '_'){
						var found = false;
						for (var l = 0; l < intersectionsArray.length; l++){
							if (intersectionsArray[l][1] == startingRow && intersectionsArray[l][2] == j && (crosswordArray[startingRow][j] == word[intersectionWordIndex] || crosswordArray[startingRow][j] == '_')){
								found = true;
							} 
						}
						if (found){
							qualityValue += 2;
						} else {
							qualityValue = -1;
							break;
						}
					}
				}
			}
		} else {
			var startingColumnIndex1 = startingColumn + firstValue;
			var startingColumnIndex2 = startingColumn + secondValue;
			var endColumnIndex1 = endColumn + firstValue;
			var endColumnIndex2 = endColumn + secondValue;
				//console.log('INDICES READ DOWN: ' + startingRow + ',' + startingColumnIndex1 + ' ' + startingRow + ',' + startingColumnIndex2 + ' ' + endRow + ',' + endColumnIndex1 + ' ' + endRow + ',' + endColumnIndex2);
				if (startingColumnIndex1 < 0 || startingColumnIndex1 > width - 1 || endColumnIndex1 < 0 || endColumnIndex1 > width - 1){
					startingColumnIndex1 = startingColumnIndex2;
					endColumnIndex1 = endColumnIndex2;
				} else if (startingColumnIndex2 < 0 || startingColumnIndex2 > width - 1 || endColumnIndex2 < 0 || endColumnIndex2 > width - 1){
					startingColumnIndex2 = startingColumnIndex1;
					endColumnIndex2 = endColumnIndex1;
				}
				if (((crosswordArray[startingRow][startingColumnIndex1] != '_' || crosswordArray[startingRow][startingColumnIndex2] != '_')) ||
					(endColumn != width-1 && 
						(crosswordArray[endRow][endColumnIndex1] != '_' || crosswordArray[endRow][endColumnIndex2] != '_')) || 
					(startingRow != 0 && crosswordArray[startingRow-1][startingColumn] != '_') || endRow != height - 1 && crosswordArray[endRow+1][endColumnIndex1] != '_'){	
					qualityValue = -1;
			} else {
				for (var m = startingRow; m <= endRow; m++){
					if (crosswordArray[m][startingColumn] != '_'){
						var found = false;
						for (var n = 0; n < intersectionsArray.length; n++){
							if (intersectionsArray[n][1] == m && intersectionsArray[n][2] == startingColumn && (crosswordArray[m][startingColumn] == word[intersectionWordIndex] || crosswordArray[m][startingColumn] == '_')){
								found = true;
							}
						}
						if (found){
							qualityValue += 2;
						} else {
							qualityValue = -1;
							break;
						}
					}
				}
			}
		/*
		if (word == 'ZAP'){
			if (qualityValue > 0){
				console.log('Cos poszlo nie tak');
				console.log('Rows and columns:')
				console.log('word= ' + word);
				console.log('START: ' + startingRow + ',' + startingColumn);
				console.log('END: ' + endRow + ',' + endColumn);
				console.log('height:= ' + height + ' width= ' + width);
				console.log('quality for word=' + qualityValue);
			}
		}*/
	}
	intersectionsArray[i].push(qualityValue);
}
}
}

function checkIntersectionOrientation(crosswordArray, row, column){
	var height = crosswordArray.length;
	var width = crosswordArray[0].length;
	var firstArg = -1;
	var secondArg = +1;
	if (column == 0){
		firstArg = 2;
	} else if (column == width - 1){
		secondArg = -2;
	}
	if (crosswordArray[row][column + firstArg] != '_' || crosswordArray[row][column + secondArg] != '_'){
		//var testColumn1 = column + firstArg;
		//var testColumn2 = column + secondArg;
		//console.log('DOWN LOG: intersekcja w ' + row + ',' + column + ' przeszukuje punkty: ' + row + ',' + testColumn1 + ' ' + row + ',' + testColumn2);
		return 'down';
	} else {
		//var testRow1 = row + firstArg;
		//var testRow2 = row + secondArg;
		//console.log('CROSS LOG: intersekcja w ' + row + ',' + column + ' przeszukuje punkty: ' + testRow2 + ',' + column + ' ' + testRow2 + ',' + column);
		return 'cross'
	}

}

function filterIntersections(intersectionsArray){
	var indicesToSave = [];
	var maxValue = 0;
	for (var i = 0; i < intersectionsArray.length; i++){
		if (intersectionsArray[i][4] > maxValue || (intersectionsArray[i][4] == maxValue && Math.random() >= 0.5)){
			indicesToSave.splice(indicesToSave.indexOf(maxValue), 1);
			indicesToSave.push(i);
			maxValue = intersectionsArray[i][4];
		}
	}	
	var results = [];
	for (var i = 0; i < indicesToSave.length; i++){
		results.push(intersectionsArray[indicesToSave[i]]);
	}
	return results;
}

function calculateStartingCoordinates(word, intersectionsArray){
	var index = 0;
	var results = [];
	var startingRow;
	var startingColumn;
	var isOrientationDown = false;
	if (intersectionsArray.length > 1){
		var index = Math.random() * (intersectionsArray - 1);
	}
	if (intersectionsArray[index][3] == 'down'){
		isOrientationDown = true;
	}
	if (isOrientationDown){
		startingColumn = intersectionsArray[index][2];
		startingRow = intersectionsArray[index][1] - intersectionsArray[index][0];
	} else {
		startingColumn = intersectionsArray[index][2] - intersectionsArray[index][0];
		startingRow = intersectionsArray[index][1];
	}

	results.push(startingRow);
	results.push(startingColumn);
	results.push(isOrientationDown);
	//console.log('calculated coordinates');
	//console.log(results);
	return results;
}

function getCrosswordWordIds(crosswordId, callback){
	Crossword.findById(crosswordId, function(err, thisCrossword){
		if (err){
			console.log(err);
			callback(-1);
		} else {
			callback(thisCrossword.wordIds);
		}
	});
}

function getWordsFromIdArray(idArray, callback){
	Word.find().where('_id').in(idArray).exec(function (err, result){
		if (err){
			console.log(err)
		} else {
			callback(result);
		}
	});
}

function getHintPanel(wordId, callback){
	var table = '';
	Word.findById(wordId, function(err, thisWord){
		if (err){
			callback(err);
		} else {
			table += '<div>Podpowiedź:' + thisWord.hint + '</div>';
			if (thisWord.picture){
				//table += '<img src="/uploads/' + thisWord.picture + '" alt="twój_obrazek" style="width:50px; height:50px;">' 
				table += '<a href="/servepicture/' + thisWord.picture + '" target="_blank">Kliknij, aby wyświetlić pomoc w postaci obrazka</a>'
			}
			if (thisWord.audio){
				//table += '<audio src="/uploads/' + thisWord.audio +'" preload controls></audio>'; 
				table += '<a href="/serveaudio/' + thisWord.audio + '" target="_blank">Kliknij, aby wyświetlić pomoc w postaci multimediów</a>'
			}
			table += '<button type="button" id="generatelinkbutton" class="btn btn-primary">Generuj link do krzyżówki</button>'
			table +='<input id="linkinput" type="text" class="field left" readonly>';
			callback(table);
		}
	});
}

function getCrosswordTitle(crosswordId, callback){
	Crossword.findById(crosswordId, function(err, thisCrossword){
		if (err){
			callback(err);
		} else {
			callback(thisCrossword.title);
		}
	});
}

