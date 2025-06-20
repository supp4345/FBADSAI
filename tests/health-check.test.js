const fs = require('fs')
const path = require('path')

describe('Application Health Checks', () => {
  test('critical files exist', () => {
    const criticalFiles = [
      'app.js',
      'package.json',
      'shopify.app.toml',
      'views/install.ejs',
      'views/app.ejs',
      'controllers/authController.js'
    ]

    criticalFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file)
      expect(fs.existsSync(filePath)).toBe(true)
    })
  })

  test('package.json has required fields', () => {
    const packageJson = require('../package.json')
    
    expect(packageJson.name).toBeDefined()
    expect(packageJson.version).toBeDefined()
    expect(packageJson.main).toBe('app.js')
    expect(packageJson.scripts.start).toBeDefined()
    expect(packageJson.dependencies).toBeDefined()
  })

  test('shopify.app.toml is properly configured', () => {
    const configPath = path.join(__dirname, '..', 'shopify.app.toml')
    expect(fs.existsSync(configPath)).toBe(true)
    
    const config = fs.readFileSync(configPath, 'utf8')
    expect(config).toContain('application_url')
    expect(config).toContain('embedded')
  })

  test('environment variables are documented', () => {
    const envExamplePath = path.join(__dirname, '..', '.env.example')
    expect(fs.existsSync(envExamplePath)).toBe(true)
    
    const envExample = fs.readFileSync(envExamplePath, 'utf8')
    expect(envExample).toContain('SHOPIFY_API_KEY')
    expect(envExample).toContain('SHOPIFY_API_SECRET_KEY')
    expect(envExample).toContain('HOST')
  })

  test('installation documentation exists', () => {
    const docs = [
      'README.md',
      'INSTALLATION_FIXES_SUMMARY.md',
      'INSTALLATION_FLOW.md'
    ]

    docs.forEach(doc => {
      const docPath = path.join(__dirname, '..', doc)
      expect(fs.existsSync(docPath)).toBe(true)
    })
  })
})