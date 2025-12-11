const mongoose = require('mongoose')
//* if we wanna connect to a databse from cluster "/ add at last database name"
const connectDB = async () => {
  await mongoose.connect(
    'mongodb+srv://asishkumar2418_db_user:0jFlO6UghBSh7wVJ@ravicapms.6nau8wj.mongodb.net/console'
  )
}
module.exports = {
  connectDB
}