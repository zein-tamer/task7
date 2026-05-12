const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },

  roles: {
    type: [String],
    enum: ["user", "admin"],
    default: ["user"]
  },

refreshTokens: {
  type: [
    {
      token: { type: String, required: true, select: false },
      device: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  default: [],
  select: false
},


  resetPasswordToken: String,
  resetPasswordExpire: Date

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
