const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const{connectDB} = require('./config/database')
const app = express()
// app.use(
//   cors({
//     origin: 'http://localhost:5173',
//     credentials: true
//   })
// )

app.use(express.json())
app.use(cookieParser())
connectDB()
  .then(() => {
    console.log('connection established with database')
    app.listen(3000, () => {
        console.log('listening to port 3000')
        
    })
  })
  .catch(error => {
    console.error('Error connectiong to Database')
  })

module.exports = app
