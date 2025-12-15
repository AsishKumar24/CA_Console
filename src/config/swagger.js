const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CA Console API',
      version: '1.0.0',
      description: 'API documentation for CA task & client management'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token'
        }
      }
    }
  },
apis: ['./src/routes/*.js']
}
 // Swagger reads ONLY route comments


module.exports = swaggerJsdoc(options)
