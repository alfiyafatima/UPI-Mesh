/**
 * HybridCryptoService — RSA-OAEP + AES-256-GCM
 * Keys are persisted via environment variables so they survive restarts.
 * On first boot, a new keypair is generated and printed to console —
 * copy the output into your hosting platform's env vars.
 */

const crypto = require('crypto');

let _serverKeyPair = null;

function generateServerKeyPair() {
  if (_serverKeyPair) return _serverKeyPair;

  // If keys are in env, reuse them (production / after first boot)
  if (process.env.RSA_PRIVATE_KEY && process.env.RSA_PUBLIC_KEY) {
    _serverKeyPair = {
      privateKey: process.env.RSA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      publicKey: process.env.RSA_PUBLIC_KEY.replace(/\\n/g, '\n'),
    };
    console.log('[CryptoService] Loaded RSA key pair from environment.');
    return _serverKeyPair;
  }

  // First boot — generate and print so you can save them as env vars
  console.log('[CryptoService] No RSA keys in environment. Generating new RSA-2048 key pair...');
  _serverKeyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  console.log('\n========== SAVE THESE AS ENVIRONMENT VARIABLES ==========');
  console.log('RSA_PUBLIC_KEY=' + _serverKeyPair.publicKey.replace(/\n/g, '\\n'));
  console.log('RSA_PRIVATE_KEY=' + _serverKeyPair.privateKey.replace(/\n/g, '\\n'));
  console.log('==========================================================\n');

  return _serverKeyPair;
}

function getPublicKeyPem() {
  return generateServerKeyPair().publicKey;
}

function encrypt(plaintext) {
  const { publicKey } = generateServerKeyPair();
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const cipherBuf = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const encryptedKey = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  );
  return [
    encryptedKey.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    cipherBuf.toString('base64'),
  ].join('|');
}

function decrypt(wireFormat) {
  const { privateKey } = generateServerKeyPair();
  const parts = wireFormat.split('|');
  if (parts.length !== 4) throw new Error('Invalid wire format');
  const [encKeyB64, ivB64, tagB64, cipherB64] = parts;
  const aesKey = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(encKeyB64, 'base64')
  );
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(cipherB64, 'base64')), decipher.final()]).toString('utf8');
}

function hashCiphertext(wireFormat) {
  const parts = wireFormat.split('|');
  if (parts.length !== 4) throw new Error('Invalid wire format');
  return crypto.createHash('sha256').update(Buffer.from(parts[3], 'base64')).digest('hex');
}

module.exports = { getPublicKeyPem, encrypt, decrypt, hashCiphertext, generateServerKeyPair };