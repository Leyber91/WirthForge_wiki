#!/usr/bin/env python3
"""
WIRTHFORGE Governance Validation Test Suite
Comprehensive tests for governance compliance validation
"""

import pytest
import asyncio
import json
import tempfile
import sqlite3
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta

# Import the governance validator modules
import sys
sys.path.append(str(Path(__file__).parent.parent / "code" / "WF-FND-006"))

from governance_validator import (
    ValidationResult,
    CorePrincipleValidator,
    PerformanceValidator,
    SandboxValidator,
    AuditTrailValidator,
    GovernanceValidator
)

class TestValidationResult:
    """Test ValidationResult dataclass"""
    
    def test_validation_result_creation(self):
        """Test creating ValidationResult instances"""
        result = ValidationResult(
            check_id="TEST-001",
            description="Test validation",
            passed=True,
            details="Test passed successfully",
            severity="medium",
            timestamp=datetime.now()
        )
        
        assert result.check_id == "TEST-001"
        assert result.passed is True
        assert result.severity == "medium"
        assert result.evidence is None
    
    def test_validation_result_with_evidence(self):
        """Test ValidationResult with evidence"""
        evidence = {"test_data": "value", "metrics": [1, 2, 3]}
        result = ValidationResult(
            check_id="TEST-002",
            description="Test with evidence",
            passed=False,
            details="Test failed with evidence",
            severity="high",
            timestamp=datetime.now(),
            evidence=evidence
        )
        
        assert result.evidence == evidence
        assert result.passed is False

class TestCorePrincipleValidator:
    """Test CorePrincipleValidator functionality"""
    
    @pytest.fixture
    def validator(self):
        return CorePrincipleValidator()
    
    @pytest.mark.asyncio
    async def test_validate_local_first(self, validator):
        """Test local-first validation"""
        with patch('psutil.net_connections', return_value=[]):
            results = await validator.validate_local_first()
            
            assert len(results) == 3
            assert all(isinstance(r, ValidationResult) for r in results)
            assert any(r.check_id == "LF-001" for r in results)
            assert any(r.check_id == "LF-002" for r in results)
            assert any(r.check_id == "LF-003" for r in results)
    
    @pytest.mark.asyncio
    async def test_network_isolation_check(self, validator):
        """Test network isolation checking"""
        with patch('psutil.net_connections', return_value=[]):
            result = await validator._check_network_isolation()
            
            assert result.check_id == "LF-001"
            assert result.severity == "critical"
            assert "Network connections change: 0" in result.details
    
    @pytest.mark.asyncio
    async def test_local_storage_check(self, validator):
        """Test local storage verification"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a test data directory
            test_data_dir = Path(temp_dir) / "data"
            test_data_dir.mkdir()
            
            with patch('pathlib.Path.cwd', return_value=Path(temp_dir)):
                result = await validator._check_local_storage()
                
                assert result.check_id == "LF-002"
                assert result.severity == "critical"
    
    @pytest.mark.asyncio
    async def test_docker_prohibition_validation(self, validator):
        """Test Docker prohibition validation"""
        with patch('psutil.process_iter', return_value=[]):
            results = await validator.validate_docker_prohibition()
            
            assert len(results) == 2
            assert any(r.check_id == "DP-001" for r in results)
            assert any(r.check_id == "DP-002" for r in results)
    
    @pytest.mark.asyncio
    async def test_docker_process_detection(self, validator):
        """Test Docker process detection"""
        # Mock no Docker processes
        mock_processes = []
        
        with patch('psutil.process_iter', return_value=mock_processes):
            result = await validator._check_docker_processes()
            
            assert result.check_id == "DP-001"
            assert result.passed is True
            assert "Docker processes found: 0" in result.details

class TestPerformanceValidator:
    """Test PerformanceValidator functionality"""
    
    @pytest.fixture
    def validator(self):
        return PerformanceValidator()
    
    @pytest.mark.asyncio
    async def test_validate_performance_constraints(self, validator):
        """Test performance constraint validation"""
        results = await validator.validate_performance_constraints()
        
        assert len(results) == 3
        assert all(isinstance(r, ValidationResult) for r in results)
        assert any(r.check_id == "PC-001" for r in results)
        assert any(r.check_id == "PC-002" for r in results)
        assert any(r.check_id == "PC-004" for r in results)
    
    @pytest.mark.asyncio
    async def test_frame_rate_validation(self, validator):
        """Test frame rate validation"""
        result = await validator._validate_frame_rate()
        
        assert result.check_id == "PC-001"
        assert result.severity == "critical"
        assert "Avg FPS:" in result.details
        assert "Budget compliance:" in result.details
    
    @pytest.mark.asyncio
    async def test_frame_timing_validation(self, validator):
        """Test frame timing validation"""
        result = await validator._validate_frame_timing()
        
        assert result.check_id == "PC-002"
        assert result.severity == "critical"
        assert "Frame budget compliance:" in result.details
    
    @pytest.mark.asyncio
    async def test_resource_usage_validation(self, validator):
        """Test resource usage validation"""
        with patch('psutil.cpu_percent', return_value=50.0), \
             patch('psutil.virtual_memory') as mock_memory:
            
            mock_memory.return_value.percent = 60.0
            
            result = await validator._validate_resource_usage()
            
            assert result.check_id == "PC-004"
            assert result.severity == "medium"
            assert "CPU:" in result.details
            assert "Memory:" in result.details

class TestSandboxValidator:
    """Test SandboxValidator functionality"""
    
    @pytest.fixture
    def validator(self):
        return SandboxValidator()
    
    @pytest.mark.asyncio
    async def test_validate_sandbox_isolation(self, validator):
        """Test sandbox isolation validation"""
        results = await validator.validate_sandbox_isolation()
        
        assert len(results) == 3
        assert all(isinstance(r, ValidationResult) for r in results)
        assert any(r.check_id == "SP-001" for r in results)
        assert any(r.check_id == "SP-002" for r in results)
        assert any(r.check_id == "SP-003" for r in results)
    
    @pytest.mark.asyncio
    async def test_isolation_validation(self, validator):
        """Test sandbox isolation checking"""
        result = await validator._validate_isolation()
        
        assert result.check_id == "SP-001"
        assert result.severity == "critical"
        assert "Isolation violations:" in result.details
    
    @pytest.mark.asyncio
    async def test_resource_limits_validation(self, validator):
        """Test sandbox resource limits"""
        with patch('psutil.cpu_percent', return_value=30.0), \
             patch('psutil.virtual_memory') as mock_memory:
            
            mock_memory.return_value.used = 500 * 1024 * 1024  # 500MB
            
            result = await validator._validate_resource_limits()
            
            assert result.check_id == "SP-002"
            assert result.severity == "high"
            assert "Resource violations:" in result.details
    
    @pytest.mark.asyncio
    async def test_cleanup_validation(self, validator):
        """Test sandbox cleanup validation"""
        result = await validator._validate_cleanup()
        
        assert result.check_id == "SP-003"
        assert result.severity == "medium"
        assert "Cleanup issues:" in result.details

class TestAuditTrailValidator:
    """Test AuditTrailValidator functionality"""
    
    @pytest.fixture
    def validator(self):
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = f.name
        
        # Create test audit database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE audit_events (
                id INTEGER PRIMARY KEY,
                timestamp TEXT,
                event_type TEXT,
                details TEXT
            )
        """)
        
        # Insert test data
        test_events = [
            (datetime.now().isoformat(), "user_action", "Test user action"),
            (datetime.now().isoformat(), "system_change", "Test system change"),
            (datetime.now().isoformat(), "security_event", "Test security event"),
            (datetime.now().isoformat(), "performance_alert", "Test performance alert"),
            (datetime.now().isoformat(), "governance_decision", "Test governance decision")
        ]
        
        cursor.executemany(
            "INSERT INTO audit_events (timestamp, event_type, details) VALUES (?, ?, ?)",
            test_events
        )
        
        conn.commit()
        conn.close()
        
        validator = AuditTrailValidator(db_path)
        yield validator
        
        # Cleanup
        Path(db_path).unlink()
        hash_file = Path(db_path + ".hash")
        if hash_file.exists():
            hash_file.unlink()
    
    @pytest.mark.asyncio
    async def test_validate_audit_compliance(self, validator):
        """Test audit compliance validation"""
        results = await validator.validate_audit_compliance()
        
        assert len(results) == 3
        assert all(isinstance(r, ValidationResult) for r in results)
        assert any(r.check_id == "AT-001" for r in results)
        assert any(r.check_id == "AT-002" for r in results)
        assert any(r.check_id == "AT-003" for r in results)
    
    @pytest.mark.asyncio
    async def test_event_logging_validation(self, validator):
        """Test event logging validation"""
        result = await validator._validate_event_logging()
        
        assert result.check_id == "AT-001"
        assert result.severity == "high"
        assert result.passed is True
        assert "Recent events:" in result.details
    
    @pytest.mark.asyncio
    async def test_log_immutability_validation(self, validator):
        """Test log immutability validation"""
        result = await validator._validate_log_immutability()
        
        assert result.check_id == "AT-002"
        assert result.severity == "high"
        assert "Hash verification:" in result.details
    
    @pytest.mark.asyncio
    async def test_user_transparency_validation(self, validator):
        """Test user transparency validation"""
        result = await validator._validate_user_transparency()
        
        assert result.check_id == "AT-003"
        assert result.severity == "medium"
        assert "Transparency features available:" in result.details

class TestGovernanceValidator:
    """Test main GovernanceValidator orchestrator"""
    
    @pytest.fixture
    def validator(self):
        return GovernanceValidator()
    
    @pytest.mark.asyncio
    async def test_run_full_validation(self, validator):
        """Test full validation suite"""
        with patch.object(validator.core_validator, 'validate_local_first', 
                         return_value=[Mock(spec=ValidationResult)]), \
             patch.object(validator.core_validator, 'validate_docker_prohibition',
                         return_value=[Mock(spec=ValidationResult)]), \
             patch.object(validator.performance_validator, 'validate_performance_constraints',
                         return_value=[Mock(spec=ValidationResult)]), \
             patch.object(validator.sandbox_validator, 'validate_sandbox_isolation',
                         return_value=[Mock(spec=ValidationResult)]), \
             patch.object(validator.audit_validator, 'validate_audit_compliance',
                         return_value=[Mock(spec=ValidationResult)]):
            
            results = await validator.run_full_validation()
            
            assert "core_principles" in results
            assert "performance" in results
            assert "sandbox" in results
            assert "audit_trail" in results
            
            assert len(results["core_principles"]) == 2  # local_first + docker
            assert len(results["performance"]) == 1
            assert len(results["sandbox"]) == 1
            assert len(results["audit_trail"]) == 1
    
    def test_generate_validation_report(self, validator):
        """Test validation report generation"""
        # Create mock results
        mock_results = {
            "core_principles": [
                ValidationResult(
                    check_id="LF-001",
                    description="Test check",
                    passed=True,
                    details="Test passed",
                    severity="critical",
                    timestamp=datetime.now()
                ),
                ValidationResult(
                    check_id="LF-002",
                    description="Test check 2",
                    passed=False,
                    details="Test failed",
                    severity="high",
                    timestamp=datetime.now()
                )
            ],
            "performance": [
                ValidationResult(
                    check_id="PC-001",
                    description="Performance test",
                    passed=True,
                    details="Performance OK",
                    severity="medium",
                    timestamp=datetime.now()
                )
            ]
        }
        
        report = validator.generate_validation_report(mock_results)
        
        assert "timestamp" in report
        assert "summary" in report
        assert "categories" in report
        assert "recommendations" in report
        
        assert report["summary"]["total_checks"] == 3
        assert report["summary"]["passed"] == 2
        assert report["summary"]["failed"] == 1
        assert report["summary"]["high_failures"] == 1
        
        assert "core_principles" in report["categories"]
        assert "performance" in report["categories"]

class TestIntegrationScenarios:
    """Integration tests for complete validation scenarios"""
    
    @pytest.mark.asyncio
    async def test_critical_failure_scenario(self):
        """Test scenario with critical failures"""
        validator = GovernanceValidator()
        
        # Mock critical failures
        critical_failure = ValidationResult(
            check_id="LF-001",
            description="Critical test",
            passed=False,
            details="Critical failure",
            severity="critical",
            timestamp=datetime.now()
        )
        
        with patch.object(validator, 'run_full_validation', 
                         return_value={"core_principles": [critical_failure]}):
            
            results = await validator.run_full_validation()
            report = validator.generate_validation_report(results)
            
            assert report["summary"]["critical_failures"] == 1
            assert any("URGENT" in rec for rec in report["recommendations"])
    
    @pytest.mark.asyncio
    async def test_performance_degradation_scenario(self):
        """Test performance degradation detection"""
        validator = PerformanceValidator()
        
        # Mock performance issues
        with patch('time.perf_counter', side_effect=[0, 0.020]):  # 20ms frame time
            result = await validator._validate_frame_timing()
            
            # Should detect frame budget violation
            assert result.check_id == "PC-002"
            assert "compliance" in result.details.lower()
    
    @pytest.mark.asyncio
    async def test_sandbox_security_breach_scenario(self):
        """Test sandbox security breach detection"""
        validator = SandboxValidator()
        
        # Mock security breach
        with patch('pathlib.Path.exists', return_value=True):
            result = await validator._validate_isolation()
            
            assert result.check_id == "SP-001"
            assert result.severity == "critical"

class TestValidationReporting:
    """Test validation reporting and output formats"""
    
    def test_report_json_serialization(self):
        """Test report can be serialized to JSON"""
        validator = GovernanceValidator()
        
        mock_results = {
            "test": [
                ValidationResult(
                    check_id="TEST-001",
                    description="Test",
                    passed=True,
                    details="OK",
                    severity="low",
                    timestamp=datetime.now()
                )
            ]
        }
        
        report = validator.generate_validation_report(mock_results)
        
        # Should be JSON serializable
        json_str = json.dumps(report)
        assert json_str is not None
        
        # Should be deserializable
        parsed = json.loads(json_str)
        assert parsed["summary"]["total_checks"] == 1
    
    def test_compliance_rate_calculation(self):
        """Test compliance rate calculation"""
        validator = GovernanceValidator()
        
        mock_results = {
            "test": [
                ValidationResult("T1", "Test 1", True, "OK", "low", datetime.now()),
                ValidationResult("T2", "Test 2", True, "OK", "low", datetime.now()),
                ValidationResult("T3", "Test 3", False, "FAIL", "medium", datetime.now()),
                ValidationResult("T4", "Test 4", True, "OK", "low", datetime.now())
            ]
        }
        
        report = validator.generate_validation_report(mock_results)
        
        assert report["summary"]["total_checks"] == 4
        assert report["summary"]["passed"] == 3
        assert report["summary"]["failed"] == 1
        
        compliance_rate = report["summary"]["passed"] / report["summary"]["total_checks"]
        assert compliance_rate == 0.75

@pytest.mark.asyncio
async def test_main_execution():
    """Test main execution function"""
    from governance_validator import main
    
    with patch('governance_validator.GovernanceValidator') as mock_validator_class:
        mock_validator = Mock()
        mock_validator_class.return_value = mock_validator
        
        mock_validator.run_full_validation.return_value = {"test": []}
        mock_validator.generate_validation_report.return_value = {
            "summary": {"passed": 5, "total_checks": 5, "critical_failures": 0}
        }
        
        with patch('builtins.open', create=True), \
             patch('json.dump'):
            
            result = await main()
            
            assert result == 0  # Success
            mock_validator.run_full_validation.assert_called_once()
            mock_validator.generate_validation_report.assert_called_once()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
