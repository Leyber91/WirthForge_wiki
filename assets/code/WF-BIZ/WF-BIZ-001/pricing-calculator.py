#!/usr/bin/env python3
"""
WF-BIZ-001 Pricing Calculator
Local-first AI platform pricing with energy-honest billing
"""

import json
import math
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class TierType(Enum):
    FREE = "free"
    PERSONAL = "personal"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class BillingCycle(Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"
    USAGE_BASED = "usage_based"

@dataclass
class EnergyMeasurement:
    """Energy consumption measurement for honest pricing"""
    timestamp: float
    cpu_joules: float
    gpu_joules: float
    memory_joules: float
    storage_joules: float
    network_joules: float
    total_joules: float
    
    @property
    def kwh(self) -> float:
        """Convert joules to kilowatt-hours"""
        return self.total_joules / 3_600_000  # 1 kWh = 3.6M joules

@dataclass
class PricingTier:
    """Pricing tier configuration"""
    tier: TierType
    name: str
    base_price: float  # USD per billing cycle
    energy_allowance: float  # kWh per month
    energy_rate: float  # USD per kWh above allowance
    features: List[str]
    limits: Dict[str, int]
    target_segments: List[str]

@dataclass
class UsageMetrics:
    """User usage metrics for pricing calculation"""
    energy_consumed: float  # kWh
    api_calls: int
    storage_used: float  # GB
    active_projects: int
    support_tickets: int
    marketplace_transactions: float  # USD volume

class PricingCalculator:
    """
    Energy-honest pricing calculator for WIRTHFORGE platform
    Implements transparent, local-first pricing model
    """
    
    def __init__(self):
        self.tiers = self._initialize_tiers()
        self.energy_base_rate = 0.12  # USD per kWh (typical US rate)
        self.energy_markup = 1.5  # 50% markup for infrastructure
        self.marketplace_commission = 0.05  # 5% commission
        self.payment_processing_fee = 0.029  # 2.9% + $0.30
        self.payment_processing_fixed = 0.30
        
    def _initialize_tiers(self) -> Dict[TierType, PricingTier]:
        """Initialize pricing tier configurations"""
        return {
            TierType.FREE: PricingTier(
                tier=TierType.FREE,
                name="Free",
                base_price=0.0,
                energy_allowance=1.0,  # 1 kWh per month
                energy_rate=0.0,  # No overage billing for free tier
                features=[
                    "Local AI processing",
                    "Basic privacy controls",
                    "Community support",
                    "Open source models"
                ],
                limits={
                    "api_calls": 1000,
                    "storage_gb": 1,
                    "projects": 3,
                    "users": 1
                },
                target_segments=["privacy_conscious_individuals"]
            ),
            TierType.PERSONAL: PricingTier(
                tier=TierType.PERSONAL,
                name="Personal",
                base_price=9.99,
                energy_allowance=5.0,  # 5 kWh per month
                energy_rate=0.18,  # $0.18 per kWh above allowance
                features=[
                    "All Free features",
                    "Advanced AI models",
                    "Priority support",
                    "Energy usage analytics",
                    "Custom model training"
                ],
                limits={
                    "api_calls": 10000,
                    "storage_gb": 10,
                    "projects": 10,
                    "users": 1
                },
                target_segments=["privacy_conscious_individuals", "professional_creators"]
            ),
            TierType.PROFESSIONAL: PricingTier(
                tier=TierType.PROFESSIONAL,
                name="Professional",
                base_price=29.99,
                energy_allowance=20.0,  # 20 kWh per month
                energy_rate=0.16,  # $0.16 per kWh above allowance
                features=[
                    "All Personal features",
                    "Team collaboration",
                    "Advanced analytics",
                    "API access",
                    "Marketplace publishing",
                    "Professional support"
                ],
                limits={
                    "api_calls": 100000,
                    "storage_gb": 100,
                    "projects": 50,
                    "users": 5
                },
                target_segments=["professional_creators", "small_medium_businesses"]
            ),
            TierType.ENTERPRISE: PricingTier(
                tier=TierType.ENTERPRISE,
                name="Enterprise",
                base_price=99.99,
                energy_allowance=100.0,  # 100 kWh per month
                energy_rate=0.14,  # $0.14 per kWh above allowance
                features=[
                    "All Professional features",
                    "Unlimited users",
                    "Custom integrations",
                    "Dedicated support",
                    "SLA guarantees",
                    "Compliance reporting",
                    "Custom deployment"
                ],
                limits={
                    "api_calls": -1,  # Unlimited
                    "storage_gb": 1000,
                    "projects": -1,  # Unlimited
                    "users": -1  # Unlimited
                },
                target_segments=["enterprise_organizations", "educational_institutions"]
            )
        }
    
    def calculate_monthly_cost(
        self, 
        tier: TierType, 
        usage: UsageMetrics,
        billing_cycle: BillingCycle = BillingCycle.MONTHLY
    ) -> Dict[str, float]:
        """
        Calculate monthly cost for a user based on tier and usage
        
        Args:
            tier: User's pricing tier
            usage: User's monthly usage metrics
            billing_cycle: Billing cycle preference
            
        Returns:
            Dictionary with cost breakdown
        """
        tier_config = self.tiers[tier]
        
        # Base subscription cost
        base_cost = tier_config.base_price
        if billing_cycle == BillingCycle.QUARTERLY:
            base_cost *= 3 * 0.95  # 5% discount for quarterly
        elif billing_cycle == BillingCycle.ANNUAL:
            base_cost *= 12 * 0.85  # 15% discount for annual
        
        # Energy overage cost
        energy_overage = max(0, usage.energy_consumed - tier_config.energy_allowance)
        energy_cost = 0.0
        
        if tier != TierType.FREE and energy_overage > 0:
            energy_cost = energy_overage * tier_config.energy_rate
        
        # Usage overage costs
        overage_cost = 0.0
        if tier_config.limits["api_calls"] > 0:
            api_overage = max(0, usage.api_calls - tier_config.limits["api_calls"])
            overage_cost += api_overage * 0.001  # $0.001 per API call
        
        if tier_config.limits["storage_gb"] > 0:
            storage_overage = max(0, usage.storage_used - tier_config.limits["storage_gb"])
            overage_cost += storage_overage * 0.10  # $0.10 per GB
        
        # Marketplace commission
        marketplace_cost = usage.marketplace_transactions * self.marketplace_commission
        
        # Support cost (for high support usage)
        support_cost = 0.0
        if usage.support_tickets > 5:  # More than 5 tickets per month
            support_cost = (usage.support_tickets - 5) * 2.0  # $2 per additional ticket
        
        total_cost = base_cost + energy_cost + overage_cost + marketplace_cost + support_cost
        
        return {
            "base_cost": base_cost,
            "energy_cost": energy_cost,
            "energy_overage_kwh": energy_overage,
            "overage_cost": overage_cost,
            "marketplace_cost": marketplace_cost,
            "support_cost": support_cost,
            "total_cost": total_cost,
            "billing_cycle": billing_cycle.value,
            "tier": tier.value
        }
    
    def estimate_energy_cost(self, measurements: List[EnergyMeasurement]) -> Dict[str, float]:
        """
        Estimate energy cost based on actual measurements
        
        Args:
            measurements: List of energy measurements
            
        Returns:
            Energy cost breakdown
        """
        total_kwh = sum(m.kwh for m in measurements)
        
        # Calculate actual energy cost
        actual_cost = total_kwh * self.energy_base_rate
        
        # Add infrastructure markup
        marked_up_cost = actual_cost * self.energy_markup
        
        # Breakdown by component
        cpu_kwh = sum(m.cpu_joules for m in measurements) / 3_600_000
        gpu_kwh = sum(m.gpu_joules for m in measurements) / 3_600_000
        memory_kwh = sum(m.memory_joules for m in measurements) / 3_600_000
        storage_kwh = sum(m.storage_joules for m in measurements) / 3_600_000
        network_kwh = sum(m.network_joules for m in measurements) / 3_600_000
        
        return {
            "total_kwh": total_kwh,
            "actual_cost": actual_cost,
            "marked_up_cost": marked_up_cost,
            "markup_percentage": (self.energy_markup - 1) * 100,
            "breakdown": {
                "cpu_kwh": cpu_kwh,
                "gpu_kwh": gpu_kwh,
                "memory_kwh": memory_kwh,
                "storage_kwh": storage_kwh,
                "network_kwh": network_kwh
            },
            "cost_per_kwh": self.energy_base_rate * self.energy_markup
        }
    
    def recommend_tier(self, usage: UsageMetrics) -> Tuple[TierType, Dict[str, float]]:
        """
        Recommend optimal tier based on usage patterns
        
        Args:
            usage: User's usage metrics
            
        Returns:
            Tuple of (recommended_tier, cost_comparison)
        """
        costs = {}
        
        for tier in TierType:
            cost_breakdown = self.calculate_monthly_cost(tier, usage)
            costs[tier] = cost_breakdown["total_cost"]
        
        # Find the most cost-effective tier that meets usage needs
        recommended = TierType.FREE
        min_cost = float('inf')
        
        for tier in TierType:
            tier_config = self.tiers[tier]
            cost = costs[tier]
            
            # Check if tier can handle the usage
            can_handle = True
            if tier_config.limits["api_calls"] > 0 and usage.api_calls > tier_config.limits["api_calls"] * 2:
                can_handle = False
            if tier_config.limits["storage_gb"] > 0 and usage.storage_used > tier_config.limits["storage_gb"] * 2:
                can_handle = False
            if tier == TierType.FREE and usage.energy_consumed > tier_config.energy_allowance * 2:
                can_handle = False
            
            if can_handle and cost < min_cost:
                min_cost = cost
                recommended = tier
        
        return recommended, costs
    
    def calculate_annual_savings(self, tier: TierType) -> Dict[str, float]:
        """
        Calculate annual savings compared to monthly billing
        
        Args:
            tier: Pricing tier
            
        Returns:
            Savings breakdown
        """
        tier_config = self.tiers[tier]
        monthly_cost = tier_config.base_price
        quarterly_cost = monthly_cost * 3 * 0.95
        annual_cost = monthly_cost * 12 * 0.85
        
        quarterly_savings = (monthly_cost * 3) - quarterly_cost
        annual_savings = (monthly_cost * 12) - annual_cost
        
        return {
            "monthly_cost": monthly_cost,
            "quarterly_cost": quarterly_cost,
            "annual_cost": annual_cost,
            "quarterly_savings": quarterly_savings,
            "annual_savings": annual_savings,
            "quarterly_savings_percent": (quarterly_savings / (monthly_cost * 3)) * 100,
            "annual_savings_percent": (annual_savings / (monthly_cost * 12)) * 100
        }
    
    def generate_pricing_quote(
        self, 
        tier: TierType, 
        projected_usage: UsageMetrics,
        billing_cycle: BillingCycle = BillingCycle.MONTHLY,
        months: int = 12
    ) -> Dict[str, any]:
        """
        Generate comprehensive pricing quote
        
        Args:
            tier: Desired pricing tier
            projected_usage: Projected monthly usage
            billing_cycle: Preferred billing cycle
            months: Quote duration in months
            
        Returns:
            Comprehensive pricing quote
        """
        monthly_breakdown = self.calculate_monthly_cost(tier, projected_usage, billing_cycle)
        annual_savings = self.calculate_annual_savings(tier)
        tier_config = self.tiers[tier]
        
        # Calculate total cost over the period
        if billing_cycle == BillingCycle.ANNUAL:
            periods = math.ceil(months / 12)
            total_base = annual_savings["annual_cost"] * periods
        elif billing_cycle == BillingCycle.QUARTERLY:
            periods = math.ceil(months / 3)
            total_base = annual_savings["quarterly_cost"] * periods
        else:
            total_base = monthly_breakdown["base_cost"] * months
        
        variable_costs = (
            monthly_breakdown["energy_cost"] + 
            monthly_breakdown["overage_cost"] + 
            monthly_breakdown["marketplace_cost"] + 
            monthly_breakdown["support_cost"]
        ) * months
        
        total_cost = total_base + variable_costs
        
        quote = {
            "quote_id": f"WF-QUOTE-{int(time.time())}",
            "generated_at": datetime.now().isoformat(),
            "tier": tier.value,
            "billing_cycle": billing_cycle.value,
            "quote_period_months": months,
            "tier_details": {
                "name": tier_config.name,
                "features": tier_config.features,
                "limits": tier_config.limits,
                "energy_allowance_kwh": tier_config.energy_allowance
            },
            "cost_breakdown": {
                "base_subscription": total_base,
                "variable_costs": variable_costs,
                "total_cost": total_cost,
                "average_monthly": total_cost / months
            },
            "monthly_breakdown": monthly_breakdown,
            "projected_usage": {
                "energy_kwh": projected_usage.energy_consumed,
                "api_calls": projected_usage.api_calls,
                "storage_gb": projected_usage.storage_used,
                "projects": projected_usage.active_projects,
                "marketplace_volume": projected_usage.marketplace_transactions
            },
            "savings_analysis": annual_savings if billing_cycle != BillingCycle.MONTHLY else None,
            "energy_transparency": {
                "base_energy_rate": self.energy_base_rate,
                "markup_percentage": (self.energy_markup - 1) * 100,
                "effective_rate": self.energy_base_rate * self.energy_markup,
                "allowance_value": tier_config.energy_allowance * self.energy_base_rate * self.energy_markup
            },
            "terms": {
                "currency": "USD",
                "privacy_guarantee": "100% local processing, no data harvesting",
                "energy_measurement": "Real-time hardware monitoring",
                "billing_transparency": "Itemized energy and usage costs",
                "cancellation": "Cancel anytime, no penalties"
            }
        }
        
        return quote
    
    def compare_with_competitors(self, usage: UsageMetrics) -> Dict[str, any]:
        """
        Compare WIRTHFORGE pricing with major competitors
        
        Args:
            usage: User's usage metrics
            
        Returns:
            Competitive pricing comparison
        """
        recommended_tier, costs = self.recommend_tier(usage)
        wirthforge_cost = costs[recommended_tier]
        
        # Competitor pricing estimates (simplified)
        competitors = {
            "OpenAI ChatGPT Plus": {
                "monthly_cost": 20.0,
                "features": ["GPT-4 access", "Priority access", "Cloud processing"],
                "privacy_score": 2,  # 1-10 scale
                "data_policy": "Data used for training"
            },
            "Google Bard": {
                "monthly_cost": 0.0,  # Free but ad-supported
                "features": ["Free access", "Google integration", "Cloud processing"],
                "privacy_score": 1,
                "data_policy": "Extensive data collection"
            },
            "Adobe Firefly": {
                "monthly_cost": 22.99,
                "features": ["Creative AI", "Adobe integration", "Cloud processing"],
                "privacy_score": 3,
                "data_policy": "Creative content analysis"
            },
            "Midjourney": {
                "monthly_cost": 10.0,
                "features": ["Art generation", "Discord integration", "Cloud processing"],
                "privacy_score": 4,
                "data_policy": "Limited data retention"
            }
        }
        
        comparison = {
            "wirthforge": {
                "tier": recommended_tier.value,
                "monthly_cost": wirthforge_cost,
                "features": self.tiers[recommended_tier].features,
                "privacy_score": 10,
                "data_policy": "100% local, no data collection",
                "energy_transparency": True,
                "vendor_lock_in": False
            },
            "competitors": competitors,
            "advantages": [
                "Complete data privacy and sovereignty",
                "Transparent energy-based pricing",
                "No vendor lock-in or data harvesting",
                "Local processing eliminates latency",
                "Energy-honest billing model"
            ],
            "value_proposition": {
                "privacy_premium": "Pay for privacy, not for data harvesting",
                "cost_transparency": "Know exactly what you're paying for",
                "performance_guarantee": "No network dependencies or outages",
                "ethical_ai": "Support sustainable, user-controlled AI"
            }
        }
        
        return comparison

def main():
    """Example usage of the pricing calculator"""
    calculator = PricingCalculator()
    
    # Example usage scenario
    usage = UsageMetrics(
        energy_consumed=3.5,  # kWh
        api_calls=5000,
        storage_used=5.0,  # GB
        active_projects=5,
        support_tickets=2,
        marketplace_transactions=50.0  # USD
    )
    
    # Get pricing recommendation
    recommended_tier, costs = calculator.recommend_tier(usage)
    print(f"Recommended tier: {recommended_tier.value}")
    print(f"Monthly costs by tier: {costs}")
    
    # Generate quote
    quote = calculator.generate_pricing_quote(
        recommended_tier, 
        usage, 
        BillingCycle.ANNUAL,
        12
    )
    print(f"\nPricing Quote:")
    print(json.dumps(quote, indent=2))
    
    # Compare with competitors
    comparison = calculator.compare_with_competitors(usage)
    print(f"\nCompetitive Analysis:")
    print(json.dumps(comparison, indent=2))

if __name__ == "__main__":
    main()
