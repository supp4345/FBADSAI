// Jest setup file
require('dotenv').config({ path: '.env.test' })

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.HOST = 'http://localhost:3000'
process.env.SHOPIFY_API_KEY = 'test_api_key'
process.env.SHOPIFY_API_SECRET_KEY = 'test_secret_key'
process.env.SESSION_SECRET = 'test_session_secret'

// Global test timeout
jest.setTimeout(10000)