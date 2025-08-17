"""
WF-FND-003 Layer 3: Orchestration & Energy Implementation Example
Core system orchestrator managing state, energy calculations, and 60Hz loop.
"""

import asyncio
import json
import time
import math
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import threading
from collections import deque

class EventType(Enum):
    TOKEN_STREAM = "TOKEN_STREAM"
    ENERGY_UPDATE = "ENERGY_UPDATE"
    COMPLETION = "COMPLETION"
    INTERFERENCE = "INTERFERENCE"
    RESONANCE = "RESONANCE"
    ERROR = "ERROR"

@dataclass
class TokenEvent:
    request_id: str
    model_name: str
    token: str
    token_index: int
    timestamp: float
    duration: float
    energy: float
    stream_id: str

@dataclass
class EnergyState:
    total_energy: float
    current_rate: float
    active_streams: int
    session_metrics: Dict[str, Any]
    level_progress: Dict[str, Any]

@dataclass
class SystemEvent:
    event_type: EventType
    request_id: str
    timestamp: float
    data: Dict[str, Any]

class Layer3_OrchestrationEnergy:
    """
    Layer 3: Orchestration & Energy Manager
    
    Responsibilities:
    - Model orchestration and scheduling
    - Energy Unit (EU) calculations  
    - Global state management (single source of truth)
    - 60Hz update loop coordination
    - Event publishing and pattern detection
    """
    
    def __init__(self, layer2_interface, layer4_interface):
        self.layer2 = layer2_interface  # Model compute interface
        self.layer4 = layer4_interface  # Transport interface
        
        # Core state (single source of truth)
        self.global_state = {
            "sessions": {},
            "global_metrics": {
                "total_energy": 0.0,
                "total_tokens": 0,
                "uptime": time.time()
            },
            "active_models": {},
            "interference_buffer": deque(maxlen=1000)
        }
        
        # Event publishing
        self.event_subscribers: List[Callable] = []
        self.event_queue = asyncio.Queue()
        
        # 60Hz update loop
        self.frame_rate = 60
        self.frame_duration = 1.0 / self.frame_rate  # 16.67ms
        self.running = False
        self.update_task = None
        
        # Energy calculation parameters
        self.energy_config = {
            "base_energy_per_token": 0.01,
            "speed_multiplier": 1.5,
            "complexity_factor": 1.2,
            "ema_alpha": 0.1  # Exponential moving average
        }
        
        # Interference detection
        self.interference_window = 0.5  # 500ms window
        self.correlation_threshold = 0.7
        
    async def start(self):
        """Start the 60Hz orchestration loop"""
        self.running = True
        self.update_task = asyncio.create_task(self._update_loop())
        print("Layer 3 Orchestrator started (60Hz)")
    
    async def stop(self):
        """Stop the orchestration loop"""
        self.running = False
        if self.update_task:
            await self.update_task
        print("Layer 3 Orchestrator stopped")
    
    async def _update_loop(self):
        """Main 60Hz update loop - maintains 16.67ms frame budget"""
        while self.running:
            frame_start = time.time()
            
            try:
                # Process queued events (batched)
                await self._process_event_batch()
                
                # Update energy calculations
                self._update_energy_state()
                
                # Detect interference patterns
                self._detect_interference()
                
                # Emit state updates
                await self._emit_state_update()
                
                # Calculate frame timing
                frame_time = time.time() - frame_start
                sleep_time = max(0, self.frame_duration - frame_time)
                
                if frame_time > self.frame_duration:
                    print(f"Frame budget exceeded: {frame_time*1000:.2f}ms")
                
                await asyncio.sleep(sleep_time)
                
            except Exception as e:
                await self._emit_error(f"Update loop error: {str(e)}")
                await asyncio.sleep(self.frame_duration)
    
    async def handle_input(self, input_event: Dict[str, Any]):
        """Handle input from Layer 1 (Identity)"""
        try:
            request_id = input_event["requestId"]
            user_id = input_event["userId"]
            session_id = input_event["sessionId"]
            payload = input_event["payload"]
            
            # Initialize session if needed
            if session_id not in self.global_state["sessions"]:
                self._initialize_session(session_id, user_id)
            
            # Route based on input type
            input_type = input_event["inputType"]
            
            if input_type == "prompt":
                await self._handle_prompt(request_id, session_id, payload)
            elif input_type == "control":
                await self._handle_control(request_id, session_id, payload)
            elif input_type == "command":
                await self._handle_command(request_id, session_id, payload)
            
        except Exception as e:
            await self._emit_error(f"Input handling error: {str(e)}", request_id)
    
    def _initialize_session(self, session_id: str, user_id: str):
        """Initialize new session state"""
        self.global_state["sessions"][session_id] = {
            "user_id": user_id,
            "created_at": time.time(),
            "total_energy": 0.0,
            "total_tokens": 0,
            "current_level": 1,
            "active_requests": {},
            "energy_history": deque(maxlen=3600),  # 1 minute at 60Hz
            "interference_events": []
        }
    
    async def _handle_prompt(self, request_id: str, session_id: str, payload: Dict[str, Any]):
        """Handle user prompt - orchestrate model execution"""
        try:
            # Determine model strategy
            model_name = payload.get("modelPreference", "default")
            council_mode = payload.get("council", False)
            
            if council_mode:
                # Multi-model council execution
                await self._execute_council(request_id, session_id, payload)
            else:
                # Single model execution
                await self._execute_single_model(request_id, session_id, model_name, payload)
                
        except Exception as e:
            await self._emit_error(f"Prompt handling error: {str(e)}", request_id)
    
    async def _execute_single_model(self, request_id: str, session_id: str, model_name: str, payload: Dict[str, Any]):
        """Execute single model generation"""
        # Create model request
        model_request = {
            "requestId": request_id,
            "modelName": model_name,
            "prompt": payload["text"],
            "parameters": payload.get("parameters", {}),
            "stream": True
        }
        
        # Register active request
        session = self.global_state["sessions"][session_id]
        session["active_requests"][request_id] = {
            "model": model_name,
            "start_time": time.time(),
            "token_count": 0,
            "stream_id": f"{request_id}_{model_name}"
        }
        
        # Start model execution (async)
        asyncio.create_task(self._monitor_model_stream(request_id, session_id, model_request))
    
    async def _execute_council(self, request_id: str, session_id: str, payload: Dict[str, Any]):
        """Execute multi-model council generation"""
        models = payload.get("models", ["model_a", "model_b"])
        
        # Create parallel model requests
        for i, model_name in enumerate(models):
            sub_request_id = f"{request_id}_council_{i}"
            model_request = {
                "requestId": sub_request_id,
                "modelName": model_name,
                "prompt": payload["text"],
                "parameters": payload.get("parameters", {}),
                "stream": True
            }
            
            # Register council member
            session = self.global_state["sessions"][session_id]
            session["active_requests"][sub_request_id] = {
                "model": model_name,
                "parent_request": request_id,
                "start_time": time.time(),
                "token_count": 0,
                "stream_id": f"{sub_request_id}_{model_name}"
            }
            
            # Start model execution
            asyncio.create_task(self._monitor_model_stream(sub_request_id, session_id, model_request))
    
    async def _monitor_model_stream(self, request_id: str, session_id: str, model_request: Dict[str, Any]):
        """Monitor token stream from Layer 2 (Model)"""
        try:
            # Call Layer 2 for model execution
            async for token_data in self.layer2.generate_stream(model_request):
                # Calculate energy for this token
                energy = self._calculate_token_energy(token_data)
                
                # Create token event
                token_event = TokenEvent(
                    request_id=request_id,
                    model_name=token_data["modelName"],
                    token=token_data["token"],
                    token_index=token_data["tokenIndex"],
                    timestamp=token_data["timestamp"],
                    duration=token_data["duration"],
                    energy=energy,
                    stream_id=token_data.get("streamId", f"{request_id}_{token_data['modelName']}")
                )
                
                # Update session state
                self._update_session_with_token(session_id, request_id, token_event)
                
                # Add to interference buffer
                self.global_state["interference_buffer"].append(token_event)
                
                # Emit token event
                await self._emit_token_event(token_event)
                
                # Check if complete
                if token_data.get("isComplete", False):
                    await self._handle_completion(request_id, session_id, token_data)
                    
        except Exception as e:
            await self._emit_error(f"Model stream error: {str(e)}", request_id)
    
    def _calculate_token_energy(self, token_data: Dict[str, Any]) -> float:
        """Calculate Energy Units (EU) for a token"""
        base_energy = self.energy_config["base_energy_per_token"]
        
        # Speed factor (faster = more energy)
        duration_ms = token_data.get("duration", 50)
        speed_factor = max(0.1, 100.0 / duration_ms)  # Normalize to ~50ms baseline
        
        # Complexity factor (based on probability if available)
        complexity_factor = 1.0
        if "probability" in token_data:
            prob = token_data["probability"]
            complexity_factor = 1.0 + (1.0 - prob)  # Lower probability = higher complexity
        
        energy = base_energy * speed_factor * complexity_factor
        return round(energy, 6)
    
    def _update_session_with_token(self, session_id: str, request_id: str, token_event: TokenEvent):
        """Update session state with new token"""
        session = self.global_state["sessions"][session_id]
        
        # Update counters
        session["total_tokens"] += 1
        session["total_energy"] += token_event.energy
        
        # Update request state
        if request_id in session["active_requests"]:
            session["active_requests"][request_id]["token_count"] += 1
        
        # Add to energy history for visualization
        session["energy_history"].append({
            "timestamp": token_event.timestamp,
            "energy": token_event.energy,
            "cumulative": session["total_energy"]
        })
        
        # Update global metrics
        self.global_state["global_metrics"]["total_tokens"] += 1
        self.global_state["global_metrics"]["total_energy"] += token_event.energy
    
    def _update_energy_state(self):
        """Update energy calculations for all sessions"""
        for session_id, session in self.global_state["sessions"].items():
            # Calculate current tokens per second
            recent_window = 2.0  # 2 second window
            now = time.time()
            
            recent_tokens = [
                entry for entry in session["energy_history"]
                if now - entry["timestamp"] < recent_window
            ]
            
            current_tps = len(recent_tokens) / recent_window if recent_tokens else 0
            
            # Update session metrics
            session["current_tps"] = current_tps
            session["last_update"] = now
    
    def _detect_interference(self):
        """Detect interference patterns between model streams"""
        if len(self.global_state["interference_buffer"]) < 2:
            return
        
        now = time.time()
        window_events = [
            event for event in self.global_state["interference_buffer"]
            if now - event.timestamp < self.interference_window
        ]
        
        # Group by model
        model_streams = {}
        for event in window_events:
            if event.model_name not in model_streams:
                model_streams[event.model_name] = []
            model_streams[event.model_name].append(event)
        
        # Check for simultaneous tokens (constructive interference)
        if len(model_streams) >= 2:
            models = list(model_streams.keys())
            for i in range(len(models)):
                for j in range(i + 1, len(models)):
                    correlation = self._calculate_stream_correlation(
                        model_streams[models[i]], 
                        model_streams[models[j]]
                    )
                    
                    if abs(correlation) > self.correlation_threshold:
                        asyncio.create_task(self._emit_interference_event(
                            models[i], models[j], correlation
                        ))
    
    def _calculate_stream_correlation(self, stream1: List[TokenEvent], stream2: List[TokenEvent]) -> float:
        """Calculate correlation between two token streams"""
        if not stream1 or not stream2:
            return 0.0
        
        # Simple timing correlation
        time_diffs = []
        for event1 in stream1:
            closest_event2 = min(stream2, key=lambda e: abs(e.timestamp - event1.timestamp))
            time_diff = abs(event1.timestamp - closest_event2.timestamp)
            time_diffs.append(time_diff)
        
        avg_diff = sum(time_diffs) / len(time_diffs)
        correlation = max(0, 1.0 - (avg_diff / 0.1))  # 100ms tolerance
        
        return correlation
    
    async def _process_event_batch(self):
        """Process batched events within frame budget"""
        batch_size = 10  # Max events per frame
        processed = 0
        
        while not self.event_queue.empty() and processed < batch_size:
            try:
                event = self.event_queue.get_nowait()
                await self._process_single_event(event)
                processed += 1
            except asyncio.QueueEmpty:
                break
    
    async def _process_single_event(self, event: SystemEvent):
        """Process individual system event"""
        # Route event to Layer 4 for transport
        await self.layer4.emit_event(asdict(event))
    
    async def _emit_token_event(self, token_event: TokenEvent):
        """Emit token stream event"""
        event = SystemEvent(
            event_type=EventType.TOKEN_STREAM,
            request_id=token_event.request_id,
            timestamp=token_event.timestamp,
            data={
                "streamId": token_event.stream_id,
                "modelName": token_event.model_name,
                "token": token_event.token,
                "tokenIndex": token_event.token_index,
                "energy": token_event.energy,
                "duration": token_event.duration
            }
        )
        await self.event_queue.put(event)
    
    async def _emit_state_update(self):
        """Emit periodic state update"""
        state_data = {
            "timestamp": time.time(),
            "globalMetrics": self.global_state["global_metrics"],
            "activeSessions": len(self.global_state["sessions"]),
            "activeModels": len(self.global_state["active_models"])
        }
        
        event = SystemEvent(
            event_type=EventType.ENERGY_UPDATE,
            request_id="system",
            timestamp=time.time(),
            data=state_data
        )
        await self.event_queue.put(event)
    
    async def _emit_interference_event(self, model1: str, model2: str, correlation: float):
        """Emit interference pattern detection"""
        pattern = "constructive" if correlation > 0 else "destructive"
        
        event = SystemEvent(
            event_type=EventType.INTERFERENCE,
            request_id="system",
            timestamp=time.time(),
            data={
                "pattern": pattern,
                "models": [model1, model2],
                "correlation": correlation,
                "strength": abs(correlation)
            }
        )
        await self.event_queue.put(event)
    
    async def _emit_error(self, message: str, request_id: str = "system"):
        """Emit error event"""
        event = SystemEvent(
            event_type=EventType.ERROR,
            request_id=request_id,
            timestamp=time.time(),
            data={
                "message": message,
                "severity": "medium"
            }
        )
        await self.event_queue.put(event)
    
    async def _handle_completion(self, request_id: str, session_id: str, completion_data: Dict[str, Any]):
        """Handle model completion"""
        session = self.global_state["sessions"][session_id]
        
        if request_id in session["active_requests"]:
            request_info = session["active_requests"][request_id]
            duration = time.time() - request_info["start_time"]
            
            # Calculate final metrics
            tokens_per_second = request_info["token_count"] / duration if duration > 0 else 0
            
            # Emit completion event
            event = SystemEvent(
                event_type=EventType.COMPLETION,
                request_id=request_id,
                timestamp=time.time(),
                data={
                    "modelName": request_info["model"],
                    "tokenCount": request_info["token_count"],
                    "duration": duration,
                    "tokensPerSecond": tokens_per_second,
                    "totalEnergy": session["total_energy"]
                }
            )
            await self.event_queue.put(event)
            
            # Clean up active request
            del session["active_requests"][request_id]
    
    async def _handle_control(self, request_id: str, session_id: str, payload: Dict[str, Any]):
        """Handle control actions (stop, pause, etc.)"""
        action = payload.get("action")
        target = payload.get("target", "all")
        
        if action == "stop":
            await self._stop_generation(session_id, target)
        elif action == "pause":
            await self._pause_generation(session_id, target)
        elif action == "resume":
            await self._resume_generation(session_id, target)
    
    async def _stop_generation(self, session_id: str, target: str):
        """Stop model generation"""
        session = self.global_state["sessions"][session_id]
        
        if target == "all":
            # Stop all active requests
            for req_id in list(session["active_requests"].keys()):
                await self.layer2.cancel_generation(req_id)
                del session["active_requests"][req_id]
        else:
            # Stop specific request
            if target in session["active_requests"]:
                await self.layer2.cancel_generation(target)
                del session["active_requests"][target]
    
    async def _handle_command(self, request_id: str, session_id: str, payload: Dict[str, Any]):
        """Handle system commands"""
        # Implementation for system commands
        pass

# Example Layer 2 interface (mock)
class MockLayer2Interface:
    async def generate_stream(self, model_request):
        """Mock model generation stream"""
        for i in range(10):
            await asyncio.sleep(0.05)  # Simulate token generation
            yield {
                "modelName": model_request["modelName"],
                "token": f"token_{i}",
                "tokenIndex": i,
                "timestamp": time.time(),
                "duration": 50,  # 50ms per token
                "probability": 0.8,
                "isComplete": i == 9
            }
    
    async def cancel_generation(self, request_id):
        print(f"Cancelling generation: {request_id}")

# Example Layer 4 interface (mock)
class MockLayer4Interface:
    async def emit_event(self, event_data):
        """Mock event emission to transport layer"""
        print(f"Emitting event: {event_data['event_type']}")

# Example usage
if __name__ == "__main__":
    async def main():
        # Initialize interfaces
        layer2 = MockLayer2Interface()
        layer4 = MockLayer4Interface()
        
        # Initialize orchestrator
        orchestrator = Layer3_OrchestrationEnergy(layer2, layer4)
        
        # Start orchestrator
        await orchestrator.start()
        
        # Simulate input from Layer 1
        input_event = {
            "requestId": "req_123",
            "userId": "user_456",
            "sessionId": "session_789",
            "inputType": "prompt",
            "payload": {
                "text": "Hello, how are you?",
                "parameters": {"temperature": 0.7}
            }
        }
        
        await orchestrator.handle_input(input_event)
        
        # Let it run for a few seconds
        await asyncio.sleep(3)
        
        # Stop orchestrator
        await orchestrator.stop()
    
    asyncio.run(main())
