"""
WF-TECH-006 Security Test Suite
WIRTHFORGE Security & Privacy Implementation Testing

Comprehensive test suite for validating security controls, authentication,
plugin sandboxing, and threat detection mechanisms.

Author: WIRTHFORGE Security Team
Version: 1.0.0
License: MIT
"""

import unittest
import asyncio
import json
import tempfile
import shutil
import socket
import ssl
import subprocess
import time
import requests
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import pytest
import logging

# Import modules under test
from WF_TECH_006_auth_middleware import AuthenticationMiddleware, SessionManager
from WF_TECH_006_network_security import NetworkSecurityManager, TLSCertificateManager
from WF_TECH_006_sandbox_manager import PluginSandboxManager, PluginSecurityValidator

logger = logging.getLogger(__name__)

class TestNetworkSecurity(unittest.TestCase):
    """Test network security controls"""
    
    def setUp(self):
        self.security_manager = NetworkSecurityManager()
        
    def test_localhost_only_validation(self):
        """Test localhost-only binding validation"""
        # Valid localhost addresses
        self.assertTrue(self.security_manager.validate_bind_address("127.0.0.1", 8145))
        self.assertTrue(self.security_manager.validate_bind_address("localhost", 8145))
        self.assertTrue(self.security_manager.validate_bind_address("::1", 8145))
        
        # Invalid external addresses
        self.assertFalse(self.security_manager.validate_bind_address("0.0.0.0", 8145))
        self.assertFalse(self.security_manager.validate_bind_address("192.168.1.1", 8145))
        self.assertFalse(self.security_manager.validate_bind_address("8.8.8.8", 8145))
    
    def test_port_scanning_detection(self):
        """Test port scanning detection"""
        # Simulate multiple connection attempts
        for i in range(15):  # Exceed threshold
            self.security_manager._record_security_event(
                "CONNECTION_ATTEMPT", "192.168.1.100", 8145, {}, "INFO"
            )
        
        events = self.security_manager.monitor_connections()
        scan_events = [e for e in events if e.event_type == "PORT_SCAN_DETECTED"]
        self.assertTrue(len(scan_events) > 0)
    
    def test_tls_certificate_generation(self):
        """Test TLS certificate generation"""
        cert_manager = TLSCertificateManager(self.security_manager.config)
        cert_path, key_path = cert_manager.generate_self_signed_cert()
        
        self.assertTrue(Path(cert_path).exists())
        self.assertTrue(Path(key_path).exists())
        
        # Verify certificate info
        cert_info = cert_manager.get_certificate_info(cert_path)
        self.assertIn("subject", cert_info)
        self.assertFalse(cert_info.get("is_expired", True))

class TestAuthentication(unittest.TestCase):
    """Test authentication and session management"""
    
    def setUp(self):
        self.session_manager = SessionManager()
        self.auth_middleware = AuthenticationMiddleware()
    
    def test_session_token_generation(self):
        """Test secure session token generation"""
        token1 = self.session_manager.generate_session_token()
        token2 = self.session_manager.generate_session_token()
        
        # Tokens should be different
        self.assertNotEqual(token1, token2)
        
        # Tokens should be proper length
        self.assertEqual(len(token1), 64)  # 32 bytes hex encoded
        self.assertEqual(len(token2), 64)
    
    def test_session_validation(self):
        """Test session validation"""
        # Create valid session
        user_id = "test_user"
        token = self.session_manager.create_session(user_id)
        
        # Valid session should authenticate
        session = self.session_manager.validate_session(token)
        self.assertIsNotNone(session)
        self.assertEqual(session.user_id, user_id)
        
        # Invalid token should fail
        invalid_session = self.session_manager.validate_session("invalid_token")
        self.assertIsNone(invalid_session)
    
    def test_csrf_protection(self):
        """Test CSRF token generation and validation"""
        csrf_token = self.auth_middleware.generate_csrf_token()
        
        # Token should be valid
        self.assertTrue(self.auth_middleware.validate_csrf_token(csrf_token))
        
        # Invalid token should fail
        self.assertFalse(self.auth_middleware.validate_csrf_token("invalid_csrf"))
    
    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        client_ip = "127.0.0.1"
        
        # Should allow initial attempts
        for i in range(4):
            self.assertFalse(self.auth_middleware.is_rate_limited(client_ip))
            self.auth_middleware.record_attempt(client_ip)
        
        # Should trigger rate limiting after threshold
        self.auth_middleware.record_attempt(client_ip)
        self.assertTrue(self.auth_middleware.is_rate_limited(client_ip))

class TestPluginSandbox(unittest.TestCase):
    """Test plugin sandboxing and security"""
    
    def setUp(self):
        self.sandbox_manager = PluginSandboxManager()
        self.validator = PluginSecurityValidator()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_plugin_manifest_validation(self):
        """Test plugin manifest validation"""
        # Valid manifest
        valid_manifest = {
            "name": "test_plugin",
            "version": "1.0.0",
            "description": "Test plugin for validation",
            "author": "Test Author",
            "entry_point": "main.py",
            "permissions": {
                "read_events": ["energy.update"],
                "write_events": [],
                "allow_network": False,
                "allow_filesystem": False,
                "max_memory_mb": 64
            }
        }
        
        errors = self.validator.validate_manifest(valid_manifest)
        self.assertEqual(len(errors), 0)
        
        # Invalid manifest (dangerous permissions)
        invalid_manifest = valid_manifest.copy()
        invalid_manifest["permissions"]["allow_network"] = True
        invalid_manifest["permissions"]["allow_filesystem"] = True
        
        errors = self.validator.validate_manifest(invalid_manifest)
        self.assertTrue(len(errors) > 0)
    
    def test_sandbox_isolation(self):
        """Test sandbox environment isolation"""
        from WF_TECH_006_sandbox_manager import SandboxEnvironment, PluginManifest, PluginPermissions
        
        permissions = PluginPermissions(
            max_memory_mb=64,
            max_cpu_percent=10,
            temp_directory_only=True
        )
        
        manifest = PluginManifest(
            name="test_plugin",
            version="1.0.0", 
            description="Test",
            author="Test",
            entry_point="main.py",
            permissions=permissions
        )
        
        sandbox = SandboxEnvironment(manifest)
        sandbox_dir = sandbox.setup_sandbox()
        
        # Verify sandbox directory structure
        self.assertTrue(Path(sandbox_dir).exists())
        self.assertTrue(Path(sandbox_dir, "code").exists())
        self.assertTrue(Path(sandbox_dir, "data").exists())
        
        # Cleanup
        sandbox.cleanup_sandbox()
        self.assertFalse(Path(sandbox_dir).exists())
    
    def test_resource_limits(self):
        """Test plugin resource limit enforcement"""
        # This would require actual process execution in real implementation
        # For now, test the configuration validation
        
        permissions = {
            "max_memory_mb": 1024,  # Too high
            "max_cpu_percent": 100,  # Too high
        }
        
        manifest = {
            "name": "resource_test",
            "version": "1.0.0",
            "description": "Resource test plugin",
            "author": "Test",
            "entry_point": "main.py",
            "permissions": permissions
        }
        
        errors = self.validator.validate_manifest(manifest)
        # Should have errors for excessive resource limits
        self.assertTrue(any("limit too high" in error for error in errors))

class TestSecurityIntegration(unittest.TestCase):
    """Integration tests for security components"""
    
    def setUp(self):
        self.test_port = 8147  # Use different port for testing
        
    def test_secure_server_setup(self):
        """Test complete secure server setup"""
        security_manager = NetworkSecurityManager()
        
        # Setup secure server configuration
        server_config = security_manager.setup_secure_server("127.0.0.1", self.test_port)
        
        self.assertEqual(server_config["host"], "127.0.0.1")
        self.assertEqual(server_config["port"], self.test_port)
        self.assertIn("ssl_context", server_config)
        self.assertTrue(Path(server_config["cert_path"]).exists())
    
    def test_end_to_end_authentication(self):
        """Test complete authentication flow"""
        session_manager = SessionManager()
        auth_middleware = AuthenticationMiddleware()
        
        # Create session
        user_id = "test_user"
        token = session_manager.create_session(user_id)
        
        # Generate CSRF token
        csrf_token = auth_middleware.generate_csrf_token()
        
        # Simulate request validation
        session = session_manager.validate_session(token)
        csrf_valid = auth_middleware.validate_csrf_token(csrf_token)
        
        self.assertIsNotNone(session)
        self.assertTrue(csrf_valid)
        self.assertEqual(session.user_id, user_id)

class TestSecurityValidation(unittest.TestCase):
    """Test security validation and compliance"""
    
    def test_security_policy_schema_validation(self):
        """Test security policy JSON schema validation"""
        # Load schema and test policy
        schema_path = Path("../configs/WF-TECH-006-security-policy-schema.json")
        policy_path = Path("../configs/WF-TECH-006-default-security-policy.json")
        
        if schema_path.exists() and policy_path.exists():
            import jsonschema
            
            with open(schema_path) as f:
                schema = json.load(f)
            
            with open(policy_path) as f:
                policy = json.load(f)
            
            # Should validate without errors
            try:
                jsonschema.validate(policy, schema)
                validation_passed = True
            except jsonschema.ValidationError:
                validation_passed = False
            
            self.assertTrue(validation_passed)
    
    def test_plugin_manifest_schema_validation(self):
        """Test plugin manifest schema validation"""
        schema_path = Path("../configs/WF-TECH-006-plugin-manifest-schema.json")
        
        if schema_path.exists():
            import jsonschema
            
            with open(schema_path) as f:
                schema = json.load(f)
            
            # Test with example from schema
            if "examples" in schema and len(schema["examples"]) > 0:
                example_manifest = schema["examples"][0]
                
                try:
                    jsonschema.validate(example_manifest, schema)
                    validation_passed = True
                except jsonschema.ValidationError:
                    validation_passed = False
                
                self.assertTrue(validation_passed)

class SecurityTestRunner:
    """Main test runner for security validation"""
    
    def __init__(self):
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": [],
            "warnings": []
        }
    
    def run_all_tests(self):
        """Run all security tests"""
        test_classes = [
            TestNetworkSecurity,
            TestAuthentication, 
            TestPluginSandbox,
            TestSecurityIntegration,
            TestSecurityValidation
        ]
        
        for test_class in test_classes:
            self.run_test_class(test_class)
        
        return self.results
    
    def run_test_class(self, test_class):
        """Run tests for a specific class"""
        suite = unittest.TestLoader().loadTestsFromTestCase(test_class)
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        
        self.results["passed"] += result.testsRun - len(result.failures) - len(result.errors)
        self.results["failed"] += len(result.failures) + len(result.errors)
        
        for failure in result.failures:
            self.results["errors"].append(f"FAIL: {failure[0]} - {failure[1]}")
        
        for error in result.errors:
            self.results["errors"].append(f"ERROR: {error[0]} - {error[1]}")
    
    def generate_report(self):
        """Generate security test report"""
        total_tests = self.results["passed"] + self.results["failed"]
        pass_rate = (self.results["passed"] / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_tests": total_tests,
            "passed": self.results["passed"],
            "failed": self.results["failed"],
            "pass_rate": f"{pass_rate:.1f}%",
            "errors": self.results["errors"],
            "warnings": self.results["warnings"],
            "security_status": "PASS" if self.results["failed"] == 0 else "FAIL"
        }
        
        return report

# Performance and load testing
class SecurityPerformanceTests:
    """Performance tests for security components"""
    
    def test_authentication_performance(self):
        """Test authentication performance under load"""
        session_manager = SessionManager()
        
        start_time = time.time()
        
        # Create many sessions
        for i in range(1000):
            token = session_manager.create_session(f"user_{i}")
            session_manager.validate_session(token)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should handle 1000 operations in reasonable time
        self.assertLess(duration, 5.0, "Authentication performance too slow")
        
        return {
            "operations": 1000,
            "duration": duration,
            "ops_per_second": 1000 / duration
        }
    
    def test_sandbox_creation_performance(self):
        """Test sandbox creation performance"""
        sandbox_manager = PluginSandboxManager()
        
        start_time = time.time()
        
        # Create multiple sandbox environments
        sandboxes = []
        for i in range(10):
            from WF_TECH_006_sandbox_manager import SandboxEnvironment, PluginManifest, PluginPermissions
            
            permissions = PluginPermissions()
            manifest = PluginManifest(
                name=f"test_plugin_{i}",
                version="1.0.0",
                description="Performance test",
                author="Test",
                entry_point="main.py",
                permissions=permissions
            )
            
            sandbox = SandboxEnvironment(manifest)
            sandbox_dir = sandbox.setup_sandbox()
            sandboxes.append(sandbox)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Cleanup
        for sandbox in sandboxes:
            sandbox.cleanup_sandbox()
        
        return {
            "sandboxes_created": 10,
            "duration": duration,
            "avg_creation_time": duration / 10
        }

if __name__ == "__main__":
    # Run security tests
    print("Starting WIRTHFORGE Security Test Suite...")
    
    runner = SecurityTestRunner()
    results = runner.run_all_tests()
    report = runner.generate_report()
    
    print(f"\n=== Security Test Report ===")
    print(f"Total Tests: {report['total_tests']}")
    print(f"Passed: {report['passed']}")
    print(f"Failed: {report['failed']}")
    print(f"Pass Rate: {report['pass_rate']}")
    print(f"Security Status: {report['security_status']}")
    
    if report['errors']:
        print(f"\nErrors:")
        for error in report['errors']:
            print(f"  {error}")
    
    # Run performance tests
    print(f"\n=== Performance Tests ===")
    perf_tests = SecurityPerformanceTests()
    
    try:
        auth_perf = perf_tests.test_authentication_performance()
        print(f"Authentication: {auth_perf['ops_per_second']:.1f} ops/sec")
        
        sandbox_perf = perf_tests.test_sandbox_creation_performance()
        print(f"Sandbox Creation: {sandbox_perf['avg_creation_time']:.3f}s avg")
        
    except Exception as e:
        print(f"Performance test error: {e}")
    
    print(f"\nSecurity validation complete.")
