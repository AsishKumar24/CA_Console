const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { connectDB } = require('./config/database')

const app = express()

// Behind the Nginx reverse proxy: trust the first hop so req.ip and
// req.secure reflect the real client (via X-Forwarded-For / -Proto).
// Needed for correct rate limiting and for the Secure cookie flag.
app.set('trust proxy', 1)

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
)

app.use(express.json())
app.use(cookieParser())

// Brute-force protection on auth endpoints: 10 attempts / 15 min per IP.
// Scoped to POST so GET /auth/me (polled on every page load) isn't throttled.
const rateLimit = require('express-rate-limit')
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => req.method !== 'POST',
  message: { error: 'Too many attempts. Please try again in 15 minutes.' }
})

// Serve uploaded files statically
const path = require('path')
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const authRouter = require('./routes/auth')
const clientRouter = require('./routes/clientRoutes')
const taskRouter = require('./routes/taskRoutes')
const billingRouter = require('./routes/billingRoutes')
const dashboardRouter = require('./routes/dashboardRoutes')
const userRouter = require('./routes/userRoutes')
const managementRouter = require('./routes/managementRoutes')
const healthRouter = require('./routes/healthRoutes')

//login and signup auth
app.use('/auth', authLimiter, authRouter)
//Clients auth
app.use('/api/clients', clientRouter)
//task routes
app.use('/api/tasks', taskRouter)
//billing routes
app.use('/api/billing', billingRouter)
//dashboard routes
app.use('/api/dashboard', dashboardRouter)
//user routes
app.use('/api/users', userRouter)
//management routes
app.use('/api/management', managementRouter)
//health & monitoring routes
app.use('/api/health', healthRouter)
app.use('/', require('./routes/testSwagger'))

// Swagger API Documentation — disabled in production so /api-docs is not
// exposed publicly. Available only when NODE_ENV !== 'production'.
if (process.env.NODE_ENV !== 'production') {
  const swaggerUI = require('swagger-ui-express')
  const swaggerSpec = require('./config/swagger')
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CA Console API Docs'
  }))
}

//console.log('📚 Swagger Documentation available at: http://localhost:3000/api-docs')
//check health of db and deployed model

const PORT = process.env.PORT || 5000
//console.log('Node version:', process.version)
const { startAutoArchiveCron } = require('./jobs/autoArchive')

connectDB()
  .then(() => {
    console.log('connection established with database')

    // Initialize cron jobs
    startAutoArchiveCron()

    app.listen(PORT, () => {
      console.log('listening to port')
    })
  })
  .catch(error => {
    console.error('Error connecting to Database')
  })


module.exports = app
