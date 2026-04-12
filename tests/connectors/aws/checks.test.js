import { describe, test, expect } from '@jest/globals'

describe('AWS Checks', () => {
  test('runAwsChecks module exports correctly', async () => {
    const { runAwsChecks } = await import('../../../src/connectors/aws/checks/index.js')
    
    expect(typeof runAwsChecks).toBe('function')
  })

  test('runAwsChecks requires credentials parameter', async () => {
    const { runAwsChecks } = await import('../../../src/connectors/aws/checks/index.js')
    
    // Should throw when called without proper parameters
    await expect(async () => {
      await runAwsChecks({})
    }).rejects.toThrow()
  })
})
