"""
WF-TECH-006 Authentication Middleware
WIRTHFORGE Security & Privacy Implementation

This module provides secure authentication middleware for the local FastAPI server,
implementing token-based authentication with HTTP-only cookies and CSRF protection.

Key Features:
- Cryptographically secure session token generation
- HTTP-only cookie management with strict security attributes
- CSRF protection for state-changing operations
- Rate limiting for brute-force protection
- Session lifecycle management
- Audit logging for security events

Author: WIRTHFORGE Security Team
Version: 1.0.0
License: MIT
"""

import secrets
import hashlib
import time
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import asyncio

from fastapi import Request, Response, HTTPException, Depends, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
import jwt

logger = logging.getLogger(__name__)

@dataclass
class SecurityConfig:
    """Security configuration for authentication middleware"""
    # Token settings
    token_entropy_bits: int = 256
    token_lifetime_hours: int = 24
    session_rotation_hours: int = 6
    
    # Cookie settings
    cookie_name: str = "wf_session"
    cookie_secure: bool = True
    cookie_httponly: bool = True
    cookie_samesite: str = "strict"
    
    # Rate limiting
    max_auth_attempts: int = 5
    rate_limit_window_minutes: int = 15
    lockout_duration_minutes: int = 30
    
    # CSRF protection
    csrf_token_name: str = "wf_csrf"
    csrf_header_name: str = "X-WF-CSRF-Token"
    
    # Allowed origins
    allowed_origins: List[str] = None
    
    def __post_init__(self):
        if self.allowed_origins is None:
            self.allowed_origins = ["https://127.0.0.1:8145", "https://localhost:8145"]

@dataclass
class SessionInfo:
    """Session information and metadata"""
    token: str
    csrf_token: str
    created_at: datetime
    last_accessed: datetime
    expires_at: datetime
    client_ip: str
    user_agent: str
    is_valid: bool = True

class SecurityAuditLogger:
    """Audit logger for security events"""
    
    def __init__(self):
        self.security_logger = logging.getLogger("wirthforge.security")
        
    def log_auth_success(self, client_ip: str, user_agent: str):
        """Log successful authentication"""
        self.security_logger.info(
            "AUTH_SUCCESS",
            extra={
                "event_type": "authentication",
                "result": "success",
                "client_ip": client_ip,
                "user_agent": user_agent,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    def log_auth_failure(self, client_ip: str, reason: str):
        """Log failed authentication attempt"""
        self.security_logger.warning(
            "AUTH_FAILURE",
            extra={
                "event_type": "authentication",
                "result": "failure",
                "reason": reason,
                "client_ip": client_ip,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    def log_rate_limit_exceeded(self, client_ip: str):
        """Log rate limit exceeded"""
        self.security_logger.warning(
            "RATE_LIMIT_EXCEEDED",
            extra={
                "event_type": "rate_limit",
                "client_ip": client_ip,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    def log_csrf_violation(self, client_ip: str, endpoint: str):
        """Log CSRF token violation"""
        self.security_logger.error(
            "CSRF_VIOLATION",
            extra={
                "event_type": "csrf",
                "client_ip": client_ip,
                "endpoint": endpoint,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

class RateLimiter:
    """Rate limiter for authentication attempts"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.attempts = defaultdict(deque)
        self.lockouts = {}
        
    def is_rate_limited(self, client_ip: str) -> bool:
        """Check if client IP is rate limited"""
        now = time.time()
        
        # Check if currently locked out
        if client_ip in self.lockouts:
            if now < self.lockouts[client_ip]:
                return True
            else:
                del self.lockouts[client_ip]
        
        # Clean old attempts
        window_start = now - (self.config.rate_limit_window_minutes * 60)
        attempts = self.attempts[client_ip]
        
        while attempts and attempts[0] < window_start:
            attempts.popleft()
        
        return len(attempts) >= self.config.max_auth_attempts
    
    def record_attempt(self, client_ip: str, success: bool = False):
        """Record authentication attempt"""
        now = time.time()
        
        if not success:
            self.attempts[client_ip].append(now)
            
            # Check if should be locked out
            if len(self.attempts[client_ip]) >= self.config.max_auth_attempts:
                lockout_until = now + (self.config.lockout_duration_minutes * 60)
                self.lockouts[client_ip] = lockout_until
                logger.warning(f"Client {client_ip} locked out until {datetime.fromtimestamp(lockout_until)}")
        else:
            # Clear attempts on successful auth
            if client_ip in self.attempts:
                del self.attempts[client_ip]
            if client_ip in self.lockouts:
                del self.lockouts[client_ip]

class SessionManager:
    """Manages user sessions and tokens"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.active_sessions: Dict[str, SessionInfo] = {}
        self.audit_logger = SecurityAuditLogger()
        self.rate_limiter = RateLimiter(config)
        
    def generate_secure_token(self) -> str:
        """Generate cryptographically secure session token"""
        token_bytes = secrets.token_bytes(self.config.token_entropy_bits // 8)
        return hashlib.sha256(token_bytes).hexdigest()
    
    def generate_csrf_token(self) -> str:
        """Generate CSRF protection token"""
        return secrets.token_urlsafe(32)
    
    def create_session(self, client_ip: str, user_agent: str) -> SessionInfo:
        """Create new authenticated session"""
        now = datetime.now(timezone.utc)
        
        session = SessionInfo(
            token=self.generate_secure_token(),
            csrf_token=self.generate_csrf_token(),
            created_at=now,
            last_accessed=now,
            expires_at=now + timedelta(hours=self.config.token_lifetime_hours),
            client_ip=client_ip,
            user_agent=user_agent
        )
        
        self.active_sessions[session.token] = session
        self.audit_logger.log_auth_success(client_ip, user_agent)
        
        logger.info(f"Created session for {client_ip}, expires {session.expires_at}")
        return session
    
    def validate_session(self, token: str, client_ip: str) -> Optional[SessionInfo]:
        """Validate session token and update last accessed time"""
        if not token or token not in self.active_sessions:
            return None
        
        session = self.active_sessions[token]
        now = datetime.now(timezone.utc)
        
        # Check if expired
        if now > session.expires_at:
            self.invalidate_session(token)
            return None
        
        # Check if needs rotation
        if now > session.created_at + timedelta(hours=self.config.session_rotation_hours):
            logger.info(f"Rotating session token for {client_ip}")
            return self.rotate_session(session, client_ip)
        
        # Update last accessed
        session.last_accessed = now
        return session
    
    def rotate_session(self, old_session: SessionInfo, client_ip: str) -> SessionInfo:
        """Rotate session token for security"""
        # Create new session
        new_session = SessionInfo(
            token=self.generate_secure_token(),
            csrf_token=self.generate_csrf_token(),
            created_at=datetime.now(timezone.utc),
            last_accessed=datetime.now(timezone.utc),
            expires_at=old_session.expires_at,  # Keep same expiry
            client_ip=client_ip,
            user_agent=old_session.user_agent
        )
        
        # Replace old session
        del self.active_sessions[old_session.token]
        self.active_sessions[new_session.token] = new_session
        
        logger.info(f"Rotated session token for {client_ip}")
        return new_session
    
    def invalidate_session(self, token: str):
        """Invalidate session token"""
        if token in self.active_sessions:
            session = self.active_sessions[token]
            del self.active_sessions[token]
            logger.info(f"Invalidated session for {session.client_ip}")
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        now = datetime.now(timezone.utc)
        expired_tokens = [
            token for token, session in self.active_sessions.items()
            if now > session.expires_at
        ]
        
        for token in expired_tokens:
            self.invalidate_session(token)
        
        if expired_tokens:
            logger.info(f"Cleaned up {len(expired_tokens)} expired sessions")

class WirthForgeAuthMiddleware(BaseHTTPMiddleware):
    """Main authentication middleware for WIRTHFORGE"""
    
    def __init__(self, app, config: SecurityConfig = None):
        super().__init__(app)
        self.config = config or SecurityConfig()
        self.session_manager = SessionManager(self.config)
        
        # Start background cleanup task
        asyncio.create_task(self._cleanup_task())
    
    async def dispatch(self, request: Request, call_next):
        """Main middleware dispatch method"""
        # Skip auth for public endpoints
        if self._is_public_endpoint(request.url.path):
            return await call_next(request)
        
        # Check rate limiting
        client_ip = self._get_client_ip(request)
        if self.session_manager.rate_limiter.is_rate_limited(client_ip):
            self.session_manager.audit_logger.log_rate_limit_exceeded(client_ip)
            raise HTTPException(status_code=429, detail="Too many authentication attempts")
        
        # Validate session
        session = await self._validate_request_auth(request)
        if not session:
            self.session_manager.rate_limiter.record_attempt(client_ip, success=False)
            self.session_manager.audit_logger.log_auth_failure(client_ip, "invalid_token")
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Check CSRF for state-changing operations
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            if not await self._validate_csrf(request, session):
                self.session_manager.audit_logger.log_csrf_violation(client_ip, request.url.path)
                raise HTTPException(status_code=403, detail="CSRF token required")
        
        # Add session info to request state
        request.state.session = session
        request.state.authenticated = True
        
        response = await call_next(request)
        
        # Handle session rotation if needed
        if hasattr(request.state, 'new_session'):
            self._set_session_cookies(response, request.state.new_session)
        
        return response
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public (no auth required)"""
        public_paths = [
            "/health",
            "/favicon.ico",
            "/static/",
            "/docs",
            "/openapi.json"
        ]
        return any(path.startswith(p) for p in public_paths)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check for forwarded headers (though shouldn't exist in local setup)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    async def _validate_request_auth(self, request: Request) -> Optional[SessionInfo]:
        """Validate authentication from request"""
        # Try cookie first
        session_token = request.cookies.get(self.config.cookie_name)
        
        # Fallback to Authorization header
        if not session_token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                session_token = auth_header[7:]
        
        if not session_token:
            return None
        
        client_ip = self._get_client_ip(request)
        session = self.session_manager.validate_session(session_token, client_ip)
        
        # Handle session rotation
        if session and session.token != session_token:
            request.state.new_session = session
        
        return session
    
    async def _validate_csrf(self, request: Request, session: SessionInfo) -> bool:
        """Validate CSRF token for state-changing operations"""
        # Get CSRF token from header or form data
        csrf_token = request.headers.get(self.config.csrf_header_name)
        
        if not csrf_token:
            # Try form data for non-JSON requests
            if request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
                form_data = await request.form()
                csrf_token = form_data.get(self.config.csrf_token_name)
        
        return csrf_token == session.csrf_token
    
    def _set_session_cookies(self, response: Response, session: SessionInfo):
        """Set secure session cookies"""
        response.set_cookie(
            key=self.config.cookie_name,
            value=session.token,
            max_age=int(self.config.token_lifetime_hours * 3600),
            httponly=self.config.cookie_httponly,
            secure=self.config.cookie_secure,
            samesite=self.config.cookie_samesite,
            path="/"
        )
        
        # Set CSRF token cookie (readable by JS)
        response.set_cookie(
            key=self.config.csrf_token_name,
            value=session.csrf_token,
            max_age=int(self.config.token_lifetime_hours * 3600),
            httponly=False,  # JS needs to read this
            secure=self.config.cookie_secure,
            samesite=self.config.cookie_samesite,
            path="/"
        )
    
    async def _cleanup_task(self):
        """Background task to clean up expired sessions"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                self.session_manager.cleanup_expired_sessions()
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")

# FastAPI Dependencies
def get_current_session(request: Request) -> SessionInfo:
    """FastAPI dependency to get current session"""
    if not hasattr(request.state, 'session'):
        raise HTTPException(status_code=401, detail="Authentication required")
    return request.state.session

def require_csrf_token(request: Request) -> str:
    """FastAPI dependency to require CSRF token"""
    session = get_current_session(request)
    return session.csrf_token

# Utility functions
def create_initial_session(client_ip: str = "127.0.0.1", user_agent: str = "WIRTHFORGE-UI") -> SessionInfo:
    """Create initial session for system startup"""
    config = SecurityConfig()
    session_manager = SessionManager(config)
    return session_manager.create_session(client_ip, user_agent)

def setup_auth_middleware(app, config: SecurityConfig = None):
    """Setup authentication middleware on FastAPI app"""
    middleware = WirthForgeAuthMiddleware(app, config)
    app.add_middleware(WirthForgeAuthMiddleware, config=config)
    return middleware

# Example usage
if __name__ == "__main__":
    # Demo of session creation and validation
    config = SecurityConfig()
    session_manager = SessionManager(config)
    
    # Create session
    session = session_manager.create_session("127.0.0.1", "test-client")
    print(f"Created session: {session.token[:16]}...")
    print(f"CSRF token: {session.csrf_token[:16]}...")
    
    # Validate session
    validated = session_manager.validate_session(session.token, "127.0.0.1")
    print(f"Session valid: {validated is not None}")
    
    # Test rate limiting
    rate_limiter = RateLimiter(config)
    for i in range(6):
        limited = rate_limiter.is_rate_limited("192.168.1.100")
        rate_limiter.record_attempt("192.168.1.100", success=False)
        print(f"Attempt {i+1}: Rate limited = {limited}")
