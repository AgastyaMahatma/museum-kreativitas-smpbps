const crypto = require('crypto');

const DEFAULT_MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY || 'MuseumKreativitasSecretKey2025#';

/**
 * Derives a 32-byte key from a secret string using SHA-256.
 */
function getDerivedKey(secret = DEFAULT_MASTER_KEY) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypts a plaintext password using AES-256-CBC.
 * Output format: ENC:<iv_hex>:<ciphertext_base64>
 */
function encryptPasswordForOwner(plainText, secret = DEFAULT_MASTER_KEY) {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const key = getDerivedKey(secret);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(String(plainText), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return `ENC:${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-CBC encrypted password string.
 */
function decryptPasswordForOwner(encryptedData, secret = DEFAULT_MASTER_KEY) {
  if (!encryptedData) return '';
  if (!String(encryptedData).startsWith('ENC:')) return encryptedData;
  try {
    const parts = String(encryptedData).split(':');
    if (parts.length < 3) return encryptedData;
    const iv = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const key = getDerivedKey(secret);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err.message);
    return encryptedData;
  }
}

module.exports = {
  DEFAULT_MASTER_KEY,
  encryptPasswordForOwner,
  decryptPasswordForOwner
};
