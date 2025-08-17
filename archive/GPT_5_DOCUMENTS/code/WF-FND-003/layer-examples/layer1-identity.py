"""
WF-FND-003 Layer 1: Input & Identity Implementation Example
Handles user input validation, identity resolution, and session management.
"""

import json
import time
import uuid
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum

class InputType(Enum):
    PROMPT = "prompt"
    COMMAND = "command"
    SETTING = "setting"
    CONTROL = "control"

class UserPath(Enum):
    FORGE = "forge"
    SCHOLAR = "scholar"
    SAGE = "sage"

@dataclass
class UserMetadata:
    user_id: str
    role: UserPath
    capabilities: list[str]
    preferences: Dict[str, Any]
    created_at: float
    last_seen: float

@dataclass
class InputEvent:
    request_id: str
    user_id: str
    session_id: str
    source: str
    input_type: InputType
    payload: Any
    timestamp: float
    metadata: UserMetadata

class Layer1_InputIdentity:
    """
    Layer 1: Input & Identity Handler
    
    Responsibilities:
    - Validate and normalize user inputs
    - Resolve user identity and session context
    - Apply security and rate limiting
    - Emit structured InputEvents to Layer 3
    """
    
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.users: Dict[str, UserMetadata] = {}
        self.rate_limits: Dict[str, list] = {}
        
        # Default local user for single-user mode
        self._create_default_user()
    
    def _create_default_user(self):
        """Create default local user for single-user installations"""
        default_user = UserMetadata(
            user_id="local_user",
            role=UserPath.FORGE,
            capabilities=["basic_models", "all_levels"],
            preferences={"theme": "dark", "level": 1},
            created_at=time.time(),
            last_seen=time.time()
        )
        self.users["local_user"] = default_user
    
    def validate_input(self, raw_request: Dict[str, Any]) -> Optional[str]:
        """
        Validate incoming request structure and content
        Returns error message if invalid, None if valid
        """
        required_fields = ["payload"]
        
        for field in required_fields:
            if field not in raw_request:
                return f"Missing required field: {field}"
        
        # Validate payload based on input type
        payload = raw_request.get("payload", {})
        
        if "text" in payload:
            text = payload["text"]
            if not isinstance(text, str):
                return "Text payload must be string"
            if len(text) > 10000:
                return "Text payload exceeds maximum length (10000 characters)"
            if len(text.strip()) == 0:
                return "Text payload cannot be empty"
        
        return None
    
    def resolve_identity(self, raw_request: Dict[str, Any]) -> tuple[str, str]:
        """
        Resolve user identity and session from request
        Returns (user_id, session_id)
        """
        # Extract auth token or default to local user
        auth_token = raw_request.get("authToken")
        user_id = "local_user"  # Default for local-first
        
        if auth_token:
            # In multi-user mode, validate token and resolve user
            # For now, simple token-to-user mapping
            user_id = self._validate_auth_token(auth_token)
        
        # Get or create session
        session_id = raw_request.get("sessionId")
        if not session_id:
            session_id = str(uuid.uuid4())
            self._create_session(user_id, session_id)
        
        return user_id, session_id
    
    def _validate_auth_token(self, token: str) -> str:
        """Validate authentication token and return user ID"""
        # Simplified auth - in production would validate JWT/API key
        if token.startswith("user_"):
            return token
        return "local_user"
    
    def _create_session(self, user_id: str, session_id: str):
        """Create new session for user"""
        self.sessions[session_id] = {
            "user_id": user_id,
            "created_at": time.time(),
            "last_activity": time.time(),
            "conversation_history": [],
            "current_level": 1,
            "active_models": []
        }
    
    def check_rate_limit(self, user_id: str) -> bool:
        """
        Check if user is within rate limits
        Returns True if allowed, False if rate limited
        """
        now = time.time()
        window = 60  # 1 minute window
        max_requests = 100  # Max requests per minute
        
        if user_id not in self.rate_limits:
            self.rate_limits[user_id] = []
        
        # Clean old requests outside window
        self.rate_limits[user_id] = [
            req_time for req_time in self.rate_limits[user_id]
            if now - req_time < window
        ]
        
        # Check if under limit
        if len(self.rate_limits[user_id]) >= max_requests:
            return False
        
        # Add current request
        self.rate_limits[user_id].append(now)
        return True
    
    def normalize_input(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and sanitize input payload"""
        normalized = payload.copy()
        
        # Trim whitespace from text inputs
        if "text" in normalized and isinstance(normalized["text"], str):
            normalized["text"] = normalized["text"].strip()
        
        # Set default parameters
        if "parameters" not in normalized:
            normalized["parameters"] = {}
        
        # Ensure safe parameter ranges
        params = normalized["parameters"]
        if "temperature" in params:
            params["temperature"] = max(0, min(2, params["temperature"]))
        if "maxTokens" in params:
            params["maxTokens"] = max(1, min(4000, params["maxTokens"]))
        
        return normalized
    
    def determine_input_type(self, payload: Dict[str, Any]) -> InputType:
        """Determine the type of input based on payload content"""
        if "text" in payload:
            text = payload["text"].lower().strip()
            if text.startswith("/") or text.startswith("#"):
                return InputType.COMMAND
            return InputType.PROMPT
        elif "action" in payload:
            return InputType.CONTROL
        elif "setting" in payload:
            return InputType.SETTING
        else:
            return InputType.PROMPT
    
    def process_request(self, raw_request: Dict[str, Any]) -> tuple[Optional[InputEvent], Optional[str]]:
        """
        Main processing function for Layer 1
        Returns (InputEvent, error_message)
        """
        # Step 1: Validate input structure
        validation_error = self.validate_input(raw_request)
        if validation_error:
            return None, validation_error
        
        # Step 2: Resolve identity and session
        try:
            user_id, session_id = self.resolve_identity(raw_request)
        except Exception as e:
            return None, f"Identity resolution failed: {str(e)}"
        
        # Step 3: Check rate limits
        if not self.check_rate_limit(user_id):
            return None, "Rate limit exceeded"
        
        # Step 4: Get user metadata
        if user_id not in self.users:
            return None, f"Unknown user: {user_id}"
        
        user_metadata = self.users[user_id]
        user_metadata.last_seen = time.time()
        
        # Step 5: Normalize input
        normalized_payload = self.normalize_input(raw_request["payload"])
        
        # Step 6: Determine input type
        input_type = self.determine_input_type(normalized_payload)
        
        # Step 7: Create InputEvent
        input_event = InputEvent(
            request_id=raw_request.get("requestId", str(uuid.uuid4())),
            user_id=user_id,
            session_id=session_id,
            source=raw_request.get("source", "ui"),
            input_type=input_type,
            payload=normalized_payload,
            timestamp=time.time(),
            metadata=user_metadata
        )
        
        # Step 8: Update session activity
        if session_id in self.sessions:
            self.sessions[session_id]["last_activity"] = time.time()
        
        return input_event, None
    
    def to_dict(self, input_event: InputEvent) -> Dict[str, Any]:
        """Convert InputEvent to dictionary for Layer 3"""
        return {
            "requestId": input_event.request_id,
            "userId": input_event.user_id,
            "sessionId": input_event.session_id,
            "source": input_event.source,
            "inputType": input_event.input_type.value,
            "payload": input_event.payload,
            "timestamp": input_event.timestamp,
            "metadata": {
                "userRole": input_event.metadata.role.value,
                "capabilities": input_event.metadata.capabilities,
                "preferences": input_event.metadata.preferences
            }
        }

# Example usage and testing
if __name__ == "__main__":
    # Initialize Layer 1
    layer1 = Layer1_InputIdentity()
    
    # Example request from Layer 4
    sample_request = {
        "requestId": "req_123",
        "sessionId": "session_456",
        "source": "ui_main",
        "payload": {
            "text": "Hello, how are you?",
            "parameters": {
                "temperature": 0.7,
                "maxTokens": 1000
            }
        }
    }
    
    # Process request
    input_event, error = layer1.process_request(sample_request)
    
    if error:
        print(f"Error: {error}")
    else:
        print("InputEvent created successfully:")
        print(json.dumps(layer1.to_dict(input_event), indent=2))
        
        # Example of what gets sent to Layer 3
        print("\nSending to Layer 3 (Orchestrator)...")
        # orchestrator.handle_input(layer1.to_dict(input_event))
