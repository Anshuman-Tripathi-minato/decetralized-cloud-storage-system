/**
 * API Client for DecentraStore Backend
 */

const REMOTE_API_ROOTS = [
  // Keep both spellings because production projects were created with inconsistent names.
  'https://decetralized-cloud-storage-system-production.up.railway.app',
  'https://decentralized-cloud-storage-system-production.up.railway.app',
];

function normalizeApiRoot(rawValue) {
  const value = (rawValue || '').trim();
  if (!value) return '';

  const isLocalBrowser = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalBrowser && /(localhost|127\.0\.0\.1)(:\d+)?/i.test(value)) {
    return '';
  }

  // Treat "/api" as a local-development proxy path only.
  // Production builds should fall through to the configured remote root.
  if (value === '/api') {
    return '';
  }

  // Accept relative API root like /backend or /api-gateway.
  if (value.startsWith('/')) {
    return value.replace(/\/$/, '');
  }

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, '');
  }

  // Accept protocol-relative host values.
  if (value.startsWith('//')) {
    return `https:${value}`.replace(/\/$/, '');
  }

  // If env value is host-only, assume HTTPS to avoid invalid fetch URLs.
  // Reject single-label hosts (for example "decentralized-cloud-k") because
  // they frequently indicate a truncated or invalid production hostname.
  if (!value.includes('.')) {
    return '';
  }

  return `https://${value}`.replace(/\/$/, '');
}

const ENV_API_ROOT = normalizeApiRoot(import.meta.env.VITE_API_URL || '');
const IS_LOCAL_HOST = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const ENABLE_REMOTE_FALLBACK = !IS_LOCAL_HOST;
const DEFAULT_API_ROOT = IS_LOCAL_HOST ? '' : REMOTE_API_ROOTS[0];
const API_ROOT = ENV_API_ROOT || DEFAULT_API_ROOT;
const API_BASE = !API_ROOT ? '/api' : (API_ROOT.endsWith('/api') ? API_ROOT : `${API_ROOT}/api`);
const REMOTE_API_BASES = REMOTE_API_ROOTS.map((root) => `${root}/api`);

function shouldRetryWithRemoteFallback(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('err_name_not_resolved')
  );
}

async function fetchJsonWithErrors(url, config) {
  const response = await fetch(url, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Make an API request
 * @param {string} endpoint
 * @param {object} options
 * @returns {Promise<any>}
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const fallbackUrls = REMOTE_API_BASES.map((base) => `${base}${endpoint}`);
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Use admin token for admin-only endpoint groups; fallback to user token when needed.
  const userToken = localStorage.getItem('decentrastore-token');
  const adminToken = localStorage.getItem('decentrastore-admin-token');
  const isAdminScopedEndpoint = endpoint.startsWith('/admin') || endpoint.startsWith('/blockchain');
  const token = isAdminScopedEndpoint ? (adminToken || userToken) : userToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    return await fetchJsonWithErrors(url, config);
  } catch (error) {
    // Production safety net: if env/rewrite DNS fails, retry known remote API roots.
    if (ENABLE_REMOTE_FALLBACK && shouldRetryWithRemoteFallback(error)) {
      for (const fallbackUrl of fallbackUrls) {
        if (fallbackUrl === url) continue;
        try {
          return await fetchJsonWithErrors(fallbackUrl, config);
        } catch (_fallbackError) {
          // Keep trying remaining fallback hosts.
        }
      }
    }
    throw error;
  }
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

export async function getMyTransactions(limit = 100) {
  return apiRequest(`/auth/transactions?limit=${limit}`);
}

// ── Storage Endpoints ─────────────────────────────────────────────────

export async function getStorageStatus() {
  return apiRequest('/storage/status');
}

export async function pledgeStorage(gigabytes, hostStoragePath, storageTargetLabel = null, providerAgentUrl = null) {
  return apiRequest('/storage/pledge', {
    method: 'POST',
    body: JSON.stringify({
      gigabytes,
      host_storage_path: hostStoragePath,
      storage_target_label: storageTargetLabel,
      provider_agent_url: providerAgentUrl,
    }),
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
  const config = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  };

  const primaryUrl = `${API_BASE}/files/chunks/upload`;
  const fallbackUrls = REMOTE_API_BASES.map((base) => `${base}/files/chunks/upload`);

  try {
    const response = await fetch(primaryUrl, config);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Chunk upload failed' }));
      throw new Error(error.detail);
    }
    return response.json();
  } catch (error) {
    if (ENABLE_REMOTE_FALLBACK && shouldRetryWithRemoteFallback(error)) {
      for (const fallbackUrl of fallbackUrls) {
        if (fallbackUrl === primaryUrl) continue;
        const response = await fetch(fallbackUrl, config).catch(() => null);
        if (!response) continue;
        if (!response.ok) {
          const fallbackError = await response.json().catch(() => ({ detail: 'Chunk upload failed' }));
          throw new Error(fallbackError.detail);
        }
        return response.json();
      }
    }
    throw error;
  }
}

/**
 * List user's uploaded files
 */
export async function listFiles() {
  return apiRequest('/files/list');
}

export async function getMyFileDistributionSummary() {
  return apiRequest('/files/distribution/summary');
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

export async function getAdminStorageDistribution(limit = 200) {
  return apiRequest(`/admin/storage-distribution?limit=${limit}`);
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
