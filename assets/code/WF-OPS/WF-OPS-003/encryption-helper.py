#!/usr/bin/env python3
"""
WF-OPS-003 Encryption Helper Module
Privacy-preserving encryption for optional backup exports with explicit user consent.
Supports AES-256-GCM encryption with secure key derivation and metadata protection.
"""

import os
import json
import hashlib
import secrets
import time
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import logging
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class EncryptionConfig:
    """Configuration for encryption operations"""
    algorithm: str = "AES-256-GCM"
    key_derivation: str = "PBKDF2-SHA256"
    iterations: int = 100000
    salt_size: int = 32
    nonce_size: int = 12
    tag_size: int = 16
    chunk_size: int = 8192
    
@dataclass
class EncryptionMetadata:
    """Metadata for encrypted content"""
    algorithm: str
    key_derivation: str
    iterations: int
    salt: str  # base64 encoded
    nonce: str  # base64 encoded
    tag: str  # base64 encoded
    content_hash: str  # SHA-256 of original content
    encrypted_hash: str  # SHA-256 of encrypted content
    timestamp: str
    user_consent: bool
    export_purpose: str

class FrameBudgetMonitor:
    """Monitor frame budget during encryption operations"""
    def __init__(self, frame_budget_ms: float = 16.67):
        self.frame_budget_ms = frame_budget_ms
        self.start_time = None
        
    def start_frame(self):
        """Start timing a frame"""
        self.start_time = time.perf_counter()
        
    def check_budget(self) -> bool:
        """Check if we're within frame budget"""
        if self.start_time is None:
            return True
        elapsed_ms = (time.perf_counter() - self.start_time) * 1000
        return elapsed_ms < self.frame_budget_ms
        
    def yield_if_needed(self):
        """Yield control if frame budget exceeded"""
        if not self.check_budget():
            time.sleep(0.001)  # Brief yield
            self.start_frame()

class ConsentManager:
    """Manage user consent for encryption operations"""
    
    @staticmethod
    def request_encryption_consent(export_purpose: str, data_description: str) -> bool:
        """Request user consent for encryption (mock implementation)"""
        logger.info(f"Requesting encryption consent for: {export_purpose}")
        logger.info(f"Data description: {data_description}")
        # In real implementation, this would show UI prompt
        return True  # Mock consent granted
        
    @staticmethod
    def log_consent_decision(granted: bool, purpose: str, timestamp: str):
        """Log consent decision for audit trail"""
        decision = "GRANTED" if granted else "DENIED"
        logger.info(f"Encryption consent {decision} for {purpose} at {timestamp}")

class EncryptionHelper:
    """Main encryption helper for WF-OPS-003 backup exports"""
    
    def __init__(self, config: Optional[EncryptionConfig] = None):
        self.config = config or EncryptionConfig()
        self.frame_monitor = FrameBudgetMonitor()
        self.consent_manager = ConsentManager()
        
    def derive_key(self, password: str, salt: bytes) -> bytes:
        """Derive encryption key from password using PBKDF2"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits
            salt=salt,
            iterations=self.config.iterations,
            backend=default_backend()
        )
        return kdf.derive(password.encode('utf-8'))
        
    def encrypt_content(self, content: bytes, password: str, 
                       export_purpose: str = "backup_export") -> Tuple[bytes, EncryptionMetadata]:
        """Encrypt content with AES-256-GCM"""
        # Request user consent
        consent_granted = self.consent_manager.request_encryption_consent(
            export_purpose, f"Content size: {len(content)} bytes"
        )
        
        if not consent_granted:
            raise PermissionError("User consent required for encryption")
            
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self.consent_manager.log_consent_decision(True, export_purpose, timestamp)
        
        # Generate cryptographic materials
        salt = secrets.token_bytes(self.config.salt_size)
        nonce = secrets.token_bytes(self.config.nonce_size)
        key = self.derive_key(password, salt)
        
        # Calculate original content hash
        content_hash = hashlib.sha256(content).hexdigest()
        
        # Encrypt content
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(nonce),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        self.frame_monitor.start_frame()
        encrypted_content = b""
        
        # Process in chunks to maintain frame budget
        for i in range(0, len(content), self.config.chunk_size):
            chunk = content[i:i + self.config.chunk_size]
            encrypted_content += encryptor.update(chunk)
            self.frame_monitor.yield_if_needed()
            
        encryptor.finalize()
        tag = encryptor.tag
        
        # Calculate encrypted content hash
        encrypted_hash = hashlib.sha256(encrypted_content + tag).hexdigest()
        
        # Create metadata
        metadata = EncryptionMetadata(
            algorithm=self.config.algorithm,
            key_derivation=self.config.key_derivation,
            iterations=self.config.iterations,
            salt=salt.hex(),
            nonce=nonce.hex(),
            tag=tag.hex(),
            content_hash=content_hash,
            encrypted_hash=encrypted_hash,
            timestamp=timestamp,
            user_consent=True,
            export_purpose=export_purpose
        )
        
        return encrypted_content + tag, metadata
        
    def decrypt_content(self, encrypted_data: bytes, metadata: EncryptionMetadata, 
                       password: str) -> bytes:
        """Decrypt content with AES-256-GCM"""
        # Extract tag from encrypted data
        tag = encrypted_data[-self.config.tag_size:]
        encrypted_content = encrypted_data[:-self.config.tag_size]
        
        # Verify encrypted content hash
        calculated_hash = hashlib.sha256(encrypted_data).hexdigest()
        if calculated_hash != metadata.encrypted_hash:
            raise ValueError("Encrypted content integrity check failed")
            
        # Derive key
        salt = bytes.fromhex(metadata.salt)
        nonce = bytes.fromhex(metadata.nonce)
        key = self.derive_key(password, salt)
        
        # Decrypt content
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(nonce, tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        self.frame_monitor.start_frame()
        decrypted_content = b""
        
        # Process in chunks to maintain frame budget
        for i in range(0, len(encrypted_content), self.config.chunk_size):
            chunk = encrypted_content[i:i + self.config.chunk_size]
            decrypted_content += decryptor.update(chunk)
            self.frame_monitor.yield_if_needed()
            
        decryptor.finalize()
        
        # Verify original content hash
        calculated_hash = hashlib.sha256(decrypted_content).hexdigest()
        if calculated_hash != metadata.content_hash:
            raise ValueError("Decrypted content integrity check failed")
            
        return decrypted_content
        
    def encrypt_file(self, file_path: Path, output_path: Path, password: str,
                    export_purpose: str = "file_export") -> EncryptionMetadata:
        """Encrypt a file and save encrypted version"""
        if not file_path.exists():
            raise FileNotFoundError(f"Source file not found: {file_path}")
            
        # Read file content
        with open(file_path, 'rb') as f:
            content = f.read()
            
        # Encrypt content
        encrypted_data, metadata = self.encrypt_content(content, password, export_purpose)
        
        # Write encrypted file
        with open(output_path, 'wb') as f:
            f.write(encrypted_data)
            
        # Write metadata file
        metadata_path = output_path.with_suffix(output_path.suffix + '.meta')
        with open(metadata_path, 'w') as f:
            json.dump(asdict(metadata), f, indent=2)
            
        logger.info(f"File encrypted: {file_path} -> {output_path}")
        return metadata
        
    def decrypt_file(self, encrypted_path: Path, output_path: Path, 
                    password: str) -> bool:
        """Decrypt a file and save decrypted version"""
        if not encrypted_path.exists():
            raise FileNotFoundError(f"Encrypted file not found: {encrypted_path}")
            
        # Read metadata
        metadata_path = encrypted_path.with_suffix(encrypted_path.suffix + '.meta')
        if not metadata_path.exists():
            raise FileNotFoundError(f"Metadata file not found: {metadata_path}")
            
        with open(metadata_path, 'r') as f:
            metadata_dict = json.load(f)
            metadata = EncryptionMetadata(**metadata_dict)
            
        # Read encrypted content
        with open(encrypted_path, 'rb') as f:
            encrypted_data = f.read()
            
        # Decrypt content
        decrypted_content = self.decrypt_content(encrypted_data, metadata, password)
        
        # Write decrypted file
        with open(output_path, 'wb') as f:
            f.write(decrypted_content)
            
        logger.info(f"File decrypted: {encrypted_path} -> {output_path}")
        return True
        
    def encrypt_backup_export(self, backup_manifest: Dict[str, Any], 
                            export_config: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt a complete backup export with manifest"""
        export_purpose = export_config.get('purpose', 'backup_export')
        password = export_config.get('password')
        
        if not password:
            raise ValueError("Password required for encrypted export")
            
        encrypted_manifest = backup_manifest.copy()
        encrypted_files = []
        
        # Encrypt each file in the backup
        for file_entry in backup_manifest.get('files', []):
            file_path = Path(file_entry['path'])
            if not file_path.exists():
                logger.warning(f"File not found for encryption: {file_path}")
                continue
                
            # Create encrypted file path
            encrypted_path = file_path.with_suffix(file_path.suffix + '.enc')
            
            try:
                metadata = self.encrypt_file(file_path, encrypted_path, password, export_purpose)
                
                # Update file entry with encryption info
                encrypted_entry = file_entry.copy()
                encrypted_entry['encrypted'] = True
                encrypted_entry['encrypted_path'] = str(encrypted_path)
                encrypted_entry['encryption_metadata'] = asdict(metadata)
                encrypted_files.append(encrypted_entry)
                
            except Exception as e:
                logger.error(f"Failed to encrypt file {file_path}: {e}")
                continue
                
        # Update manifest
        encrypted_manifest['files'] = encrypted_files
        encrypted_manifest['encrypted'] = True
        encrypted_manifest['encryption_config'] = {
            'algorithm': self.config.algorithm,
            'key_derivation': self.config.key_derivation,
            'export_purpose': export_purpose,
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        return encrypted_manifest
        
    def verify_encryption_integrity(self, encrypted_path: Path) -> bool:
        """Verify integrity of encrypted file"""
        try:
            metadata_path = encrypted_path.with_suffix(encrypted_path.suffix + '.meta')
            
            if not metadata_path.exists():
                logger.error(f"Metadata file missing: {metadata_path}")
                return False
                
            # Read metadata
            with open(metadata_path, 'r') as f:
                metadata_dict = json.load(f)
                metadata = EncryptionMetadata(**metadata_dict)
                
            # Read encrypted file
            with open(encrypted_path, 'rb') as f:
                encrypted_data = f.read()
                
            # Verify encrypted content hash
            calculated_hash = hashlib.sha256(encrypted_data).hexdigest()
            if calculated_hash != metadata.encrypted_hash:
                logger.error(f"Encrypted content hash mismatch: {encrypted_path}")
                return False
                
            logger.info(f"Encryption integrity verified: {encrypted_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to verify encryption integrity: {e}")
            return False

def main():
    """Example usage of encryption helper"""
    helper = EncryptionHelper()
    
    # Example: encrypt a test file
    test_content = b"This is test backup content for WF-OPS-003"
    password = "test_password_123"
    
    try:
        # Encrypt content
        encrypted_data, metadata = helper.encrypt_content(
            test_content, password, "test_export"
        )
        
        print(f"Encryption successful:")
        print(f"  Original size: {len(test_content)} bytes")
        print(f"  Encrypted size: {len(encrypted_data)} bytes")
        print(f"  Algorithm: {metadata.algorithm}")
        print(f"  Content hash: {metadata.content_hash}")
        
        # Decrypt content
        decrypted_content = helper.decrypt_content(encrypted_data, metadata, password)
        
        if decrypted_content == test_content:
            print("Decryption successful - content matches original")
        else:
            print("ERROR: Decrypted content does not match original")
            
    except Exception as e:
        print(f"Encryption test failed: {e}")

if __name__ == "__main__":
    main()
