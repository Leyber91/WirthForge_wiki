"""
WF-TECH-005 Energy Mapper Module
WIRTHFORGE Token-to-Energy Conversion System

This module implements the core energy calculation formulas from WF-FND-002,
converting AI token characteristics into Energy Units (EU) with support for
velocity, certainty, and friction components.

Key Features:
- WF-FND-002 energy formula implementation
- Adaptive mapping for missing data (fallback weights)
- Multi-model energy calculation
- Pattern-aware energy adjustments (burst/stall detection)
- Performance-optimized calculations for 60Hz processing
"""

import math
import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
from collections import deque

class TokenType(Enum):
    """Token classification for energy calculation"""
    NORMAL = "normal"
    BURST = "burst"      # Part of rapid token sequence
    STALL = "stall"      # After significant pause
    FINAL = "final"      # Last token in generation
    SPECIAL = "special"  # Special tokens (start, end, etc.)

@dataclass
class EnergyComponents:
    """Breakdown of energy calculation components"""
    base_energy: float
    velocity_component: float
    certainty_component: float
    friction_component: float
    pattern_modifier: float
    total_energy: float

@dataclass
class TokenMetrics:
    """Comprehensive token analysis for energy calculation"""
    content: str
    timestamp: float
    model_id: str
    
    # Core metrics
    token_length: int
    confidence: Optional[float] = None
    logprobs: Optional[Dict] = None
    
    # Timing metrics
    time_since_last: Optional[float] = None
    generation_velocity: Optional[float] = None  # tokens/second
    
    # Context metrics
    position_in_sequence: int = 0
    total_sequence_length: Optional[int] = None
    
    # Classification
    token_type: TokenType = TokenType.NORMAL
    is_continuation: bool = False
    
    # Model-specific
    model_temperature: Optional[float] = None
    model_top_p: Optional[float] = None

class EnergyMapper:
    """
    Core energy calculation engine implementing WF-FND-002 formulas.
    
    Converts token characteristics into Energy Units (EU) using velocity,
    certainty, and friction components with adaptive fallbacks.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize energy mapper with configuration"""
        self.config = self._load_config(config or {})
        
        # State tracking for velocity calculations
        self.model_histories = {}  # model_id -> token history
        self.global_history = deque(maxlen=100)  # Global token timing
        
        # Pattern detection state
        self.burst_detectors = {}  # model_id -> burst detection state
        self.stall_detectors = {}  # model_id -> stall detection state
        
        # Performance optimization
        self.calculation_cache = {}  # Cache for repeated calculations
        self.cache_hits = 0
        self.cache_misses = 0
        
    def _load_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Load configuration with defaults from WF-FND-002"""
        defaults = {
            # Base energy parameters
            "base_energy_per_token": 1.0,
            "energy_unit_scale": 1.0,
            
            # Component weights (must sum to 1.0)
            "velocity_weight": 0.4,
            "certainty_weight": 0.3,
            "friction_weight": 0.3,
            
            # Velocity calculation
            "velocity_window_size": 10,  # tokens to consider for velocity
            "max_velocity_tokens_per_sec": 20.0,
            "min_velocity_tokens_per_sec": 0.1,
            "velocity_smoothing_alpha": 0.3,
            
            # Certainty calculation
            "confidence_threshold_high": 0.8,
            "confidence_threshold_low": 0.3,
            "entropy_calculation_enabled": True,
            "max_entropy_bits": 10.0,
            
            # Friction calculation
            "stall_threshold_ms": 500.0,
            "burst_threshold_ms": 50.0,
            "friction_decay_factor": 0.8,
            "friction_amplification": 1.5,
            
            # Pattern modifiers
            "burst_energy_multiplier": 1.3,
            "stall_energy_multiplier": 0.7,
            "final_token_multiplier": 1.2,
            "special_token_multiplier": 0.8,
            
            # Fallback handling
            "use_fallback_confidence": True,
            "fallback_confidence_value": 0.5,
            "use_length_based_energy": True,
            "length_energy_factor": 0.1,
            
            # Performance tuning
            "enable_caching": True,
            "cache_size_limit": 1000,
            "precision_digits": 3
        }
        
        # Merge with provided config
        merged = defaults.copy()
        merged.update(config)
        
        # Validate weights sum to 1.0
        weight_sum = (merged["velocity_weight"] + 
                     merged["certainty_weight"] + 
                     merged["friction_weight"])
        if abs(weight_sum - 1.0) > 0.01:
            raise ValueError(f"Component weights must sum to 1.0, got {weight_sum}")
            
        return merged
        
    def calculate_energy(self, token_metrics: TokenMetrics) -> EnergyComponents:
        """
        Calculate energy for a single token using WF-FND-002 formulas.
        
        E(t) = base_energy * (velocity_component + certainty_component + friction_component) * pattern_modifier
        """
        
        # Check cache first
        cache_key = self._get_cache_key(token_metrics)
        if self.config["enable_caching"] and cache_key in self.calculation_cache:
            self.cache_hits += 1
            return self.calculation_cache[cache_key]
            
        self.cache_misses += 1
        
        # Calculate base energy
        base_energy = self._calculate_base_energy(token_metrics)
        
        # Calculate velocity component
        velocity_component = self._calculate_velocity_component(token_metrics)
        
        # Calculate certainty component
        certainty_component = self._calculate_certainty_component(token_metrics)
        
        # Calculate friction component
        friction_component = self._calculate_friction_component(token_metrics)
        
        # Calculate pattern modifier
        pattern_modifier = self._calculate_pattern_modifier(token_metrics)
        
        # Combine components using WF-FND-002 formula
        weighted_sum = (
            velocity_component * self.config["velocity_weight"] +
            certainty_component * self.config["certainty_weight"] +
            friction_component * self.config["friction_weight"]
        )
        
        total_energy = base_energy * weighted_sum * pattern_modifier
        
        # Round to configured precision
        precision = self.config["precision_digits"]
        total_energy = round(total_energy, precision)
        
        # Create result object
        result = EnergyComponents(
            base_energy=round(base_energy, precision),
            velocity_component=round(velocity_component, precision),
            certainty_component=round(certainty_component, precision),
            friction_component=round(friction_component, precision),
            pattern_modifier=round(pattern_modifier, precision),
            total_energy=total_energy
        )
        
        # Cache result
        if self.config["enable_caching"]:
            self._cache_result(cache_key, result)
            
        # Update model history
        self._update_model_history(token_metrics)
        
        return result
        
    def _calculate_base_energy(self, token_metrics: TokenMetrics) -> float:
        """Calculate base energy per token"""
        base = self.config["base_energy_per_token"]
        
        # Add length-based component if enabled
        if self.config["use_length_based_energy"]:
            length_bonus = token_metrics.token_length * self.config["length_energy_factor"]
            base += length_bonus
            
        return base * self.config["energy_unit_scale"]
        
    def _calculate_velocity_component(self, token_metrics: TokenMetrics) -> float:
        """
        Calculate velocity component: V(t) = f(tokens_per_second)
        Higher velocity = higher energy
        """
        
        # Get or calculate velocity
        if token_metrics.generation_velocity is not None:
            velocity = token_metrics.generation_velocity
        else:
            velocity = self._estimate_velocity(token_metrics)
            
        # Normalize velocity to 0-1 range
        max_vel = self.config["max_velocity_tokens_per_sec"]
        min_vel = self.config["min_velocity_tokens_per_sec"]
        
        # Clamp velocity to reasonable range
        velocity = max(min_vel, min(max_vel, velocity))
        
        # Logarithmic scaling for better distribution
        normalized_velocity = math.log(velocity / min_vel) / math.log(max_vel / min_vel)
        
        return max(0.0, min(1.0, normalized_velocity))
        
    def _calculate_certainty_component(self, token_metrics: TokenMetrics) -> float:
        """
        Calculate certainty component: C(t) = f(confidence, entropy)
        Higher certainty = higher energy
        """
        
        certainty = 0.0
        
        # Primary: Use confidence if available
        if token_metrics.confidence is not None:
            certainty = token_metrics.confidence
            
        # Secondary: Calculate from logprobs if available
        elif (token_metrics.logprobs is not None and 
              self.config["entropy_calculation_enabled"]):
            certainty = self._calculate_confidence_from_logprobs(token_metrics.logprobs)
            
        # Fallback: Use configured fallback
        elif self.config["use_fallback_confidence"]:
            certainty = self.config["fallback_confidence_value"]
            
        # Apply certainty thresholds for non-linear scaling
        high_thresh = self.config["confidence_threshold_high"]
        low_thresh = self.config["confidence_threshold_low"]
        
        if certainty >= high_thresh:
            # High certainty gets bonus
            certainty = 0.8 + 0.2 * ((certainty - high_thresh) / (1.0 - high_thresh))
        elif certainty <= low_thresh:
            # Low certainty gets penalty
            certainty = 0.2 * (certainty / low_thresh)
        else:
            # Linear scaling in middle range
            certainty = 0.2 + 0.6 * ((certainty - low_thresh) / (high_thresh - low_thresh))
            
        return max(0.0, min(1.0, certainty))
        
    def _calculate_friction_component(self, token_metrics: TokenMetrics) -> float:
        """
        Calculate friction component: F(t) = f(stall_time, burst_detection)
        Stalls reduce energy, smooth flow maintains energy
        """
        
        friction = 1.0  # Default: no friction
        
        # Check for stall condition
        if token_metrics.time_since_last is not None:
            stall_threshold = self.config["stall_threshold_ms"] / 1000.0
            
            if token_metrics.time_since_last > stall_threshold:
                # Apply friction penalty
                stall_factor = min(token_metrics.time_since_last / stall_threshold, 3.0)
                friction *= (self.config["friction_decay_factor"] ** stall_factor)
                
        # Check for burst condition
        if self._is_burst_token(token_metrics):
            # Reduce friction for burst tokens
            friction *= self.config["friction_amplification"]
            
        # Pattern-based friction
        if token_metrics.token_type == TokenType.STALL:
            friction *= 0.5  # Heavy friction for stall tokens
        elif token_metrics.token_type == TokenType.BURST:
            friction *= 1.2  # Reduced friction for burst tokens
            
        return max(0.1, min(2.0, friction))  # Clamp to reasonable range
        
    def _calculate_pattern_modifier(self, token_metrics: TokenMetrics) -> float:
        """Calculate pattern-based energy modifiers"""
        modifier = 1.0
        
        # Apply token type modifiers
        if token_metrics.token_type == TokenType.BURST:
            modifier *= self.config["burst_energy_multiplier"]
        elif token_metrics.token_type == TokenType.STALL:
            modifier *= self.config["stall_energy_multiplier"]
        elif token_metrics.token_type == TokenType.FINAL:
            modifier *= self.config["final_token_multiplier"]
        elif token_metrics.token_type == TokenType.SPECIAL:
            modifier *= self.config["special_token_multiplier"]
            
        # Position-based modifiers
        if token_metrics.total_sequence_length is not None:
            # Slight boost for tokens near the end
            position_ratio = token_metrics.position_in_sequence / token_metrics.total_sequence_length
            if position_ratio > 0.8:  # Last 20% of sequence
                modifier *= 1.1
                
        return modifier
        
    def _estimate_velocity(self, token_metrics: TokenMetrics) -> float:
        """Estimate token generation velocity from model history"""
        model_id = token_metrics.model_id
        
        if model_id not in self.model_histories:
            return self.config["min_velocity_tokens_per_sec"]
            
        history = self.model_histories[model_id]
        if len(history) < 2:
            return self.config["min_velocity_tokens_per_sec"]
            
        # Calculate velocity from recent history
        window_size = min(self.config["velocity_window_size"], len(history))
        recent_tokens = history[-window_size:]
        
        time_deltas = []
        for i in range(1, len(recent_tokens)):
            delta = recent_tokens[i]["timestamp"] - recent_tokens[i-1]["timestamp"]
            if delta > 0:
                time_deltas.append(delta)
                
        if not time_deltas:
            return self.config["min_velocity_tokens_per_sec"]
            
        avg_delta = sum(time_deltas) / len(time_deltas)
        velocity = 1.0 / avg_delta if avg_delta > 0 else self.config["min_velocity_tokens_per_sec"]
        
        return velocity
        
    def _calculate_confidence_from_logprobs(self, logprobs: Dict) -> float:
        """Calculate confidence from log probabilities using entropy"""
        if not logprobs or "top_logprobs" not in logprobs:
            return 0.5
            
        top_logprobs = logprobs["top_logprobs"]
        if not top_logprobs:
            return 0.5
            
        # Calculate entropy from top logprobs
        entropy = 0.0
        for token_data in top_logprobs:
            if "logprob" in token_data:
                prob = math.exp(token_data["logprob"])
                if prob > 0:
                    entropy -= prob * math.log2(prob)
                    
        # Normalize entropy to confidence (0-1)
        max_entropy = self.config["max_entropy_bits"]
        normalized_entropy = min(entropy / max_entropy, 1.0)
        confidence = 1.0 - normalized_entropy  # High entropy = low confidence
        
        return confidence
        
    def _is_burst_token(self, token_metrics: TokenMetrics) -> bool:
        """Detect if token is part of a burst sequence"""
        if token_metrics.time_since_last is None:
            return False
            
        burst_threshold = self.config["burst_threshold_ms"] / 1000.0
        return token_metrics.time_since_last < burst_threshold
        
    def _update_model_history(self, token_metrics: TokenMetrics):
        """Update model history for velocity calculations"""
        model_id = token_metrics.model_id
        
        if model_id not in self.model_histories:
            self.model_histories[model_id] = deque(maxlen=self.config["velocity_window_size"])
            
        self.model_histories[model_id].append({
            "timestamp": token_metrics.timestamp,
            "token_length": token_metrics.token_length,
            "confidence": token_metrics.confidence
        })
        
        # Update global history
        self.global_history.append({
            "timestamp": token_metrics.timestamp,
            "model_id": model_id,
            "energy": None  # Will be filled by caller
        })
        
    def _get_cache_key(self, token_metrics: TokenMetrics) -> str:
        """Generate cache key for token metrics"""
        # Create key from relevant fields only
        key_parts = [
            str(token_metrics.token_length),
            str(token_metrics.confidence or "none"),
            str(token_metrics.token_type.value),
            str(round(token_metrics.time_since_last or 0, 2))
        ]
        return "|".join(key_parts)
        
    def _cache_result(self, cache_key: str, result: EnergyComponents):
        """Cache calculation result with size limit"""
        if len(self.calculation_cache) >= self.config["cache_size_limit"]:
            # Remove oldest entry (simple FIFO)
            oldest_key = next(iter(self.calculation_cache))
            del self.calculation_cache[oldest_key]
            
        self.calculation_cache[cache_key] = result
        
    def batch_calculate_energy(self, token_list: List[TokenMetrics]) -> List[EnergyComponents]:
        """Calculate energy for multiple tokens efficiently"""
        results = []
        
        for i, token_metrics in enumerate(token_list):
            # Update timing information
            if i > 0:
                time_delta = token_metrics.timestamp - token_list[i-1].timestamp
                token_metrics.time_since_last = time_delta
                
            # Calculate energy
            energy_components = self.calculate_energy(token_metrics)
            results.append(energy_components)
            
        return results
        
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        total_requests = self.cache_hits + self.cache_misses
        hit_rate = self.cache_hits / total_requests if total_requests > 0 else 0
        
        return {
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": round(hit_rate, 3),
            "cache_size": len(self.calculation_cache),
            "models_tracked": len(self.model_histories),
            "global_history_size": len(self.global_history)
        }
        
    def reset_cache(self):
        """Reset calculation cache"""
        self.calculation_cache.clear()
        self.cache_hits = 0
        self.cache_misses = 0
        
    def configure_for_model(self, model_id: str, model_config: Dict[str, Any]):
        """Configure energy mapping for specific model characteristics"""
        # This could be extended to have per-model configurations
        # For now, we just ensure the model is tracked
        if model_id not in self.model_histories:
            self.model_histories[model_id] = deque(maxlen=self.config["velocity_window_size"])

# Utility functions for common use cases

def create_token_metrics_from_simple_data(content: str, model_id: str, 
                                        confidence: Optional[float] = None,
                                        timestamp: Optional[float] = None) -> TokenMetrics:
    """Create TokenMetrics from simple token data"""
    return TokenMetrics(
        content=content,
        timestamp=timestamp or time.time(),
        model_id=model_id,
        token_length=len(content),
        confidence=confidence,
        token_type=TokenType.NORMAL
    )

def calculate_sequence_energy(token_contents: List[str], model_id: str,
                            energy_mapper: EnergyMapper = None) -> Tuple[List[EnergyComponents], float]:
    """Calculate energy for a complete token sequence"""
    if energy_mapper is None:
        energy_mapper = EnergyMapper()
        
    # Create token metrics for sequence
    token_metrics_list = []
    base_time = time.time()
    
    for i, content in enumerate(token_contents):
        metrics = TokenMetrics(
            content=content,
            timestamp=base_time + i * 0.1,  # 100ms intervals
            model_id=model_id,
            token_length=len(content),
            position_in_sequence=i,
            total_sequence_length=len(token_contents),
            token_type=TokenType.FINAL if i == len(token_contents) - 1 else TokenType.NORMAL
        )
        token_metrics_list.append(metrics)
        
    # Calculate energy for all tokens
    energy_results = energy_mapper.batch_calculate_energy(token_metrics_list)
    total_energy = sum(result.total_energy for result in energy_results)
    
    return energy_results, total_energy

# Example usage and testing
if __name__ == "__main__":
    # Create energy mapper with custom config
    config = {
        "velocity_weight": 0.5,
        "certainty_weight": 0.3,
        "friction_weight": 0.2,
        "enable_caching": True
    }
    
    mapper = EnergyMapper(config)
    
    # Test single token
    token = TokenMetrics(
        content="hello",
        timestamp=time.time(),
        model_id="test_model",
        token_length=5,
        confidence=0.85,
        token_type=TokenType.NORMAL
    )
    
    energy = mapper.calculate_energy(token)
    print(f"Token energy: {energy.total_energy} EU")
    print(f"Components: velocity={energy.velocity_component}, "
          f"certainty={energy.certainty_component}, friction={energy.friction_component}")
    
    # Test sequence
    sequence = ["The", "quick", "brown", "fox", "jumps"]
    energy_results, total = calculate_sequence_energy(sequence, "test_model", mapper)
    
    print(f"\nSequence total energy: {total} EU")
    for i, (token, energy) in enumerate(zip(sequence, energy_results)):
        print(f"  {token}: {energy.total_energy} EU")
        
    # Performance stats
    stats = mapper.get_performance_stats()
    print(f"\nPerformance: {stats}")
