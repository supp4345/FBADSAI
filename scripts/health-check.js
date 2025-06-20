#!/usr/bin/env node

/**
 * Health Check Script
 * Verifies that all critical components are working properly
 */

const fs = require('fs')
const path = require('path')

console.log('🏥 Running Health Check...\n')

const checks = [
  {
    name: 'Environment Variables',
    check: () => {
      const required = [
        'SHOPIFY_API_KEY',
        'SHOPIFY_API_SECRET_KEY',
        'HOST'
      ]
      const missing = required.filter(env => !process.env[env])
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
      }
      return 'All required environment variables present'
    }
  },
  {
    name: 'Critical Files',
    check: () => {
      const files = [
        'app.js',
        'package.json',
        'shopify.app.toml',
        'views/install.ejs',
        'views/app.ejs',
        'controllers/authController.js'
      ]
      const missing = files.filter(file => !fs.existsSync(path.join(__dirname, '..', file)))
      if (missing.length > 0) {
        throw new Error(`Missing critical files: ${missing.join(', ')}`)
      }
      return 'All critical files present'
    }
  },
  {
    name: 'Node.js Version',
    check: () => {
      const version = process.version
      const major = parseInt(version.slice(1).split('.')[0])
      if (major < 18) {
        throw new Error(`Node.js version ${version} is not supported. Minimum required: 18.0.0`)
      }
      return `Node.js ${version} ✅`
    }
  },
  {
    name: 'Package Dependencies',
    check: () => {
      const packageJson = require('../package.json')
      const nodeModulesExists = fs.existsSync(path.join(__dirname, '..', 'node_modules'))
      if (!nodeModulesExists) {
        throw new Error('node_modules directory not found. Run "npm install" first.')
      }
      return `${Object.keys(packageJson.dependencies).length} dependencies installed`
    }
  },
  {
    name: 'Shopify Configuration',
    check: () => {
      const configPath = path.join(__dirname, '..', 'shopify.app.toml')
      if (!fs.existsSync(configPath)) {
        throw new Error('shopify.app.toml not found')
      }
      const config = fs.readFileSync(configPath, 'utf8')
      if (!config.includes('application_url')) {
        throw new Error('application_url not configured in shopify.app.toml')
      }
      return 'Shopify configuration valid'
    }
  }
]

let passed = 0
let failed = 0

for (const { name, check } of checks) {
  try {
    const result = check()
    console.log(`✅ ${name}: ${result}`)
    passed++
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`)
    failed++
  }
}

console.log(`\n📊 Health Check Results:`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)

if (failed > 0) {
  console.log('\n🚨 Some health checks failed. Please fix the issues above before deploying.')
  process.exit(1)
} else {
  console.log('\n🎉 All health checks passed! The application is ready to run.')
  process.exit(0)
}