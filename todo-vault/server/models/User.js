const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  done:        { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  todos:    [todoSchema],
});

module.exports = mongoose.model('User', userSchema);