"""
Auth Router — Sprint 1 stub, fully implemented in Sprint 2.
Provides JWT issuance for RSA-based user identity and admin login.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import datetime
from core.security import create_access_token, get_current_user
from core.config import settings
from core.database import get_db
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Pydantic Schemas ──────────────────────────────────────────────────

class NodeRegisterRequest(BaseModel):
    node_id: str
    public_key: str          # PEM-encoded RSA-2048 public key
    public_key_fingerprint: str
    keystore_encrypted: str  # Encrypted private key blob (client-side encrypted)


class NodeLoginRequest(BaseModel):
    node_id: str
    public_key_fingerprint: str
    challenge: str           # The message that was signed
    signature: str           # Challenge response signed with private key


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    node_id: str
    role: str


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_node(req: NodeRegisterRequest):
    """Register a new storage node with RSA public key."""
    db = get_db()

    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Check if node_id already exists
    existing = await db.users.find_one({"node_id": req.node_id})
    if existing:
        raise HTTPException(status_code=400, detail="Node ID already registered")

    # Check fingerprint uniqueness
    existing_fp = await db.users.find_one({"public_key_fingerprint": req.public_key_fingerprint})
    if existing_fp:
        raise HTTPException(status_code=400, detail="Public key fingerprint already registered")

    # Create user document
    user_doc = {
        "node_id": req.node_id,
        "public_key": req.public_key,
        "public_key_fingerprint": req.public_key_fingerprint,
        "keystore_encrypted": req.keystore_encrypted,
        "token_balance": 0.0,
        "storage_pledged_gb": 0,
        "storage_used_gb": 0.0,
        "is_active": True,
        "registered_at": datetime.utcnow(),
        "last_seen": datetime.utcnow(),
        "uptime_score": 100.0,
    }

    await db.users.insert_one(user_doc)

    # Log to blockchain
    await _log_blockchain_event(db, "NODE_REGISTERED", req.node_id, {
        "fingerprint": req.public_key_fingerprint
    })

    token = create_access_token({"sub": req.node_id, "role": "user", "fingerprint": req.public_key_fingerprint})
    return TokenResponse(access_token=token, node_id=req.node_id, role="user")


@router.post("/login", response_model=TokenResponse)
async def login_node(req: NodeLoginRequest):
    """Authenticate a node by verifying its RSA signature."""
    db = get_db()

    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user = await db.users.find_one({"node_id": req.node_id})
    if not user:
        raise HTTPException(status_code=404, detail="Node not found. Please register first.")

    if user.get("public_key_fingerprint") != req.public_key_fingerprint:
        raise HTTPException(status_code=401, detail="Invalid identity credentials")

    # Verify the signature
    from utils.crypto import verify_rsa_signature
    is_valid = verify_rsa_signature(
        user.get("public_key"),
        req.signature,
        req.challenge
    )
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Update last seen
    await db.users.update_one(
        {"node_id": req.node_id},
        {"$set": {"last_seen": datetime.utcnow(), "is_active": True}}
    )

    token = create_access_token({
        "sub": req.node_id,
        "role": "user",
        "fingerprint": req.public_key_fingerprint
    })
    return TokenResponse(
        access_token=token,
        node_id=req.node_id,
        role="user"
    )


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(req: AdminLoginRequest):
    """Traditional admin login with username/password."""
    if req.username != settings.ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    # Simple string comparison for prototype
    # In production, use pre-hashed passwords stored securely
    if req.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = create_access_token({"sub": req.username, "role": "admin"})
    return TokenResponse(access_token=token, node_id=req.username, role="admin")


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user = await db.users.find_one({"node_id": current_user["sub"]}, {"_id": 0, "private_key": 0, "keystore_encrypted": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# ── Helper ────────────────────────────────────────────────────────────

async def _log_blockchain_event(db, event_type: str, node_id: str, metadata: dict):
    """Write a simulated Hyperledger Fabric event to MongoDB."""
    import hashlib, json, uuid
    tx_data = {
        "event_type": event_type,
        "node_id": node_id,
        "metadata": metadata,
        "timestamp": datetime.utcnow().isoformat(),
        "nonce": str(uuid.uuid4()),
    }
    tx_hash = hashlib.sha256(json.dumps(tx_data, sort_keys=True).encode()).hexdigest()
    await db.blockchain_logs.insert_one({
        "tx_hash": tx_hash,
        "event_type": event_type,
        "node_id": node_id,
        "metadata": metadata,
        "block_number": await db.blockchain_logs.count_documents({}) + 14829,
        "channel": "decentrastore-channel",
        "chaincode": "storage-contract",
        "timestamp": datetime.utcnow(),
        "status": "VALID",
    })
