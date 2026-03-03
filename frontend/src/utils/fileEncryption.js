/**
 * File Encryption & Chunking Utilities for DecentraStore
 * Uses AES-256-GCM for client-side encryption
 */

const CHUNK_SIZE = 256 * 1024; // 256 KB per chunk
const AES_KEY_LENGTH = 256;

/**
 * Generate AES-256 encryption key
 * @returns {Promise<CryptoKey>}
 */
export async function generateAESKey() {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: AES_KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export AES key to base64 string
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function exportAESKey(key) {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import AES key from base64 string
 * @param {string} keyB64
 * @returns {Promise<CryptoKey>}
 */
export async function importAESKey(keyB64) {
  const keyBuffer = base64ToArrayBuffer(keyB64);
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate initialization vector for AES-GCM
 * @returns {Uint8Array}
 */
export function generateIV() {
  return crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
}

/**
 * Encrypt data with AES-256-GCM
 * @param {CryptoKey} key
 * @param {ArrayBuffer} data
 * @param {Uint8Array} iv
 * @returns {Promise<ArrayBuffer>}
 */
export async function encryptData(key, data, iv) {
  return await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );
}

/**
 * Decrypt data with AES-256-GCM
 * @param {CryptoKey} key
 * @param {ArrayBuffer} encryptedData
 * @param {Uint8Array} iv
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptData(key, encryptedData, iv) {
  return await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedData
  );
}

/**
 * Generate SHA-256 hash of data
 * @param {ArrayBuffer} data
 * @returns {Promise<string>} Hex string
 */
export async function sha256Hash(data) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate Content ID (CID) from file data
 * @param {ArrayBuffer} data
 * @returns {Promise<string>}
 */
export async function generateCID(data) {
  const hash = await sha256Hash(data);
  return `bafk${hash.substring(0, 56)}`; // IPFS-like CID prefix
}

/**
 * Split file into chunks
 * @param {File} file
 * @returns {Promise<Array<{index: number, data: ArrayBuffer, size: number}>>}
 */
export async function chunkFile(file) {
  const chunks = [];
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);
    const data = await blob.arrayBuffer();
    
    chunks.push({
      index: i,
      data: data,
      size: data.byteLength,
    });
  }
  
  return chunks;
}

/**
 * Encrypt a file and split into chunks
 * @param {File} file
 * @param {CryptoKey} aesKey
 * @param {Function} progressCallback (current, total) => void
 * @returns {Promise<{cid: string, encryptedChunks: Array, iv: string, metadata: object}>}
 */
export async function encryptFile(file, aesKey, progressCallback = null) {
  // Read entire file
  const fileData = await file.arrayBuffer();
  
  // Generate CID from original data
  const cid = await generateCID(fileData);
  
  // Generate IV
  const iv = generateIV();
  
  // Encrypt entire file
  const encryptedData = await encryptData(aesKey, fileData, iv);
  
  // Split encrypted data into chunks
  const blob = new Blob([encryptedData]);
  const encryptedFile = new File([blob], file.name);
  const chunks = await chunkFile(encryptedFile);
  
  // Generate chunk IDs
  const encryptedChunks = await Promise.all(
    chunks.map(async (chunk, idx) => {
      const chunkHash = await sha256Hash(chunk.data);
      
      if (progressCallback) {
        progressCallback(idx + 1, chunks.length);
      }
      
      return {
        chunk_id: `chunk_${cid}_${idx}`,
        index: idx,
        data: chunk.data,
        size: chunk.size,
        hash: chunkHash,
      };
    })
  );
  
  return {
    cid,
    encryptedChunks,
    iv: arrayBufferToBase64(iv),
    metadata: {
      originalName: file.name,
      originalSize: file.size,
      encryptedSize: encryptedData.byteLength,
      mimeType: file.type,
      totalChunks: chunks.length,
      chunkSize: CHUNK_SIZE,
      uploadedAt: new Date().toISOString(),
    },
  };
}

/**
 * Decrypt file chunks and reconstruct original file
 * @param {Array} encryptedChunks Array of {data: ArrayBuffer}
 * @param {CryptoKey} aesKey
 * @param {string} ivB64
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptFile(encryptedChunks, aesKey, ivB64) {
  // Concatenate all chunks
  const totalSize = encryptedChunks.reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
  const combined = new Uint8Array(totalSize);
  
  let offset = 0;
  for (const chunk of encryptedChunks) {
    combined.set(new Uint8Array(chunk.data), offset);
    offset += chunk.data.byteLength;
  }
  
  // Decrypt
  const iv = base64ToArrayBuffer(ivB64);
  const decrypted = await decryptData(aesKey, combined.buffer, new Uint8Array(iv));
  
  return decrypted;
}

/**
 * Download decrypted file
 * @param {ArrayBuffer} data
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadFile(data, filename, mimeType = 'application/octet-stream') {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Helper Functions ──────────────────────────────────────────────────

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
