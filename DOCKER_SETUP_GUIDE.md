# 🚀 Quick Start: Docker Storage Node Feature

## Installation

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `docker==7.0.0` - Docker Python SDK

### 2. Ensure Docker is Running
```bash
# Check Docker status
docker --version
docker ps

# If Docker not running:
# - Linux: sudo systemctl start docker
# - Mac: Open Docker Desktop
# - Windows: docker daemon
```

### 3. Start the Backend
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

You should see in the logs:
```
✅ Docker service initialized
📦 Found X existing storage containers
```

### 4. Start the Frontend
```bash
cd frontend
npm run dev
```

## How It Works

### User Journey

1. **Login to User Portal** → Go to "Storage Node" page

2. **Pledge Storage**
   - Move slider to select amount (1-100 GB)
   - Click "Pledge X GB & Start Earning"
   - Backend automatically creates Docker container

3. **See Container Status**
   - Container status card shows:
     - ✅ Container is running
     - Container ID (e.g., `abc123def456`)
     - Allocated storage (10 GB)
     - Volume name
   - Status indicator shows "Running"

4. **Earn Rewards**
   - 0.5 AST per GB per day
   - Check wallet to see earnings accumulate
   - Withdraw to personal wallet anytime

### What Happens Behind the Scenes

```
User clicks "Pledge 10 GB"
    ↓
POST /api/storage/pledge { gigabytes: 10 }
    ↓
Backend:
├─ Validates pledge (1-1000 GB)
├─ Creates Docker container "decentrastore-storage-user123"
├─ Creates Docker volume "decentrastore-data-user123"
├─ Mounts volume at /storage in container
├─ Sets restart policy to "unless-stopped"
├─ Saves container info to MongoDB
├─ Records 5.0 AST reward
└─ Returns container details
    ↓
Frontend displays:
├─ Success message with container info
├─ Container status card
└─ Updated earnings display
```

## API Endpoints

### Pledge Storage
```bash
curl -X POST http://localhost:8000/api/storage/pledge \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"gigabytes": 10}'
```

**Response:**
```json
{
  "pledged_gb": 10,
  "total_pledge_gb": 10,
  "reward_ast": 5.0,
  "new_balance": 105.0,
  "message": "Successfully pledged 10 GB. Earned 5.0 AST!",
  "container": {
    "container_id": "abc123",
    "container_name": "decentrastore-storage-user123",
    "status": "running",
    "storage_gb": 10,
    "volume_name": "decentrastore-data-user123"
  }
}
```

### Get Storage Status
```bash
curl http://localhost:8000/api/storage/status \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "node_id": "user123",
  "storage_pledged": 10737418240,
  "storage_used": 0,
  "files_uploaded": 0,
  "total_uploaded_size": 0,
  "chunks_stored": 0,
  "token_balance": 105.0,
  "is_active": true,
  "container_running": true,
  "container_id": "abc123",
  "container_name": "decentrastore-storage-user123"
}
```

### Get Container Status
```bash
curl http://localhost:8000/api/storage/container/status \
  -H "Authorization: Bearer {token}"
```

### List All Containers
```bash
curl http://localhost:8000/api/storage/containers/list \
  -H "Authorization: Bearer {token}"
```

## Docker Commands for Testing

### View Storage Containers
```bash
# List running containers
docker ps --filter "label=decentrastore=true"

# List all containers (including stopped)
docker ps -a --filter "label=decentrastore=true"
```

### Inspect a Container
```bash
docker inspect decentrastore-storage-user123
```

### View Volumes
```bash
# List all DecentraStore volumes
docker volume ls | grep decentrastore-data

# Inspect a volume
docker volume inspect decentrastore-data-user123
```

### View Container Logs
```bash
docker logs decentrastore-storage-user123
```

### Check Volume Storage
```bash
# This will vary by system, but volumes are typically in:
ls -la /var/lib/docker/volumes/decentrastore-data-user123/_data/
```

## Testing the Feature

### Test Case 1: First Pledge
1. Go to Storage Node page
2. Set storage to 10 GB
3. Click pledge button
4. Verify:
   - ✅ Container created
   - ✅ Storage status shows 10 GB pledged
   - ✅ Daily earnings show 5 AST
   - ✅ Container status card visible
   - ✅ Check Docker: `docker ps | grep decentrastore`

### Test Case 2: Additional Pledge
1. Go to Storage Node page
2. Set storage to 5 GB
3. Click pledge button
4. Verify:
   - ✅ New container created (separate from first)
   - ✅ Total pledge shows 15 GB
   - ✅ Wallet shows 2.5 additional AST earned
   - ✅ Check Docker: `docker ps | grep decentrastore` (see 2 containers)

### Test Case 3: Container Restart
1. Stop a container: `docker stop decentrastore-storage-user123`
2. Wait 5 seconds
3. Verify restart: `docker ps | grep decentrastore` - should be running again
4. This tests the `restart_policy: unless-stopped`

### Test Case 4: Connection Issues
1. Stop Docker: `docker stop -t 0 $(docker ps -q)` or pause Docker Desktop
2. Try to pledge storage
3. Verify:
   - ✅ Request still succeeds
   - ✅ Warning shown about Docker unavailable
   - ✅ Backend logs show Docker connection failed
   - ✅ Can retry when Docker is back

## Troubleshooting

### Docker Connection Failed
```python
# Check in logs: "Docker daemon is not available"

# Solution:
# 1. Verify Docker running: docker ps
# 2. Check Docker socket: ls -la /var/run/docker.sock
# 3. Check permissions: groups $USER | grep docker
# 4. If needed: sudo usermod -aG docker $USER
```

### Container Not Found
```python
# Check what containers exist:
docker ps -a

# View logs:
docker logs decentrastore-storage-{node_id}

# Check Docker errors:
journalctl -u docker -n 20
```

### Database Errors
```python
# Verify MongoDB is running:
mongo --version
mongo localhost:27017

# Check collections:
# In mongo shell:
# use decentrastore_db
# db.storage_containers.find()
# db.users.find({"is_storage_node": true})
```

### Port Conflicts
```bash
# Backend using 8000, Frontend using 5173
# If conflicts:
python -m uvicorn main:app --port 8001
# or
npm run dev -- --port 5174
```

## Configuration

### Customize Container Settings
In `backend/services/docker_service.py`, method `create_storage_container()`:

```python
# Add memory limit (default: unlimited)
mem_limit='512m',

# Add CPU limit (default: unlimited)
cpus=0.5,

# Change base image (currently: alpine:latest)
image='alpine:latest',

# Add environment variables
environment={
    'CUSTOM_VAR': 'value',
    # ... existing vars
}
```

## Performance Notes

- **Container Creation Time**: ~2-3 seconds per container
- **Volume Creation Time**: ~1 second
- **Memory Per Container**: ~5-10 MB (Alpine base)
- **Volume Storage**: Depends on file sizes, no preset limit
- **Max Containers**: Limited by system resources

## Security Checklist

- ✅ Each user's node has separate container
- ✅ Each node has dedicated Docker volume
- ✅ Data is encrypted before storage
- ✅ Containers can't delete their data (persistent volume)
- ✅ Only authenticated users can pledge
- ✅ Only the user can access their container data

## Next Steps

1. **User Signup/Login**: Create user account
2. **Fund Wallet**: Get initial tokens (if available)
3. **Pledge Storage**: Follow the feature walkthrough above
4. **Monitor Earnings**: Check wallet page for rewards
5. **Expand Pledge**: Add more storage for more earnings

## Support

If containers aren't creating:

1. Check Docker logs:
   ```bash
   docker system events --filter "type=container"
   ```

2. Check backend logs for errors:
   ```
   Look for: "Docker API error" or "Docker daemon is not available"
   ```

3. Verify Docker socket permissions:
   ```bash
   sudo chown $USER:docker /var/run/docker.sock
   ```

4. Check system resources:
   ```bash
   docker stats
   free -h
   df -h
   ```

---

**You're all set! 🎉 Users can now earn tokens by providing storage infrastructure!**
