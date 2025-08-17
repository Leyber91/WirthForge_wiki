"""
DECIPHER Energy Calculator Module
Implements WF-FND-002 energy metaphor formulas for token-to-energy conversion

This module provides precise energy calculations based on token characteristics,
model parameters, and generation speed with support for multi-model scenarios.
"""

import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class ModelTier(Enum):
    """Model performance tiers"""
    SMALL = "small"      # 7B parameters
    MEDIUM = "medium"    # 13B parameters  
    LARGE = "large"      # 30B+ parameters
    GIANT = "giant"      # 70B+ parameters

@dataclass
class ModelConfig:
    """Model configuration for energy calculations"""
    name: str
    tier: ModelTier
    base_factor: float
    complexity_sensitivity: float
    speed_efficiency: float

@dataclass
class TokenMetrics:
    """Token batch metrics for energy calculation"""
    count: int
    complexity: float
    speed: float  # tokens/second
    model_id: str
    has_code: bool = False
    has_math: bool = False
    language: str = "en"

class EnergyCalculator:
    """
    Core energy calculation engine implementing WF-FND-002 formulas
    
    Energy Formula:
    EU = BASE_ENERGY × TOKEN_COUNT × COMPLEXITY_FACTOR × SPEED_MULTIPLIER × MODEL_FACTOR
    
    Where:
    - BASE_ENERGY = 0.01 EU per token (baseline)
    - COMPLEXITY_FACTOR = 0.1 to 10.0 (token difficulty)
    - SPEED_MULTIPLIER = speed-based energy boost
    - MODEL_FACTOR = model size and capability multiplier
    """
    
    # Core constants from WF-FND-002
    BASE_ENERGY = 0.01  # EU per token
    MIN_COMPLEXITY = 0.1
    MAX_COMPLEXITY = 10.0
    
    def __init__(self):
        self.model_configs = self._initialize_model_configs()
        self.complexity_cache = {}
        self.calculation_count = 0
    
    def _initialize_model_configs(self) -> Dict[str, ModelConfig]:
        """Initialize model configurations"""
        return {
            # Llama family
            "llama2_7b": ModelConfig("llama2_7b", ModelTier.SMALL, 1.0, 1.0, 1.0),
            "llama2_13b": ModelConfig("llama2_13b", ModelTier.MEDIUM, 1.3, 1.1, 0.9),
            "llama2_70b": ModelConfig("llama2_70b", ModelTier.GIANT, 2.5, 1.3, 0.7),
            
            # Code Llama family
            "codellama_7b": ModelConfig("codellama_7b", ModelTier.SMALL, 1.1, 1.4, 1.0),
            "codellama_13b": ModelConfig("codellama_13b", ModelTier.MEDIUM, 1.4, 1.5, 0.9),
            "codellama_34b": ModelConfig("codellama_34b", ModelTier.LARGE, 2.0, 1.6, 0.8),
            
            # Mistral family
            "mistral_7b": ModelConfig("mistral_7b", ModelTier.SMALL, 0.9, 1.0, 1.1),
            "mixtral_8x7b": ModelConfig("mixtral_8x7b", ModelTier.LARGE, 1.8, 1.2, 0.85),
            
            # OpenAI models (for comparison/hybrid scenarios)
            "gpt_3_5_turbo": ModelConfig("gpt_3_5_turbo", ModelTier.MEDIUM, 1.2, 1.1, 1.0),
            "gpt_4": ModelConfig("gpt_4", ModelTier.LARGE, 2.0, 1.3, 0.8),
            "gpt_4_turbo": ModelConfig("gpt_4_turbo", ModelTier.LARGE, 1.8, 1.25, 0.9),
            
            # Default fallback
            "unknown": ModelConfig("unknown", ModelTier.SMALL, 1.0, 1.0, 1.0)
        }
    
    def calculate_energy(self, metrics: TokenMetrics) -> float:
        """
        Calculate energy for token batch
        
        Args:
            metrics: Token batch metrics
            
        Returns:
            Energy value in EU (Energy Units)
        """
        self.calculation_count += 1
        
        # Get model configuration
        model_config = self.model_configs.get(metrics.model_id, self.model_configs["unknown"])
        
        # Base energy calculation
        base_eu = self.BASE_ENERGY * metrics.count
        
        # Apply complexity factor with bounds checking
        complexity_factor = self._calculate_complexity_factor(metrics, model_config)
        
        # Apply speed multiplier
        speed_multiplier = self._calculate_speed_multiplier(metrics.speed, model_config)
        
        # Apply model factor
        model_factor = self._calculate_model_factor(model_config, metrics)
        
        # Calculate final energy
        energy = base_eu * complexity_factor * speed_multiplier * model_factor
        
        # Apply content-specific bonuses
        content_bonus = self._calculate_content_bonus(metrics)
        energy *= content_bonus
        
        # Round to 3 decimal places for consistency
        return round(energy, 3)
    
    def _calculate_complexity_factor(self, metrics: TokenMetrics, model_config: ModelConfig) -> float:
        """Calculate complexity factor with model sensitivity"""
        # Base complexity with bounds
        base_complexity = max(self.MIN_COMPLEXITY, min(self.MAX_COMPLEXITY, metrics.complexity))
        
        # Apply model sensitivity
        adjusted_complexity = base_complexity * model_config.complexity_sensitivity
        
        # Ensure final bounds
        return max(self.MIN_COMPLEXITY, min(self.MAX_COMPLEXITY, adjusted_complexity))
    
    def _calculate_speed_multiplier(self, speed: float, model_config: ModelConfig) -> float:
        """
        Calculate speed multiplier based on generation speed
        
        Higher speed = more computational energy = higher multiplier
        Uses logarithmic scaling to prevent extreme values
        """
        if speed <= 0:
            return 1.0
        
        # Normalize speed (typical range: 10-100 tokens/second)
        normalized_speed = speed / 50.0  # 50 tokens/sec as baseline
        
        # Apply model efficiency factor
        efficiency_adjusted = normalized_speed / model_config.speed_efficiency
        
        # Logarithmic scaling: 1.0 + log(1 + speed_factor)
        speed_multiplier = 1.0 + math.log(1.0 + efficiency_adjusted) * 0.2
        
        # Reasonable bounds: 0.5x to 3.0x
        return max(0.5, min(3.0, speed_multiplier))
    
    def _calculate_model_factor(self, model_config: ModelConfig, metrics: TokenMetrics) -> float:
        """Calculate model-specific energy factor"""
        base_factor = model_config.base_factor
        
        # Tier-based adjustments
        tier_adjustments = {
            ModelTier.SMALL: 1.0,
            ModelTier.MEDIUM: 1.2,
            ModelTier.LARGE: 1.5,
            ModelTier.GIANT: 2.0
        }
        
        tier_factor = tier_adjustments.get(model_config.tier, 1.0)
        
        return base_factor * tier_factor
    
    def _calculate_content_bonus(self, metrics: TokenMetrics) -> float:
        """Calculate content-specific energy bonuses"""
        bonus = 1.0
        
        # Code content bonus (more complex processing)
        if metrics.has_code:
            bonus *= 1.15
        
        # Mathematical content bonus
        if metrics.has_math:
            bonus *= 1.10
        
        # Language-specific adjustments
        language_factors = {
            "en": 1.0,      # English baseline
            "es": 1.05,     # Spanish
            "fr": 1.05,     # French
            "de": 1.08,     # German (compound words)
            "zh": 1.12,     # Chinese (character complexity)
            "ja": 1.15,     # Japanese (multiple writing systems)
            "ar": 1.10,     # Arabic (RTL, diacritics)
            "code": 1.20    # Programming languages
        }
        
        language_factor = language_factors.get(metrics.language, 1.0)
        bonus *= language_factor
        
        return bonus
    
    def calculate_batch_energy(self, batch_metrics: List[TokenMetrics]) -> Tuple[float, Dict]:
        """
        Calculate energy for multiple token batches
        
        Args:
            batch_metrics: List of token batch metrics
            
        Returns:
            Tuple of (total_energy, breakdown_dict)
        """
        total_energy = 0.0
        breakdown = {
            "batches": [],
            "total_tokens": 0,
            "average_complexity": 0.0,
            "average_speed": 0.0,
            "model_distribution": {}
        }
        
        total_tokens = 0
        total_complexity = 0.0
        total_speed = 0.0
        
        for metrics in batch_metrics:
            energy = self.calculate_energy(metrics)
            total_energy += energy
            
            # Track breakdown
            breakdown["batches"].append({
                "model_id": metrics.model_id,
                "tokens": metrics.count,
                "energy": energy,
                "complexity": metrics.complexity,
                "speed": metrics.speed
            })
            
            # Accumulate statistics
            total_tokens += metrics.count
            total_complexity += metrics.complexity * metrics.count
            total_speed += metrics.speed * metrics.count
            
            # Model distribution
            if metrics.model_id not in breakdown["model_distribution"]:
                breakdown["model_distribution"][metrics.model_id] = {"tokens": 0, "energy": 0.0}
            breakdown["model_distribution"][metrics.model_id]["tokens"] += metrics.count
            breakdown["model_distribution"][metrics.model_id]["energy"] += energy
        
        # Calculate averages
        if total_tokens > 0:
            breakdown["total_tokens"] = total_tokens
            breakdown["average_complexity"] = total_complexity / total_tokens
            breakdown["average_speed"] = total_speed / total_tokens
        
        return round(total_energy, 3), breakdown
    
    def estimate_energy_rate(self, tokens_per_second: float, model_id: str, 
                           avg_complexity: float = 1.0) -> float:
        """
        Estimate energy generation rate
        
        Args:
            tokens_per_second: Token generation rate
            model_id: Model identifier
            avg_complexity: Average token complexity
            
        Returns:
            Energy rate in EU/second
        """
        # Create sample metrics
        sample_metrics = TokenMetrics(
            count=1,  # Per token calculation
            complexity=avg_complexity,
            speed=tokens_per_second,
            model_id=model_id
        )
        
        # Calculate energy per token
        energy_per_token = self.calculate_energy(sample_metrics)
        
        # Scale by rate
        return energy_per_token * tokens_per_second
    
    def get_model_efficiency_ranking(self) -> List[Tuple[str, float]]:
        """
        Get models ranked by energy efficiency (EU per computational cost)
        
        Returns:
            List of (model_id, efficiency_score) tuples, sorted by efficiency
        """
        efficiency_scores = []
        
        # Standard test metrics
        test_metrics = TokenMetrics(
            count=100,
            complexity=1.0,
            speed=50.0,
            model_id=""
        )
        
        for model_id, config in self.model_configs.items():
            if model_id == "unknown":
                continue
                
            test_metrics.model_id = model_id
            energy = self.calculate_energy(test_metrics)
            
            # Efficiency = energy output / computational cost (approximated by base_factor)
            efficiency = energy / config.base_factor
            efficiency_scores.append((model_id, efficiency))
        
        # Sort by efficiency (descending)
        return sorted(efficiency_scores, key=lambda x: x[1], reverse=True)
    
    def validate_energy_calculation(self, metrics: TokenMetrics) -> Dict[str, any]:
        """
        Validate energy calculation and return diagnostic information
        
        Args:
            metrics: Token metrics to validate
            
        Returns:
            Validation results and diagnostic data
        """
        validation = {
            "valid": True,
            "warnings": [],
            "errors": [],
            "calculation_breakdown": {},
            "recommendations": []
        }
        
        # Validate inputs
        if metrics.count <= 0:
            validation["errors"].append("Token count must be positive")
            validation["valid"] = False
        
        if not (self.MIN_COMPLEXITY <= metrics.complexity <= self.MAX_COMPLEXITY):
            validation["warnings"].append(
                f"Complexity {metrics.complexity} outside recommended range "
                f"[{self.MIN_COMPLEXITY}, {self.MAX_COMPLEXITY}]"
            )
        
        if metrics.speed < 0:
            validation["errors"].append("Speed cannot be negative")
            validation["valid"] = False
        
        if metrics.speed > 200:
            validation["warnings"].append(
                f"Speed {metrics.speed} tokens/sec is unusually high"
            )
        
        # Model validation
        if metrics.model_id not in self.model_configs:
            validation["warnings"].append(
                f"Unknown model '{metrics.model_id}', using default configuration"
            )
        
        # Calculate breakdown if valid
        if validation["valid"]:
            model_config = self.model_configs.get(metrics.model_id, self.model_configs["unknown"])
            
            base_eu = self.BASE_ENERGY * metrics.count
            complexity_factor = self._calculate_complexity_factor(metrics, model_config)
            speed_multiplier = self._calculate_speed_multiplier(metrics.speed, model_config)
            model_factor = self._calculate_model_factor(model_config, metrics)
            content_bonus = self._calculate_content_bonus(metrics)
            
            validation["calculation_breakdown"] = {
                "base_energy": base_eu,
                "complexity_factor": complexity_factor,
                "speed_multiplier": speed_multiplier,
                "model_factor": model_factor,
                "content_bonus": content_bonus,
                "final_energy": self.calculate_energy(metrics)
            }
            
            # Recommendations
            if metrics.complexity < 0.5:
                validation["recommendations"].append(
                    "Consider if complexity factor accurately represents token difficulty"
                )
            
            if metrics.speed < 10:
                validation["recommendations"].append(
                    "Low generation speed may indicate performance issues"
                )
        
        return validation
    
    def get_statistics(self) -> Dict[str, any]:
        """Get calculator statistics"""
        return {
            "calculations_performed": self.calculation_count,
            "models_configured": len(self.model_configs) - 1,  # Exclude 'unknown'
            "cache_size": len(self.complexity_cache),
            "supported_tiers": [tier.value for tier in ModelTier]
        }

# Example usage and testing
def example_usage():
    """Example usage of the energy calculator"""
    calculator = EnergyCalculator()
    
    # Single calculation
    metrics = TokenMetrics(
        count=10,
        complexity=1.5,
        speed=45.0,
        model_id="llama2_13b",
        has_code=True,
        language="en"
    )
    
    energy = calculator.calculate_energy(metrics)
    print(f"Energy for batch: {energy} EU")
    
    # Validation
    validation = calculator.validate_energy_calculation(metrics)
    print(f"Validation: {validation}")
    
    # Batch calculation
    batch = [
        TokenMetrics(5, 1.2, 50.0, "llama2_7b"),
        TokenMetrics(8, 1.8, 35.0, "codellama_13b", has_code=True),
        TokenMetrics(3, 0.9, 60.0, "mistral_7b")
    ]
    
    total_energy, breakdown = calculator.calculate_batch_energy(batch)
    print(f"Batch total energy: {total_energy} EU")
    print(f"Breakdown: {breakdown}")
    
    # Efficiency ranking
    ranking = calculator.get_model_efficiency_ranking()
    print(f"Model efficiency ranking: {ranking[:3]}")  # Top 3

if __name__ == "__main__":
    example_usage()
