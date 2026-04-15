import { describe, test, expect } from '@jest/globals'
import { encrypt, decrypt } from '../../src/services/encryption.js'

describe('Encryption Service', () => {

  test('should encrypt and decrypt a string', () => {
    const plaintext = 'my secret data'
    const encrypted = encrypt(plaintext)
    
    expect(encrypted).toHaveProperty('iv')
    expect(encrypted).toHaveProperty('data')
    expect(encrypted).toHaveProperty('tag')
    expect(encrypted.data).not.toBe(plaintext)
    
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  test('should encrypt JSON credentials', () => {
    const credentials = { roleArn: 'arn:aws:iam::123456789012:role/MyRole', externalId: 'abc123' }
    const plaintext = JSON.stringify(credentials)
    
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)
    const parsed = JSON.parse(decrypted)
    
    expect(parsed).toEqual(credentials)
  })

  test('should produce different ciphertext for same plaintext', () => {
    const plaintext = 'test data'
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)
    
    // Different IVs mean different ciphertext
    expect(encrypted1.iv).not.toBe(encrypted2.iv)
    expect(encrypted1.data).not.toBe(encrypted2.data)
    
    // But both decrypt to same plaintext
    expect(decrypt(encrypted1)).toBe(plaintext)
    expect(decrypt(encrypted2)).toBe(plaintext)
  })

  test('should fail with tampered ciphertext', () => {
    const plaintext = 'sensitive data'
    const encrypted = encrypt(plaintext)
    
    // Tamper with the data
    encrypted.data = encrypted.data.slice(0, -2) + 'ff'
    
    expect(() => decrypt(encrypted)).toThrow()
  })

  test('should fail with wrong auth tag', () => {
    const plaintext = 'sensitive data'
    const encrypted = encrypt(plaintext)
    
    // Tamper with the auth tag
    encrypted.tag = 'a'.repeat(32)
    
    expect(() => decrypt(encrypted)).toThrow()
  })
})
