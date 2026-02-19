const validator = require('validator')

const validateSignUpData = req => {
  const { firstName, lastName, email, password } = req.body

  if (!firstName || !lastName) {
    throw new Error('Name fields are required')
  }

  if (!validator.isEmail(email)) {
    throw new Error('Invalid email address')
  }

  if (!validator.isStrongPassword(password)) {
    throw new Error('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character')
  }
}

const validatePassword = (password) => {
  if (!validator.isStrongPassword(password)) {
    throw new Error('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character')
  }
}

module.exports = { validateSignUpData, validatePassword }
