var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var wordSchema = new Schema({
  word: { type: String, required: true, unique: false },
  hint: {type: String, required: true, unique: false},
  audio: {type: String, required: false, unique: false},
  picture: {type: String, required: false, unique: false},
  tags: {type: [String], required: false, unique: false}
});

// the schema is useless so far
// we need to create a model using it
var Word = mongoose.model('Word', wordSchema);

// make this available to our users in our Node applications
module.exports = Word;