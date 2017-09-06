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
var Word = require('./dbschemas/word.js');
var fs = require('fs');
var formidable = require('express-formidable');
var uploadDir = __dirname + '/uploads';
var formidableMiddleware = formidable({
	uploadDir: uploadDir
});
var path = require('path');


if (!fs.existsSync(uploadDir)){
	fs.mkdirSync(uploadDir);
}



app.set('view engine', 'html');

db.on('error', console.error.bind(console, 'MongoDB connection error!'));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(formidable({
  //uploadDir: uploadDir
//}));

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

app.get('/play/:id', function(req, res){
	genCrossword();
	fs.readFile(__dirname + '/html/play.html', 'utf8', function(err, html){
		if(err){
			res.send('There was an error loading your view!');
		}else{
			var table = generateEmptyTable(20, 20);
			html = html.replace("TU MA BYĆ KRZYŻÓWKA", table);
			res.send(html);
		}
	});
})

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
	'<table align="center" style="width:50%" id="wordslist">' +
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

function generateEmptyTable(width, height){
	var table = '<table>';
	var tableInsides = '';
	for (var i = 0; i < height; i++){
		tableInsides += '<tr>';
		for (var j = 0; j < width; j++){
			tableInsides += '<td>' + getRandomChar() + '</td>';
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

function genCrossword(){
	var words = ['TABLESPOONFUL', 'DINGALING', 'ICE', 'TESTATOR', 'AGHA', 'PESTER', 'QUIFFS', 'OURS', 'CONGRESS', 'LIKEASHOT', 'ZAP', 'MASSIFCENTRAL',
	'TAINT', 'PROBLEM', 'BREASTSTROKES', 'ENDGAMES', 'WADI', 'PINION', 'GOTHIC', 'OVAL', 'TUNGSTEN', 'FRIDGEFREEZER', 'LOGJAMS', 'SEPAL'];
	words.sort(function(a, b){
		if(a.length < b.length) return 1;
		if(a.length > b.length) return -1;
		return 0;
	});
	var crosswordArray = matrix(15, 15, '_');
	var testWords = words;
	var startingRow = Math.floor(crosswordArray.length/2);
	var startingColumn = Math.floor(crosswordArray[0].length/2 - testWords[0].length/2);
	console.log('starting: ' + startingRow + ',' + startingColumn);
	insertWordIntoArray(testWords[0], crosswordArray, startingRow, startingColumn, false);
	for (var i = 1; i < testWords.length; i++){
		var intersections = findPossibleIntersections(testWords[i], crosswordArray);
		evaluateIntersectionQuality(testWords[i], crosswordArray, intersections);
		if (intersections.length > 0){
			intersections = filterIntersections(intersections);
			if (intersections.length > 0){
				var coordinates = calculateStartingCoordinates(testWords[i], intersections);
				insertWordIntoArray(testWords[i], crosswordArray, coordinates[0], coordinates[1], coordinates[2]);
			}
		}
	}
	printCrosswordArray(crosswordArray);
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


function insertWordIntoArray(word, crosswordArray, startingRow, startingColumn, down){
	var height = crosswordArray.length;
	var width = crosswordArray[0].length;
	console.log('DIMENSIONS ' + 'height: ' + height + ' width ' + width);
	if (down){
		if (startingRow + word.length > height){
			return -1;
		} else {
			for (var i = 0; i < word.length; i++){
				crosswordArray[startingRow + i][startingColumn] = word[i];
			}
		}
	} else {
		if (startingColumn + word.length > width){
			return -1;
		} else {
			for (var i = 0; i < word.length; i++){
				crosswordArray[startingRow][startingColumn + i] = word[i];
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
	var testLog = true;
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
			if (startingRow == 0 || endRow == 0 || startingColumn == 0 || endColumn == 0){
				firstValue = 1; // nie mozna minusow
			}
			if (startingRow == (height-1) || endRow == (height - 1) || startingColumn == (width -1) || endColumn == (width-1)){
				secondValue = -1; //nie mozna plusow
			}

			0,0 - nie mozna minusow
			0,max nie mozna minusa, nie mozna plusa
			max, 0 - nie mozna plusa, nie mozna minusa
			max, max - nie monza plusow

			0,0
			1,1
			//kurde wez to sobie rozkmin na ostro bo ja jebie
			0, max
			1, 


			if (testLog){
				console.log('Rows and columns:')
				console.log('START: ' + startingRow + ',' + startingColumn);
				console.log('END: ' + endRow + ',' + endColumn);
				var test1 = startingRow + firstValue;
				var test2 = startingRow + secondValue;
				var test3 = endRow + firstValue;
				var test4 = endRow + secondValue;
				console.log('VALUES' + firstValue + ',' + secondValue);
				console.log('height:= ' + height + ' width= ' + width);
				console.log('INDICES THAT WILL BE READ: ' + test1 + ',' + startingColumn + ' ' + test2 + ',' + startingColumn + ' ' + test3 + ',' + endColumn + ' ' + test4 + ',' + endColumn);
			}

			if (crossIntersection){
				if (((crosswordArray[startingRow+firstValue][startingColumn] != '_' || crosswordArray[startingRow + secondValue][startingColumn] != '_')) || 
					((endRow != height-1 && endRow != 0) && 
						(crosswordArray[endRow + firstValue][endColumn] != '_' || crosswordArray[endRow + secondValue][endColumn] != '_'))){
					qualityValue = -1;
			} else {
				for (var j = startingColumn; j < endColumn; j++){
					if (crosswordArray[startingRow][j] != '_'){
						var found = false;
						for (var l = 0; l < intersectionsArray.length; l++){
							if (intersectionsArray[l][1] == startingRow && intersectionsArray[l][2] == j){
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
			if (((crosswordArray[startingRow][startingColumn + firstValue] != '_' || crosswordArray[startingRow][startingColumn + secondValue] != '_')) ||
				(endColumn != width-1 && 
					(crosswordArray[endRow][endColumn + firstValue] != '_' || crosswordArray[endRow][endColumn + secondValue] != '_'))){
				qualityValue = -1;
		} else {
			for (var m = startingRow; m <= endRow; m++){
				if (crosswordArray[m][startingColumn] != '_'){
					var found = false;
					for (var n = 0; n < intersectionsArray.length; n++){
						if (intersectionsArray[n][1] == m && intersectionsArray[n][2] == startingColumn){
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
	console.log('calculated coordinates');
	console.log(results);
	return results;
}

