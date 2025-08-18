"""
DECIPHER Core Engine - Layer 3 Central Compiler
Real-time token-to-energy conversion with 60Hz frame timing

Implements WF-FND-004 specification for local-first, privacy-preserving
AI token stream processing with energy metaphor visualization.
"""

import asyncio
import time
import json
import threading
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
from collections import deque
from enum import Enum
import logging
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UXLevel(Enum):
    """User experience levels determining feature availability"""
    BASIC = 1
    ENHANCED = 2
    INTERMEDIATE = 3
    ADVANCED = 4
    EXPERT = 5

class EventType(Enum):
    """DECIPHER event types"""
    ENERGY_UPDATE = "energy_update"
    TOKEN_STREAM = "token_stream"
    INTERFERENCE = "interference"
    RESONANCE = "resonance"
    ENERGY_FIELD = "energy_field"
    ERROR = "error"

@dataclass
class TokenBatch:
    """Token batch for processing"""
    timestamp: float
    stream_id: str
    model_id: str
    token_count: int
    complexity: float
    speed: float
    metadata: Dict[str, Any]

@dataclass
class EnergyState:
    """Current energy state"""
    current: float
    rate: float
    accumulated: float
    smoothed: float
    peak: float

@dataclass
class FrameMetrics:
    """Frame processing metrics"""
    sequence: int
    start_time: float
    duration: float
    tokens_processed: int
    energy_generated: float
    overrun: bool

class EMAFilter:
    """Exponential Moving Average filter for energy smoothing"""
    
    def __init__(self, alpha: float = 0.1):
        self.alpha = alpha
        self.value = 0.0
        self.initialized = False
    
    def update(self, new_value: float) -> float:
        """Update filter with new value"""
        if not self.initialized:
            self.value = new_value
            self.initialized = True
        else:
            self.value = self.alpha * new_value + (1 - self.alpha) * self.value
        return self.value

class TokenQueue:
    """Thread-safe token queue with backpressure management"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.queue = deque()
        self.lock = threading.Lock()
        self.overflow_count = 0
        self.merge_count = 0
    
    def enqueue(self, batch: TokenBatch) -> bool:
        """Add token batch to queue with overflow protection"""
        with self.lock:
            if len(self.queue) >= self.max_size:
                # Emergency merge or drop
                if len(self.queue) > 0:
                    last_batch = self.queue[-1]
                    if (last_batch.stream_id == batch.stream_id and 
                        batch.timestamp - last_batch.timestamp < 0.1):
                        # Merge with last batch
                        merged = self._merge_batches(last_batch, batch)
                        self.queue[-1] = merged
                        self.merge_count += 1
                        return True
                
                # Drop oldest if no merge possible
                self.queue.popleft()
                self.overflow_count += 1
            
            self.queue.append(batch)
            return True
    
    def drain(self, max_items: int = None) -> List[TokenBatch]:
        """Drain items from queue"""
        with self.lock:
            if max_items is None:
                items = list(self.queue)
                self.queue.clear()
            else:
                items = []
                for _ in range(min(max_items, len(self.queue))):
                    items.append(self.queue.popleft())
            return items
    
    def size(self) -> int:
        """Get current queue size"""
        with self.lock:
            return len(self.queue)
    
    def _merge_batches(self, batch1: TokenBatch, batch2: TokenBatch) -> TokenBatch:
        """Merge two token batches"""
        total_tokens = batch1.token_count + batch2.token_count
        weighted_complexity = (
            (batch1.complexity * batch1.token_count + 
             batch2.complexity * batch2.token_count) / total_tokens
        )
        
        return TokenBatch(
            timestamp=batch2.timestamp,
            stream_id=batch1.stream_id,
            model_id=batch1.model_id,
            token_count=total_tokens,
            complexity=weighted_complexity,
            speed=max(batch1.speed, batch2.speed),
            metadata={**batch1.metadata, **batch2.metadata}
        )

class EnergyCalculator:
    """Energy calculation engine implementing WF-FND-002 formulas"""
    
    BASE_ENERGY = 0.01  # Base energy per token (EU)
    
    def __init__(self):
        self.model_factors = {
            "llama2_7b": 1.0,
            "llama2_13b": 1.3,
            "codellama_7b": 1.1,
            "codellama_13b": 1.4,
            "mistral_7b": 0.9,
            "gpt_3_5": 1.2,
            "gpt_4": 2.0
        }
    
    def calculate_energy(self, batch: TokenBatch) -> float:
        """Calculate energy for token batch"""
        # Base energy calculation
        base_eu = self.BASE_ENERGY * batch.token_count
        
        # Apply complexity factor (0.1 - 10.0)
        complexity_factor = max(0.1, min(10.0, batch.complexity))
        
        # Apply speed multiplier (higher speed = more energy)
        speed_multiplier = 1.0 + (batch.speed / 100.0)  # Normalize speed
        
        # Apply model size factor
        model_factor = self.model_factors.get(batch.model_id, 1.0)
        
        # Calculate final energy
        energy = base_eu * complexity_factor * speed_multiplier * model_factor
        
        return round(energy, 3)

class PatternDetector:
    """Pattern detection for interference and resonance"""
    
    def __init__(self, ux_level: UXLevel):
        self.ux_level = ux_level
        self.stream_history = {}
        self.interference_threshold = 0.7
        self.resonance_threshold = 5.0
    
    def analyze_patterns(self, streams: Dict[str, List[float]]) -> List[Dict]:
        """Analyze patterns across multiple streams"""
        patterns = []
        
        if self.ux_level.value < 2:
            return patterns  # Pattern detection disabled for Level 1
        
        # Interference detection (Level 2+)
        if len(streams) >= 2:
            interference = self._detect_interference(streams)
            if interference:
                patterns.append(interference)
        
        # Resonance detection (Level 5 only)
        if self.ux_level.value >= 5:
            resonance = self._detect_resonance(streams)
            if resonance:
                patterns.append(resonance)
        
        return patterns
    
    def _detect_interference(self, streams: Dict[str, List[float]]) -> Optional[Dict]:
        """Detect interference patterns between streams"""
        stream_ids = list(streams.keys())
        if len(stream_ids) < 2:
            return None
        
        # Simple correlation-based interference detection
        correlations = []
        for i in range(len(stream_ids)):
            for j in range(i + 1, len(stream_ids)):
                stream_a = streams[stream_ids[i]]
                stream_b = streams[stream_ids[j]]
                
                if len(stream_a) >= 5 and len(stream_b) >= 5:
                    correlation = self._calculate_correlation(stream_a[-5:], stream_b[-5:])
                    correlations.append({
                        'streams': [stream_ids[i], stream_ids[j]],
                        'correlation': correlation
                    })
        
        # Check for strong correlation (interference)
        for corr in correlations:
            if abs(corr['correlation']) > self.interference_threshold:
                pattern_type = "constructive" if corr['correlation'] > 0 else "destructive"
                return {
                    'type': EventType.INTERFERENCE.value,
                    'pattern': pattern_type,
                    'strength': abs(corr['correlation']),
                    'streams': corr['streams']
                }
        
        return None
    
    def _detect_resonance(self, streams: Dict[str, List[float]]) -> Optional[Dict]:
        """Detect resonance phenomena (Level 5 only)"""
        if len(streams) < 2:
            return None
        
        # Simple sustained high-energy detection
        total_energy = sum(
            sum(stream[-10:]) if len(stream) >= 10 else sum(stream)
            for stream in streams.values()
        )
        
        if total_energy > self.resonance_threshold:
            return {
                'type': EventType.RESONANCE.value,
                'phenomenon': 'emergent',
                'intensity': min(total_energy, 10.0),
                'frequency': 60.0,  # Frame rate
                'participants': list(streams.keys())
            }
        
        return None
    
    def _calculate_correlation(self, series_a: List[float], series_b: List[float]) -> float:
        """Calculate correlation between two series"""
        if len(series_a) != len(series_b) or len(series_a) == 0:
            return 0.0
        
        mean_a = sum(series_a) / len(series_a)
        mean_b = sum(series_b) / len(series_b)
        
        numerator = sum((a - mean_a) * (b - mean_b) for a, b in zip(series_a, series_b))
        
        sum_sq_a = sum((a - mean_a) ** 2 for a in series_a)
        sum_sq_b = sum((b - mean_b) ** 2 for b in series_b)
        
        denominator = (sum_sq_a * sum_sq_b) ** 0.5
        
        return numerator / denominator if denominator != 0 else 0.0

class DecipherCore:
    """Main DECIPHER engine - Layer 3 central compiler"""
    
    FRAME_RATE = 60  # Hz
    FRAME_BUDGET = 16.67  # milliseconds
    
    def __init__(self, ux_level: UXLevel = UXLevel.BASIC):
        self.ux_level = ux_level
        self.running = False
        self.frame_sequence = 0
        
        # Core components
        self.token_queue = TokenQueue()
        self.energy_calculator = EnergyCalculator()
        self.pattern_detector = PatternDetector(ux_level)
        self.ema_filter = EMAFilter(alpha=0.1)
        
        # State management
        self.energy_state = EnergyState(0.0, 0.0, 0.0, 0.0, 0.0)
        self.stream_registry = {}
        self.stream_history = {}
        self.performance_metrics = {
            'frame_rate': 0.0,
            'overrun_count': 0,
            'throughput': 0.0
        }
        
        # Event callbacks
        self.event_callbacks: List[Callable] = []
        
        # Frame timing
        self.last_frame_time = 0.0
        self.frame_times = deque(maxlen=60)  # Last 60 frame times
    
    def register_callback(self, callback: Callable):
        """Register event callback"""
        self.event_callbacks.append(callback)
    
    def ingest_tokens(self, stream_id: str, model_id: str, token_count: int, 
                     complexity: float = 1.0, speed: float = 50.0, 
                     metadata: Dict = None) -> bool:
        """Ingest tokens from Layer 2"""
        batch = TokenBatch(
            timestamp=time.time(),
            stream_id=stream_id,
            model_id=model_id,
            token_count=token_count,
            complexity=complexity,
            speed=speed,
            metadata=metadata or {}
        )
        
        return self.token_queue.enqueue(batch)
    
    async def start(self):
        """Start the DECIPHER engine"""
        self.running = True
        self.last_frame_time = time.time()
        
        logger.info(f"DECIPHER starting - UX Level {self.ux_level.value}, 60Hz frame rate")
        
        while self.running:
            frame_start = time.time()
            
            try:
                await self._process_frame()
            except Exception as e:
                logger.error(f"Frame processing error: {e}")
                await self._emit_error_event("FRAME_PROCESSING_ERROR", str(e))
            
            # Calculate frame timing
            frame_duration = (time.time() - frame_start) * 1000  # ms
            self.frame_times.append(frame_duration)
            
            # Check for budget overrun
            if frame_duration > self.FRAME_BUDGET:
                self.performance_metrics['overrun_count'] += 1
                logger.warning(f"Frame {self.frame_sequence} overrun: {frame_duration:.2f}ms")
            
            # Sleep until next frame
            sleep_time = max(0, (self.FRAME_BUDGET / 1000) - (time.time() - frame_start))
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
    
    async def _process_frame(self):
        """Process a single 60Hz frame"""
        frame_start = time.time()
        self.frame_sequence += 1
        
        # Generate frame ID
        frame_id = f"frame_{self.frame_sequence}_{int(frame_start * 1000)}"
        
        # Step 1: Drain token queue (Priority 1)
        batches = self.token_queue.drain(max_items=50)  # Limit batch size
        
        if not batches:
            # No tokens to process, emit minimal update
            await self._emit_energy_event(frame_id, 0.0)
            return
        
        # Step 2: Calculate energy (Priority 1)
        total_energy = 0.0
        tokens_processed = 0
        
        for batch in batches:
            energy = self.energy_calculator.calculate_energy(batch)
            total_energy += energy
            tokens_processed += batch.token_count
            
            # Update stream registry
            self._update_stream_registry(batch, energy)
        
        # Step 3: Update energy state (Priority 2)
        self.energy_state.current = total_energy
        self.energy_state.accumulated += total_energy
        self.energy_state.smoothed = self.ema_filter.update(total_energy)
        
        if total_energy > self.energy_state.peak:
            self.energy_state.peak = total_energy
        
        # Calculate energy rate
        time_delta = frame_start - self.last_frame_time
        if time_delta > 0:
            self.energy_state.rate = total_energy / time_delta
        
        # Step 4: Pattern analysis (Priority 3, conditional)
        patterns = []
        if self.ux_level.value >= 2 and len(self.stream_history) >= 2:
            # Check remaining budget
            elapsed = (time.time() - frame_start) * 1000
            if elapsed < self.FRAME_BUDGET * 0.7:  # 70% budget threshold
                patterns = self.pattern_detector.analyze_patterns(self.stream_history)
        
        # Step 5: Emit events (Priority 1)
        await self._emit_energy_event(frame_id, total_energy)
        
        for pattern in patterns:
            await self._emit_pattern_event(frame_id, pattern)
        
        # Update timing
        self.last_frame_time = frame_start
        
        # Update performance metrics
        self._update_performance_metrics(tokens_processed, frame_start)
    
    def _update_stream_registry(self, batch: TokenBatch, energy: float):
        """Update stream registry and history"""
        stream_id = batch.stream_id
        
        # Update registry
        if stream_id not in self.stream_registry:
            self.stream_registry[stream_id] = {
                'model_id': batch.model_id,
                'created': batch.timestamp,
                'token_count': 0,
                'energy_contribution': 0.0
            }
        
        self.stream_registry[stream_id]['token_count'] += batch.token_count
        self.stream_registry[stream_id]['energy_contribution'] += energy
        self.stream_registry[stream_id]['last_activity'] = batch.timestamp
        
        # Update history for pattern detection
        if stream_id not in self.stream_history:
            self.stream_history[stream_id] = deque(maxlen=100)
        
        self.stream_history[stream_id].append(energy)
    
    def _update_performance_metrics(self, tokens_processed: int, frame_time: float):
        """Update performance metrics"""
        # Calculate frame rate
        if len(self.frame_times) > 10:
            avg_frame_time = sum(self.frame_times) / len(self.frame_times)
            self.performance_metrics['frame_rate'] = 1000.0 / avg_frame_time
        
        # Calculate throughput
        time_delta = frame_time - self.last_frame_time
        if time_delta > 0:
            self.performance_metrics['throughput'] = tokens_processed / time_delta
    
    async def _emit_energy_event(self, frame_id: str, energy: float):
        """Emit energy update event"""
        event = {
            'type': EventType.ENERGY_UPDATE.value,
            'timestamp': time.time(),
            'frameId': frame_id,
            'energy': {
                'current': self.energy_state.current,
                'rate': self.energy_state.rate,
                'accumulated': self.energy_state.accumulated,
                'smoothed': self.energy_state.smoothed,
                'peak': self.energy_state.peak
            },
            'tokens': {
                'count': len(self.token_queue.drain(0)),  # Current queue size
                'rate': self.performance_metrics['throughput']
            },
            'metadata': {
                'frameSequence': self.frame_sequence,
                'frameDuration': self.frame_times[-1] if self.frame_times else 0.0,
                'uxLevel': self.ux_level.value,
                'activeModels': list(set(
                    info['model_id'] for info in self.stream_registry.values()
                ))
            }
        }
        
        await self._emit_event(event)
    
    async def _emit_pattern_event(self, frame_id: str, pattern: Dict):
        """Emit pattern detection event"""
        event = {
            **pattern,
            'timestamp': time.time(),
            'frameId': frame_id
        }
        
        await self._emit_event(event)
    
    async def _emit_error_event(self, error_code: str, message: str):
        """Emit error event"""
        event = {
            'type': EventType.ERROR.value,
            'timestamp': time.time(),
            'error': {
                'code': error_code,
                'message': message,
                'severity': 'medium'
            }
        }
        
        await self._emit_event(event)
    
    async def _emit_event(self, event: Dict):
        """Emit event to all registered callbacks"""
        for callback in self.event_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logger.error(f"Event callback error: {e}")
    
    def stop(self):
        """Stop the DECIPHER engine"""
        self.running = False
        logger.info("DECIPHER stopped")
    
    def get_state_snapshot(self) -> Dict:
        """Get current state snapshot for debugging/audit"""
        return {
            'timestamp': time.time(),
            'frameSequence': self.frame_sequence,
            'energyState': asdict(self.energy_state),
            'performanceMetrics': self.performance_metrics,
            'streamRegistry': self.stream_registry,
            'queueSize': self.token_queue.size(),
            'uxLevel': self.ux_level.value
        }

# Example usage and testing
async def example_usage():
    """Example usage of DECIPHER core"""
    
    # Event handler
    async def handle_event(event):
        print(f"Event: {event['type']} - {json.dumps(event, indent=2)}")
    
    # Create DECIPHER instance
    decipher = DecipherCore(UXLevel.ADVANCED)
    decipher.register_callback(handle_event)
    
    # Simulate token ingestion
    async def simulate_tokens():
        await asyncio.sleep(1)  # Let DECIPHER start
        
        for i in range(100):
            # Simulate multi-model token streams
            decipher.ingest_tokens(
                stream_id="stream_a",
                model_id="llama2_7b",
                token_count=5,
                complexity=1.2,
                speed=45.0
            )
            
            if i % 3 == 0:  # Second model occasionally
                decipher.ingest_tokens(
                    stream_id="stream_b",
                    model_id="codellama_13b",
                    token_count=3,
                    complexity=1.8,
                    speed=30.0
                )
            
            await asyncio.sleep(0.1)  # 100ms intervals
    
    # Run simulation
    await asyncio.gather(
        decipher.start(),
        simulate_tokens()
    )

if __name__ == "__main__":
    # Run example
    asyncio.run(example_usage())
