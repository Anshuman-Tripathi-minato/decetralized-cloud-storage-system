"""
Backend crypto utilities for RSA signature verification
"""
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature
import base64


def verify_rsa_signature(public_key_pem: str, signature_b64: str, message: str) -> bool:
    """
    Verify an RSA signature
    
    Args:
        public_key_pem: PEM-encoded public key
        signature_b64: Base64-encoded signature
        message: Original message that was signed
    
    Returns:
        bool: True if signature is valid
    """
    try:
        # Load public key
        public_key = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
        
        # Decode signature from base64
        signature = base64.b64decode(signature_b64)
        
        # Verify signature
        public_key.verify(
            signature,
            message.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return True
    except InvalidSignature:
        return False
    except Exception as e:
        print(f"Signature verification error: {e}")
        return False


def generate_fingerprint(public_key_pem: str) -> str:
    """Generate SHA-256 fingerprint of a public key"""
    import hashlib
    return hashlib.sha256(public_key_pem.encode('utf-8')).hexdigest()
