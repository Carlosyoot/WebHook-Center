const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const iv = Buffer.alloc(16, 0);

const key = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_SECRET)
  .digest();

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

function decrypt(encryptedText) {
  const encrypted = Buffer.from(encryptedText, 'base64');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
