#!/usr/bin/env python3
"""
WF-BIZ-002 Pricing Engine
Energy-honest pricing calculator with transparent billing and tier management
"""

import json
import sqlite3
import time
import hashlib
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import psutil
import os

class TierType(Enum):
    """Pricing tier enumeration"""
    FREE = "free"
    PERSONAL = "personal"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

@dataclass
class EnergyMeasurement:
    """Real-time energy measurement data"""
    timestamp: float
    cpu_usage_percent: float
    gpu_usage_percent: float
    memory_usage_gb: float
    storage_io_mb: float
    total_energy_eu: float
    component_breakdown: Dict[str, float]

@dataclass
class UsageMetrics:
    """User usage metrics for pricing calculations"""
    daily_hours: float
    monthly_tokens: int
    monthly_storage_gb: float
    concurrent_sessions: int
    marketplace_purchases: int
    monthly_energy_kwh: float
    
    def to_hash(self) -> str:
        """Generate hash for caching purposes"""
        content = f"{self.daily_hours}_{self.monthly_tokens}_{self.monthly_storage_gb}_{self.concurrent_sessions}_{self.marketplace_purchases}_{self.monthly_energy_kwh}"
        return hashlib.md5(content.encode()).hexdigest()

@dataclass
class TierConfiguration:
    """Configuration for a pricing tier"""
    tier_id: str
    tier_name: str
    monthly_price: float
    annual_price: float
    energy_allocation_eu: float
    max_parallel_models: int
    features: List[str]
    support_level: str
    api_access: bool
    storage_limit_gb: float
    overage_rate_per_eu: float

@dataclass
class PricingCalculation:
    """Result of pricing calculation"""
    recommended_tier: TierType
    monthly_costs: Dict[TierType, float]
    energy_breakdown: Dict[str, float]
    overage_costs: Dict[TierType, float]
    total_costs: Dict[TierType, float]
    savings_annual: Dict[TierType, float]
    upgrade_recommendations: List[str]

class EnergyMonitor:
    """Real-time energy monitoring system"""
    
    def __init__(self):
        self.baseline_power = self._calculate_baseline_power()
        self.component_power_models = self._load_power_models()
    
    def _calculate_baseline_power(self) -> float:
        """Calculate system baseline power consumption"""
        # Simplified baseline calculation
        # In production, this would use hardware-specific models
        cpu_count = psutil.cpu_count()
        memory_gb = psutil.virtual_memory().total / (1024**3)
        return 10.0 + (cpu_count * 2.0) + (memory_gb * 0.5)  # Watts
    
    def _load_power_models(self) -> Dict[str, Dict[str, float]]:
        """Load component-specific power models"""
        return {
            "cpu": {
                "idle_watts": 5.0,
                "max_watts": 65.0,
                "efficiency_factor": 0.85
            },
            "gpu": {
                "idle_watts": 10.0,
                "max_watts": 250.0,
                "efficiency_factor": 0.90
            },
            "memory": {
                "watts_per_gb": 0.5,
                "access_multiplier": 1.2
            },
            "storage": {
                "idle_watts": 2.0,
                "read_watts_per_mb": 0.001,
                "write_watts_per_mb": 0.002
            }
        }
    
    def measure_current_usage(self) -> EnergyMeasurement:
        """Measure current system energy usage"""
        timestamp = time.time()
        
        # CPU measurements
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_freq = psutil.cpu_freq()
        
        # Memory measurements
        memory = psutil.virtual_memory()
        memory_gb = memory.used / (1024**3)
        
        # Storage I/O measurements
        disk_io = psutil.disk_io_counters()
        storage_io_mb = (disk_io.read_bytes + disk_io.write_bytes) / (1024**2) if disk_io else 0
        
        # GPU measurements (simplified - would use nvidia-ml-py in production)
        gpu_percent = self._estimate_gpu_usage()
        
        # Calculate component energy consumption
        component_breakdown = self._calculate_component_energy(
            cpu_percent, gpu_percent, memory_gb, storage_io_mb
        )
        
        # Convert to Energy Units (EU)
        total_watts = sum(component_breakdown.values())
        total_energy_eu = self._watts_to_energy_units(total_watts)
        
        return EnergyMeasurement(
            timestamp=timestamp,
            cpu_usage_percent=cpu_percent,
            gpu_usage_percent=gpu_percent,
            memory_usage_gb=memory_gb,
            storage_io_mb=storage_io_mb,
            total_energy_eu=total_energy_eu,
            component_breakdown=component_breakdown
        )
    
    def _estimate_gpu_usage(self) -> float:
        """Estimate GPU usage (simplified implementation)"""
        # In production, would use proper GPU monitoring libraries
        # This is a placeholder that estimates based on system load
        try:
            load_avg = os.getloadavg()[0] if hasattr(os, 'getloadavg') else psutil.cpu_percent()
            return min(load_avg * 0.3, 100.0)  # Rough estimation
        except:
            return 0.0
    
    def _calculate_component_energy(self, cpu_percent: float, gpu_percent: float, 
                                  memory_gb: float, storage_io_mb: float) -> Dict[str, float]:
        """Calculate energy consumption by component"""
        models = self.component_power_models
        
        # CPU energy calculation
        cpu_load_factor = cpu_percent / 100.0
        cpu_watts = (models["cpu"]["idle_watts"] + 
                    (models["cpu"]["max_watts"] - models["cpu"]["idle_watts"]) * cpu_load_factor)
        
        # GPU energy calculation
        gpu_load_factor = gpu_percent / 100.0
        gpu_watts = (models["gpu"]["idle_watts"] + 
                    (models["gpu"]["max_watts"] - models["gpu"]["idle_watts"]) * gpu_load_factor)
        
        # Memory energy calculation
        memory_watts = memory_gb * models["memory"]["watts_per_gb"] * models["memory"]["access_multiplier"]
        
        # Storage energy calculation
        storage_watts = (models["storage"]["idle_watts"] + 
                        storage_io_mb * (models["storage"]["read_watts_per_mb"] + 
                                       models["storage"]["write_watts_per_mb"]))
        
        return {
            "cpu": cpu_watts,
            "gpu": gpu_watts,
            "memory": memory_watts,
            "storage": storage_watts,
            "baseline": self.baseline_power
        }
    
    def _watts_to_energy_units(self, watts: float) -> float:
        """Convert watts to Energy Units (EU)"""
        # 1 EU = 1 Wh (Watt-hour) for simplicity
        # In production, this would be more sophisticated
        return watts / 3600.0  # Convert to Wh

class PricingEngine:
    """Main pricing engine for WIRTHFORGE platform"""
    
    def __init__(self, config_path: Optional[str] = None, db_path: Optional[str] = None):
        self.config_path = config_path or "pricing_config.json"
        self.db_path = db_path or "pricing_engine.db"
        self.energy_monitor = EnergyMonitor()
        
        # Load configuration
        self.config = self._load_configuration()
        self.tiers = self._initialize_tiers()
        
        # Initialize database
        self._initialize_database()
    
    def _load_configuration(self) -> Dict[str, Any]:
        """Load pricing configuration"""
        default_config = {
            "base_energy_rate": 0.0001,  # EUR per EU
            "currency": "EUR",
            "regional_adjustments": {},
            "competitive_analysis": {
                "update_frequency_hours": 24,
                "last_updated": None
            },
            "tier_configurations": {
                "free": {
                    "energy_allocation": 1000,
                    "base_price": 0.0,
                    "features": ["Basic AI", "Local Processing", "Privacy Protection"]
                },
                "personal": {
                    "energy_allocation": 10000,
                    "base_price": 9.42,
                    "features": ["Enhanced AI", "Cloud Sync", "Priority Support"]
                },
                "professional": {
                    "energy_allocation": 50000,
                    "base_price": 29.99,
                    "features": ["Advanced Orchestrator", "API Access", "Custom Integrations"]
                },
                "enterprise": {
                    "energy_allocation": 500000,
                    "base_price": 99.99,
                    "features": ["On-premise Deployment", "Dedicated Support", "Custom Development"]
                }
            }
        }
        
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
                # Merge with defaults
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
        except FileNotFoundError:
            # Create default config file
            with open(self.config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            return default_config
    
    def _initialize_tiers(self) -> Dict[TierType, TierConfiguration]:
        """Initialize tier configurations"""
        tiers = {}
        
        for tier_name, tier_data in self.config["tier_configurations"].items():
            tier_type = TierType(tier_name)
            
            tiers[tier_type] = TierConfiguration(
                tier_id=tier_name,
                tier_name=tier_name.title(),
                monthly_price=tier_data["base_price"],
                annual_price=tier_data["base_price"] * 12 * 0.9,  # 10% annual discount
                energy_allocation_eu=tier_data["energy_allocation"],
                max_parallel_models=tier_data.get("max_parallel_models", 1),
                features=tier_data["features"],
                support_level=tier_data.get("support_level", "standard"),
                api_access=tier_data.get("api_access", False),
                storage_limit_gb=tier_data.get("storage_limit_gb", 10.0),
                overage_rate_per_eu=self.config["base_energy_rate"]
            )
        
        return tiers
    
    def _initialize_database(self):
        """Initialize SQLite database for pricing data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pricing_calculations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL,
                user_id TEXT,
                usage_hash TEXT,
                recommended_tier TEXT,
                calculation_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS energy_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL,
                user_id TEXT,
                total_energy_eu REAL,
                component_breakdown TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS competitive_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                competitor TEXT,
                pricing_data TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def calculate_pricing(self, usage: UsageMetrics, user_id: Optional[str] = None) -> PricingCalculation:
        """Calculate pricing for given usage metrics"""
        
        # Calculate costs for each tier
        monthly_costs = {}
        overage_costs = {}
        total_costs = {}
        
        for tier_type, tier_config in self.tiers.items():
            # Base subscription cost
            base_cost = tier_config.monthly_price
            
            # Calculate energy overage
            energy_overage = max(0, usage.monthly_energy_kwh * 1000 - tier_config.energy_allocation_eu)  # Convert kWh to EU
            overage_cost = energy_overage * tier_config.overage_rate_per_eu
            
            # Storage overage (if applicable)
            storage_overage = max(0, usage.monthly_storage_gb - tier_config.storage_limit_gb)
            storage_cost = storage_overage * 0.10  # €0.10 per GB overage
            
            monthly_costs[tier_type] = base_cost
            overage_costs[tier_type] = overage_cost + storage_cost
            total_costs[tier_type] = base_cost + overage_cost + storage_cost
        
        # Recommend optimal tier
        recommended_tier = self._recommend_tier(usage, total_costs)
        
        # Calculate annual savings
        savings_annual = {}
        for tier_type, tier_config in self.tiers.items():
            monthly_total = total_costs[tier_type]
            annual_total = tier_config.annual_price + (overage_costs[tier_type] * 12)
            savings_annual[tier_type] = (monthly_total * 12) - annual_total
        
        # Generate upgrade recommendations
        upgrade_recommendations = self._generate_upgrade_recommendations(usage, recommended_tier)
        
        # Energy breakdown
        energy_breakdown = {
            "ai_processing": usage.monthly_energy_kwh * 0.6,
            "data_processing": usage.monthly_energy_kwh * 0.2,
            "ui_rendering": usage.monthly_energy_kwh * 0.1,
            "background_tasks": usage.monthly_energy_kwh * 0.1
        }
        
        calculation = PricingCalculation(
            recommended_tier=recommended_tier,
            monthly_costs=monthly_costs,
            energy_breakdown=energy_breakdown,
            overage_costs=overage_costs,
            total_costs=total_costs,
            savings_annual=savings_annual,
            upgrade_recommendations=upgrade_recommendations
        )
        
        # Store calculation in database
        self._store_calculation(user_id, usage, calculation)
        
        return calculation
    
    def _recommend_tier(self, usage: UsageMetrics, total_costs: Dict[TierType, float]) -> TierType:
        """Recommend optimal tier based on usage and cost efficiency"""
        
        # Convert energy usage to EU
        monthly_energy_eu = usage.monthly_energy_kwh * 1000
        
        # Find the tier that best fits usage without significant overage
        for tier_type in [TierType.FREE, TierType.PERSONAL, TierType.PROFESSIONAL, TierType.ENTERPRISE]:
            tier_config = self.tiers[tier_type]
            
            # Check if usage fits within tier allocation (with 20% buffer)
            if monthly_energy_eu <= tier_config.energy_allocation_eu * 1.2:
                # Check if features match usage patterns
                if self._features_match_usage(usage, tier_type):
                    return tier_type
        
        # If no tier fits well, recommend based on cost efficiency
        cost_efficiency = {}
        for tier_type, cost in total_costs.items():
            if cost > 0:
                cost_efficiency[tier_type] = monthly_energy_eu / cost
        
        if cost_efficiency:
            return max(cost_efficiency.keys(), key=lambda t: cost_efficiency[t])
        
        return TierType.PERSONAL  # Default recommendation
    
    def _features_match_usage(self, usage: UsageMetrics, tier_type: TierType) -> bool:
        """Check if tier features match usage patterns"""
        tier_config = self.tiers[tier_type]
        
        # Check concurrent sessions
        if usage.concurrent_sessions > tier_config.max_parallel_models:
            return False
        
        # Check marketplace usage
        if usage.marketplace_purchases > 0 and tier_type == TierType.FREE:
            return False
        
        # Check professional features need
        if usage.daily_hours > 6 and tier_type in [TierType.FREE, TierType.PERSONAL]:
            return False
        
        return True
    
    def _generate_upgrade_recommendations(self, usage: UsageMetrics, current_tier: TierType) -> List[str]:
        """Generate personalized upgrade recommendations"""
        recommendations = []
        
        current_config = self.tiers[current_tier]
        monthly_energy_eu = usage.monthly_energy_kwh * 1000
        
        # Energy usage recommendations
        if monthly_energy_eu > current_config.energy_allocation_eu * 0.8:
            recommendations.append(
                f"You're using {monthly_energy_eu/current_config.energy_allocation_eu*100:.1f}% of your energy allocation. "
                f"Consider upgrading to avoid overage charges."
            )
        
        # Feature recommendations
        if usage.concurrent_sessions > current_config.max_parallel_models:
            recommendations.append(
                f"Upgrade to support {usage.concurrent_sessions} concurrent sessions for better productivity."
            )
        
        # Marketplace recommendations
        if usage.marketplace_purchases > 0 and current_tier == TierType.FREE:
            recommendations.append(
                "Upgrade to Personal tier for enhanced marketplace features and creator tools."
            )
        
        # Professional usage recommendations
        if usage.daily_hours > 6 and current_tier in [TierType.FREE, TierType.PERSONAL]:
            recommendations.append(
                "Your usage patterns suggest professional needs. Consider Professional tier for advanced features."
            )
        
        return recommendations
    
    def compare_with_competitors(self, usage: UsageMetrics) -> Dict[str, Any]:
        """Compare WIRTHFORGE pricing with competitors"""
        
        # Load competitive data
        competitive_data = self._load_competitive_data()
        
        # Calculate WIRTHFORGE costs
        wirthforge_calculation = self.calculate_pricing(usage)
        wirthforge_cost = wirthforge_calculation.total_costs[wirthforge_calculation.recommended_tier]
        
        # Competitive analysis
        competitors = {
            "openai": {
                "monthly_cost": self._estimate_competitor_cost("openai", usage),
                "privacy_score": 3,
                "energy_transparency": False,
                "vendor_lock_in": True,
                "local_processing": False
            },
            "google": {
                "monthly_cost": self._estimate_competitor_cost("google", usage),
                "privacy_score": 2,
                "energy_transparency": False,
                "vendor_lock_in": True,
                "local_processing": False
            },
            "anthropic": {
                "monthly_cost": self._estimate_competitor_cost("anthropic", usage),
                "privacy_score": 6,
                "energy_transparency": False,
                "vendor_lock_in": True,
                "local_processing": False
            }
        }
        
        # WIRTHFORGE advantages
        advantages = [
            "Complete privacy protection with 100% local processing",
            "Transparent energy-based billing with real-time monitoring",
            "No vendor lock-in with full data sovereignty",
            "Community-driven development and open ecosystem",
            "Energy-honest pricing reflecting actual computational costs",
            "60Hz real-time performance guarantee"
        ]
        
        # Value propositions
        value_propositions = {
            "privacy_premium": "10x better privacy than cloud alternatives with complete local processing",
            "cost_transparency": "100% transparent energy-based billing with no hidden costs",
            "performance_guarantee": "Consistent 60Hz real-time performance with local optimization",
            "ethical_ai": "Community-driven ethical AI development without data harvesting",
            "energy_honesty": "Pay only for actual computational energy consumed",
            "user_sovereignty": "Complete control over data, models, and processing"
        }
        
        return {
            "wirthforge": {
                "monthly_cost": wirthforge_cost,
                "recommended_tier": wirthforge_calculation.recommended_tier.value,
                "privacy_score": 10,
                "energy_transparency": True,
                "vendor_lock_in": False,
                "local_processing": True
            },
            "competitors": competitors,
            "advantages": advantages,
            "value_proposition": value_propositions,
            "cost_comparison": {
                "wirthforge_cost": wirthforge_cost,
                "average_competitor_cost": sum(c["monthly_cost"] for c in competitors.values()) / len(competitors),
                "cost_savings": max(0, sum(c["monthly_cost"] for c in competitors.values()) / len(competitors) - wirthforge_cost)
            }
        }
    
    def _estimate_competitor_cost(self, competitor: str, usage: UsageMetrics) -> float:
        """Estimate competitor costs based on usage patterns"""
        # Simplified competitor cost estimation
        # In production, this would use real-time competitive intelligence
        
        base_costs = {
            "openai": 20.0,
            "google": 15.0,
            "anthropic": 25.0
        }
        
        base_cost = base_costs.get(competitor, 20.0)
        
        # Scale based on usage
        usage_multiplier = (usage.monthly_tokens / 10000) * (usage.daily_hours / 4)
        
        return base_cost * max(1.0, usage_multiplier)
    
    def _load_competitive_data(self) -> Dict[str, Any]:
        """Load competitive pricing data from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT competitor, pricing_data, last_updated 
            FROM competitive_analysis 
            WHERE last_updated > datetime('now', '-24 hours')
        ''')
        
        data = {}
        for row in cursor.fetchall():
            competitor, pricing_data, last_updated = row
            data[competitor] = json.loads(pricing_data)
        
        conn.close()
        return data
    
    def _store_calculation(self, user_id: Optional[str], usage: UsageMetrics, calculation: PricingCalculation):
        """Store pricing calculation in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO pricing_calculations 
            (timestamp, user_id, usage_hash, recommended_tier, calculation_data)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            time.time(),
            user_id or "anonymous",
            usage.to_hash(),
            calculation.recommended_tier.value,
            json.dumps(asdict(calculation), default=str)
        ))
        
        conn.commit()
        conn.close()
    
    def get_real_time_energy_cost(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get real-time energy cost for current usage"""
        measurement = self.energy_monitor.measure_current_usage()
        
        # Calculate current cost rate
        current_cost_per_hour = measurement.total_energy_eu * self.config["base_energy_rate"]
        
        # Store measurement
        self._store_energy_measurement(user_id, measurement)
        
        return {
            "current_energy_eu": measurement.total_energy_eu,
            "cost_per_hour": current_cost_per_hour,
            "component_breakdown": measurement.component_breakdown,
            "efficiency_score": self._calculate_efficiency_score(measurement),
            "optimization_tips": self._generate_optimization_tips(measurement)
        }
    
    def _store_energy_measurement(self, user_id: Optional[str], measurement: EnergyMeasurement):
        """Store energy measurement in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO energy_measurements 
            (timestamp, user_id, total_energy_eu, component_breakdown)
            VALUES (?, ?, ?, ?)
        ''', (
            measurement.timestamp,
            user_id or "anonymous",
            measurement.total_energy_eu,
            json.dumps(measurement.component_breakdown)
        ))
        
        conn.commit()
        conn.close()
    
    def _calculate_efficiency_score(self, measurement: EnergyMeasurement) -> float:
        """Calculate energy efficiency score (0-100)"""
        # Compare against optimal energy usage patterns
        total_power = sum(measurement.component_breakdown.values())
        baseline_power = measurement.component_breakdown.get("baseline", 0)
        
        if total_power <= baseline_power:
            return 100.0
        
        # Calculate efficiency based on useful work vs total consumption
        useful_power = total_power - baseline_power
        efficiency = min(100.0, (useful_power / total_power) * 100)
        
        return efficiency
    
    def _generate_optimization_tips(self, measurement: EnergyMeasurement) -> List[str]:
        """Generate energy optimization tips"""
        tips = []
        breakdown = measurement.component_breakdown
        
        # CPU optimization tips
        if breakdown.get("cpu", 0) > 30:
            tips.append("High CPU usage detected. Consider closing unnecessary applications.")
        
        # GPU optimization tips
        if breakdown.get("gpu", 0) > 100:
            tips.append("GPU usage is high. Optimize model parameters for better efficiency.")
        
        # Memory optimization tips
        if breakdown.get("memory", 0) > 10:
            tips.append("High memory usage. Consider reducing model size or batch size.")
        
        # General tips
        if not tips:
            tips.append("Your energy usage is optimized. Great job!")
        
        return tips
    
    def update_competitive_data(self, competitor: str, pricing_data: Dict[str, Any]):
        """Update competitive pricing data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO competitive_analysis 
            (competitor, pricing_data, last_updated)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (competitor, json.dumps(pricing_data)))
        
        conn.commit()
        conn.close()

# Example usage and testing
if __name__ == "__main__":
    # Initialize pricing engine
    engine = PricingEngine()
    
    # Example usage metrics
    usage = UsageMetrics(
        daily_hours=4.0,
        monthly_tokens=8000,
        monthly_storage_gb=15.0,
        concurrent_sessions=2,
        marketplace_purchases=1,
        monthly_energy_kwh=25.0
    )
    
    # Calculate pricing
    calculation = engine.calculate_pricing(usage, user_id="test_user")
    
    print("Pricing Calculation Results:")
    print(f"Recommended Tier: {calculation.recommended_tier.value}")
    print(f"Monthly Costs: {calculation.monthly_costs}")
    print(f"Total Costs: {calculation.total_costs}")
    print(f"Upgrade Recommendations: {calculation.upgrade_recommendations}")
    
    # Get competitive analysis
    competitive_analysis = engine.compare_with_competitors(usage)
    print(f"\nCompetitive Analysis:")
    print(f"WIRTHFORGE Cost: €{competitive_analysis['wirthforge']['monthly_cost']:.2f}")
    print(f"Average Competitor Cost: €{competitive_analysis['cost_comparison']['average_competitor_cost']:.2f}")
    print(f"Cost Savings: €{competitive_analysis['cost_comparison']['cost_savings']:.2f}")
    
    # Get real-time energy cost
    real_time_cost = engine.get_real_time_energy_cost(user_id="test_user")
    print(f"\nReal-time Energy Cost:")
    print(f"Current Energy: {real_time_cost['current_energy_eu']:.4f} EU")
    print(f"Cost per Hour: €{real_time_cost['cost_per_hour']:.4f}")
    print(f"Efficiency Score: {real_time_cost['efficiency_score']:.1f}%")
    print(f"Optimization Tips: {real_time_cost['optimization_tips']}")
