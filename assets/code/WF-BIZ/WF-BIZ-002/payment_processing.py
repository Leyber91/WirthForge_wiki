#!/usr/bin/env python3
"""
WF-BIZ-002 Payment Processing System
Local-first payment processing with privacy-preserving token storage and secure payment flows
"""

import json
import sqlite3
import uuid
import hashlib
import time
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone, timedelta
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class PaymentMethod(Enum):
    """Supported payment methods"""
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    STRIPE_CARD = "stripe_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    CRYPTO = "crypto"
    STORE_CREDIT = "store_credit"

class PaymentStatus(Enum):
    """Payment processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    DISPUTED = "disputed"

class RefundReason(Enum):
    """Refund reason codes"""
    USER_REQUEST = "user_request"
    BILLING_ERROR = "billing_error"
    SERVICE_ISSUE = "service_issue"
    DUPLICATE_CHARGE = "duplicate_charge"
    FRAUD_PREVENTION = "fraud_prevention"
    POLICY_VIOLATION = "policy_violation"

@dataclass
class PaymentToken:
    """Encrypted payment token for local storage"""
    token_id: str
    user_id: str
    payment_method: PaymentMethod
    encrypted_data: str
    last_four: Optional[str]
    expiry_date: Optional[str]
    is_default: bool
    created_at: datetime
    last_used: Optional[datetime] = None

@dataclass
class PaymentRequest:
    """Payment processing request"""
    request_id: str
    user_id: str
    amount: float
    currency: str
    payment_method: PaymentMethod
    description: str
    metadata: Dict[str, Any]
    billing_address: Optional[Dict[str, str]]
    created_at: datetime
    idempotency_key: Optional[str] = None

@dataclass
class PaymentResult:
    """Payment processing result"""
    payment_id: str
    request_id: str
    status: PaymentStatus
    amount: float
    currency: str
    payment_method: PaymentMethod
    external_transaction_id: Optional[str]
    gateway_response: Dict[str, Any]
    fees: Dict[str, float]
    processed_at: datetime
    error_message: Optional[str] = None

@dataclass
class RefundRequest:
    """Refund processing request"""
    refund_id: str
    payment_id: str
    amount: float
    reason: RefundReason
    description: str
    requested_by: str
    created_at: datetime

class PaymentEncryption:
    """Local payment data encryption"""
    
    def __init__(self, master_key: Optional[str] = None):
        if master_key:
            self.key = master_key.encode()
        else:
            self.key = self._generate_key()
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'wirthforge_payment_salt',
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.key))
        self.cipher = Fernet(key)
    
    def _generate_key(self) -> bytes:
        """Generate encryption key from system entropy"""
        return os.urandom(32)
    
    def encrypt_payment_data(self, data: Dict[str, Any]) -> str:
        """Encrypt sensitive payment data"""
        json_data = json.dumps(data).encode()
        encrypted = self.cipher.encrypt(json_data)
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt_payment_data(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt payment data"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self.cipher.decrypt(encrypted_bytes)
            return json.loads(decrypted.decode())
        except Exception as e:
            raise ValueError(f"Failed to decrypt payment data: {e}")
    
    def hash_sensitive_data(self, data: str) -> str:
        """Hash sensitive data for indexing"""
        return hashlib.sha256(data.encode()).hexdigest()

class PaymentGatewayInterface:
    """Interface for payment gateway integrations"""
    
    def process_payment(self, request: PaymentRequest, token: Optional[PaymentToken] = None) -> PaymentResult:
        """Process payment through gateway"""
        raise NotImplementedError
    
    def refund_payment(self, payment_id: str, amount: float, reason: str) -> Dict[str, Any]:
        """Process refund through gateway"""
        raise NotImplementedError
    
    def verify_webhook(self, payload: str, signature: str) -> bool:
        """Verify webhook signature"""
        raise NotImplementedError

class MockPaymentGateway(PaymentGatewayInterface):
    """Mock payment gateway for testing"""
    
    def process_payment(self, request: PaymentRequest, token: Optional[PaymentToken] = None) -> PaymentResult:
        """Mock payment processing"""
        # Simulate processing delay
        time.sleep(0.1)
        
        # Mock success/failure based on amount
        success = request.amount < 10000  # Fail for amounts >= €100
        
        return PaymentResult(
            payment_id=str(uuid.uuid4()),
            request_id=request.request_id,
            status=PaymentStatus.COMPLETED if success else PaymentStatus.FAILED,
            amount=request.amount,
            currency=request.currency,
            payment_method=request.payment_method,
            external_transaction_id=f"mock_txn_{uuid.uuid4().hex[:8]}",
            gateway_response={
                "gateway": "mock",
                "response_code": "00" if success else "05",
                "response_message": "Approved" if success else "Declined"
            },
            fees={"processing_fee": request.amount * 0.029, "fixed_fee": 0.30},
            processed_at=datetime.now(timezone.utc),
            error_message=None if success else "Mock decline for testing"
        )
    
    def refund_payment(self, payment_id: str, amount: float, reason: str) -> Dict[str, Any]:
        """Mock refund processing"""
        return {
            "refund_id": str(uuid.uuid4()),
            "status": "completed",
            "amount": amount,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }
    
    def verify_webhook(self, payload: str, signature: str) -> bool:
        """Mock webhook verification"""
        return True

class PaymentProcessor:
    """Main payment processing system"""
    
    def __init__(self, db_path: str = "payment_system.db", 
                 config_path: str = "payment_config.json",
                 encryption_key: Optional[str] = None):
        self.db_path = db_path
        self.config_path = config_path
        self.encryption = PaymentEncryption(encryption_key)
        
        # Load configuration
        self.config = self._load_payment_config()
        
        # Initialize payment gateway
        self.gateway = MockPaymentGateway()  # Replace with real gateway
        
        # Initialize database
        self._initialize_database()
    
    def _load_payment_config(self) -> Dict[str, Any]:
        """Load payment processing configuration"""
        default_config = {
            "supported_currencies": ["EUR", "USD", "GBP"],
            "default_currency": "EUR",
            "payment_methods": {
                "apple_pay": {"enabled": True, "fee_percentage": 0.029, "fixed_fee": 0.30},
                "google_pay": {"enabled": True, "fee_percentage": 0.029, "fixed_fee": 0.30},
                "stripe_card": {"enabled": True, "fee_percentage": 0.029, "fixed_fee": 0.30},
                "paypal": {"enabled": True, "fee_percentage": 0.034, "fixed_fee": 0.35},
                "bank_transfer": {"enabled": True, "fee_percentage": 0.008, "fixed_fee": 0.25},
                "crypto": {"enabled": False, "fee_percentage": 0.015, "fixed_fee": 0.00},
                "store_credit": {"enabled": True, "fee_percentage": 0.000, "fixed_fee": 0.00}
            },
            "limits": {
                "min_payment_amount": 0.50,
                "max_payment_amount": 10000.00,
                "daily_limit_per_user": 1000.00,
                "monthly_limit_per_user": 5000.00
            },
            "security": {
                "require_3ds": True,
                "fraud_detection": True,
                "velocity_checks": True,
                "geolocation_checks": False
            },
            "privacy": {
                "token_retention_days": 365,
                "transaction_retention_days": 2555,  # 7 years
                "anonymize_after_days": 90,
                "pci_compliance": True
            }
        }
        
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
        except FileNotFoundError:
            with open(self.config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            return default_config
    
    def _initialize_database(self):
        """Initialize payment database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Payment tokens table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payment_tokens (
                token_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                encrypted_data TEXT NOT NULL,
                last_four TEXT,
                expiry_date TEXT,
                is_default BOOLEAN DEFAULT FALSE,
                created_at REAL NOT NULL,
                last_used REAL,
                INDEX(user_id)
            )
        ''')
        
        # Payment requests table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payment_requests (
                request_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                description TEXT,
                metadata TEXT,
                billing_address TEXT,
                created_at REAL NOT NULL,
                idempotency_key TEXT,
                INDEX(user_id, created_at),
                INDEX(idempotency_key)
            )
        ''')
        
        # Payment results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payment_results (
                payment_id TEXT PRIMARY KEY,
                request_id TEXT NOT NULL,
                status TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                external_transaction_id TEXT,
                gateway_response TEXT,
                fees TEXT,
                processed_at REAL NOT NULL,
                error_message TEXT,
                FOREIGN KEY(request_id) REFERENCES payment_requests(request_id)
            )
        ''')
        
        # Refunds table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS refunds (
                refund_id TEXT PRIMARY KEY,
                payment_id TEXT NOT NULL,
                amount REAL NOT NULL,
                reason TEXT NOT NULL,
                description TEXT,
                requested_by TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                processed_at REAL,
                created_at REAL NOT NULL,
                FOREIGN KEY(payment_id) REFERENCES payment_results(payment_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def store_payment_token(self, user_id: str, payment_method: PaymentMethod,
                           payment_data: Dict[str, Any], 
                           last_four: Optional[str] = None,
                           expiry_date: Optional[str] = None,
                           is_default: bool = False) -> str:
        """Store encrypted payment token"""
        token_id = str(uuid.uuid4())
        encrypted_data = self.encryption.encrypt_payment_data(payment_data)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # If setting as default, unset other defaults
        if is_default:
            cursor.execute('''
                UPDATE payment_tokens SET is_default = FALSE 
                WHERE user_id = ?
            ''', (user_id,))
        
        cursor.execute('''
            INSERT INTO payment_tokens 
            (token_id, user_id, payment_method, encrypted_data, last_four, 
             expiry_date, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            token_id, user_id, payment_method.value, encrypted_data,
            last_four, expiry_date, is_default, time.time()
        ))
        
        conn.commit()
        conn.close()
        
        return token_id
    
    def get_payment_tokens(self, user_id: str) -> List[PaymentToken]:
        """Get user's payment tokens"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT token_id, user_id, payment_method, encrypted_data, last_four,
                   expiry_date, is_default, created_at, last_used
            FROM payment_tokens 
            WHERE user_id = ?
            ORDER BY is_default DESC, created_at DESC
        ''', (user_id,))
        
        tokens = []
        for row in cursor.fetchall():
            tokens.append(PaymentToken(
                token_id=row[0],
                user_id=row[1],
                payment_method=PaymentMethod(row[2]),
                encrypted_data=row[3],
                last_four=row[4],
                expiry_date=row[5],
                is_default=bool(row[6]),
                created_at=datetime.fromtimestamp(row[7], tz=timezone.utc),
                last_used=datetime.fromtimestamp(row[8], tz=timezone.utc) if row[8] else None
            ))
        
        conn.close()
        return tokens
    
    def process_payment(self, user_id: str, amount: float, currency: str,
                       payment_method: PaymentMethod, description: str,
                       metadata: Optional[Dict[str, Any]] = None,
                       token_id: Optional[str] = None,
                       billing_address: Optional[Dict[str, str]] = None,
                       idempotency_key: Optional[str] = None) -> PaymentResult:
        """Process payment"""
        # Validate amount
        if amount < self.config["limits"]["min_payment_amount"]:
            raise ValueError(f"Amount below minimum: {self.config['limits']['min_payment_amount']}")
        
        if amount > self.config["limits"]["max_payment_amount"]:
            raise ValueError(f"Amount above maximum: {self.config['limits']['max_payment_amount']}")
        
        # Check idempotency
        if idempotency_key:
            existing_result = self._check_idempotency(idempotency_key)
            if existing_result:
                return existing_result
        
        # Create payment request
        request_id = str(uuid.uuid4())
        request = PaymentRequest(
            request_id=request_id,
            user_id=user_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            description=description,
            metadata=metadata or {},
            billing_address=billing_address,
            created_at=datetime.now(timezone.utc),
            idempotency_key=idempotency_key
        )
        
        # Store payment request
        self._store_payment_request(request)
        
        # Get payment token if specified
        token = None
        if token_id:
            token = self._get_payment_token(token_id)
        
        # Process through gateway
        try:
            result = self.gateway.process_payment(request, token)
            
            # Store result
            self._store_payment_result(result)
            
            # Update token last used
            if token:
                self._update_token_last_used(token_id)
            
            return result
            
        except Exception as e:
            # Store failed result
            failed_result = PaymentResult(
                payment_id=str(uuid.uuid4()),
                request_id=request_id,
                status=PaymentStatus.FAILED,
                amount=amount,
                currency=currency,
                payment_method=payment_method,
                external_transaction_id=None,
                gateway_response={"error": str(e)},
                fees={},
                processed_at=datetime.now(timezone.utc),
                error_message=str(e)
            )
            
            self._store_payment_result(failed_result)
            return failed_result
    
    def process_refund(self, payment_id: str, amount: Optional[float] = None,
                      reason: RefundReason = RefundReason.USER_REQUEST,
                      description: str = "", requested_by: str = "system") -> Dict[str, Any]:
        """Process payment refund"""
        # Get original payment
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT amount, currency, status FROM payment_results 
            WHERE payment_id = ?
        ''', (payment_id,))
        
        payment_data = cursor.fetchone()
        if not payment_data:
            conn.close()
            raise ValueError("Payment not found")
        
        original_amount, currency, status = payment_data
        
        if status not in [PaymentStatus.COMPLETED.value, PaymentStatus.CAPTURED.value]:
            conn.close()
            raise ValueError("Payment cannot be refunded")
        
        # Default to full refund
        if amount is None:
            amount = original_amount
        
        if amount > original_amount:
            conn.close()
            raise ValueError("Refund amount exceeds original payment")
        
        # Create refund request
        refund_id = str(uuid.uuid4())
        refund_request = RefundRequest(
            refund_id=refund_id,
            payment_id=payment_id,
            amount=amount,
            reason=reason,
            description=description,
            requested_by=requested_by,
            created_at=datetime.now(timezone.utc)
        )
        
        # Store refund request
        cursor.execute('''
            INSERT INTO refunds 
            (refund_id, payment_id, amount, reason, description, requested_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            refund_id, payment_id, amount, reason.value, description,
            requested_by, time.time()
        ))
        
        try:
            # Process through gateway
            gateway_result = self.gateway.refund_payment(payment_id, amount, description)
            
            # Update refund status
            cursor.execute('''
                UPDATE refunds SET status = 'completed', processed_at = ?
                WHERE refund_id = ?
            ''', (time.time(), refund_id))
            
            conn.commit()
            conn.close()
            
            return {
                "refund_id": refund_id,
                "status": "completed",
                "amount": amount,
                "currency": currency,
                "gateway_result": gateway_result
            }
            
        except Exception as e:
            # Update refund status to failed
            cursor.execute('''
                UPDATE refunds SET status = 'failed' WHERE refund_id = ?
            ''', (refund_id,))
            
            conn.commit()
            conn.close()
            
            raise ValueError(f"Refund processing failed: {e}")
    
    def _check_idempotency(self, idempotency_key: str) -> Optional[PaymentResult]:
        """Check for existing payment with same idempotency key"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT pr.payment_id FROM payment_requests req
            JOIN payment_results pr ON req.request_id = pr.request_id
            WHERE req.idempotency_key = ?
        ''', (idempotency_key,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return self._get_payment_result(result[0])
        return None
    
    def _store_payment_request(self, request: PaymentRequest):
        """Store payment request in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO payment_requests 
            (request_id, user_id, amount, currency, payment_method, description,
             metadata, billing_address, created_at, idempotency_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            request.request_id, request.user_id, request.amount, request.currency,
            request.payment_method.value, request.description,
            json.dumps(request.metadata), json.dumps(request.billing_address or {}),
            request.created_at.timestamp(), request.idempotency_key
        ))
        
        conn.commit()
        conn.close()
    
    def _store_payment_result(self, result: PaymentResult):
        """Store payment result in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO payment_results 
            (payment_id, request_id, status, amount, currency, payment_method,
             external_transaction_id, gateway_response, fees, processed_at, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            result.payment_id, result.request_id, result.status.value,
            result.amount, result.currency, result.payment_method.value,
            result.external_transaction_id, json.dumps(result.gateway_response),
            json.dumps(result.fees), result.processed_at.timestamp(),
            result.error_message
        ))
        
        conn.commit()
        conn.close()
    
    def _get_payment_token(self, token_id: str) -> Optional[PaymentToken]:
        """Get payment token by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM payment_tokens WHERE token_id = ?
        ''', (token_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return PaymentToken(
                token_id=row[0],
                user_id=row[1],
                payment_method=PaymentMethod(row[2]),
                encrypted_data=row[3],
                last_four=row[4],
                expiry_date=row[5],
                is_default=bool(row[6]),
                created_at=datetime.fromtimestamp(row[7], tz=timezone.utc),
                last_used=datetime.fromtimestamp(row[8], tz=timezone.utc) if row[8] else None
            )
        return None
    
    def _get_payment_result(self, payment_id: str) -> Optional[PaymentResult]:
        """Get payment result by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM payment_results WHERE payment_id = ?
        ''', (payment_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return PaymentResult(
                payment_id=row[0],
                request_id=row[1],
                status=PaymentStatus(row[2]),
                amount=row[3],
                currency=row[4],
                payment_method=PaymentMethod(row[5]),
                external_transaction_id=row[6],
                gateway_response=json.loads(row[7]) if row[7] else {},
                fees=json.loads(row[8]) if row[8] else {},
                processed_at=datetime.fromtimestamp(row[9], tz=timezone.utc),
                error_message=row[10]
            )
        return None
    
    def _update_token_last_used(self, token_id: str):
        """Update token last used timestamp"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE payment_tokens SET last_used = ? WHERE token_id = ?
        ''', (time.time(), token_id))
        
        conn.commit()
        conn.close()
    
    def get_payment_history(self, user_id: str, limit: int = 50) -> List[PaymentResult]:
        """Get user payment history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT pr.* FROM payment_results pr
            JOIN payment_requests req ON pr.request_id = req.request_id
            WHERE req.user_id = ?
            ORDER BY pr.processed_at DESC
            LIMIT ?
        ''', (user_id, limit))
        
        results = []
        for row in cursor.fetchall():
            results.append(PaymentResult(
                payment_id=row[0],
                request_id=row[1],
                status=PaymentStatus(row[2]),
                amount=row[3],
                currency=row[4],
                payment_method=PaymentMethod(row[5]),
                external_transaction_id=row[6],
                gateway_response=json.loads(row[7]) if row[7] else {},
                fees=json.loads(row[8]) if row[8] else {},
                processed_at=datetime.fromtimestamp(row[9], tz=timezone.utc),
                error_message=row[10]
            ))
        
        conn.close()
        return results

# Example usage
if __name__ == "__main__":
    processor = PaymentProcessor()
    
    # Store payment token
    token_id = processor.store_payment_token(
        user_id="test_user",
        payment_method=PaymentMethod.STRIPE_CARD,
        payment_data={"card_token": "tok_test_123", "brand": "visa"},
        last_four="4242",
        expiry_date="12/25",
        is_default=True
    )
    
    # Process payment
    result = processor.process_payment(
        user_id="test_user",
        amount=9.42,
        currency="EUR",
        payment_method=PaymentMethod.STRIPE_CARD,
        description="WIRTHFORGE Personal Monthly",
        token_id=token_id
    )
    
    print(f"Payment result: {result.status.value}")
    print(f"Payment ID: {result.payment_id}")
