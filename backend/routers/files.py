"""Files Router — File Upload, Retrieval, and Management."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from backend.core.security import get_current_user
from backend.core.database import get_db
import base64

router = APIRouter()


class FileMetadata(BaseModel):
    cid: str
    filename: str
    size: int
    encrypted_size: int
    mime_type: Optional[str] = None
    total_chunks: int
    chunk_size: int
    encryption_key: str  # Base64 encoded AES key
    iv: str  # Base64 encoded initialization vector


@router.post("/upload")
async def upload_file_metadata(
    file_metadata: FileMetadata,
    current_user: dict = Depends(get_current_user)
):
    """Store file metadata and encryption information."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Check if file already exists
    existing = await db.files.find_one({"cid": file_metadata.cid})
    if existing:
        raise HTTPException(status_code=409, detail="File with this CID already exists")

    file_doc = {
        "cid": file_metadata.cid,
        "owner_node_id": current_user["sub"],
        "filename": file_metadata.filename,
        "size": file_metadata.size,
        "encrypted_size": file_metadata.encrypted_size,
        "mime_type": file_metadata.mime_type,
        "total_chunks": file_metadata.total_chunks,
        "chunk_size": file_metadata.chunk_size,
        "encryption_key": file_metadata.encryption_key,
        "iv": file_metadata.iv,
        "uploaded_at": datetime.utcnow(),
        "is_complete": False,
        "chunks_uploaded": 0,
    }

    await db.files.insert_one(file_doc)

    return {
        "cid": file_metadata.cid,
        "status": "metadata_saved",
        "message": "Upload file chunks next",
    }


@router.post("/chunks/upload")
async def upload_chunk(
    chunk: UploadFile = File(...),
    chunk_id: str = Form(...),
    chunk_index: int = Form(...),
    cid: str = Form(...),
    chunk_hash: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a single encrypted chunk."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Verify file exists and belongs to user
    file_doc = await db.files.find_one({"cid": cid, "owner_node_id": current_user["sub"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    # Read chunk data
    chunk_data = await chunk.read()
    chunk_data_b64 = base64.b64encode(chunk_data).decode('utf-8')

    # Store chunk
    chunk_doc = {
        "chunk_id": chunk_id,
        "cid": cid,
        "chunk_index": chunk_index,
        "chunk_hash": chunk_hash,
        "data": chunk_data_b64,
        "size": len(chunk_data),
        "uploaded_at": datetime.utcnow(),
        "replicas": [],  # Future: track storage nodes holding this chunk
    }

    # Check if chunk already exists
    existing_chunk = await db.chunks.find_one({"chunk_id": chunk_id})
    if existing_chunk:
        return {"chunk_id": chunk_id, "status": "already_exists"}

    await db.chunks.insert_one(chunk_doc)

    # Update file progress
    chunks_uploaded = file_doc.get("chunks_uploaded", 0) + 1
    is_complete = chunks_uploaded >= file_doc["total_chunks"]

    await db.files.update_one(
        {"cid": cid},
        {
            "$set": {
                "chunks_uploaded": chunks_uploaded,
                "is_complete": is_complete,
            }
        }
    )

    return {
        "chunk_id": chunk_id,
        "chunk_index": chunk_index,
        "status": "uploaded",
        "file_complete": is_complete,
    }


@router.get("/list")
async def list_files(current_user: dict = Depends(get_current_user)):
    """List all files uploaded by the current user."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    cursor = db.files.find(
        {"owner_node_id": current_user["sub"]},
        {"_id": 0}
    ).sort("uploaded_at", -1)

    files = await cursor.to_list(length=100)

    return {"files": files}


@router.get("/{cid}")
async def get_file_metadata(cid: str, current_user: dict = Depends(get_current_user)):
    """Get file metadata by CID."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    file_doc = await db.files.find_one(
        {"cid": cid, "owner_node_id": current_user["sub"]},
        {"_id": 0}
    )

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    return file_doc


@router.get("/{cid}/chunks")
async def retrieve_file_chunks(cid: str, current_user: dict = Depends(get_current_user)):
    """Retrieve all chunks for a file."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Verify file exists and belongs to user
    file_doc = await db.files.find_one({"cid": cid, "owner_node_id": current_user["sub"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    # Get all chunks
    cursor = db.chunks.find(
        {"cid": cid},
        {"_id": 0, "chunk_id": 1, "chunk_index": 1, "data": 1, "chunk_hash": 1}
    ).sort("chunk_index", 1)

    chunks = await cursor.to_list(length=file_doc["total_chunks"])

    if len(chunks) < file_doc["total_chunks"]:
        raise HTTPException(
            status_code=500,
            detail=f"Incomplete file: {len(chunks)}/{file_doc['total_chunks']} chunks available"
        )

    return {"chunks": chunks, "total": len(chunks)}


@router.delete("/{cid}")
async def delete_file(cid: str, current_user: dict = Depends(get_current_user)):
    """Delete a file and all its chunks."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Verify file exists and belongs to user
    file_doc = await db.files.find_one({"cid": cid, "owner_node_id": current_user["sub"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete all chunks
    await db.chunks.delete_many({"cid": cid})

    # Delete file metadata
    await db.files.delete_one({"cid": cid})

    return {"cid": cid, "status": "deleted", "message": "File and all chunks removed"}
