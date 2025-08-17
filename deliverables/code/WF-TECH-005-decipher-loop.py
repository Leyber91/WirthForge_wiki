"""
WF-TECH-005 Decipher Real-Time Loop Implementation
WIRTHFORGE Real-Time AI Energy Compiler

This module implements the core 60Hz real-time loop that converts AI token streams
into structured energy events with <16.67ms frame budget compliance.

Key Features:
- 60Hz frame-locked processing loop
- Token-to-energy conversion using WF-FND-002 formulas
- Adaptive load management and frame dropping
- WebSocket event emission
- State machine management (IDLE, CHARGING, FLOWING, STALLING, DRAINED)
- Multi-model support with interference/resonance detection
"""

import asyncio
import time
import json
import logging
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from collections import deque
from enum import Enum
import uuid
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnergyState(Enum):
    """Energy state machine states from WF-FND-002"""
    IDLE = "IDLE"
    CHARGING = "CHARGING"  # Prompt received, waiting for first token
    FLOWING = "FLOWING"    # Tokens flowing normally
    STALLING = "STALLING"  # Long pause detected
    DRAINED = "DRAINED"    # Generation complete

@dataclass
class TokenData:
    """Represents a single token from the AI model"""
    content: str
    timestamp: float
    model_id: str
    confidence: Optional[float] = None  # 0.0-1.0 if available
    logprobs: Optional[Dict] = None     # Log probabilities if available
    is_final: bool = False              # True if this is the last token

@dataclass
class FrameState:
    """Current frame processing state"""
    frame_id: int
    timestamp: float
    tokens_processed: int
    energy_generated: float
    total_energy: float
    energy_rate: float  # EU per second (smoothed)
    state: EnergyState
    processing_time_ms: float
    queue_depth: int
    
    # Pattern detection
    interference_detected: bool = False
    resonance_detected: bool = False
    interference_strength: float = 0.0
    resonance_strength: float = 0.0
    
    # Performance metrics
    frame_overruns: int = 0
    dropped_tokens: int = 0

@dataclass
class DecipherConfig:
    """Configuration for Decipher loop"""
    target_fps: int = 60
    frame_budget_ms: float = 16.67  # 1000ms / 60fps
    max_queue_size: int = 1000
    max_tokens_per_frame: int = 10
    
    # Energy calculation parameters
    energy_smoothing_alpha: float = 0.35  # EMA smoothing factor
    base_energy_per_token: float = 1.0
    velocity_weight: float = 0.4
    certainty_weight: float = 0.3
    friction_weight: float = 0.3
    
    # Stall detection
    stall_threshold_ms: float = 500.0  # Consider stalling after 500ms
    drain_timeout_ms: float = 2000.0   # Consider drained after 2s
    
    # Performance tuning
    enable_resonance_detection: bool = True
    enable_interference_detection: bool = True
    enable_particle_effects: bool = True
    
    # Adaptive degradation thresholds
    degradation_queue_threshold: int = 100
    degradation_overrun_threshold: int = 5

class DecipherLoop:
    """
    Main Decipher real-time processing loop.
    
    Implements the 60Hz compiler that converts AI token streams into
    structured energy events for real-time visualization.
    """
    
    def __init__(self, config: DecipherConfig = None):
        self.config = config or DecipherConfig()
        self.frame_interval = 1.0 / self.config.target_fps
        
        # Core state
        self.running = False
        self.frame_count = 0
        self.current_state = EnergyState.IDLE
        self.total_energy = 0.0
        self.energy_rate_ema = 0.0  # Exponential moving average
        self.last_token_time = 0.0
        self.session_start_time = 0.0
        
        # Token processing
        self.token_queue = asyncio.Queue(maxsize=self.config.max_queue_size)
        self.active_models = {}  # model_id -> model state
        
        # Performance tracking
        self.frame_overruns = 0
        self.dropped_tokens = 0
        self.processing_times = deque(maxlen=60)  # Last 60 frame times
        
        # Event emission
        self.event_callbacks = []  # List of async callbacks for events
        
        # Adaptive degradation state
        self.degraded_mode = False
        self.consecutive_overruns = 0
        
        # Pattern detection state
        self.interference_history = deque(maxlen=30)  # 0.5s history at 60fps
        self.resonance_history = deque(maxlen=180)    # 3s history at 60fps
        
    def add_event_callback(self, callback: Callable):
        """Add callback for event emission (typically WebSocket send)"""
        self.event_callbacks.append(callback)
        
    async def ingest_token(self, token: TokenData):
        """
        Ingest a token from the AI model.
        Non-blocking - queues token for processing in next frame.
        """
        try:
            self.token_queue.put_nowait(token)
            
            # Update state machine on first token
            if self.current_state == EnergyState.CHARGING:
                self.current_state = EnergyState.FLOWING
                self.last_token_time = time.time()
                
        except asyncio.QueueFull:
            # Queue full - drop token and count it
            self.dropped_tokens += 1
            logger.warning(f"Token queue full, dropped token from {token.model_id}")
            
    async def start_session(self, session_id: str = None):
        """Start a new Decipher session"""
        self.session_start_time = time.time()
        self.current_state = EnergyState.IDLE
        self.total_energy = 0.0
        self.frame_count = 0
        
        # Emit session start event
        await self._emit_event({
            "id": str(uuid.uuid4()),
            "type": "session.start",
            "timestamp": int(time.time() * 1000),
            "payload": {
                "session_id": session_id or str(uuid.uuid4()),
                "config": asdict(self.config)
            }
        })
        
    async def start_prompt(self, prompt_data: Dict[str, Any]):
        """Signal that a new prompt is being processed"""
        self.current_state = EnergyState.CHARGING
        
        await self._emit_event({
            "id": str(uuid.uuid4()),
            "type": "prompt.start",
            "timestamp": int(time.time() * 1000),
            "payload": prompt_data
        })
        
    async def start_loop(self):
        """Start the main 60Hz processing loop"""
        self.running = True
        logger.info("Starting Decipher 60Hz loop")
        
        try:
            while self.running:
                frame_start = time.time()
                
                # Process frame
                await self._process_frame(frame_start)
                
                # Calculate sleep time to maintain 60Hz
                frame_duration = time.time() - frame_start
                sleep_time = max(0, self.frame_interval - frame_duration)
                
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                else:
                    # Frame overrun
                    self.frame_overruns += 1
                    self.consecutive_overruns += 1
                    logger.warning(f"Frame overrun: {frame_duration*1000:.2f}ms")
                    
        except Exception as e:
            logger.error(f"Decipher loop error: {e}")
            await self._emit_error_event(str(e))
            
    async def stop_loop(self):
        """Stop the processing loop gracefully"""
        self.running = False
        logger.info("Stopping Decipher loop")
        
    async def _process_frame(self, frame_start: float):
        """Process a single frame within the 16.67ms budget"""
        frame_id = self.frame_count
        self.frame_count += 1
        
        # Phase 1: Essential processing (always runs)
        tokens_this_frame = await self._collect_tokens()
        frame_energy = await self._calculate_frame_energy(tokens_this_frame)
        self._update_state_machine()
        
        # Check timing after essential work
        elapsed = (time.time() - frame_start) * 1000
        budget_used = elapsed / self.config.frame_budget_ms
        
        # Phase 2: Optional enhancements (if time permits)
        particles = []
        if budget_used < 0.5 and self.config.enable_particle_effects:
            particles = self._generate_particles(tokens_this_frame, frame_energy)
            
        # Phase 3: Pattern detection (if time permits and enabled)
        interference_data = None
        resonance_data = None
        
        if budget_used < 0.7:
            if self.config.enable_interference_detection:
                interference_data = self._detect_interference()
            if self.config.enable_resonance_detection:
                resonance_data = self._detect_resonance()
                
        # Phase 4: Emit frame event
        await self._emit_frame_event(
            frame_id, frame_start, tokens_this_frame, frame_energy,
            particles, interference_data, resonance_data
        )
        
        # Phase 5: Performance tracking and adaptation
        final_duration = (time.time() - frame_start) * 1000
        self.processing_times.append(final_duration)
        
        if final_duration <= self.config.frame_budget_ms:
            self.consecutive_overruns = 0
        
        # Adaptive degradation
        self._update_degradation_state()
        
    async def _collect_tokens(self) -> List[TokenData]:
        """Collect tokens from queue for this frame"""
        tokens = []
        max_tokens = self.config.max_tokens_per_frame
        
        # In degraded mode, process more tokens per frame to catch up
        if self.degraded_mode:
            max_tokens *= 2
            
        try:
            while len(tokens) < max_tokens:
                token = self.token_queue.get_nowait()
                tokens.append(token)
                self.last_token_time = time.time()
        except asyncio.QueueEmpty:
            pass
            
        return tokens
        
    async def _calculate_frame_energy(self, tokens: List[TokenData]) -> float:
        """Calculate total energy for this frame using WF-FND-002 formulas"""
        if not tokens:
            return 0.0
            
        total_energy = 0.0
        current_time = time.time()
        
        for token in tokens:
            # Base energy per token
            energy = self.config.base_energy_per_token
            
            # Velocity component (tokens per second)
            if hasattr(self, '_last_frame_time'):
                time_delta = current_time - self._last_frame_time
                if time_delta > 0:
                    velocity = 1.0 / time_delta  # tokens per second
                    energy += self.config.velocity_weight * min(velocity / 10.0, 1.0)
                    
            # Certainty component (based on confidence if available)
            if token.confidence is not None:
                certainty_bonus = self.config.certainty_weight * token.confidence
                energy += certainty_bonus
                
            # Friction component (stall penalty)
            if self.current_state == EnergyState.STALLING:
                energy *= (1.0 - self.config.friction_weight)
                
            total_energy += energy
            
        self._last_frame_time = current_time
        
        # Update running totals
        self.total_energy += total_energy
        
        # Update smoothed energy rate
        if total_energy > 0:
            instantaneous_rate = total_energy / self.frame_interval
            alpha = self.config.energy_smoothing_alpha
            self.energy_rate_ema = (alpha * instantaneous_rate + 
                                  (1 - alpha) * self.energy_rate_ema)
                                  
        return total_energy
        
    def _update_state_machine(self):
        """Update energy state machine based on current conditions"""
        current_time = time.time()
        time_since_last_token = current_time - self.last_token_time
        
        if self.current_state == EnergyState.FLOWING:
            if time_since_last_token > (self.config.stall_threshold_ms / 1000.0):
                self.current_state = EnergyState.STALLING
                
        elif self.current_state == EnergyState.STALLING:
            if time_since_last_token > (self.config.drain_timeout_ms / 1000.0):
                self.current_state = EnergyState.DRAINED
                
        # Check for final token
        if hasattr(self, '_received_final_token') and self._received_final_token:
            self.current_state = EnergyState.DRAINED
            
    def _generate_particles(self, tokens: List[TokenData], frame_energy: float) -> List[Dict]:
        """Generate particle effects for visualization"""
        particles = []
        
        for i, token in enumerate(tokens):
            particle_energy = frame_energy / len(tokens) if tokens else 0
            
            particle = {
                "id": f"particle_{self.frame_count}_{i}",
                "type": "spark" if particle_energy < 0.5 else "bolt",
                "energy": round(particle_energy, 3),
                "intensity": min(particle_energy * 2.0, 1.0),
                "model_id": token.model_id,
                "timestamp": token.timestamp
            }
            
            # Add special effects based on state
            if self.current_state == EnergyState.STALLING:
                particle["type"] = "fade"
                particle["intensity"] *= 0.5
            elif particle_energy > 1.0:
                particle["type"] = "burst"
                
            particles.append(particle)
            
        return particles
        
    def _detect_interference(self) -> Optional[Dict]:
        """Detect interference patterns between multiple models"""
        if len(self.active_models) < 2:
            return None
            
        # Simple interference detection based on timing overlap
        # In a full implementation, this would analyze frequency patterns
        
        models_active_now = []
        current_time = time.time()
        
        for model_id, model_state in self.active_models.items():
            if current_time - model_state.get('last_token_time', 0) < 0.1:  # 100ms window
                models_active_now.append(model_id)
                
        if len(models_active_now) >= 2:
            # Calculate interference strength (simplified)
            strength = min(len(models_active_now) / 3.0, 1.0)
            
            interference = {
                "type": "constructive" if strength > 0.7 else "destructive",
                "strength": round(strength, 3),
                "models_involved": models_active_now,
                "frequency": 60.0,  # Placeholder - would be calculated from FFT
                "duration_ms": 100.0
            }
            
            self.interference_history.append(interference)
            return interference
            
        return None
        
    def _detect_resonance(self) -> Optional[Dict]:
        """Detect resonance patterns in energy flow"""
        if len(self.resonance_history) < 30:  # Need some history
            return None
            
        # Simple resonance detection based on sustained high energy
        # In a full implementation, this would use spectral analysis
        
        recent_energy = [frame.get('energy', 0) for frame in 
                        list(self.resonance_history)[-30:]]
        
        if recent_energy:
            avg_energy = sum(recent_energy) / len(recent_energy)
            if avg_energy > 1.5:  # Threshold for resonance
                resonance = {
                    "type": "harmonic",
                    "strength": min(avg_energy / 3.0, 1.0),
                    "frequency": 42.5,  # Placeholder
                    "amplification": avg_energy / 1.0,  # Ratio vs baseline
                    "duration_ms": len(recent_energy) * self.frame_interval * 1000
                }
                return resonance
                
        return None
        
    def _update_degradation_state(self):
        """Update adaptive degradation state based on performance"""
        queue_size = self.token_queue.qsize()
        
        # Enter degraded mode if consistently overloaded
        if (queue_size > self.config.degradation_queue_threshold or 
            self.consecutive_overruns > self.config.degradation_overrun_threshold):
            if not self.degraded_mode:
                self.degraded_mode = True
                logger.warning("Entering degraded mode due to performance issues")
                
        # Exit degraded mode if performance improves
        elif (self.degraded_mode and queue_size < 10 and 
              self.consecutive_overruns == 0):
            self.degraded_mode = False
            logger.info("Exiting degraded mode - performance recovered")
            
    async def _emit_frame_event(self, frame_id: int, frame_start: float, 
                               tokens: List[TokenData], frame_energy: float,
                               particles: List[Dict], interference_data: Optional[Dict],
                               resonance_data: Optional[Dict]):
        """Emit the main frame event to UI"""
        
        event = {
            "id": f"frame-{frame_id}",
            "type": "energy.update",
            "timestamp": int(frame_start * 1000),
            "payload": {
                "frame_id": frame_id,
                "new_tokens": len(tokens),
                "energy_generated": round(frame_energy, 3),
                "total_energy": round(self.total_energy, 3),
                "energy_rate": round(self.energy_rate_ema, 3),
                "state": self.current_state.value,
                "queue_depth": self.token_queue.qsize(),
                "processing_time_ms": round((time.time() - frame_start) * 1000, 2),
                
                # Visual elements
                "particles": particles,
                
                # Pattern detection
                "interference": interference_data,
                "resonance": resonance_data,
                
                # Performance metrics
                "performance": {
                    "frame_overruns": self.frame_overruns,
                    "dropped_tokens": self.dropped_tokens,
                    "degraded_mode": self.degraded_mode,
                    "avg_frame_time_ms": round(
                        sum(self.processing_times) / len(self.processing_times), 2
                    ) if self.processing_times else 0
                }
            }
        }
        
        await self._emit_event(event)
        
        # Store frame data for pattern detection
        self.resonance_history.append({
            "energy": frame_energy,
            "timestamp": frame_start,
            "state": self.current_state.value
        })
        
    async def _emit_event(self, event: Dict):
        """Emit event to all registered callbacks"""
        for callback in self.event_callbacks:
            try:
                await callback(event)
            except Exception as e:
                logger.error(f"Error in event callback: {e}")
                
    async def _emit_error_event(self, error_message: str):
        """Emit error event"""
        event = {
            "id": str(uuid.uuid4()),
            "type": "error",
            "timestamp": int(time.time() * 1000),
            "payload": {
                "message": error_message,
                "component": "decipher",
                "severity": "error"
            }
        }
        await self._emit_event(event)

# Example usage and testing
async def example_usage():
    """Example of how to use the Decipher loop"""
    
    # Create configuration
    config = DecipherConfig(
        target_fps=60,
        enable_resonance_detection=True,
        enable_interference_detection=True
    )
    
    # Create Decipher instance
    decipher = DecipherLoop(config)
    
    # Add event callback (would typically be WebSocket send)
    async def print_event(event):
        print(f"Event: {event['type']} - {event['payload']}")
        
    decipher.add_event_callback(print_event)
    
    # Start session
    await decipher.start_session("example_session")
    
    # Simulate token stream in background
    async def simulate_tokens():
        await asyncio.sleep(0.1)  # Small delay
        
        for i in range(20):
            token = TokenData(
                content=f"token_{i}",
                timestamp=time.time(),
                model_id="test_model",
                confidence=0.8 + (i % 3) * 0.1
            )
            await decipher.ingest_token(token)
            await asyncio.sleep(0.05)  # 20 tokens/second
            
    # Run both tasks
    token_task = asyncio.create_task(simulate_tokens())
    loop_task = asyncio.create_task(decipher.start_loop())
    
    # Let it run for 2 seconds
    await asyncio.sleep(2.0)
    
    # Stop gracefully
    await decipher.stop_loop()
    token_task.cancel()
    
    print(f"Processed {decipher.frame_count} frames")
    print(f"Total energy: {decipher.total_energy:.2f} EU")
    print(f"Frame overruns: {decipher.frame_overruns}")

if __name__ == "__main__":
    asyncio.run(example_usage())
