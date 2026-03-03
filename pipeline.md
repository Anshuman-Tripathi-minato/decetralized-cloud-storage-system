## 🏗️ High-Level Architecture

┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│  React 18 (Vite)                                                    │
│  ├─ User Portal (/app/*)         │  Admin Portal (/admin/*)        │
│  │  ├─ Dashboard                 │  ├─ Dashboard                   │
│  │  ├─ Upload                    │  ├─ Network Monitor             │
│  │  ├─ Files                     │  ├─ Blockchain Logs             │
│  │  ├─ Storage/Wallet            │  ├─ Node Registry               │
│  │  └─ Login/Register            │  ├─ Protocol Settings           │
│  │                               │  └─ Admin Login                 │
│  └─ Context: Auth, Theme
└────┬────────────────────────────┬──────────────────────────────────┘
     │                            │
     └──── HTTP/REST APIs ────────┘
          (Add JWT to headers)
          
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│  FastAPI (Uvicorn)                                                  │
│  ├─ CORS Middleware                                                 │
│  └─ Lifespan Events (startup/shutdown)                             │
└────┬────────────────────────────────────────────────────────────────┘
     │
     └─────────┬────────────┬────────────┬────────────┬──────────────┐
               │            │            │            │              │
┌──────────┐  ┌──────────┐  ┌──────────┐ ┌──────────────┐  ┌──────────┐
│ Auth     │  │ Files    │  │ Storage  │ │ Admin        │  │ Network/ │
│          │  │ Router   │  │ Router   │ │ Router       │  │Blockchain│
├──────────┤  ├──────────┤  ├──────────┤ ├──────────────┤  └──────────┘
│ POST     │  │ POST     │  │ GET      │ │ GET          │
│ /register│  │ /upload  │  │ /status  │ │ /stats       │
│ /login   │  │ /chunks  │  │ POST     │ │ GET          │
│ /admin   │  │ GET /list│  │ /pledge  │ │ /nodes       │
│          │  │ DELETE   │  │          │ │ POST /config │
└──────────┘  └──────────┘  └──────────┘ └──────────────┘
     │            │            │            │
     └────────────┴────────────┴────────────┘
               │
     ┌─────────┴──────────┐
     │                    │
┌────▼────────────────────────────────────────────────────────────────┐
│                      SECURITY & DATABASE                            │
├──────────────────────────────────────────────────────────────────────┤
│  JWT Verification (RS256)  │  MongoDB / In-Memory DB                │
│  ├─ get_current_user()     │  ├─ users collection                  │
│  └─ get_admin_user()       │  ├─ files collection                  │
│                            │  ├─ chunks collection                 │
│                            │  ├─ blockchain_logs                   │
│                            │  ├─ token_transactions                │
│                            │  └─ network_peers                     │
└────────────────────────────────────────────────────────────────────┘

## 📊 Data Pipeline (File Upload Example)
STEP 1: AUTHENTICATION
┌────────────────────────────────────────────┐
│ 1. User uploads keystore.json              │
│ 2. Browser generates challenge (random)    │
│ 3. Signs challenge with private key (RSA)  │
│ 4. Sends signature + node_id to backend    │
└────────┬───────────────────────────────────┘
         │
         ▼
       Backend verifies RSA signature
       → Returns JWT token + node_id

STEP 2: FILE UPLOAD FLOW
┌────────────────────────────────────────────┐
│ 1. User selects file (client-side)         │
│ 2. Browser encrypts file (AES-256-GCM)     │
│ 3. Splits into 1MB chunks                  │
│ 4. Generates CID (Content ID)              │
│ 5. Computes SHA-256 hash for each chunk    │
└────────┬───────────────────────────────────┘
         │
         ▼
    POST /api/files/upload
    ├─ Headers: Authorization: Bearer {JWT}
    └─ Body: FileMetadata
       ├─ cid, filename, size
       ├─ encrypted_size, mime_type
       ├─ chunk_size, total_chunks
       ├─ encryption_key (base64)
       └─ iv (initialization vector)
         │
         ▼
    Backend validation
    └─ Check duplicate CID
    └─ Save metadata to MongoDB (files collection)
    └─ Return: "metadata_saved"

STEP 3: CHUNK UPLOAD
┌────────────────────────────────────────────┐
│ For each 1MB chunk:                        │
│ 1. Browser encodes chunk as base64         │
│ 2. Computes chunk hash                     │
│ 3. Creates chunk_id                        │
└────────┬───────────────────────────────────┘
         │
         ▼
    POST /api/files/chunks/upload
    ├─ Form Data:
    │  ├─ chunk (binary file)
    │  ├─ chunk_id
    │  ├─ chunk_index
    │  ├─ cid
    │  └─ chunk_hash
    └─ Headers: Authorization: Bearer {JWT}
        │
        ▼
     Backend processes:
     ├─ Verify file belongs to user
     ├─ Read chunk data
     ├─ Encode as base64
     ├─ Store in MongoDB (chunks collection)
     ├─ Increment chunks_uploaded counter
     ├─ Check if file complete
     └─ Record blockchain event

STEP 4: STORAGE PLEDGE
┌────────────────────────────────────────────┐
│ User pledges storage to network            │
└────────┬───────────────────────────────────┘
         │
         ▼
    POST /api/storage/pledge
    ├─ Body: { gigabytes: 100 }
    └─ Headers: Authorization: Bearer {JWT}
        │
        ▼
     Backend:
     ├─ Validate GB amount (1-1000)
     ├─ Update user.storage_pledged
     ├─ Calculate reward (0.5 AST/GB)
     ├─ Update user.token_balance
     ├─ Record transaction in token_transactions
     └─ Log to blockchain_logs

 ##  🔐 Authentication Types

 Portal	    |              Type               	 |         Flow

 User       |    RSA-2048 Challenge-Response     |     1. Upload keystore.json<br/>2. Sign challenge with private key<br/>3. Verify signature with public key<br/>4. Issue JWT

 Admin       |   Username/Password                 |   1. POST /auth/admin/login<br/>2. Hash & verify password<br/>3. Issue JWT with admin role


## 📁 Database Collections
// users
{
  node_id, 
  public_key, 
  public_key_fingerprint,
  token_balance,
  storage_pledged_gb,
  storage_used_gb,
  is_active,
  registered_at,
  uptime_score
}

// files
{
  cid,
  owner_node_id,
  filename,
  size,
  encrypted_size,
  total_chunks,
  chunks_uploaded,
  is_complete,
  encryption_key,
  iv,
  uploaded_at
}

// chunks
{
  chunk_id,
  cid,
  chunk_index,
  chunk_hash,
  data (base64),
  size,
  uploaded_at,
  replicas []
}

// blockchain_logs (audit trail)
{
  tx_hash,
  event_type (upload/download/pledge/reward/register),
  node_id,
  details,
  timestamp
}

// token_transactions
{
  node_id,
  type (earn/spend),
  amount,
  category (storage/network_reward),
  timestamp
}

## 🎯 Request-Response Flow Example

USER ACTION: Upload a 100MB file
      │
      ▼
┌─────────────────────────────────────────────┐
│ Frontend (Browser)                          │
├─────────────────────────────────────────────┤
│ 1. User selected file: document.pdf (100MB) │
│ 2. generateCID() → "QmX7kh..."              │
│ 3. Encrypt AES-256: encrypted_doc           │
│ 4. Split into 100x 1MB chunks               │
│ 5. Compute SHA-256 per chunk                │
└─────────────┬───────────────────────────────┘
              │
              ▼ (with JWT in Authorization header)
    POST /api/files/upload + metadata
              │
              ▼
┌─────────────────────────────────────────────┐
│ Backend API Router (auth.py)                │
├─────────────────────────────────────────────┤
│ 1. Verify JWT token                         │
│ 2. Extract current_user from token          │
│ 3. Check duplicate CID in MongoDB           │
│ 4. Insert file record                       │
└─────────────┬───────────────────────────────┘
              │
              ▼ (200 OK)
    Return: {
      "cid": "QmX7kh...",
      "status": "metadata_saved",
      "message": "Upload file chunks next"
    }
              │
              ▼ (loop 100 times)
    POST /api/files/chunks/upload + binary data
              │
              ▼
┌─────────────────────────────────────────────┐
│ Backend (files.py - chunk handler)          │
├─────────────────────────────────────────────┤
│ 1. Verify user owns file                    │
│ 2. Read binary chunk data                   │
│ 3. Base64 encode                            │
│ 4. Insert into chunks collection            │
│ 5. Update file progress counter             │
│ 6. Check if all chunks uploaded             │
└─────────────┬───────────────────────────────┘
              │
              ▼ (200 OK × 100)
    Return: {
      "chunk_id": "chunk_0",
      "status": "uploaded",
      "file_complete": false/true
    }
              │
              ▼ (When complete)
    Emit blockchain_log event
    Return admin dashboard shows new file

## 🔄 Request Pipeline Summary

1.Client Layer → React 18, Web Crypto API, HTTP requests
2.API Gateway → FastAPI, route + authenticate
3.Handler → Business logic (auth.py, files.py, storage.py, etc.)
4.Database Layer → MongoDB with collections
5.Response → JSON back to frontend
6.Audit → Blockchain logs event