/**
 * DecentraStore Crypto Utilities
 * RSA-2048 keypair generation, signing, and verification
 * Uses Web Crypto API (built-in, no dependencies)
 */

/**
 * Generate a new RSA-2048 keypair
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 */
export async function generateRSAKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['sign', 'verify']
  );
  return keyPair;
}

/**
 * Export public key to PEM format
 * @param {CryptoKey} publicKey
 * @returns {Promise<string>}
 */
export async function exportPublicKeyPEM(publicKey) {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  const exportedAsBase64 = window.btoa(exportedAsString);
  const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
  return pemExported;
}

/**
 * Export private key to PEM format
 * @param {CryptoKey} privateKey
 * @returns {Promise<string>}
 */
export async function exportPrivateKeyPEM(privateKey) {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  const exportedAsBase64 = window.btoa(exportedAsString);
  const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
  return pemExported;
}

/**
 * Import public key from PEM format
 * @param {string} pem
 * @returns {Promise<CryptoKey>}
 */
export async function importPublicKeyPEM(pem) {
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length).replace(/\s/g, '');
  const binaryDerString = window.atob(pemContents);
  const binaryDer = str2ab(binaryDerString);
  
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['verify']
  );
  return publicKey;
}

/**
 * Import private key from PEM format
 * @param {string} pem
 * @returns {Promise<CryptoKey>}
 */
export async function importPrivateKeyPEM(pem) {
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length).replace(/\s/g, '');
  const binaryDerString = window.atob(pemContents);
  const binaryDer = str2ab(binaryDerString);
  
  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['sign']
  );
  return privateKey;
}

/**
 * Sign a message with a private key
 * @param {CryptoKey} privateKey
 * @param {string} message
 * @returns {Promise<string>} Base64-encoded signature
 */
export async function signMessage(privateKey, message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const signature = await window.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    data
  );
  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode.apply(null, signatureArray));
  return signatureBase64;
}

/**
 * Verify a signature
 * @param {CryptoKey} publicKey
 * @param {string} signature Base64-encoded
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export async function verifySignature(publicKey, signature, message) {
  const signatureBinary = str2ab(window.atob(signature));
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const isValid = await window.crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signatureBinary,
    data
  );
  return isValid;
}

/**
 * Generate a fingerprint for a public key (SHA-256 hash)
 * @param {string} publicKeyPEM
 * @returns {Promise<string>} Hex-encoded fingerprint
 */
export async function generatePublicKeyFingerprint(publicKeyPEM) {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKeyPEM);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate a random node ID
 * @returns {string} format: node_XXXXXXXXXXXX
 */
export function generateNodeId() {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `node_${hex}`;
}

/**
 * Create a keystore JSON object
 * @param {string} nodeId
 * @param {string} publicKeyPEM
 * @param {string} privateKeyPEM
 * @param {string} fingerprint
 * @returns {object}
 */
export function createKeystore(nodeId, publicKeyPEM, privateKeyPEM, fingerprint) {
  return {
    version: '1.0',
    node_id: nodeId,
    created_at: new Date().toISOString(),
    public_key: publicKeyPEM,
    private_key: privateKeyPEM,
    fingerprint: fingerprint,
    algorithm: 'RSA-2048',
    hash: 'SHA-256',
  };
}

/**
 * Download a keystore as JSON file
 * @param {object} keystore
 * @param {string} filename
 */
export function downloadKeystore(keystore, filename = 'decentrastore-keystore.json') {
  const blob = new Blob([JSON.stringify(keystore, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a keystore file
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function readKeystoreFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const keystore = JSON.parse(e.target.result);
        resolve(keystore);
      } catch (err) {
        reject(new Error('Invalid keystore file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Helper function: string to ArrayBuffer
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
