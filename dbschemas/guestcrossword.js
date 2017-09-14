var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var guestCrosswordSchema = new Schema({
  table1: { type: String, required: true, unique: false },
  table2: { type: String, required: true, unique: false }
});

// the schema is useless so far
// we need to create a model using it
var GuestCrossword = mongoose.model('GuestCrossword', guestCrosswordSchema);

// make this available to our users in our Node applications
module.exports = GuestCrossword;