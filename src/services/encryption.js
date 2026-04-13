import crypto from 'crypto'
import { ENCRYPTION_KEY } from './config.js'

const ALGORITHM = 'aes-256-gcm'
const KEY = ENCRYPTION_KEY

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag().toString('hex')

  return {
    iv: iv.toString('hex'),
    data: encrypted,
    tag: authTag
  }
}

export function decrypt(encryptedObj) {
  const { iv, data, tag } = encryptedObj
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  )

  decipher.setAuthTag(Buffer.from(tag, 'hex'))

  let decrypted = decipher.update(data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
