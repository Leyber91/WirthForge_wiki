"""
WF-TECH-002: Energy Mapping Implementation
Computes E(t) from token events and maintains EMA smoothing for 60Hz visualization
"""

import asyncio
import time
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from collections import deque
import math


@dataclass
class TokenEvent:
    """Token event with timing and optional logprobs"""
    token: str
    timestamp_ms: int
    delta_ms: int
    model: str
    session_id: str
    logprobs: Optional[List[float]] = None
    position: int = 0


class EnergyMapper:
    """
    Computes energy E(t) ∈ [0,1] from token cadence, certainty, and stall signals
    Implements FND-002 energy metaphor with graceful degradation
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        
        # Energy computation weights (from FND-002)
        self.cadence_weight = self.config.get('cadence_weight', 0.4)
        self.certainty_weight = self.config.get('certainty_weight', 0.4) 
        self.stall_weight = self.config.get('stall_weight', 0.2)
        
        # EMA smoothing parameters
        self.ema_alpha = self.config.get('ema_alpha', 0.1)
        self.normalization_window = self.config.get('normalization_window', 100)
        
        # State tracking
        self.token_history = deque(maxlen=self.normalization_window)
        self.energy_ema = 0.0
        self.last_timestamp = 0
        
        # Performance targets (ms)
        self.target_delta = 50  # 20 TPS baseline
        self.stall_threshold = 200  # Consider stalled if >200ms
        
    def compute_energy(self, event: TokenEvent) -> float:
        """
        Compute instantaneous energy E(t) from token event
        
        E(t) = w_c * E_cadence + w_cert * E_certainty + w_stall * E_stall
        where weights sum to 1.0
        """
        # Cadence energy (inverse of delta time, normalized)
        e_cadence = self._compute_cadence_energy(event.delta_ms)
        
        # Certainty energy (from logprobs if available)
        e_certainty = self._compute_certainty_energy(event.logprobs)
        
        # Stall penalty (high delta times reduce energy)
        e_stall = self._compute_stall_energy(event.delta_ms)
        
        # Weighted combination
        energy = (
            self.cadence_weight * e_cadence +
            self.certainty_weight * e_certainty +
            self.stall_weight * e_stall
        )
        
        # Clamp to [0,1] and update EMA
        energy = max(0.0, min(1.0, energy))
        self.energy_ema = self._update_ema(energy)
        
        # Track for normalization
        self.token_history.append({
            'timestamp': event.timestamp_ms,
            'delta': event.delta_ms,
            'energy': energy
        })
        
        return energy
    
    def _compute_cadence_energy(self, delta_ms: int) -> float:
        """Energy from token generation speed (faster = higher energy)"""
        if delta_ms <= 0:
            return 1.0
        
        # Exponential decay: E = exp(-delta/target)
        normalized_delta = delta_ms / self.target_delta
        return math.exp(-normalized_delta)
    
    def _compute_certainty_energy(self, logprobs: Optional[List[float]]) -> float:
        """Energy from model confidence (higher confidence = higher energy)"""
        if not logprobs:
            return 0.5  # Neutral when logprobs unavailable
        
        # Convert log probabilities to confidence
        # Higher probability (less negative logprob) = higher certainty
        max_logprob = max(logprobs) if logprobs else -1.0
        confidence = math.exp(max_logprob)  # Convert to probability
        
        return confidence
    
    def _compute_stall_energy(self, delta_ms: int) -> float:
        """Energy penalty for stalls (long delays reduce energy)"""
        if delta_ms < self.stall_threshold:
            return 1.0  # No penalty for normal timing
        
        # Linear decay for stalls
        stall_factor = (delta_ms - self.stall_threshold) / self.stall_threshold
        return max(0.0, 1.0 - stall_factor * 0.5)
    
    def _update_ema(self, new_energy: float) -> float:
        """Update exponential moving average for smooth visualization"""
        if self.energy_ema == 0.0:
            return new_energy  # Initialize
        
        return self.ema_alpha * new_energy + (1 - self.ema_alpha) * self.energy_ema
    
    def get_smoothed_energy(self) -> float:
        """Get current smoothed energy value for 60Hz output"""
        return self.energy_ema
    
    def get_statistics(self) -> Dict[str, float]:
        """Get energy statistics for monitoring"""
        if not self.token_history:
            return {}
        
        energies = [t['energy'] for t in self.token_history]
        deltas = [t['delta'] for t in self.token_history]
        
        return {
            'energy_mean': sum(energies) / len(energies),
            'energy_std': self._std_dev(energies),
            'delta_mean': sum(deltas) / len(deltas),
            'tps_current': 1000.0 / deltas[-1] if deltas[-1] > 0 else 0.0,
            'smoothed_energy': self.energy_ema
        }
    
    def _std_dev(self, values: List[float]) -> float:
        """Compute standard deviation"""
        if len(values) < 2:
            return 0.0
        
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return math.sqrt(variance)


class DiversityIndexCalculator:
    """
    Computes Diversity Index (DI) for ensemble token streams
    DI = 1 - max(P_i) where P_i is probability of most likely token
    """
    
    def __init__(self):
        self.alignment_window_ms = 100  # Token alignment window
        self.pending_tokens = {}  # session_id -> tokens
    
    def compute_di(self, aligned_tokens: List[TokenEvent]) -> float:
        """
        Compute diversity index from aligned token events
        Higher DI indicates more model disagreement/exploration
        """
        if len(aligned_tokens) < 2:
            return 0.0  # No diversity with single model
        
        # Extract logprobs if available
        all_logprobs = [event.logprobs for event in aligned_tokens if event.logprobs]
        
        if not all_logprobs:
            # Fallback: text-based diversity
            return self._text_diversity(aligned_tokens)
        
        # Probability-based diversity
        return self._probability_diversity(all_logprobs)
    
    def _text_diversity(self, tokens: List[TokenEvent]) -> float:
        """Fallback diversity calculation based on token text"""
        unique_tokens = set(event.token for event in tokens)
        return 1.0 - (1.0 / len(unique_tokens)) if unique_tokens else 0.0
    
    def _probability_diversity(self, logprobs_list: List[List[float]]) -> float:
        """Diversity from probability distributions"""
        # Aggregate probability distributions
        combined_probs = {}
        
        for logprobs in logprobs_list:
            for i, logprob in enumerate(logprobs):
                prob = math.exp(logprob)
                combined_probs[i] = combined_probs.get(i, 0.0) + prob
        
        if not combined_probs:
            return 0.5
        
        # Normalize probabilities
        total_prob = sum(combined_probs.values())
        if total_prob > 0:
            normalized_probs = {k: v/total_prob for k, v in combined_probs.items()}
            max_prob = max(normalized_probs.values())
            return 1.0 - max_prob
        
        return 0.5


class EnsembleEnergyCalculator:
    """
    Computes ensemble energy E_ensemble(t) from multiple model streams
    E_ensemble(t) = Σ(γ_m * E_m(t)) / Σ(γ_m)
    """
    
    def __init__(self, model_weights: Dict[str, float] = None):
        self.model_weights = model_weights or {}
        self.default_weight = 1.0
    
    def compute_ensemble_energy(self, token_events: List[TokenEvent]) -> float:
        """Compute weighted ensemble energy from multiple model events"""
        if not token_events:
            return 0.0
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for event in token_events:
            # Get model-specific weight
            weight = self.model_weights.get(event.model, self.default_weight)
            
            # Assume energy already computed and stored in event
            energy = getattr(event, 'energy', 0.5)
            
            weighted_sum += weight * energy
            total_weight += weight
        
        return min(1.0, weighted_sum / total_weight) if total_weight > 0 else 0.0
    
    def update_model_weight(self, model: str, weight: float):
        """Update confidence weight for specific model"""
        self.model_weights[model] = max(0.0, min(2.0, weight))  # Clamp to reasonable range


# Example usage and integration
async def example_energy_pipeline():
    """Example of energy mapping pipeline integration"""
    
    # Initialize components
    energy_mapper = EnergyMapper({
        'cadence_weight': 0.4,
        'certainty_weight': 0.4,
        'stall_weight': 0.2,
        'ema_alpha': 0.1
    })
    
    di_calculator = DiversityIndexCalculator()
    ensemble_calculator = EnsembleEnergyCalculator()
    
    # Simulate token events
    events = [
        TokenEvent("Hello", 1000, 45, "llama2", "session1", [-0.1, -0.5, -1.2]),
        TokenEvent("world", 1045, 50, "llama2", "session1", [-0.2, -0.3, -1.0]),
    ]
    
    # Process events
    for event in events:
        energy = energy_mapper.compute_energy(event)
        event.energy = energy  # Store for ensemble calculation
        
        print(f"Token: {event.token}, Energy: {energy:.3f}")
    
    # Get statistics
    stats = energy_mapper.get_statistics()
    print(f"Energy stats: {stats}")


if __name__ == "__main__":
    asyncio.run(example_energy_pipeline())
