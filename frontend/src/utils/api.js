/**
 * API Client for DecentraStore Backend
 */

const API_ROOT = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = `${API_ROOT}/api`;

/**
 * Make an API request
 * @param {string} endpoint
 * @param {object} options
 * @returns {Promise<any>}
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('decentrastore-token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Auth Endpoints ────────────────────────────────────────────────────

export async function registerNode(nodeId, publicKey, fingerprint, keystoreEncrypted) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      node_id: nodeId,
      public_key: publicKey,
      public_key_fingerprint: fingerprint,
      keystore_encrypted: keystoreEncrypted,
    }),
  });
}

export async function loginNode(nodeId, fingerprint, signature, challenge) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      node_id: nodeId,
      public_key_fingerprint: fingerprint,
      signature: signature,
      challenge: challenge,
    }),
  });
}

export async function adminLogin(username, password) {
  return apiRequest('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe() {
  return apiRequest('/auth/me');
}

// ── Storage Endpoints ─────────────────────────────────────────────────

export async function getStorageStatus() {
  return apiRequest('/storage/status');
}

export async function pledgeStorage(gigabytes) {
  return apiRequest('/storage/pledge', {
    method: 'POST',
    body: JSON.stringify({ gigabytes }),
  });
}

export async function getContainerStatus() {
  return apiRequest('/storage/container/status');
}

export async function listStorageContainers() {
  return apiRequest('/storage/containers/list');
}

// ── File Endpoints ────────────────────────────────────────────────────

/**
 * Upload file metadata and encryption info
 */
export async function uploadFileMetadata(cid, metadata, encryptionKey, iv) {
  return apiRequest('/files/upload', {
    method: 'POST',
    body: JSON.stringify({
      cid,
      filename: metadata.originalName,
      size: metadata.originalSize,
      encrypted_size: metadata.encryptedSize,
      mime_type: metadata.mimeType,
      total_chunks: metadata.totalChunks,
      chunk_size: metadata.chunkSize,
      encryption_key: encryptionKey,
      iv: iv,
    }),
  });
}

/**
 * Upload a single encrypted chunk
 */
export async function uploadChunk(chunkId, chunkIndex, chunkData, cid, chunkHash) {
  const formData = new FormData();
  const blob = new Blob([chunkData]);
  formData.append('chunk', blob);
  formData.append('chunk_id', chunkId);
  formData.append('chunk_index', chunkIndex.toString());
  formData.append('cid', cid);
  formData.append('chunk_hash', chunkHash);
  
  const token = localStorage.getItem('decentrastore-token');
  const response = await fetch(`${API_BASE}/files/chunks/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Chunk upload failed' }));
    throw new Error(error.detail);
  }
  
  return response.json();
}

/**
 * List user's uploaded files
 */
export async function listFiles() {
  return apiRequest('/files/list');
}

/**
 * Get file metadata by CID
 */
export async function getFileMetadata(cid) {
  return apiRequest(`/files/${cid}`);
}

/**
 * Retrieve all chunks for a file
 */
export async function retrieveFileChunks(cid) {
  return apiRequest(`/files/${cid}/chunks`);
}

/**
 * Delete a file
 */
export async function deleteFile(cid) {
  return apiRequest(`/files/${cid}`, {
    method: 'DELETE',
  });
}

// ── Network Endpoints ─────────────────────────────────────────────────

export async function getPeers(limit = 20) {
  return apiRequest(`/network/peers?limit=${limit}`);
}

export async function getNetworkTopology() {
  return apiRequest('/network/topology');
}

export async function getNetworkMetrics() {
  return apiRequest('/network/metrics/history');
}

// ── Admin Endpoints ───────────────────────────────────────────────────

export async function getAdminStats() {
  return apiRequest('/admin/stats');
}

export async function getAdminNodes() {
  return apiRequest('/admin/nodes');
}

export async function banNode(nodeId) {
  return apiRequest(`/admin/nodes/${nodeId}/ban`, {
    method: 'PATCH',
  });
}

export async function getProtocolSettings() {
  return apiRequest('/admin/protocol');
}

export async function updateProtocolSettings(settings) {
  return apiRequest('/admin/protocol', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

// ── Blockchain Endpoints ──────────────────────────────────────────────

export async function getBlockchainLogs(limit = 50, eventType = null) {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (eventType) params.append('event_type', eventType);
  return apiRequest(`/blockchain/logs?${params}`);
}

export async function getBlockchainStats() {
  return apiRequest('/blockchain/stats');
}

export async function getBlockchainLog(txHash) {
  return apiRequest(`/blockchain/logs/${txHash}`);
}

// ── Health Check ──────────────────────────────────────────────────────

export async function getHealth() {
  return apiRequest('/health');
}
