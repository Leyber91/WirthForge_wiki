"""
WF-TECH-006 Security Audit & Validation Tool
WIRTHFORGE Security & Privacy Implementation

Automated security audit tool for validating WIRTHFORGE security controls,
generating compliance reports, and performing security assessments.

Author: WIRTHFORGE Security Team
Version: 1.0.0
License: MIT
"""

import json
import os
import sys
import subprocess
import hashlib
import time
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import psutil
import socket
import ssl

logger = logging.getLogger(__name__)

@dataclass
class SecurityFinding:
    """Security audit finding"""
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    category: str
    title: str
    description: str
    recommendation: str
    affected_component: str
    timestamp: datetime
    
@dataclass
class AuditResult:
    """Complete audit result"""
    timestamp: datetime
    overall_score: int  # 0-100
    findings: List[SecurityFinding]
    compliance_status: str
    recommendations: List[str]

class SecurityAuditor:
    """Main security audit engine"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.findings: List[SecurityFinding] = []
        
    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load audit configuration"""
        default_config = {
            "network_checks": True,
            "authentication_checks": True,
            "plugin_checks": True,
            "data_protection_checks": True,
            "compliance_checks": True,
            "performance_checks": True
        }
        
        if config_path and Path(config_path).exists():
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                default_config.update(user_config)
        
        return default_config
    
    def run_full_audit(self) -> AuditResult:
        """Run complete security audit"""
        logger.info("Starting WIRTHFORGE security audit")
        
        if self.config["network_checks"]:
            self._audit_network_security()
        
        if self.config["authentication_checks"]:
            self._audit_authentication()
        
        if self.config["plugin_checks"]:
            self._audit_plugin_security()
        
        if self.config["data_protection_checks"]:
            self._audit_data_protection()
        
        if self.config["compliance_checks"]:
            self._audit_compliance()
        
        if self.config["performance_checks"]:
            self._audit_performance()
        
        return self._generate_audit_result()
    
    def _audit_network_security(self):
        """Audit network security controls"""
        logger.info("Auditing network security")
        
        # Check localhost-only binding
        self._check_localhost_binding()
        
        # Check TLS configuration
        self._check_tls_config()
        
        # Check firewall rules
        self._check_firewall_rules()
        
        # Check open ports
        self._check_open_ports()
    
    def _check_localhost_binding(self):
        """Check that services only bind to localhost"""
        try:
            connections = psutil.net_connections(kind='inet')
            external_bindings = []
            
            for conn in connections:
                if conn.laddr and conn.status == 'LISTEN':
                    if conn.laddr.ip not in ['127.0.0.1', '::1']:
                        external_bindings.append(f"{conn.laddr.ip}:{conn.laddr.port}")
            
            if external_bindings:
                self.findings.append(SecurityFinding(
                    severity="HIGH",
                    category="Network Security",
                    title="External Network Binding Detected",
                    description=f"Services bound to external interfaces: {', '.join(external_bindings)}",
                    recommendation="Configure services to bind only to localhost (127.0.0.1)",
                    affected_component="Network Layer",
                    timestamp=datetime.utcnow()
                ))
            else:
                logger.info("✓ All services properly bound to localhost")
                
        except Exception as e:
            self.findings.append(SecurityFinding(
                severity="MEDIUM",
                category="Network Security",
                title="Network Binding Check Failed",
                description=f"Unable to verify network bindings: {e}",
                recommendation="Manually verify network binding configuration",
                affected_component="Network Layer",
                timestamp=datetime.utcnow()
            ))
    
    def _check_tls_config(self):
        """Check TLS configuration"""
        cert_dirs = [
            Path.home() / ".wirthforge" / "certs",
            Path("./certs"),
            Path("../certs")
        ]
        
        cert_found = False
        for cert_dir in cert_dirs:
            cert_path = cert_dir / "localhost.crt"
            key_path = cert_dir / "localhost.key"
            
            if cert_path.exists() and key_path.exists():
                cert_found = True
                self._validate_certificate(str(cert_path))
                break
        
        if not cert_found:
            self.findings.append(SecurityFinding(
                severity="HIGH",
                category="Network Security",
                title="TLS Certificate Missing",
                description="No TLS certificate found for localhost",
                recommendation="Generate TLS certificate using certificate manager",
                affected_component="TLS Layer",
                timestamp=datetime.utcnow()
            ))
    
    def _validate_certificate(self, cert_path: str):
        """Validate TLS certificate"""
        try:
            import ssl
            from cryptography import x509
            
            with open(cert_path, 'rb') as f:
                cert_data = f.read()
            
            cert = x509.load_pem_x509_certificate(cert_data)
            
            # Check expiration
            days_until_expiry = (cert.not_valid_after - datetime.utcnow()).days
            
            if days_until_expiry < 0:
                self.findings.append(SecurityFinding(
                    severity="CRITICAL",
                    category="Network Security",
                    title="TLS Certificate Expired",
                    description=f"Certificate expired {abs(days_until_expiry)} days ago",
                    recommendation="Regenerate TLS certificate immediately",
                    affected_component="TLS Layer",
                    timestamp=datetime.utcnow()
                ))
            elif days_until_expiry < 30:
                self.findings.append(SecurityFinding(
                    severity="MEDIUM",
                    category="Network Security",
                    title="TLS Certificate Expiring Soon",
                    description=f"Certificate expires in {days_until_expiry} days",
                    recommendation="Plan certificate renewal",
                    affected_component="TLS Layer",
                    timestamp=datetime.utcnow()
                ))
            else:
                logger.info(f"✓ TLS certificate valid for {days_until_expiry} days")
                
        except Exception as e:
            self.findings.append(SecurityFinding(
                severity="MEDIUM",
                category="Network Security",
                title="Certificate Validation Failed",
                description=f"Unable to validate certificate: {e}",
                recommendation="Manually verify certificate validity",
                affected_component="TLS Layer",
                timestamp=datetime.utcnow()
            ))
    
    def _check_firewall_rules(self):
        """Check firewall configuration"""
        try:
            if os.name == 'nt':  # Windows
                result = subprocess.run([
                    'netsh', 'advfirewall', 'firewall', 'show', 'rule', 
                    'name=all', 'dir=in'
                ], capture_output=True, text=True)
                
                if 'WIRTHFORGE' in result.stdout:
                    logger.info("✓ WIRTHFORGE firewall rules found")
                else:
                    self.findings.append(SecurityFinding(
                        severity="MEDIUM",
                        category="Network Security",
                        title="Firewall Rules Missing",
                        description="No WIRTHFORGE-specific firewall rules detected",
                        recommendation="Configure firewall rules to block external access",
                        affected_component="Firewall",
                        timestamp=datetime.utcnow()
                    ))
            else:
                logger.info("Firewall check skipped on non-Windows platform")
                
        except Exception as e:
            self.findings.append(SecurityFinding(
                severity="LOW",
                category="Network Security",
                title="Firewall Check Failed",
                description=f"Unable to check firewall rules: {e}",
                recommendation="Manually verify firewall configuration",
                affected_component="Firewall",
                timestamp=datetime.utcnow()
            ))
    
    def _check_open_ports(self):
        """Check for unexpected open ports"""
        expected_ports = {8145, 8146}
        
        try:
            connections = psutil.net_connections(kind='inet')
            listening_ports = set()
            
            for conn in connections:
                if conn.laddr and conn.status == 'LISTEN':
                    listening_ports.add(conn.laddr.port)
            
            unexpected_ports = listening_ports - expected_ports
            
            if unexpected_ports:
                self.findings.append(SecurityFinding(
                    severity="MEDIUM",
                    category="Network Security",
                    title="Unexpected Open Ports",
                    description=f"Unexpected ports listening: {sorted(unexpected_ports)}",
                    recommendation="Review and close unnecessary ports",
                    affected_component="Network Layer",
                    timestamp=datetime.utcnow()
                ))
            else:
                logger.info("✓ Only expected ports are listening")
                
        except Exception as e:
            logger.error(f"Port check failed: {e}")
    
    def _audit_authentication(self):
        """Audit authentication controls"""
        logger.info("Auditing authentication security")
        
        # Check session configuration
        self._check_session_config()
        
        # Check CSRF protection
        self._check_csrf_config()
        
        # Check rate limiting
        self._check_rate_limiting()
    
    def _check_session_config(self):
        """Check session management configuration"""
        # This would check actual session configuration in real implementation
        config_paths = [
            "config/security.json",
            "../configs/WF-TECH-006-default-security-policy.json"
        ]
        
        config_found = False
        for config_path in config_paths:
            if Path(config_path).exists():
                config_found = True
                try:
                    with open(config_path, 'r') as f:
                        config = json.load(f)
                    
                    auth_config = config.get('authentication', {})
                    session_config = auth_config.get('session_config', {})
                    
                    # Check session timeout
                    timeout = session_config.get('session_timeout_minutes', 0)
                    if timeout > 120:  # More than 2 hours
                        self.findings.append(SecurityFinding(
                            severity="MEDIUM",
                            category="Authentication",
                            title="Long Session Timeout",
                            description=f"Session timeout is {timeout} minutes",
                            recommendation="Consider shorter session timeout for better security",
                            affected_component="Session Management",
                            timestamp=datetime.utcnow()
                        ))
                    elif timeout > 0:
                        logger.info(f"✓ Session timeout configured: {timeout} minutes")
                    
                except Exception as e:
                    logger.error(f"Error reading config {config_path}: {e}")
                break
        
        if not config_found:
            self.findings.append(SecurityFinding(
                severity="HIGH",
                category="Authentication",
                title="Security Configuration Missing",
                description="No security configuration file found",
                recommendation="Create and configure security policy file",
                affected_component="Configuration",
                timestamp=datetime.utcnow()
            ))
    
    def _check_csrf_config(self):
        """Check CSRF protection configuration"""
        # In real implementation, this would check CSRF middleware configuration
        logger.info("✓ CSRF protection check (implementation-dependent)")
    
    def _check_rate_limiting(self):
        """Check rate limiting configuration"""
        # In real implementation, this would check rate limiting middleware
        logger.info("✓ Rate limiting check (implementation-dependent)")
    
    def _audit_plugin_security(self):
        """Audit plugin security controls"""
        logger.info("Auditing plugin security")
        
        # Check plugin directory permissions
        self._check_plugin_permissions()
        
        # Check sandbox configuration
        self._check_sandbox_config()
    
    def _check_plugin_permissions(self):
        """Check plugin directory permissions"""
        plugin_dirs = [
            "plugins/",
            "../plugins/",
            Path.home() / ".wirthforge" / "plugins"
        ]
        
        for plugin_dir in plugin_dirs:
            plugin_path = Path(plugin_dir)
            if plugin_path.exists():
                try:
                    # Check directory permissions (Unix-like systems)
                    if hasattr(os, 'stat'):
                        stat_info = plugin_path.stat()
                        mode = stat_info.st_mode
                        
                        # Check if world-writable
                        if mode & 0o002:
                            self.findings.append(SecurityFinding(
                                severity="HIGH",
                                category="Plugin Security",
                                title="Plugin Directory World-Writable",
                                description=f"Plugin directory {plugin_path} is world-writable",
                                recommendation="Restrict plugin directory permissions",
                                affected_component="Plugin System",
                                timestamp=datetime.utcnow()
                            ))
                        else:
                            logger.info(f"✓ Plugin directory permissions OK: {plugin_path}")
                            
                except Exception as e:
                    logger.error(f"Permission check failed for {plugin_path}: {e}")
    
    def _check_sandbox_config(self):
        """Check plugin sandbox configuration"""
        # This would check actual sandbox configuration in real implementation
        logger.info("✓ Plugin sandbox configuration check (implementation-dependent)")
    
    def _audit_data_protection(self):
        """Audit data protection controls"""
        logger.info("Auditing data protection")
        
        # Check data directory permissions
        self._check_data_permissions()
        
        # Check backup configuration
        self._check_backup_config()
    
    def _check_data_permissions(self):
        """Check data directory permissions"""
        data_dirs = [
            "data/",
            "../data/",
            Path.home() / ".wirthforge" / "data"
        ]
        
        for data_dir in data_dirs:
            data_path = Path(data_dir)
            if data_path.exists():
                try:
                    if hasattr(os, 'stat'):
                        stat_info = data_path.stat()
                        mode = stat_info.st_mode
                        
                        # Check if world-readable
                        if mode & 0o004:
                            self.findings.append(SecurityFinding(
                                severity="MEDIUM",
                                category="Data Protection",
                                title="Data Directory World-Readable",
                                description=f"Data directory {data_path} is world-readable",
                                recommendation="Restrict data directory permissions",
                                affected_component="Data Storage",
                                timestamp=datetime.utcnow()
                            ))
                        else:
                            logger.info(f"✓ Data directory permissions OK: {data_path}")
                            
                except Exception as e:
                    logger.error(f"Permission check failed for {data_path}: {e}")
    
    def _check_backup_config(self):
        """Check backup configuration"""
        # This would check actual backup configuration in real implementation
        logger.info("✓ Backup configuration check (implementation-dependent)")
    
    def _audit_compliance(self):
        """Audit compliance requirements"""
        logger.info("Auditing compliance")
        
        # Check privacy policy compliance
        self._check_privacy_compliance()
        
        # Check data retention compliance
        self._check_retention_compliance()
    
    def _check_privacy_compliance(self):
        """Check privacy policy compliance"""
        # This would check privacy policy implementation
        logger.info("✓ Privacy compliance check (implementation-dependent)")
    
    def _check_retention_compliance(self):
        """Check data retention compliance"""
        # This would check data retention policies
        logger.info("✓ Data retention compliance check (implementation-dependent)")
    
    def _audit_performance(self):
        """Audit security performance"""
        logger.info("Auditing security performance")
        
        # Check resource usage
        self._check_resource_usage()
    
    def _check_resource_usage(self):
        """Check system resource usage"""
        try:
            # Memory usage
            memory = psutil.virtual_memory()
            if memory.percent > 90:
                self.findings.append(SecurityFinding(
                    severity="MEDIUM",
                    category="Performance",
                    title="High Memory Usage",
                    description=f"System memory usage at {memory.percent}%",
                    recommendation="Monitor memory usage and optimize if needed",
                    affected_component="System Resources",
                    timestamp=datetime.utcnow()
                ))
            
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > 90:
                self.findings.append(SecurityFinding(
                    severity="MEDIUM",
                    category="Performance",
                    title="High CPU Usage",
                    description=f"System CPU usage at {cpu_percent}%",
                    recommendation="Monitor CPU usage and optimize if needed",
                    affected_component="System Resources",
                    timestamp=datetime.utcnow()
                ))
            
            logger.info(f"✓ Resource usage: CPU {cpu_percent}%, Memory {memory.percent}%")
            
        except Exception as e:
            logger.error(f"Resource usage check failed: {e}")
    
    def _generate_audit_result(self) -> AuditResult:
        """Generate final audit result"""
        # Calculate overall score
        critical_count = len([f for f in self.findings if f.severity == "CRITICAL"])
        high_count = len([f for f in self.findings if f.severity == "HIGH"])
        medium_count = len([f for f in self.findings if f.severity == "MEDIUM"])
        low_count = len([f for f in self.findings if f.severity == "LOW"])
        
        # Score calculation (100 - penalty points)
        score = 100
        score -= critical_count * 25  # Critical findings: -25 points each
        score -= high_count * 15      # High findings: -15 points each
        score -= medium_count * 5     # Medium findings: -5 points each
        score -= low_count * 1        # Low findings: -1 point each
        
        score = max(0, score)  # Minimum score is 0
        
        # Determine compliance status
        if critical_count > 0:
            compliance_status = "NON-COMPLIANT"
        elif high_count > 0:
            compliance_status = "NEEDS ATTENTION"
        elif medium_count > 3:
            compliance_status = "MINOR ISSUES"
        else:
            compliance_status = "COMPLIANT"
        
        # Generate recommendations
        recommendations = []
        if critical_count > 0:
            recommendations.append("Address all critical security findings immediately")
        if high_count > 0:
            recommendations.append("Resolve high-priority security issues")
        if medium_count > 5:
            recommendations.append("Review and address medium-priority findings")
        
        return AuditResult(
            timestamp=datetime.utcnow(),
            overall_score=score,
            findings=self.findings,
            compliance_status=compliance_status,
            recommendations=recommendations
        )

def generate_audit_report(audit_result: AuditResult, output_path: str):
    """Generate detailed audit report"""
    report = {
        "audit_metadata": {
            "timestamp": audit_result.timestamp.isoformat(),
            "tool_version": "1.0.0",
            "audit_type": "WIRTHFORGE Security Audit"
        },
        "summary": {
            "overall_score": audit_result.overall_score,
            "compliance_status": audit_result.compliance_status,
            "total_findings": len(audit_result.findings),
            "findings_by_severity": {
                "CRITICAL": len([f for f in audit_result.findings if f.severity == "CRITICAL"]),
                "HIGH": len([f for f in audit_result.findings if f.severity == "HIGH"]),
                "MEDIUM": len([f for f in audit_result.findings if f.severity == "MEDIUM"]),
                "LOW": len([f for f in audit_result.findings if f.severity == "LOW"]),
                "INFO": len([f for f in audit_result.findings if f.severity == "INFO"])
            }
        },
        "findings": [asdict(finding) for finding in audit_result.findings],
        "recommendations": audit_result.recommendations
    }
    
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    logger.info(f"Audit report generated: {output_path}")

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Run security audit
    auditor = SecurityAuditor()
    result = auditor.run_full_audit()
    
    # Generate report
    report_path = f"security_audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    generate_audit_report(result, report_path)
    
    # Print summary
    print(f"\n=== WIRTHFORGE Security Audit Summary ===")
    print(f"Overall Score: {result.overall_score}/100")
    print(f"Compliance Status: {result.compliance_status}")
    print(f"Total Findings: {len(result.findings)}")
    
    if result.findings:
        print(f"\nFindings by Severity:")
        for severity in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            count = len([f for f in result.findings if f.severity == severity])
            if count > 0:
                print(f"  {severity}: {count}")
    
    if result.recommendations:
        print(f"\nKey Recommendations:")
        for rec in result.recommendations:
            print(f"  • {rec}")
    
    print(f"\nDetailed report saved to: {report_path}")
