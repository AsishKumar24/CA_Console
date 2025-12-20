const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CA Console API Documentation',
      version: '1.0.0',
      description: 'Complete API documentation for CA Console - Task, Client, and Billing Management System',
      contact: {
        name: 'Asish Kumar',
        email: 'your-email@example.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Authentication cookie (JWT token)'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token in Authorization header (for testing)'
        }
      },
      schemas: {
        // User Schema
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            role: { type: 'string', enum: ['ADMIN', 'STAFF'], example: 'STAFF' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // Client Schema
        Client: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Tech Solutions Pvt Ltd' },
            code: { type: 'string', example: 'TSPL001' },
            mobile: { type: 'string', example: '9876543210' },
            email: { type: 'string', format: 'email', example: 'contact@techsolutions.com' },
            pan: { type: 'string', example: 'ABCDE1234F' },
            gstin: { type: 'string', example: '29ABCDE1234F1Z5' },
            address: { type: 'string', example: '123 Business Park, City' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // Task Schema
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', example: 'Income Tax Return - AY 2024-25' },
            serviceType: { type: 'string', example: 'Income Tax Return' },
            priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH'], example: 'NORMAL' },
            status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'], example: 'IN_PROGRESS' },
            dueDate: { type: 'string', format: 'date', example: '2024-12-31' },
            assessmentYear: { type: 'string', example: '2024-25' },
            period: { type: 'string', example: 'Quarterly' },
            client: { type: 'string', description: 'Client ID' },
            assignedTo: { type: 'string', description: 'User ID' },
            createdBy: { type: 'string', description: 'User ID' },
            isArchived: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // Error Response
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
            success: { type: 'boolean', example: false }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints (Admin only)' },
      { name: 'Clients', description: 'Client management endpoints' },
      { name: 'Tasks', description: 'Task management endpoints' },
      { name: 'Dashboard', description: 'Dashboard statistics endpoints' },
      { name: 'Billing', description: 'Billing and payment endpoints' }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controller/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
