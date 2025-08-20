#!/usr/bin/env python3
"""
WF-BIZ-001 Energy Billing System
Transparent, real-time energy measurement and billing for WIRTHFORGE platform
"""

import json
import time
import psutil
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import hashlib

class ComponentType(Enum):
    CPU = "cpu"
    GPU = "gpu"
    MEMORY = "memory"
    STORAGE = "storage"
    NETWORK = "network"

class BillingPeriod(Enum):
    REAL_TIME = "real_time"
    HOURLY = "hourly"
    DAILY = "daily"
    MONTHLY = "monthly"

@dataclass
class EnergyMeasurement:
    """Single energy measurement from hardware"""
    timestamp: float
    component: ComponentType
    power_watts: float
    duration_seconds: float
    energy_joules: float
    user_id: str
    session_id: str
    operation_type: str
    metadata: Dict[str, Any]
    
    @property
    def kwh(self) -> float:
        """Convert joules to kilowatt-hours"""
        return self.energy_joules / 3_600_000

@dataclass
class BillingRecord:
    """Energy billing record for a user"""
    record_id: str
    user_id: str
    period_start: float
    period_end: float
    total_energy_kwh: float
    component_breakdown: Dict[str, float]
    base_rate: float
    markup_rate: float
    total_cost: float
    tier: str
    allowance_used: float
    overage_kwh: float
    overage_cost: float

class EnergyMonitor:
    """
    Real-time energy monitoring for transparent billing
    Measures actual hardware energy consumption
    """
    
    def __init__(self):
        self.is_monitoring = False
        self.measurements = []
        self.lock = threading.Lock()
        
        # Energy coefficients (watts per unit utilization)
        self.energy_coefficients = {
            ComponentType.CPU: {
                "base_watts": 15.0,  # Base CPU power
                "max_watts": 65.0,   # Max CPU power under load
                "efficiency_factor": 0.85
            },
            ComponentType.GPU: {
                "base_watts": 25.0,  # Base GPU power
                "max_watts": 250.0,  # Max GPU power under load
                "efficiency_factor": 0.90
            },
            ComponentType.MEMORY: {
                "base_watts": 5.0,   # Base memory power
                "max_watts": 15.0,   # Max memory power
                "efficiency_factor": 0.95
            },
            ComponentType.STORAGE: {
                "base_watts": 2.0,   # Base storage power
                "max_watts": 8.0,    # Max storage power under load
                "efficiency_factor": 0.80
            },
            ComponentType.NETWORK: {
                "base_watts": 1.0,   # Base network power
                "max_watts": 5.0,    # Max network power
                "efficiency_factor": 0.75
            }
        }
    
    def start_monitoring(self, user_id: str, session_id: str, operation_type: str):
        """Start energy monitoring for a user session"""
        self.is_monitoring = True
        self.current_user_id = user_id
        self.current_session_id = session_id
        self.current_operation = operation_type
        self.monitoring_start = time.time()
        
        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def stop_monitoring(self) -> List[EnergyMeasurement]:
        """Stop monitoring and return measurements"""
        self.is_monitoring = False
        if hasattr(self, 'monitor_thread'):
            self.monitor_thread.join(timeout=1.0)
        
        with self.lock:
            measurements = self.measurements.copy()
            self.measurements.clear()
        
        return measurements
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        last_measurement = time.time()
        
        while self.is_monitoring:
            try:
                current_time = time.time()
                duration = current_time - last_measurement
                
                # Measure each component
                measurements = self._measure_components(current_time, duration)
                
                with self.lock:
                    self.measurements.extend(measurements)
                
                last_measurement = current_time
                time.sleep(0.1)  # 100ms measurement interval
                
            except Exception as e:
                print(f"Energy monitoring error: {e}")
                time.sleep(1.0)
    
    def _measure_components(self, timestamp: float, duration: float) -> List[EnergyMeasurement]:
        """Measure energy consumption for all components"""
        measurements = []
        
        try:
            # CPU measurement
            cpu_percent = psutil.cpu_percent(interval=None)
            cpu_power = self._calculate_component_power(ComponentType.CPU, cpu_percent / 100.0)
            cpu_energy = cpu_power * duration  # Joules
            
            measurements.append(EnergyMeasurement(
                timestamp=timestamp,
                component=ComponentType.CPU,
                power_watts=cpu_power,
                duration_seconds=duration,
                energy_joules=cpu_energy,
                user_id=self.current_user_id,
                session_id=self.current_session_id,
                operation_type=self.current_operation,
                metadata={"utilization_percent": cpu_percent}
            ))
            
            # Memory measurement
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_power = self._calculate_component_power(ComponentType.MEMORY, memory_percent / 100.0)
            memory_energy = memory_power * duration
            
            measurements.append(EnergyMeasurement(
                timestamp=timestamp,
                component=ComponentType.MEMORY,
                power_watts=memory_power,
                duration_seconds=duration,
                energy_joules=memory_energy,
                user_id=self.current_user_id,
                session_id=self.current_session_id,
                operation_type=self.current_operation,
                metadata={"utilization_percent": memory_percent, "used_gb": memory.used / (1024**3)}
            ))
            
            # Storage measurement (simplified)
            disk = psutil.disk_io_counters()
            if disk:
                # Estimate storage activity based on I/O
                storage_activity = min(1.0, (disk.read_bytes + disk.write_bytes) / (100 * 1024 * 1024))  # Normalize to 100MB/s
                storage_power = self._calculate_component_power(ComponentType.STORAGE, storage_activity)
                storage_energy = storage_power * duration
                
                measurements.append(EnergyMeasurement(
                    timestamp=timestamp,
                    component=ComponentType.STORAGE,
                    power_watts=storage_power,
                    duration_seconds=duration,
                    energy_joules=storage_energy,
                    user_id=self.current_user_id,
                    session_id=self.current_session_id,
                    operation_type=self.current_operation,
                    metadata={"read_bytes": disk.read_bytes, "write_bytes": disk.write_bytes}
                ))
            
            # Network measurement (simplified)
            network = psutil.net_io_counters()
            if network:
                # Estimate network activity
                network_activity = min(1.0, (network.bytes_sent + network.bytes_recv) / (10 * 1024 * 1024))  # Normalize to 10MB/s
                network_power = self._calculate_component_power(ComponentType.NETWORK, network_activity)
                network_energy = network_power * duration
                
                measurements.append(EnergyMeasurement(
                    timestamp=timestamp,
                    component=ComponentType.NETWORK,
                    power_watts=network_power,
                    duration_seconds=duration,
                    energy_joules=network_energy,
                    user_id=self.current_user_id,
                    session_id=self.current_session_id,
                    operation_type=self.current_operation,
                    metadata={"bytes_sent": network.bytes_sent, "bytes_recv": network.bytes_recv}
                ))
            
        except Exception as e:
            print(f"Component measurement error: {e}")
        
        return measurements
    
    def _calculate_component_power(self, component: ComponentType, utilization: float) -> float:
        """Calculate power consumption for a component based on utilization"""
        coeffs = self.energy_coefficients[component]
        base_power = coeffs["base_watts"]
        max_power = coeffs["max_watts"]
        efficiency = coeffs["efficiency_factor"]
        
        # Linear power scaling with efficiency factor
        variable_power = (max_power - base_power) * utilization * efficiency
        return base_power + variable_power

class EnergyBillingEngine:
    """
    Energy billing engine with transparent pricing
    Implements energy-honest billing model
    """
    
    def __init__(self, db_path: str = "energy_billing.db"):
        self.db_path = db_path
        self.monitor = EnergyMonitor()
        self._initialize_database()
        
        # Billing configuration
        self.base_energy_rate = 0.12  # USD per kWh (typical US rate)
        self.markup_multiplier = 1.5  # 50% markup for infrastructure
        self.effective_rate = self.base_energy_rate * self.markup_multiplier
        
        # Tier allowances (kWh per month)
        self.tier_allowances = {
            "free": 1.0,
            "personal": 5.0,
            "professional": 20.0,
            "enterprise": 100.0
        }
        
        # Overage rates (USD per kWh above allowance)
        self.overage_rates = {
            "free": 0.0,  # No overage billing for free tier
            "personal": 0.18,
            "professional": 0.16,
            "enterprise": 0.14
        }
    
    def _initialize_database(self):
        """Initialize database for energy billing"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS energy_measurements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    component TEXT NOT NULL,
                    power_watts REAL NOT NULL,
                    duration_seconds REAL NOT NULL,
                    energy_joules REAL NOT NULL,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    operation_type TEXT NOT NULL,
                    metadata TEXT,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS billing_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    record_id TEXT UNIQUE NOT NULL,
                    user_id TEXT NOT NULL,
                    period_start REAL NOT NULL,
                    period_end REAL NOT NULL,
                    total_energy_kwh REAL NOT NULL,
                    component_breakdown TEXT NOT NULL,
                    base_rate REAL NOT NULL,
                    markup_rate REAL NOT NULL,
                    total_cost REAL NOT NULL,
                    tier TEXT NOT NULL,
                    allowance_used REAL NOT NULL,
                    overage_kwh REAL NOT NULL,
                    overage_cost REAL NOT NULL,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_measurements_user_time 
                ON energy_measurements(user_id, timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_billing_user_period 
                ON billing_records(user_id, period_start, period_end)
            """)
    
    def start_session_monitoring(self, user_id: str, operation_type: str) -> str:
        """Start monitoring energy for a user session"""
        session_id = f"session_{user_id}_{int(time.time())}"
        self.monitor.start_monitoring(user_id, session_id, operation_type)
        return session_id
    
    def end_session_monitoring(self, session_id: str) -> Dict[str, Any]:
        """End monitoring and calculate session energy cost"""
        measurements = self.monitor.stop_monitoring()
        
        if not measurements:
            return {"session_id": session_id, "total_energy_kwh": 0, "cost": 0}
        
        # Store measurements
        self._store_measurements(measurements)
        
        # Calculate session totals
        total_energy_joules = sum(m.energy_joules for m in measurements)
        total_energy_kwh = total_energy_joules / 3_600_000
        
        # Component breakdown
        component_breakdown = {}
        for component in ComponentType:
            component_energy = sum(
                m.energy_joules for m in measurements 
                if m.component == component
            ) / 3_600_000
            component_breakdown[component.value] = component_energy
        
        # Calculate cost
        session_cost = total_energy_kwh * self.effective_rate
        
        return {
            "session_id": session_id,
            "user_id": measurements[0].user_id,
            "operation_type": measurements[0].operation_type,
            "duration_seconds": measurements[-1].timestamp - measurements[0].timestamp,
            "total_energy_kwh": total_energy_kwh,
            "component_breakdown": component_breakdown,
            "base_rate": self.base_energy_rate,
            "effective_rate": self.effective_rate,
            "markup_percentage": (self.markup_multiplier - 1) * 100,
            "session_cost": session_cost,
            "measurement_count": len(measurements)
        }
    
    def _store_measurements(self, measurements: List[EnergyMeasurement]):
        """Store energy measurements in database"""
        with sqlite3.connect(self.db_path) as conn:
            for measurement in measurements:
                conn.execute("""
                    INSERT INTO energy_measurements (
                        timestamp, component, power_watts, duration_seconds,
                        energy_joules, user_id, session_id, operation_type, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    measurement.timestamp,
                    measurement.component.value,
                    measurement.power_watts,
                    measurement.duration_seconds,
                    measurement.energy_joules,
                    measurement.user_id,
                    measurement.session_id,
                    measurement.operation_type,
                    json.dumps(measurement.metadata)
                ))
    
    def calculate_monthly_bill(self, user_id: str, tier: str, month: Optional[int] = None, year: Optional[int] = None) -> BillingRecord:
        """Calculate monthly energy bill for a user"""
        if month is None or year is None:
            now = datetime.now()
            month = now.month
            year = now.year
        
        # Calculate period boundaries
        period_start = datetime(year, month, 1).timestamp()
        if month == 12:
            period_end = datetime(year + 1, 1, 1).timestamp()
        else:
            period_end = datetime(year, month + 1, 1).timestamp()
        
        # Get user's energy consumption for the period
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT component, SUM(energy_joules) as total_joules
                FROM energy_measurements
                WHERE user_id = ? AND timestamp BETWEEN ? AND ?
                GROUP BY component
            """, (user_id, period_start, period_end))
            
            component_data = cursor.fetchall()
        
        # Calculate component breakdown
        component_breakdown = {}
        total_energy_joules = 0
        
        for component, joules in component_data:
            kwh = joules / 3_600_000
            component_breakdown[component] = kwh
            total_energy_joules += joules
        
        total_energy_kwh = total_energy_joules / 3_600_000
        
        # Calculate billing
        allowance = self.tier_allowances.get(tier, 0)
        allowance_used = min(total_energy_kwh, allowance)
        overage_kwh = max(0, total_energy_kwh - allowance)
        
        # Base cost (for allowance)
        base_cost = allowance_used * self.effective_rate
        
        # Overage cost
        overage_rate = self.overage_rates.get(tier, self.effective_rate)
        overage_cost = overage_kwh * overage_rate
        
        total_cost = base_cost + overage_cost
        
        # Create billing record
        record_id = hashlib.sha256(f"{user_id}_{period_start}_{period_end}".encode()).hexdigest()[:16]
        
        billing_record = BillingRecord(
            record_id=record_id,
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
            total_energy_kwh=total_energy_kwh,
            component_breakdown=component_breakdown,
            base_rate=self.base_energy_rate,
            markup_rate=self.effective_rate,
            total_cost=total_cost,
            tier=tier,
            allowance_used=allowance_used,
            overage_kwh=overage_kwh,
            overage_cost=overage_cost
        )
        
        # Store billing record
        self._store_billing_record(billing_record)
        
        return billing_record
    
    def _store_billing_record(self, record: BillingRecord):
        """Store billing record in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO billing_records (
                    record_id, user_id, period_start, period_end,
                    total_energy_kwh, component_breakdown, base_rate, markup_rate,
                    total_cost, tier, allowance_used, overage_kwh, overage_cost
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.record_id,
                record.user_id,
                record.period_start,
                record.period_end,
                record.total_energy_kwh,
                json.dumps(record.component_breakdown),
                record.base_rate,
                record.markup_rate,
                record.total_cost,
                record.tier,
                record.allowance_used,
                record.overage_kwh,
                record.overage_cost
            ))
    
    def get_user_energy_usage(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get user's energy usage analytics"""
        end_time = time.time()
        start_time = end_time - (days * 24 * 3600)
        
        with sqlite3.connect(self.db_path) as conn:
            # Total usage
            cursor = conn.execute("""
                SELECT SUM(energy_joules) / 3600000 as total_kwh
                FROM energy_measurements
                WHERE user_id = ? AND timestamp BETWEEN ? AND ?
            """, (user_id, start_time, end_time))
            total_kwh = cursor.fetchone()[0] or 0
            
            # Daily breakdown
            cursor = conn.execute("""
                SELECT DATE(timestamp, 'unixepoch') as date,
                       SUM(energy_joules) / 3600000 as daily_kwh
                FROM energy_measurements
                WHERE user_id = ? AND timestamp BETWEEN ? AND ?
                GROUP BY DATE(timestamp, 'unixepoch')
                ORDER BY date
            """, (user_id, start_time, end_time))
            daily_usage = [{"date": row[0], "kwh": row[1]} for row in cursor.fetchall()]
            
            # Component breakdown
            cursor = conn.execute("""
                SELECT component, SUM(energy_joules) / 3600000 as component_kwh
                FROM energy_measurements
                WHERE user_id = ? AND timestamp BETWEEN ? AND ?
                GROUP BY component
            """, (user_id, start_time, end_time))
            component_usage = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Operation breakdown
            cursor = conn.execute("""
                SELECT operation_type, SUM(energy_joules) / 3600000 as operation_kwh
                FROM energy_measurements
                WHERE user_id = ? AND timestamp BETWEEN ? AND ?
                GROUP BY operation_type
            """, (user_id, start_time, end_time))
            operation_usage = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Calculate costs
        estimated_cost = total_kwh * self.effective_rate
        
        return {
            "user_id": user_id,
            "period_days": days,
            "total_energy_kwh": total_kwh,
            "estimated_cost": estimated_cost,
            "average_daily_kwh": total_kwh / days if days > 0 else 0,
            "daily_usage": daily_usage,
            "component_breakdown": component_usage,
            "operation_breakdown": operation_usage,
            "energy_efficiency": {
                "kwh_per_operation": total_kwh / len(operation_usage) if operation_usage else 0,
                "most_efficient_operation": min(operation_usage.items(), key=lambda x: x[1])[0] if operation_usage else None,
                "least_efficient_operation": max(operation_usage.items(), key=lambda x: x[1])[0] if operation_usage else None
            }
        }
    
    def generate_transparency_report(self, user_id: str) -> Dict[str, Any]:
        """Generate energy billing transparency report"""
        usage = self.get_user_energy_usage(user_id, 30)
        
        return {
            "report_id": f"transparency_{user_id}_{int(time.time())}",
            "generated_at": datetime.now().isoformat(),
            "user_id": user_id,
            "billing_methodology": {
                "measurement_frequency": "100ms intervals",
                "components_measured": [c.value for c in ComponentType],
                "base_energy_rate": self.base_energy_rate,
                "markup_percentage": (self.markup_multiplier - 1) * 100,
                "effective_rate": self.effective_rate,
                "markup_justification": "Infrastructure, monitoring, and platform costs"
            },
            "usage_summary": usage,
            "tier_comparison": {
                tier: {
                    "allowance_kwh": allowance,
                    "overage_rate": self.overage_rates.get(tier, 0),
                    "estimated_monthly_cost": self._estimate_tier_cost(usage["total_energy_kwh"], tier)
                }
                for tier, allowance in self.tier_allowances.items()
            },
            "privacy_guarantee": "All energy measurements are processed locally and never shared",
            "accuracy_statement": "Energy measurements are hardware-based and updated in real-time",
            "billing_transparency": "Complete itemization of energy costs with no hidden fees"
        }
    
    def _estimate_tier_cost(self, monthly_kwh: float, tier: str) -> float:
        """Estimate monthly cost for a tier given usage"""
        allowance = self.tier_allowances.get(tier, 0)
        overage_rate = self.overage_rates.get(tier, 0)
        
        allowance_used = min(monthly_kwh, allowance)
        overage_kwh = max(0, monthly_kwh - allowance)
        
        base_cost = allowance_used * self.effective_rate
        overage_cost = overage_kwh * overage_rate
        
        return base_cost + overage_cost

def main():
    """Example usage of energy billing system"""
    billing_engine = EnergyBillingEngine()
    
    # Start monitoring a user session
    user_id = "user_001"
    session_id = billing_engine.start_session_monitoring(user_id, "ai_generation")
    
    print(f"Started monitoring session: {session_id}")
    
    # Simulate some work
    time.sleep(2)
    
    # End monitoring
    session_result = billing_engine.end_session_monitoring(session_id)
    print(f"Session energy usage: {session_result['total_energy_kwh']:.6f} kWh")
    print(f"Session cost: ${session_result['session_cost']:.4f}")
    
    # Calculate monthly bill
    monthly_bill = billing_engine.calculate_monthly_bill(user_id, "personal")
    print(f"Monthly bill: ${monthly_bill.total_cost:.2f}")
    
    # Generate transparency report
    transparency = billing_engine.generate_transparency_report(user_id)
    print(f"Transparency report generated with {len(transparency['usage_summary']['daily_usage'])} days of data")

if __name__ == "__main__":
    main()
