# integration_interfaces.py
from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncIterator

class ModelInterface(ABC):
    """Integration seam for WF-TECH-002: Local AI Integration"""
    
    @abstractmethod
    async def load_model(self, model_path: str) -> bool:
        pass
    
    @abstractmethod
    async def stream_tokens(self, prompt: str) -> AsyncIterator[str]:
        pass

class ProtocolInterface(ABC):
    """Integration seam for WF-TECH-003: Real-Time Protocol"""
    
    @abstractmethod
    async def send_event(self, channel: str, data: Dict[str, Any]):
        pass
    
    @abstractmethod
    async def subscribe(self, channel: str) -> AsyncIterator[Dict[str, Any]]:
        pass

class StateInterface(ABC):
    """Integration seam for WF-TECH-004: State & Storage"""
    
    @abstractmethod
    async def save_state(self, key: str, value: Any):
        pass
    
    @abstractmethod
    async def load_state(self, key: str) -> Any:
        pass
