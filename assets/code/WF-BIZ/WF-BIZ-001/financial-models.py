#!/usr/bin/env python3
"""
WF-BIZ-001 Financial Models
Comprehensive financial modeling for WIRTHFORGE business planning
"""

import json
import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3

class ScenarioType(Enum):
    CONSERVATIVE = "conservative"
    REALISTIC = "realistic"
    OPTIMISTIC = "optimistic"
    STRESS_TEST = "stress_test"

class RevenueStream(Enum):
    SUBSCRIPTION = "subscription"
    ENERGY_BILLING = "energy_billing"
    MARKETPLACE = "marketplace"
    PROFESSIONAL_SERVICES = "professional_services"

@dataclass
class FinancialAssumptions:
    """Core financial assumptions for modeling"""
    # Market assumptions
    total_addressable_market: float  # USD
    serviceable_addressable_market: float  # USD
    market_growth_rate: float  # Annual percentage
    
    # User growth assumptions
    initial_users: int
    monthly_growth_rate: float  # Percentage
    conversion_rate: float  # Free to paid
    churn_rate: float  # Monthly
    
    # Pricing assumptions
    free_tier_percentage: float
    personal_tier_price: float
    professional_tier_price: float
    enterprise_tier_price: float
    energy_rate_per_kwh: float
    marketplace_commission: float
    
    # Cost assumptions
    customer_acquisition_cost: float
    gross_margin: float
    engineering_cost_percentage: float
    sales_marketing_percentage: float
    general_admin_percentage: float

@dataclass
class MonthlyFinancials:
    """Monthly financial snapshot"""
    month: int
    date: str
    
    # User metrics
    total_users: int
    free_users: int
    personal_users: int
    professional_users: int
    enterprise_users: int
    new_users: int
    churned_users: int
    
    # Revenue
    subscription_revenue: float
    energy_revenue: float
    marketplace_revenue: float
    services_revenue: float
    total_revenue: float
    
    # Costs
    cost_of_goods_sold: float
    engineering_costs: float
    sales_marketing_costs: float
    general_admin_costs: float
    total_costs: float
    
    # Metrics
    gross_profit: float
    gross_margin: float
    operating_profit: float
    operating_margin: float
    net_profit: float
    cash_flow: float
    cumulative_cash: float
    
    # KPIs
    arpu: float  # Average Revenue Per User
    ltv: float   # Customer Lifetime Value
    cac: float   # Customer Acquisition Cost
    ltv_cac_ratio: float
    burn_rate: float
    runway_months: float

class FinancialModel:
    """
    Comprehensive financial model for WIRTHFORGE business planning
    Supports multiple scenarios and sensitivity analysis
    """
    
    def __init__(self, db_path: str = "financial_model.db"):
        self.db_path = db_path
        self._initialize_database()
        
        # Default assumptions for different scenarios
        self.scenario_assumptions = {
            ScenarioType.CONSERVATIVE: FinancialAssumptions(
                total_addressable_market=50_000_000_000,  # $50B
                serviceable_addressable_market=5_000_000_000,  # $5B
                market_growth_rate=0.15,  # 15% annually
                initial_users=100,
                monthly_growth_rate=0.10,  # 10% monthly
                conversion_rate=0.03,  # 3%
                churn_rate=0.08,  # 8% monthly
                free_tier_percentage=0.85,
                personal_tier_price=9.99,
                professional_tier_price=29.99,
                enterprise_tier_price=99.99,
                energy_rate_per_kwh=0.18,
                marketplace_commission=0.05,
                customer_acquisition_cost=45.0,
                gross_margin=0.75,
                engineering_cost_percentage=0.40,
                sales_marketing_percentage=0.25,
                general_admin_percentage=0.15
            ),
            ScenarioType.REALISTIC: FinancialAssumptions(
                total_addressable_market=50_000_000_000,
                serviceable_addressable_market=5_000_000_000,
                market_growth_rate=0.20,  # 20% annually
                initial_users=500,
                monthly_growth_rate=0.15,  # 15% monthly
                conversion_rate=0.05,  # 5%
                churn_rate=0.05,  # 5% monthly
                free_tier_percentage=0.80,
                personal_tier_price=9.99,
                professional_tier_price=29.99,
                enterprise_tier_price=99.99,
                energy_rate_per_kwh=0.18,
                marketplace_commission=0.05,
                customer_acquisition_cost=35.0,
                gross_margin=0.80,
                engineering_cost_percentage=0.35,
                sales_marketing_percentage=0.20,
                general_admin_percentage=0.12
            ),
            ScenarioType.OPTIMISTIC: FinancialAssumptions(
                total_addressable_market=50_000_000_000,
                serviceable_addressable_market=5_000_000_000,
                market_growth_rate=0.25,  # 25% annually
                initial_users=1000,
                monthly_growth_rate=0.20,  # 20% monthly
                conversion_rate=0.08,  # 8%
                churn_rate=0.03,  # 3% monthly
                free_tier_percentage=0.75,
                personal_tier_price=9.99,
                professional_tier_price=29.99,
                enterprise_tier_price=99.99,
                energy_rate_per_kwh=0.18,
                marketplace_commission=0.05,
                customer_acquisition_cost=25.0,
                gross_margin=0.85,
                engineering_cost_percentage=0.30,
                sales_marketing_percentage=0.18,
                general_admin_percentage=0.10
            )
        }
    
    def _initialize_database(self):
        """Initialize database for storing financial projections"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS projections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scenario TEXT NOT NULL,
                    month INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS assumptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scenario TEXT NOT NULL,
                    assumptions TEXT NOT NULL,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
    
    def project_user_growth(
        self, 
        assumptions: FinancialAssumptions, 
        months: int = 60
    ) -> List[Dict[str, int]]:
        """Project user growth over time"""
        projections = []
        
        total_users = assumptions.initial_users
        free_users = int(total_users * assumptions.free_tier_percentage)
        paid_users = total_users - free_users
        
        for month in range(months):
            # Calculate new users
            growth_factor = (1 + assumptions.monthly_growth_rate) ** month
            new_users_this_month = int(assumptions.initial_users * assumptions.monthly_growth_rate * growth_factor)
            
            # Apply churn
            churned_users = int(total_users * assumptions.churn_rate)
            
            # Net user growth
            total_users = max(0, total_users + new_users_this_month - churned_users)
            
            # Convert free to paid
            new_conversions = int(free_users * assumptions.conversion_rate)
            
            # Update user distribution
            free_users = int(total_users * assumptions.free_tier_percentage) - new_conversions
            paid_users = total_users - free_users
            
            # Distribute paid users across tiers (simplified)
            personal_users = int(paid_users * 0.70)  # 70% personal
            professional_users = int(paid_users * 0.25)  # 25% professional
            enterprise_users = paid_users - personal_users - professional_users  # 5% enterprise
            
            projections.append({
                "month": month + 1,
                "total_users": total_users,
                "free_users": max(0, free_users),
                "personal_users": personal_users,
                "professional_users": professional_users,
                "enterprise_users": enterprise_users,
                "new_users": new_users_this_month,
                "churned_users": churned_users
            })
        
        return projections
    
    def calculate_revenue(
        self, 
        user_data: Dict[str, int], 
        assumptions: FinancialAssumptions
    ) -> Dict[str, float]:
        """Calculate monthly revenue from user base"""
        # Subscription revenue
        subscription_revenue = (
            user_data["personal_users"] * assumptions.personal_tier_price +
            user_data["professional_users"] * assumptions.professional_tier_price +
            user_data["enterprise_users"] * assumptions.enterprise_tier_price
        )
        
        # Energy billing revenue (simplified model)
        # Assume average energy consumption per user tier
        energy_consumption = (
            user_data["free_users"] * 0.5 +  # 0.5 kWh per free user
            user_data["personal_users"] * 2.0 +  # 2.0 kWh per personal user
            user_data["professional_users"] * 8.0 +  # 8.0 kWh per professional user
            user_data["enterprise_users"] * 25.0  # 25.0 kWh per enterprise user
        )
        energy_revenue = energy_consumption * assumptions.energy_rate_per_kwh
        
        # Marketplace revenue (grows with user engagement)
        marketplace_volume = user_data["total_users"] * 2.5  # $2.5 average transaction per user
        marketplace_revenue = marketplace_volume * assumptions.marketplace_commission
        
        # Professional services (scales with enterprise users)
        services_revenue = user_data["enterprise_users"] * 50.0  # $50 per enterprise user
        
        total_revenue = subscription_revenue + energy_revenue + marketplace_revenue + services_revenue
        
        return {
            "subscription_revenue": subscription_revenue,
            "energy_revenue": energy_revenue,
            "marketplace_revenue": marketplace_revenue,
            "services_revenue": services_revenue,
            "total_revenue": total_revenue
        }
    
    def calculate_costs(
        self, 
        revenue: Dict[str, float], 
        user_data: Dict[str, int],
        assumptions: FinancialAssumptions
    ) -> Dict[str, float]:
        """Calculate monthly costs"""
        total_revenue = revenue["total_revenue"]
        
        # Cost of Goods Sold (energy costs, infrastructure)
        cogs = total_revenue * (1 - assumptions.gross_margin)
        
        # Engineering costs (fixed + variable)
        base_engineering = 50000  # Base monthly engineering cost
        variable_engineering = user_data["total_users"] * 0.50  # $0.50 per user
        engineering_costs = base_engineering + variable_engineering
        
        # Sales & Marketing costs
        sales_marketing_costs = total_revenue * assumptions.sales_marketing_percentage
        
        # General & Administrative costs
        general_admin_costs = total_revenue * assumptions.general_admin_percentage
        
        total_costs = cogs + engineering_costs + sales_marketing_costs + general_admin_costs
        
        return {
            "cost_of_goods_sold": cogs,
            "engineering_costs": engineering_costs,
            "sales_marketing_costs": sales_marketing_costs,
            "general_admin_costs": general_admin_costs,
            "total_costs": total_costs
        }
    
    def calculate_metrics(
        self, 
        revenue: Dict[str, float], 
        costs: Dict[str, float],
        user_data: Dict[str, int],
        assumptions: FinancialAssumptions,
        previous_cash: float = 0
    ) -> Dict[str, float]:
        """Calculate financial metrics"""
        total_revenue = revenue["total_revenue"]
        total_costs = costs["total_costs"]
        cogs = costs["cost_of_goods_sold"]
        
        # Profit metrics
        gross_profit = total_revenue - cogs
        gross_margin = gross_profit / total_revenue if total_revenue > 0 else 0
        operating_profit = total_revenue - total_costs
        operating_margin = operating_profit / total_revenue if total_revenue > 0 else 0
        net_profit = operating_profit  # Simplified (no taxes, interest)
        
        # Cash flow
        cash_flow = net_profit
        cumulative_cash = previous_cash + cash_flow
        
        # User metrics
        paid_users = user_data["personal_users"] + user_data["professional_users"] + user_data["enterprise_users"]
        arpu = total_revenue / user_data["total_users"] if user_data["total_users"] > 0 else 0
        
        # LTV calculation (simplified)
        monthly_churn = assumptions.churn_rate
        ltv = arpu / monthly_churn if monthly_churn > 0 else 0
        
        # CAC and ratios
        cac = assumptions.customer_acquisition_cost
        ltv_cac_ratio = ltv / cac if cac > 0 else 0
        
        # Burn rate and runway
        burn_rate = -cash_flow if cash_flow < 0 else 0
        runway_months = cumulative_cash / burn_rate if burn_rate > 0 else float('inf')
        
        return {
            "gross_profit": gross_profit,
            "gross_margin": gross_margin,
            "operating_profit": operating_profit,
            "operating_margin": operating_margin,
            "net_profit": net_profit,
            "cash_flow": cash_flow,
            "cumulative_cash": cumulative_cash,
            "arpu": arpu,
            "ltv": ltv,
            "cac": cac,
            "ltv_cac_ratio": ltv_cac_ratio,
            "burn_rate": burn_rate,
            "runway_months": runway_months
        }
    
    def generate_projection(
        self, 
        scenario: ScenarioType, 
        months: int = 60,
        initial_cash: float = 1_000_000
    ) -> List[MonthlyFinancials]:
        """Generate complete financial projection"""
        assumptions = self.scenario_assumptions[scenario]
        user_projections = self.project_user_growth(assumptions, months)
        
        projections = []
        cumulative_cash = initial_cash
        
        for month_data in user_projections:
            month = month_data["month"]
            date = (datetime.now() + timedelta(days=30 * (month - 1))).strftime("%Y-%m")
            
            # Calculate revenue
            revenue = self.calculate_revenue(month_data, assumptions)
            
            # Calculate costs
            costs = self.calculate_costs(revenue, month_data, assumptions)
            
            # Calculate metrics
            metrics = self.calculate_metrics(
                revenue, costs, month_data, assumptions, cumulative_cash
            )
            
            # Update cumulative cash
            cumulative_cash = metrics["cumulative_cash"]
            
            # Create monthly financial snapshot
            monthly_financials = MonthlyFinancials(
                month=month,
                date=date,
                total_users=month_data["total_users"],
                free_users=month_data["free_users"],
                personal_users=month_data["personal_users"],
                professional_users=month_data["professional_users"],
                enterprise_users=month_data["enterprise_users"],
                new_users=month_data["new_users"],
                churned_users=month_data["churned_users"],
                subscription_revenue=revenue["subscription_revenue"],
                energy_revenue=revenue["energy_revenue"],
                marketplace_revenue=revenue["marketplace_revenue"],
                services_revenue=revenue["services_revenue"],
                total_revenue=revenue["total_revenue"],
                cost_of_goods_sold=costs["cost_of_goods_sold"],
                engineering_costs=costs["engineering_costs"],
                sales_marketing_costs=costs["sales_marketing_costs"],
                general_admin_costs=costs["general_admin_costs"],
                total_costs=costs["total_costs"],
                gross_profit=metrics["gross_profit"],
                gross_margin=metrics["gross_margin"],
                operating_profit=metrics["operating_profit"],
                operating_margin=metrics["operating_margin"],
                net_profit=metrics["net_profit"],
                cash_flow=metrics["cash_flow"],
                cumulative_cash=metrics["cumulative_cash"],
                arpu=metrics["arpu"],
                ltv=metrics["ltv"],
                cac=metrics["cac"],
                ltv_cac_ratio=metrics["ltv_cac_ratio"],
                burn_rate=metrics["burn_rate"],
                runway_months=metrics["runway_months"]
            )
            
            projections.append(monthly_financials)
        
        # Save to database
        self._save_projection(scenario, projections, assumptions)
        
        return projections
    
    def _save_projection(
        self, 
        scenario: ScenarioType, 
        projections: List[MonthlyFinancials],
        assumptions: FinancialAssumptions
    ):
        """Save projection to database"""
        with sqlite3.connect(self.db_path) as conn:
            # Save assumptions
            conn.execute("""
                INSERT INTO assumptions (scenario, assumptions)
                VALUES (?, ?)
            """, (scenario.value, json.dumps(asdict(assumptions))))
            
            # Save projections
            for projection in projections:
                conn.execute("""
                    INSERT INTO projections (scenario, month, date, data)
                    VALUES (?, ?, ?, ?)
                """, (
                    scenario.value,
                    projection.month,
                    projection.date,
                    json.dumps(asdict(projection))
                ))
    
    def sensitivity_analysis(
        self, 
        base_scenario: ScenarioType = ScenarioType.REALISTIC,
        variable: str = "monthly_growth_rate",
        range_percent: float = 0.5  # +/- 50%
    ) -> Dict[str, Any]:
        """Perform sensitivity analysis on key variables"""
        base_assumptions = self.scenario_assumptions[base_scenario]
        base_value = getattr(base_assumptions, variable)
        
        # Test range
        test_values = [
            base_value * (1 - range_percent),
            base_value * (1 - range_percent/2),
            base_value,
            base_value * (1 + range_percent/2),
            base_value * (1 + range_percent)
        ]
        
        results = []
        
        for test_value in test_values:
            # Create modified assumptions
            modified_assumptions = FinancialAssumptions(**asdict(base_assumptions))
            setattr(modified_assumptions, variable, test_value)
            
            # Generate 12-month projection
            user_projections = self.project_user_growth(modified_assumptions, 12)
            
            # Calculate final month metrics
            final_month = user_projections[-1]
            revenue = self.calculate_revenue(final_month, modified_assumptions)
            costs = self.calculate_costs(revenue, final_month, modified_assumptions)
            metrics = self.calculate_metrics(revenue, costs, final_month, modified_assumptions)
            
            results.append({
                "variable_value": test_value,
                "change_percent": ((test_value - base_value) / base_value) * 100,
                "total_users": final_month["total_users"],
                "total_revenue": revenue["total_revenue"],
                "operating_profit": metrics["operating_profit"],
                "ltv_cac_ratio": metrics["ltv_cac_ratio"]
            })
        
        return {
            "variable": variable,
            "base_value": base_value,
            "results": results,
            "analysis": {
                "revenue_sensitivity": max(r["total_revenue"] for r in results) / min(r["total_revenue"] for r in results),
                "profit_sensitivity": max(r["operating_profit"] for r in results) / min(r["operating_profit"] for r in results) if min(r["operating_profit"] for r in results) > 0 else float('inf')
            }
        }
    
    def break_even_analysis(self, scenario: ScenarioType = ScenarioType.REALISTIC) -> Dict[str, Any]:
        """Calculate break-even metrics"""
        projections = self.generate_projection(scenario, 60)
        
        # Find break-even month
        break_even_month = None
        for projection in projections:
            if projection.operating_profit > 0:
                break_even_month = projection.month
                break
        
        # Find cash flow positive month
        cash_positive_month = None
        for projection in projections:
            if projection.cumulative_cash > 0 and projection.cash_flow > 0:
                cash_positive_month = projection.month
                break
        
        if break_even_month:
            break_even_data = projections[break_even_month - 1]
            
            return {
                "break_even_month": break_even_month,
                "break_even_users": break_even_data.total_users,
                "break_even_revenue": break_even_data.total_revenue,
                "cash_positive_month": cash_positive_month,
                "assumptions": asdict(self.scenario_assumptions[scenario])
            }
        else:
            return {
                "break_even_month": None,
                "message": "Break-even not achieved within projection period",
                "final_month_loss": projections[-1].operating_profit
            }
    
    def funding_requirements(self, scenario: ScenarioType = ScenarioType.REALISTIC) -> Dict[str, Any]:
        """Calculate funding requirements"""
        projections = self.generate_projection(scenario, 60, initial_cash=0)
        
        # Find minimum cash position
        min_cash = min(p.cumulative_cash for p in projections)
        
        # Find when additional funding is needed
        funding_needed_month = None
        for projection in projections:
            if projection.cumulative_cash < -100000:  # Need funding when cash < -$100k
                funding_needed_month = projection.month
                break
        
        # Calculate funding stages
        stages = []
        if min_cash < 0:
            # Seed funding
            stages.append({
                "stage": "seed",
                "amount": abs(min_cash) + 500000,  # Buffer
                "timing": "Month 1",
                "purpose": "Product development and initial growth"
            })
        
        # Series A (if high growth)
        if projections[23].total_users > 10000:  # Month 24
            stages.append({
                "stage": "series_a",
                "amount": 2000000,
                "timing": "Month 24",
                "purpose": "Scale operations and market expansion"
            })
        
        return {
            "minimum_cash_position": min_cash,
            "funding_needed_month": funding_needed_month,
            "recommended_stages": stages,
            "total_funding_required": sum(s["amount"] for s in stages)
        }

def main():
    """Example usage of financial models"""
    model = FinancialModel()
    
    # Generate projections for all scenarios
    scenarios = [ScenarioType.CONSERVATIVE, ScenarioType.REALISTIC, ScenarioType.OPTIMISTIC]
    
    for scenario in scenarios:
        print(f"\n=== {scenario.value.upper()} SCENARIO ===")
        projections = model.generate_projection(scenario, 24)
        
        # Print key metrics for months 12 and 24
        for month in [12, 24]:
            if month <= len(projections):
                p = projections[month - 1]
                print(f"\nMonth {month}:")
                print(f"  Users: {p.total_users:,}")
                print(f"  Revenue: ${p.total_revenue:,.0f}")
                print(f"  Profit: ${p.operating_profit:,.0f}")
                print(f"  Cash: ${p.cumulative_cash:,.0f}")
    
    # Break-even analysis
    break_even = model.break_even_analysis()
    print(f"\nBreak-even Analysis:")
    print(json.dumps(break_even, indent=2))
    
    # Sensitivity analysis
    sensitivity = model.sensitivity_analysis(variable="conversion_rate")
    print(f"\nSensitivity Analysis (Conversion Rate):")
    for result in sensitivity["results"]:
        print(f"  {result['change_percent']:+.1f}%: Revenue ${result['total_revenue']:,.0f}")

if __name__ == "__main__":
    main()
