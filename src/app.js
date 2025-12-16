const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { connectDB } = require('./config/database')


const app = express()
// app.use(
//   cors({
//     origin: 'http://localhost:5173',
//     credentials: true
//   })
// )

app.use(express.json())
app.use(cookieParser())
const authRouter = require('./routes/auth')
const clientRouter = require('./routes/clientRoutes')
const taskRouter = require('./routes/taskRoutes')


//login and signup auth
app.use('/auth', authRouter)
//Clients auth
app.use('/api/clients', clientRouter)
//task routes
 app.use('/api/tasks' , taskRouter)
app.use('/', require('./routes/testSwagger'))
if (process.env.NODE_ENV == 'production') {
  const swaggerUI = require('swagger-ui-express')
  const swaggerSpec = require('./config/swagger')
  //console.log(swaggerUI)
  //console.log(swaggerSpec)
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec))
}
const healthCheck = require('./routes/health')
app.use('/' , healthCheck)
connectDB()
  .then(() => {
    console.log('connection established with database')
    app.listen(process.env.PORT, () => {
        console.log('listening to port')
        
    })
  })
  .catch(error => {
    console.error('Error connectiong to Database')
  })

module.exports = app
