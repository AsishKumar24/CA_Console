const mongoose = require('mongoose')
require('dotenv').config()

//* if we wanna connect to a databse from cluster "/ add at last database name"
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI
    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not set.')
    };
    await mongoose.connect(mongoURI)
  } catch (error) {
    process.exit(1)
  };
};

module.exports = {
  connectDB
}