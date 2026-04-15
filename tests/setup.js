// Jest setup file - runs before all tests
// Set required environment variables for testing

process.env.ENCRYPTION_KEY = 'a'.repeat(64)
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.AUTH0_DOMAIN = 'test.auth0.com'
process.env.AUTH0_AUDIENCE = 'https://api.test.com'
process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret'
process.env.AWS_REGION = 'us-east-1'
