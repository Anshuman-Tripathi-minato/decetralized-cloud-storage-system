# 🏗️ Docker Storage Node Feature - Architecture & Workflow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER FRONTEND (React)                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │            Storage Node Page (user/StoragePage.jsx)         │  │
│  │                                                             │  │
│  │  Input: Storage Amount (1-100 GB)                          │  │
│  │  Button: "Pledge {X} GB & Start Earning"                   │  │
│  │                                                             │  │
│  │  Display:                                                   │  │
│  │  ├─ Current Pledge (GB)                                    │  │
│  │  ├─ Daily Earnings (AST)                                   │  │
│  │  ├─ Monthly Estimate (AST)                                 │  │
│  │  ├─ Container Status Card (NEW)                            │  │
│  │  │  ├─ Running status (green dot)                          │  │
│  │  │  ├─ Container ID                                        │  │
│  │  │  ├─ Allocated Storage                                   │  │
│  │  │  └─ Volume Name                                         │  │
│  │  └─ Success Message with container details                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────┬──────────────────────────────────────────────┘
                      │
                      │ HTTP POST
                      │ /api/storage/pledge
                      │ { gigabytes: 10 }
                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND FastAPI Server                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │           Storage Router (routers/storage.py)               │  │
│  │                                                             │  │
│  │  POST /pledge:                                              │  │
│  │  1. Validate request (1-1000 GB)                            │  │
│  │  2. Get current user from JWT                               │  │
│  │  3. Query MongoDB users collection                          │  │
│  │  4. Calculate new pledge & rewards                          │  │
│  └─────────────────────┬───────────────────────────────────────┘  │
│                        │                                           │
│                        ↓                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │     Docker Service (services/docker_service.py) [NEW]       │  │
│  │                                                             │  │
│  │  create_storage_container(node_id, storage_gb):             │  │
│  │  ├─ Connect to Docker daemon (/var/run/docker.sock)         │  │
│  │  ├─ Create Docker volume                                    │  │
│  │  │  Name: decentrastore-data-{node_id}                      │  │
│  │  │  Driver: local                                           │  │
│  │  │  Labels: node_id, storage_gb                             │  │
│  │  ├─ Create Docker container                                 │  │
│  │  │  Image: alpine:latest                                    │  │
│  │  │  Name: decentrastore-storage-{node_id}                   │  │
│  │  │  Volume Mount: /storage                                  │  │
│  │  │  Env Vars: NODE_ID, STORAGE_GB, PURPOSE                  │  │
│  │  │  Restart: unless-stopped                                 │  │
│  │  │  Labels: decentrastore=true, node_id, etc.               │  │
│  │  └─ Return container info (id, name, status)                │  │
│  └─────────────────────┬───────────────────────────────────────┘  │
│                        │                                           │
│                        ↓                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              MongoDB Database (motor async)                 │  │
│  │                                                             │  │
│  │  Updates:                                                   │  │
│  │  db.users.update_one({                                      │  │
│  │    node_id: user_id                                         │  │
│  │  }, {                                                       │  │
│  │    storage_pledged: new_sum,                                │  │
│  │    token_balance: new_balance,                              │  │
│  │    container_id: {container_id},                            │  │
│  │    container_name: {container_name},                        │  │
│  │    is_storage_node: true                                    │  │
│  │  })                                                         │  │
│  │                                                             │  │
│  │  Inserts:                                                   │  │
│  │  db.storage_containers.insert_one({                         │  │
│  │    node_id, container_id, container_name,                   │  │
│  │    storage_gb, volume_name, status, created_at              │  │
│  │  })                                                         │  │
│  │                                                             │  │
│  │  db.token_transactions.insert_one({                         │  │
│  │    node_id, type: 'earn', amount: 5.0,                      │  │
│  │    description: 'Storage pledge: 10 GB',                    │  │
│  │    category: 'storage', timestamp                           │  │
│  │  })                                                         │  │
│  └─────────────────────┬───────────────────────────────────────┘  │
│                        │                                           │
│                        ↓                                           │
│              Response JSON:                                        │
│              {                                                     │
│                pledged_gb: 10,                                     │
│                total_pledge_gb: 10,                                │
│                reward_ast: 5.0,                                    │
│                new_balance: 105.0,                                 │
│                message: "Successfully pledged...",                 │
│                container: {                                        │
│                  container_id: "abc123def456",                     │
│                  container_name: "decentrastore-storage-user",     │
│                  status: "running",                                │
│                  storage_gb: 10,                                   │
│                  volume_name: "decentrastore-data-user",           │
│                  volume_path: "/var/lib/docker/volumes/..."        │
│                }                                                   │
│              }                                                     │
└─────────────────────────────────────────────────────────────────────┘
                      │
                      │ HTTP Response
                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         USER FRONTEND (React)                       │
│                                                                     │
│  ✅ Show success message                                           │
│  ✅ Display container status card                                  │
│  ✅ Update pledge amount & earnings                                │
│  ✅ Refresh container status                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Docker Infrastructure

```
┌───────────────────────────────────────────────────────────────────┐
│                      Docker Daemon                                │
│                  (/var/run/docker.sock)                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Storage Node 1 (User A)                     │    │
│  │                                                          │    │
│  │  Container: decentrastore-storage-user-a                │    │
│  │  ├─ Runtime: Alpine Linux                               │    │
│  │  ├─ Restart: Unless-stopped                             │    │
│  │  ├─ Memory: Unlimited (can be limited)                  │    │
│  │  ├─ CPU: Unlimited (can be limited)                     │    │
│  │  └─ Mounts:                                              │    │
│  │     └─ /storage → decentrastore-data-user-a             │    │
│  │                                                          │    │
│  │  Volume: decentrastore-data-user-a                      │    │
│  │  ├─ Driver: local                                       │    │
│  │  ├─ Path: /var/lib/docker/volumes/decentre.../_data     │    │
│  │  └─ Data: Encrypted file chunks (persistent)            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Storage Node 2 (User B)                     │    │
│  │                                                          │    │
│  │  Container: decentrastore-storage-user-b                │    │
│  │  └─ Similar structure as Node 1                         │    │
│  │     (isolated, separate volume, separate data)          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Storage Node N (User N)                     │    │
│  │                                                          │    │
│  │  Container: decentrastore-storage-user-n                │    │
│  │  └─ Similar structure as Node 1                         │    │
│  │     (isolated, separate volume, separate data)          │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow: File Upload & Storage

```
                    GET /storage/status
                          │
                          ↓
        ┌─────────────────────────────────┐
        │  Docker Service (get_container  │
        │  _info, is_container_running)   │
        │                                 │
        │  Returns:                       │
        │  - Running status               │
        │  - Memory usage                 │
        │  - Container metadata           │
        └─────────────────────────────────┘
                          │
                          ↓
        Frontend shows container status in
        Storage Node page
```

## Container Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     Container Lifecycle                         │
└─────────────────────────────────────────────────────────────────┘

1. CREATION (User pledges)
   ┌───────────────────────────────────────┐
   │ User pledges 10 GB storage             │
   └───────────────────────────────────────┘
            ↓
   ┌───────────────────────────────────────┐
   │ Docker volume created                  │
   │ (decentrastore-data-{node_id})        │
   └───────────────────────────────────────┘
            ↓
   ┌───────────────────────────────────────┐
   │ Alpine container created & started     │
   │ (decentrastore-storage-{node_id})     │
   └───────────────────────────────────────┘
            ↓
   ┌───────────────────────────────────────┐
   │ Container registered in MongoDB        │
   │ User marked as storage_node            │
   └───────────────────────────────────────┘

2. RUNNING
   ┌───────────────────────────────────────┐
   │ Container ready to receive chunks      │
   │ Other nodes can upload encrypted files │
   │ Data stored at /storage (volume mount) │
   └───────────────────────────────────────┘

3. OPERATION
   ┌───────────────────────────────────────┐
   │ Other users upload encrypted chunks:   │
   │ POST /api/files/chunks/upload          │
   │                                       │
   │ Storage location:                      │
   │ /storage/{cid}/{chunk_id}              │
   │ (inside container, mounted volume)     │
   └───────────────────────────────────────┘
            ↓
   ┌───────────────────────────────────────┐
   │ Daily earnings accrue (0.5 AST/GB/day) │
   │ Token transactions recorded            │
   └───────────────────────────────────────┘

4. MONITORING
   ┌───────────────────────────────────────┐
   │ GET /api/storage/status                │
   │ → Returns container status             │
   │ GET /api/storage/container/status      │
   │ → Returns detailed container info      │
   └───────────────────────────────────────┘

5. TERMINATION (Optional)
   ┌───────────────────────────────────────┐
   │ User can stop pledge (future feature)  │
   │ Container stopped (not deleted)        │
   │ Volume data preserved                  │
   │ Future: Can restart container          │
   └───────────────────────────────────────┘

6. RESTART (Auto)
   ┌───────────────────────────────────────┐
   │ If container crashes:                  │
   │ Docker daemon auto-restarts it         │
   │ (restart_policy: unless-stopped)       │
   │ Data remains intact in volume          │
   └───────────────────────────────────────┘
```

## State Diagram: Container & Node Status

```
                        START
                          │
                          ↓
                   ┌──────────────┐
                   │ User Pledges  │
                   │ Storage       │
                   └──────┬───────┘
                          │
                          ↓
            ┌─────────────────────────────┐
            │ Container Created (Running) │
            └──────────┬──────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
        ↓              ↓                  ↓
    ┌────────┐  ┌────────────┐  ┌──────────────┐
    │Running │  │Unhealthy   │  │Stopped       │
    │(Green) │  │(Yellow)    │  │(Grey)        │
    └────┬───┘  └─────┬──────┘  └──────┬───────┘
         │            │                 │
         │            └─────────────────┘
         │                 │(restart)
         │                 ↑
         │        ┌────────────────┐
         │        │Volume Persisted│
         │        │(Data Safe)     │
         └────────┴────────────────┘
                        │
                        ↓
                   ┌──────────────┐
                   │Pledge Active  │
                   │Earning Tokens │
                   └──────┬───────┘
                          │
                    (future: revoke)
                          │
                          ↓
                   ┌──────────────┐
                   │Data Withdrawn │
                   │Container Kept │
                   └──────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│  Pledge Storage Endpoint                                │
└─────────────────────────┬───────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ↓                   ↓
         Validate     Docker Available?
         Request      
         (1-1000 GB)  YES            NO
            │          │              │
            │          ↓              ↓
            │  Create Container  Continue
            │         │           (no container)
            │         │              │
            │    Success?         WARNING
            │    /  \            logged
            │   /    \               │
            │  Y      N              │
            │  │      │              │
            │  │      └──┐      ┌────┘
            │  │         │      │
            │  └─────────┼──────┘
            │            │
            └────────┬───┴──────────────┐
                     │                  │
                     ↓                  ↓
            ┌──────────────┐    ┌────────────────┐
            │ Return OK    │    │ Return Error   │
            │ with details │    │ with reason    │
            └──────────────┘    └────────────────┘
                     │                  │
                     └────────┬─────────┘
                              │
                              ↓
                         Frontend
                         Update UI
```

## Integration Points

### 1. Frontend Integration
- **Component**: `StoragePage.jsx`
- **API Calls**:
  - `pledgeStorage(gigabytes)` - Create pledge + container
  - `getStorageStatus()` - Get pledge & container info
  - `getContainerStatus()` - Get detailed container status
- **State Updates**:
  - Success: Display container card
  - Error: Show error message
  - Loading: Show spinner while pledging

### 2. Backend Integration
- **Router**: `storage.py`
- **Service**: `docker_service.py`
- **Database**:
  - `users` collection - container_id, container_name, is_storage_node
  - `storage_containers` collection - container tracking
  - `token_transactions` collection - reward recording

### 3. Docker Integration
- **Client**: Python Docker SDK
- **Connection**: Unix socket (/var/run/docker.sock)
- **Resources**:
  - Containers: Alpine Linux based
  - Volumes: Local driver
  - Networks: Bridge (default)

### 4. Database Integration
- **Collections Created**:
  - `storage_containers` - New collection for tracking
  - `users` - Updated with container fields
  - `token_transactions` - Records rewards
- **Queries**:
  - Insert container record
  - Update user container_id
  - Query container status
  - Find containers by node_id

## Summary

The Docker Storage Node feature seamlessly integrates:

1. **Frontend**: Beautiful UI for pledging and monitoring
2. **Backend**: Fast API endpoints with business logic
3. **Docker**: Automated container + volume provisioning
4. **Database**: Persistent tracking and reward recording
5. **Monitoring**: Real-time status and health checks

Users can now become infrastructure providers and earn tokens by contributing encrypted storage to the network!
