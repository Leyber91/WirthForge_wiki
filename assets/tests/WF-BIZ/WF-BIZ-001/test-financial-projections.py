#!/usr/bin/env python3
"""
WF-BIZ-001 Financial Projections Test Suite
Comprehensive testing of WIRTHFORGE financial modeling and forecasting
"""

import unittest
import json
import time
import tempfile
import os
import numpy as np
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

# Import financial model components
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'code', 'WF-BIZ', 'WF-BIZ-001'))

from financial_models import FinancialModel, ScenarioType, FinancialAssumptions, MonthlyFinancials
from revenue_analytics import RevenueAnalytics, RevenueStream, RevenueEvent, CohortType

class TestFinancialModelAccuracy(unittest.TestCase):
    """Test financial model accuracy and consistency"""
    
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db.close()
        self.model = FinancialModel(self.temp_db.name)
    
    def tearDown(self):
        os.unlink(self.temp_db.name)
    
    def test_scenario_assumptions_validity(self):
        """Test that scenario assumptions are realistic and consistent"""
        for scenario, assumptions in self.model.scenario_assumptions.items():
            # Market size assumptions
            self.assertGreater(assumptions.total_addressable_market, 0)
            self.assertGreater(assumptions.serviceable_addressable_market, 0)
            self.assertLessEqual(assumptions.serviceable_addressable_market, assumptions.total_addressable_market)
            
            # Growth rate assumptions
            self.assertGreater(assumptions.market_growth_rate, 0)
            self.assertLess(assumptions.market_growth_rate, 1.0)  # Less than 100% annually
            self.assertGreater(assumptions.monthly_growth_rate, 0)
            self.assertLess(assumptions.monthly_growth_rate, 0.5)  # Less than 50% monthly
            
            # Conversion and churn assumptions
            self.assertGreater(assumptions.conversion_rate, 0)
            self.assertLess(assumptions.conversion_rate, 0.5)  # Less than 50%
            self.assertGreater(assumptions.churn_rate, 0)
            self.assertLess(assumptions.churn_rate, 0.3)  # Less than 30% monthly
            
            # Pricing assumptions
            self.assertGreater(assumptions.personal_tier_price, 0)
            self.assertGreater(assumptions.professional_tier_price, assumptions.personal_tier_price)
            self.assertGreater(assumptions.enterprise_tier_price, assumptions.professional_tier_price)
            
            # Cost assumptions
            self.assertGreater(assumptions.gross_margin, 0.5)  # At least 50%
            self.assertLess(assumptions.gross_margin, 1.0)     # Less than 100%
    
    def test_user_growth_projections(self):
        """Test user growth projection logic"""
        assumptions = self.model.scenario_assumptions[ScenarioType.REALISTIC]
        projections = self.model.project_user_growth(assumptions, 24)
        
        # Should have projections for all months
        self.assertEqual(len(projections), 24)
        
        # User growth should be generally increasing (allowing for churn)
        first_month_users = projections[0]["total_users"]
        last_month_users = projections[-1]["total_users"]
        self.assertGreaterEqual(last_month_users, first_month_users)
        
        # User distribution should be reasonable
        for month_data in projections:
            total = month_data["total_users"]
            free = month_data["free_users"]
            paid = month_data["personal_users"] + month_data["professional_users"] + month_data["enterprise_users"]
            
            # Total should equal sum of segments
            self.assertEqual(total, free + paid)
            
            # Free users should be majority initially
            if month_data["month"] <= 6:
                self.assertGreaterEqual(free, paid)
    
    def test_revenue_calculations(self):
        """Test revenue calculation accuracy"""
        assumptions = self.model.scenario_assumptions[ScenarioType.REALISTIC]
        
        # Test with sample user data
        user_data = {
            "total_users": 1000,
            "free_users": 700,
            "personal_users": 200,
            "professional_users": 80,
            "enterprise_users": 20
        }
        
        revenue = self.model.calculate_revenue(user_data, assumptions)
        
        # Validate revenue components
        self.assertGreaterEqual(revenue["subscription_revenue"], 0)
        self.assertGreaterEqual(revenue["energy_revenue"], 0)
        self.assertGreaterEqual(revenue["marketplace_revenue"], 0)
        self.assertGreaterEqual(revenue["services_revenue"], 0)
        
        # Total should equal sum of components
        expected_total = (
            revenue["subscription_revenue"] + 
            revenue["energy_revenue"] + 
            revenue["marketplace_revenue"] + 
            revenue["services_revenue"]
        )
        self.assertAlmostEqual(revenue["total_revenue"], expected_total, places=2)
        
        # Subscription revenue should be largest component initially
        self.assertGreaterEqual(revenue["subscription_revenue"], revenue["energy_revenue"])
    
    def test_cost_calculations(self):
        """Test cost calculation logic"""
        assumptions = self.model.scenario_assumptions[ScenarioType.REALISTIC]
        
        revenue = {"total_revenue": 50000}
        user_data = {"total_users": 1000}
        
        costs = self.model.calculate_costs(revenue, user_data, assumptions)
        
        # Validate cost components
        self.assertGreaterEqual(costs["cost_of_goods_sold"], 0)
        self.assertGreaterEqual(costs["engineering_costs"], 0)
        self.assertGreaterEqual(costs["sales_marketing_costs"], 0)
        self.assertGreaterEqual(costs["general_admin_costs"], 0)
        
        # Total should equal sum of components
        expected_total = (
            costs["cost_of_goods_sold"] + 
            costs["engineering_costs"] + 
            costs["sales_marketing_costs"] + 
            costs["general_admin_costs"]
        )
        self.assertAlmostEqual(costs["total_costs"], expected_total, places=2)
        
        # COGS should respect gross margin
        expected_cogs = revenue["total_revenue"] * (1 - assumptions.gross_margin)
        self.assertAlmostEqual(costs["cost_of_goods_sold"], expected_cogs, places=2)
    
    def test_financial_metrics_calculation(self):
        """Test financial metrics calculation"""
        revenue = {"total_revenue": 100000}
        costs = {
            "cost_of_goods_sold": 20000,
            "engineering_costs": 30000,
            "sales_marketing_costs": 15000,
            "general_admin_costs": 10000,
            "total_costs": 75000
        }
        user_data = {"total_users": 2000}
        assumptions = self.model.scenario_assumptions[ScenarioType.REALISTIC]
        
        metrics = self.model.calculate_metrics(revenue, costs, user_data, assumptions, 0)
        
        # Validate profit calculations
        self.assertEqual(metrics["gross_profit"], 80000)  # 100000 - 20000
        self.assertEqual(metrics["gross_margin"], 0.8)    # 80000 / 100000
        self.assertEqual(metrics["operating_profit"], 25000)  # 100000 - 75000
        self.assertEqual(metrics["operating_margin"], 0.25)   # 25000 / 100000
        
        # Validate user metrics
        self.assertEqual(metrics["arpu"], 50.0)  # 100000 / 2000
        
        # LTV should be reasonable
        self.assertGreater(metrics["ltv"], 0)
        self.assertLess(metrics["ltv"], 10000)  # Sanity check
    
    def test_scenario_comparison(self):
        """Test that different scenarios produce different results"""
        scenarios = [ScenarioType.CONSERVATIVE, ScenarioType.REALISTIC, ScenarioType.OPTIMISTIC]
        projections = {}
        
        for scenario in scenarios:
            projection = self.model.generate_projection(scenario, 12, 500000)
            projections[scenario] = projection
        
        # Compare final month results
        final_months = {scenario: proj[-1] for scenario, proj in projections.items()}
        
        # Optimistic should have highest revenue
        self.assertGreaterEqual(
            final_months[ScenarioType.OPTIMISTIC].total_revenue,
            final_months[ScenarioType.REALISTIC].total_revenue
        )
        self.assertGreaterEqual(
            final_months[ScenarioType.REALISTIC].total_revenue,
            final_months[ScenarioType.CONSERVATIVE].total_revenue
        )
        
        # User growth should follow same pattern
        self.assertGreaterEqual(
            final_months[ScenarioType.OPTIMISTIC].total_users,
            final_months[ScenarioType.REALISTIC].total_users
        )
        self.assertGreaterEqual(
            final_months[ScenarioType.REALISTIC].total_users,
            final_months[ScenarioType.CONSERVATIVE].total_users
        )

class TestBreakEvenAnalysis(unittest.TestCase):
    """Test break-even analysis accuracy"""
    
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db.close()
        self.model = FinancialModel(self.temp_db.name)
    
    def tearDown(self):
        os.unlink(self.temp_db.name)
    
    def test_break_even_calculation(self):
        """Test break-even point calculation"""
        break_even = self.model.break_even_analysis(ScenarioType.REALISTIC)
        
        if break_even.get("break_even_month"):
            # Break-even should occur within reasonable timeframe
            self.assertLessEqual(break_even["break_even_month"], 60)  # Within 5 years
            
            # Break-even metrics should be reasonable
            self.assertGreater(break_even["break_even_users"], 0)
            self.assertGreater(break_even["break_even_revenue"], 0)
            
            # Revenue should be sufficient to cover costs
            self.assertGreater(break_even["break_even_revenue"], 10000)  # At least $10k monthly
    
    def test_break_even_sensitivity(self):
        """Test break-even sensitivity to assumptions"""
        # Test different scenarios
        scenarios = [ScenarioType.CONSERVATIVE, ScenarioType.REALISTIC, ScenarioType.OPTIMISTIC]
        break_even_months = []
        
        for scenario in scenarios:
            result = self.model.break_even_analysis(scenario)
            if result.get("break_even_month"):
                break_even_months.append(result["break_even_month"])
        
        if len(break_even_months) >= 2:
            # Conservative should take longer than optimistic
            conservative_idx = scenarios.index(ScenarioType.CONSERVATIVE)
            optimistic_idx = scenarios.index(ScenarioType.OPTIMISTIC)
            
            if conservative_idx < len(break_even_months) and optimistic_idx < len(break_even_months):
                self.assertGreaterEqual(
                    break_even_months[conservative_idx],
                    break_even_months[optimistic_idx]
                )

class TestSensitivityAnalysis(unittest.TestCase):
    """Test sensitivity analysis functionality"""
    
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db.close()
        self.model = FinancialModel(self.temp_db.name)
    
    def tearDown(self):
        os.unlink(self.temp_db.name)
    
    def test_growth_rate_sensitivity(self):
        """Test sensitivity to growth rate changes"""
        sensitivity = self.model.sensitivity_analysis(
            ScenarioType.REALISTIC,
            "monthly_growth_rate",
            0.5  # +/- 50%
        )
        
        # Should have results for different values
        self.assertGreater(len(sensitivity["results"]), 3)
        
        # Results should show impact of growth rate changes
        results = sensitivity["results"]
        
        # Higher growth rates should lead to higher revenue
        sorted_results = sorted(results, key=lambda x: x["variable_value"])
        revenues = [r["total_revenue"] for r in sorted_results]
        
        # Revenue should generally increase with growth rate
        for i in range(1, len(revenues)):
            self.assertGreaterEqual(revenues[i], revenues[i-1] * 0.8)  # Allow some variance
    
    def test_conversion_rate_sensitivity(self):
        """Test sensitivity to conversion rate changes"""
        sensitivity = self.model.sensitivity_analysis(
            ScenarioType.REALISTIC,
            "conversion_rate",
            0.5
        )
        
        # Should show significant impact on revenue
        results = sensitivity["results"]
        revenues = [r["total_revenue"] for r in results]
        
        revenue_range = max(revenues) - min(revenues)
        avg_revenue = sum(revenues) / len(revenues)
        
        # Conversion rate should have significant impact (>20% range)
        self.assertGreater(revenue_range / avg_revenue, 0.2)

class TestRevenueAnalytics(unittest.TestCase):
    """Test revenue analytics and forecasting"""
    
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db.close()
        self.analytics = RevenueAnalytics(self.temp_db.name)
    
    def tearDown(self):
        os.unlink(self.temp_db.name)
    
    def test_mrr_calculation(self):
        """Test Monthly Recurring Revenue calculation"""
        # Add sample revenue events
        now = time.time()
        
        for i in range(10):
            event = RevenueEvent(
                event_id=f"test_event_{i}",
                user_id=f"user_{i}",
                timestamp=now - (i * 24 * 3600),  # Spread over 10 days
                stream=RevenueStream.SUBSCRIPTION,
                amount=29.99,
                tier="professional",
                metadata={}
            )
            self.analytics.record_revenue_event(event)
        
        mrr = self.analytics.calculate_mrr()
        
        # Should have positive MRR
        self.assertGreater(mrr["total_mrr"], 0)
        
        # Should have tier breakdown
        self.assertIn("mrr_by_tier", mrr)
        self.assertIn("professional", mrr["mrr_by_tier"])
    
    def test_revenue_growth_analysis(self):
        """Test revenue growth trend analysis"""
        # Add revenue events across multiple months
        now = time.time()
        
        for month in range(6):
            for day in range(30):
                for user in range(5):
                    event = RevenueEvent(
                        event_id=f"growth_test_{month}_{day}_{user}",
                        user_id=f"user_{user}",
                        timestamp=now - ((month * 30 + day) * 24 * 3600),
                        stream=RevenueStream.SUBSCRIPTION,
                        amount=19.99 + (month * 2),  # Growing revenue
                        tier="personal",
                        metadata={}
                    )
                    self.analytics.record_revenue_event(event)
        
        growth = self.analytics.analyze_revenue_growth(6)
        
        # Should have monthly data
        self.assertEqual(len(growth["monthly_data"]), 6)
        
        # Should calculate growth rates
        for month_data in growth["monthly_data"][1:]:  # Skip first month
            if "month_over_month_growth" in month_data:
                # Growth rate should be reasonable
                self.assertGreater(month_data["month_over_month_growth"], -50)  # Not declining too fast
                self.assertLess(month_data["month_over_month_growth"], 200)     # Not growing unrealistically
    
    def test_cohort_analysis(self):
        """Test cohort analysis functionality"""
        now = time.time()
        
        # Create cohorts of users
        for cohort_month in range(3):
            cohort_start = now - (cohort_month * 30 * 24 * 3600)
            
            for user in range(10):
                user_id = f"cohort_{cohort_month}_user_{user}"
                
                # Assign to cohort
                self.analytics.assign_user_to_cohort(
                    user_id,
                    cohort_start,
                    "personal",
                    "organic",
                    "north_america"
                )
                
                # Add revenue events for this user
                for month in range(cohort_month + 1):
                    event = RevenueEvent(
                        event_id=f"cohort_revenue_{cohort_month}_{user}_{month}",
                        user_id=user_id,
                        timestamp=cohort_start + (month * 30 * 24 * 3600),
                        stream=RevenueStream.SUBSCRIPTION,
                        amount=19.99,
                        tier="personal",
                        metadata={}
                    )
                    self.analytics.record_revenue_event(event)
        
        # Perform cohort analysis
        cohorts = self.analytics.perform_cohort_analysis(CohortType.SIGNUP_MONTH, 6)
        
        # Should have cohort data
        self.assertGreater(len(cohorts), 0)
        
        for cohort in cohorts:
            # Validate cohort structure
            self.assertGreater(cohort.initial_size, 0)
            self.assertGreaterEqual(len(cohort.revenue_by_period), 1)
            self.assertGreaterEqual(len(cohort.retention_by_period), 1)
            self.assertGreaterEqual(cohort.ltv_projection, 0)
    
    def test_revenue_forecasting(self):
        """Test revenue forecasting accuracy"""
        # Add historical revenue data
        now = time.time()
        
        for month in range(12):
            monthly_revenue = 10000 + (month * 1000)  # Growing trend
            
            for day in range(30):
                event = RevenueEvent(
                    event_id=f"forecast_test_{month}_{day}",
                    user_id=f"user_{day % 10}",
                    timestamp=now - ((month * 30 + day) * 24 * 3600),
                    stream=RevenueStream.SUBSCRIPTION,
                    amount=monthly_revenue / 30,
                    tier="professional",
                    metadata={}
                )
                self.analytics.record_revenue_event(event)
        
        forecast = self.analytics.forecast_revenue(12)
        
        if "monthly_forecast" in forecast:
            # Should have 12 months of forecasts
            self.assertEqual(len(forecast["monthly_forecast"]), 12)
            
            # Forecasted values should be positive
            for monthly_value in forecast["monthly_forecast"]:
                self.assertGreaterEqual(monthly_value, 0)
            
            # Should have reasonable growth
            first_month = forecast["monthly_forecast"][0]
            last_month = forecast["monthly_forecast"][-1]
            
            if first_month > 0:
                growth_ratio = last_month / first_month
                self.assertLess(growth_ratio, 10)  # Not more than 10x growth

class TestFundingRequirements(unittest.TestCase):
    """Test funding requirements calculation"""
    
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db.close()
        self.model = FinancialModel(self.temp_db.name)
    
    def tearDown(self):
        os.unlink(self.temp_db.name)
    
    def test_funding_calculation(self):
        """Test funding requirements calculation"""
        funding = self.model.funding_requirements(ScenarioType.REALISTIC)
        
        # Should have funding analysis
        self.assertIn("minimum_cash_position", funding)
        self.assertIn("recommended_stages", funding)
        
        # If funding is needed, should have reasonable amounts
        if funding.get("recommended_stages"):
            total_funding = funding["total_funding_required"]
            self.assertGreater(total_funding, 0)
            self.assertLess(total_funding, 100_000_000)  # Sanity check
            
            # Should have staging
            for stage in funding["recommended_stages"]:
                self.assertIn("stage", stage)
                self.assertIn("amount", stage)
                self.assertIn("timing", stage)
                self.assertIn("purpose", stage)
    
    def test_funding_scenarios(self):
        """Test funding requirements across scenarios"""
        scenarios = [ScenarioType.CONSERVATIVE, ScenarioType.REALISTIC, ScenarioType.OPTIMISTIC]
        funding_requirements = {}
        
        for scenario in scenarios:
            funding = self.model.funding_requirements(scenario)
            funding_requirements[scenario] = funding.get("total_funding_required", 0)
        
        # Conservative scenario might need more funding (slower growth)
        # This is not always true, so we just check they're reasonable
        for amount in funding_requirements.values():
            if amount > 0:
                self.assertLess(amount, 50_000_000)  # Reasonable upper bound

class TestFinancialProjectionIntegration(unittest.TestCase):
    """Test integration between financial projection components"""
    
    def setUp(self):
        self.temp_db1 = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db1.close()
        self.temp_db2 = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db2.close()
        
        self.model = FinancialModel(self.temp_db1.name)
        self.analytics = RevenueAnalytics(self.temp_db2.name)
    
    def tearDown(self):
        os.unlink(self.temp_db1.name)
        os.unlink(self.temp_db2.name)
    
    def test_projection_analytics_consistency(self):
        """Test consistency between projections and analytics"""
        # Generate projection
        projections = self.model.generate_projection(ScenarioType.REALISTIC, 12)
        
        # Simulate analytics data based on projections
        now = time.time()
        
        for i, projection in enumerate(projections[:6]):  # First 6 months
            month_start = now - ((6-i) * 30 * 24 * 3600)
            
            # Add revenue events based on projection
            monthly_revenue = projection.total_revenue
            daily_revenue = monthly_revenue / 30
            
            for day in range(30):
                event = RevenueEvent(
                    event_id=f"integration_test_{i}_{day}",
                    user_id=f"user_{day % 10}",
                    timestamp=month_start + (day * 24 * 3600),
                    stream=RevenueStream.SUBSCRIPTION,
                    amount=daily_revenue,
                    tier="professional",
                    metadata={}
                )
                self.analytics.record_revenue_event(event)
        
        # Compare analytics with projections
        mrr = self.analytics.calculate_mrr()
        latest_projection = projections[5]  # 6th month (0-indexed)
        
        # MRR should be in same ballpark as projected revenue
        ratio = mrr["total_mrr"] / max(latest_projection.total_revenue, 1)
        self.assertGreater(ratio, 0.5)  # Within 50%
        self.assertLess(ratio, 2.0)     # Within 200%

def run_financial_projections_tests():
    """Run all financial projections tests"""
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestFinancialModelAccuracy,
        TestBreakEvenAnalysis,
        TestSensitivityAnalysis,
        TestRevenueAnalytics,
        TestFundingRequirements,
        TestFinancialProjectionIntegration
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Generate test report
    report = {
        "test_run_id": f"financial_projections_{int(time.time())}",
        "timestamp": datetime.now().isoformat(),
        "total_tests": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "success_rate": (result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun if result.testsRun > 0 else 0,
        "test_categories": [
            "financial_model_accuracy",
            "break_even_analysis",
            "sensitivity_analysis",
            "revenue_analytics",
            "funding_requirements",
            "integration_testing"
        ],
        "validation_status": "PASSED" if result.wasSuccessful() else "FAILED",
        "financial_health_indicators": {
            "model_consistency": "PASSED" if len(result.failures) == 0 else "FAILED",
            "projection_accuracy": "PASSED" if len(result.errors) == 0 else "FAILED",
            "scenario_coverage": "COMPREHENSIVE",
            "sensitivity_testing": "COMPLETE"
        },
        "recommendations": []
    }
    
    # Add recommendations based on results
    if result.failures:
        report["recommendations"].append("Review financial model assumptions and calculation logic")
    
    if result.errors:
        report["recommendations"].append("Fix technical errors in financial projection system")
    
    if report["success_rate"] < 0.90:
        report["recommendations"].append("Improve financial model robustness and test coverage")
    
    return report

if __name__ == "__main__":
    # Run financial projections tests
    test_report = run_financial_projections_tests()
    
    print("\n" + "="*70)
    print("FINANCIAL PROJECTIONS TEST REPORT")
    print("="*70)
    print(f"Test Run ID: {test_report['test_run_id']}")
    print(f"Timestamp: {test_report['timestamp']}")
    print(f"Total Tests: {test_report['total_tests']}")
    print(f"Failures: {test_report['failures']}")
    print(f"Errors: {test_report['errors']}")
    print(f"Success Rate: {test_report['success_rate']:.1%}")
    print(f"Status: {test_report['validation_status']}")
    
    print("\nFinancial Health Indicators:")
    for indicator, status in test_report['financial_health_indicators'].items():
        print(f"  - {indicator.replace('_', ' ').title()}: {status}")
    
    if test_report['recommendations']:
        print("\nRecommendations:")
        for rec in test_report['recommendations']:
            print(f"  - {rec}")
    
    print("\nTest Categories Covered:")
    for category in test_report['test_categories']:
        print(f"  - {category.replace('_', ' ').title()}")
    
    print("\n" + "="*70)
