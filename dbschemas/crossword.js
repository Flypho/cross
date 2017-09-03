var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var crosswordSchema = new Schema({
  wordIds: { type: [Schema.ObjectId], required: false, unique: false },
  tags: {type: [String], required: false, unique: false},
  title: {type: String, required: true, unique: false}
});

// the schema is useless so far
// we need to create a model using it
var Crossword = mongoose.model('Crossword', crosswordSchema);

// make this available to our users in our Node applications
module.exports = Crossword;