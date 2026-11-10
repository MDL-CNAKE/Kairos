const mongoose = require('mongoose');
const env = require('./env.config');

async function connectDB() {
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
}

module.exports = { connectDB };
