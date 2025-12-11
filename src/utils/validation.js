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
    throw new Error('Password is not strong enough')
  }
}

module.exports = { validateSignUpData }
