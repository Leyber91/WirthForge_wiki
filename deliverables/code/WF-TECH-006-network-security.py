"""
WF-TECH-006 Network Security Manager
WIRTHFORGE Security & Privacy Implementation

This module enforces localhost-only networking policies and provides network
security monitoring and validation for the WIRTHFORGE system.

Key Features:
- Localhost binding enforcement
- Network interface monitoring
- Firewall rule management
- TLS certificate generation and management
- Network traffic auditing
- Port scanning detection

Author: WIRTHFORGE Security Team
Version: 1.0.0
License: MIT
"""

import socket
import ssl
import subprocess
import platform
import logging
import psutil
import ipaddress
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime, timedelta
import asyncio
import aiofiles
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

logger = logging.getLogger(__name__)

@dataclass
class NetworkSecurityConfig:
    """Configuration for network security policies"""
    # Allowed interfaces
    allowed_hosts: List[str] = None
    allowed_ports: List[int] = None
    
    # TLS settings
    cert_directory: str = None
    cert_validity_days: int = 365
    cert_key_size: int = 4096
    
    # Monitoring settings
    scan_detection_threshold: int = 10
    scan_detection_window_seconds: int = 60
    
    # Firewall settings
    enable_firewall_rules: bool = True
    firewall_rule_name: str = "WIRTHFORGE-Security"
    
    def __post_init__(self):
        if self.allowed_hosts is None:
            self.allowed_hosts = ["127.0.0.1", "localhost", "::1"]
        if self.allowed_ports is None:
            self.allowed_ports = [8145, 8146]  # Main and backup ports
        if self.cert_directory is None:
            self.cert_directory = str(Path.home() / ".wirthforge" / "certs")

@dataclass
class NetworkInterface:
    """Network interface information"""
    name: str
    address: str
    port: int
    protocol: str
    status: str
    process_id: Optional[int] = None
    process_name: Optional[str] = None

@dataclass
class SecurityEvent:
    """Network security event"""
    timestamp: datetime
    event_type: str
    source_ip: str
    target_port: int
    details: Dict[str, Any]
    severity: str = "INFO"

class TLSCertificateManager:
    """Manages TLS certificates for localhost"""
    
    def __init__(self, config: NetworkSecurityConfig):
        self.config = config
        self.cert_dir = Path(config.cert_directory)
        self.cert_dir.mkdir(parents=True, exist_ok=True)
        
    def generate_self_signed_cert(self, hostname: str = "localhost") -> Tuple[str, str]:
        """Generate self-signed certificate for localhost"""
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.config.cert_key_size,
        )
        
        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Local"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "Localhost"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "WIRTHFORGE"),
            x509.NameAttribute(NameOID.COMMON_NAME, hostname),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.utcnow()
        ).not_valid_after(
            datetime.utcnow() + timedelta(days=self.config.cert_validity_days)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.DNSName("127.0.0.1"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                x509.IPAddress(ipaddress.IPv6Address("::1")),
            ]),
            critical=False,
        ).add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=True,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                content_commitment=False,
                data_encipherment=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        ).add_extension(
            x509.ExtendedKeyUsage([
                x509.oid.ExtendedKeyUsageOID.SERVER_AUTH,
            ]),
            critical=True,
        ).sign(private_key, hashes.SHA256())
        
        # Save certificate and key
        cert_path = self.cert_dir / f"{hostname}.crt"
        key_path = self.cert_dir / f"{hostname}.key"
        
        with open(cert_path, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        with open(key_path, "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
        
        # Set restrictive permissions
        cert_path.chmod(0o644)
        key_path.chmod(0o600)
        
        logger.info(f"Generated TLS certificate: {cert_path}")
        return str(cert_path), str(key_path)
    
    def get_certificate_info(self, cert_path: str) -> Dict[str, Any]:
        """Get certificate information"""
        try:
            with open(cert_path, "rb") as f:
                cert_data = f.read()
            
            cert = x509.load_pem_x509_certificate(cert_data)
            
            return {
                "subject": cert.subject.rfc4514_string(),
                "issuer": cert.issuer.rfc4514_string(),
                "serial_number": str(cert.serial_number),
                "not_valid_before": cert.not_valid_before.isoformat(),
                "not_valid_after": cert.not_valid_after.isoformat(),
                "is_expired": cert.not_valid_after < datetime.utcnow(),
                "days_until_expiry": (cert.not_valid_after - datetime.utcnow()).days
            }
        except Exception as e:
            logger.error(f"Error reading certificate {cert_path}: {e}")
            return {}
    
    def ensure_certificates_exist(self) -> Tuple[str, str]:
        """Ensure certificates exist, generate if missing"""
        cert_path = self.cert_dir / "localhost.crt"
        key_path = self.cert_dir / "localhost.key"
        
        # Check if certificates exist and are valid
        if cert_path.exists() and key_path.exists():
            cert_info = self.get_certificate_info(str(cert_path))
            if cert_info and not cert_info.get("is_expired", True):
                if cert_info.get("days_until_expiry", 0) > 30:  # Renew if < 30 days
                    return str(cert_path), str(key_path)
        
        # Generate new certificates
        logger.info("Generating new TLS certificates")
        return self.generate_self_signed_cert()

class FirewallManager:
    """Manages firewall rules for network security"""
    
    def __init__(self, config: NetworkSecurityConfig):
        self.config = config
        self.system = platform.system()
        
    def add_localhost_only_rule(self, port: int) -> bool:
        """Add firewall rule to block external access to port"""
        try:
            if self.system == "Windows":
                return self._add_windows_rule(port)
            elif self.system == "Linux":
                return self._add_linux_rule(port)
            elif self.system == "Darwin":  # macOS
                return self._add_macos_rule(port)
            else:
                logger.warning(f"Firewall rules not supported on {self.system}")
                return False
        except Exception as e:
            logger.error(f"Failed to add firewall rule for port {port}: {e}")
            return False
    
    def _add_windows_rule(self, port: int) -> bool:
        """Add Windows firewall rule"""
        rule_name = f"{self.config.firewall_rule_name}-Block-{port}"
        
        # Remove existing rule if present
        subprocess.run([
            "netsh", "advfirewall", "firewall", "delete", "rule",
            f"name={rule_name}"
        ], capture_output=True)
        
        # Add new rule to block external access
        cmd = [
            "netsh", "advfirewall", "firewall", "add", "rule",
            f"name={rule_name}",
            "dir=in", "action=block", "protocol=TCP",
            f"localport={port}",
            "remoteip=!127.0.0.1,!::1"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        success = result.returncode == 0
        
        if success:
            logger.info(f"Added Windows firewall rule for port {port}")
        else:
            logger.error(f"Failed to add Windows firewall rule: {result.stderr}")
        
        return success
    
    def _add_linux_rule(self, port: int) -> bool:
        """Add Linux iptables rule"""
        # Check if iptables is available
        if not self._command_exists("iptables"):
            logger.warning("iptables not available")
            return False
        
        # Add rule to drop external connections
        cmd = [
            "iptables", "-A", "INPUT",
            "-p", "tcp", "--dport", str(port),
            "!", "-s", "127.0.0.1",
            "-j", "DROP"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        success = result.returncode == 0
        
        if success:
            logger.info(f"Added Linux iptables rule for port {port}")
        else:
            logger.error(f"Failed to add iptables rule: {result.stderr}")
        
        return success
    
    def _add_macos_rule(self, port: int) -> bool:
        """Add macOS pfctl rule"""
        # macOS firewall rules are more complex, log for manual setup
        logger.info(f"macOS detected. Manual firewall setup recommended for port {port}")
        logger.info(f"Consider: sudo pfctl -f /etc/pf.conf")
        return True  # Don't fail on macOS
    
    def _command_exists(self, command: str) -> bool:
        """Check if command exists in PATH"""
        try:
            subprocess.run([command, "--version"], capture_output=True)
            return True
        except FileNotFoundError:
            return False
    
    def remove_rules(self) -> bool:
        """Remove all WIRTHFORGE firewall rules"""
        try:
            if self.system == "Windows":
                for port in self.config.allowed_ports:
                    rule_name = f"{self.config.firewall_rule_name}-Block-{port}"
                    subprocess.run([
                        "netsh", "advfirewall", "firewall", "delete", "rule",
                        f"name={rule_name}"
                    ], capture_output=True)
                return True
            elif self.system == "Linux":
                # Remove iptables rules (simplified)
                subprocess.run(["iptables", "-F"], capture_output=True)
                return True
            return True
        except Exception as e:
            logger.error(f"Failed to remove firewall rules: {e}")
            return False

class NetworkSecurityManager:
    """Main network security manager"""
    
    def __init__(self, config: NetworkSecurityConfig = None):
        self.config = config or NetworkSecurityConfig()
        self.cert_manager = TLSCertificateManager(self.config)
        self.firewall_manager = FirewallManager(self.config)
        self.security_events: List[SecurityEvent] = []
        self.connection_attempts = {}
        
    def validate_bind_address(self, host: str, port: int) -> bool:
        """Validate that bind address is localhost only"""
        if host not in self.config.allowed_hosts:
            logger.error(f"Attempted bind to non-localhost address: {host}")
            self._record_security_event(
                "INVALID_BIND_ATTEMPT",
                "unknown",
                port,
                {"attempted_host": host},
                "ERROR"
            )
            return False
        
        if port not in self.config.allowed_ports:
            logger.warning(f"Binding to non-standard port: {port}")
            self._record_security_event(
                "NON_STANDARD_PORT",
                host,
                port,
                {"port": port},
                "WARNING"
            )
        
        # Test actual binding
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((host, port))
            sock.close()
            
            logger.info(f"Successfully validated bind to {host}:{port}")
            return True
            
        except OSError as e:
            logger.error(f"Failed to bind to {host}:{port} - {e}")
            self._record_security_event(
                "BIND_FAILURE",
                host,
                port,
                {"error": str(e)},
                "ERROR"
            )
            return False
    
    def scan_open_ports(self) -> Dict[str, Any]:
        """Audit currently open ports for security review"""
        try:
            connections = psutil.net_connections(kind='inet')
            
            localhost_ports = []
            external_ports = []
            
            for conn in connections:
                if conn.laddr:
                    port_info = {
                        'address': conn.laddr.ip,
                        'port': conn.laddr.port,
                        'status': conn.status,
                        'pid': conn.pid,
                        'process_name': None
                    }
                    
                    # Get process name if available
                    if conn.pid:
                        try:
                            process = psutil.Process(conn.pid)
                            port_info['process_name'] = process.name()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass
                    
                    if conn.laddr.ip in self.config.allowed_hosts:
                        localhost_ports.append(port_info)
                    else:
                        external_ports.append(port_info)
                        # Log potential security issue
                        self._record_security_event(
                            "EXTERNAL_PORT_DETECTED",
                            conn.laddr.ip,
                            conn.laddr.port,
                            port_info,
                            "WARNING"
                        )
            
            return {
                'localhost_ports': localhost_ports,
                'external_ports': external_ports,
                'total_connections': len(connections),
                'scan_timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error scanning ports: {e}")
            return {'error': str(e)}
    
    def setup_secure_server(self, host: str = "127.0.0.1", port: int = 8145) -> Dict[str, Any]:
        """Setup secure server with TLS and firewall rules"""
        # Validate bind address
        if not self.validate_bind_address(host, port):
            raise ValueError(f"Invalid bind address: {host}:{port}")
        
        # Generate/ensure certificates
        cert_path, key_path = self.cert_manager.ensure_certificates_exist()
        
        # Setup firewall rules
        if self.config.enable_firewall_rules:
            self.firewall_manager.add_localhost_only_rule(port)
        
        # Create SSL context
        ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        ssl_context.load_cert_chain(cert_path, key_path)
        
        # Configure secure ciphers
        ssl_context.set_ciphers('ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS')
        ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
        
        logger.info(f"Configured secure server for {host}:{port}")
        
        return {
            'host': host,
            'port': port,
            'cert_path': cert_path,
            'key_path': key_path,
            'ssl_context': ssl_context,
            'firewall_configured': self.config.enable_firewall_rules
        }
    
    def monitor_connections(self) -> List[SecurityEvent]:
        """Monitor for suspicious connection attempts"""
        current_time = datetime.utcnow()
        
        # Clean old events
        cutoff_time = current_time - timedelta(seconds=self.config.scan_detection_window_seconds)
        self.security_events = [
            event for event in self.security_events
            if event.timestamp > cutoff_time
        ]
        
        # Check for port scanning
        connection_counts = {}
        for event in self.security_events:
            if event.event_type in ["CONNECTION_ATTEMPT", "INVALID_BIND_ATTEMPT"]:
                source = event.source_ip
                connection_counts[source] = connection_counts.get(source, 0) + 1
        
        # Detect scanning attempts
        scanning_ips = [
            ip for ip, count in connection_counts.items()
            if count > self.config.scan_detection_threshold
        ]
        
        for ip in scanning_ips:
            self._record_security_event(
                "PORT_SCAN_DETECTED",
                ip,
                0,
                {"connection_count": connection_counts[ip]},
                "CRITICAL"
            )
        
        return [event for event in self.security_events if event.severity in ["WARNING", "ERROR", "CRITICAL"]]
    
    def _record_security_event(self, event_type: str, source_ip: str, port: int, 
                              details: Dict[str, Any], severity: str = "INFO"):
        """Record security event"""
        event = SecurityEvent(
            timestamp=datetime.utcnow(),
            event_type=event_type,
            source_ip=source_ip,
            target_port=port,
            details=details,
            severity=severity
        )
        
        self.security_events.append(event)
        
        # Log based on severity
        log_msg = f"Security event: {event_type} from {source_ip}:{port}"
        if severity == "CRITICAL":
            logger.critical(log_msg, extra=asdict(event))
        elif severity == "ERROR":
            logger.error(log_msg, extra=asdict(event))
        elif severity == "WARNING":
            logger.warning(log_msg, extra=asdict(event))
        else:
            logger.info(log_msg, extra=asdict(event))
    
    def get_security_status(self) -> Dict[str, Any]:
        """Get comprehensive security status"""
        port_scan = self.scan_open_ports()
        recent_events = self.monitor_connections()
        
        # Certificate status
        cert_path = Path(self.config.cert_directory) / "localhost.crt"
        cert_info = {}
        if cert_path.exists():
            cert_info = self.cert_manager.get_certificate_info(str(cert_path))
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'localhost_ports': port_scan.get('localhost_ports', []),
            'external_ports': port_scan.get('external_ports', []),
            'recent_security_events': [asdict(event) for event in recent_events[-10:]],
            'certificate_info': cert_info,
            'firewall_enabled': self.config.enable_firewall_rules,
            'security_level': self._calculate_security_level(port_scan, recent_events)
        }
    
    def _calculate_security_level(self, port_scan: Dict, events: List[SecurityEvent]) -> str:
        """Calculate overall security level"""
        issues = 0
        
        # Check for external ports
        if port_scan.get('external_ports'):
            issues += len(port_scan['external_ports'])
        
        # Check for critical events
        critical_events = [e for e in events if e.severity == "CRITICAL"]
        if critical_events:
            issues += len(critical_events) * 2
        
        # Check for error events
        error_events = [e for e in events if e.severity == "ERROR"]
        if error_events:
            issues += len(error_events)
        
        if issues == 0:
            return "SECURE"
        elif issues <= 2:
            return "MONITORING"
        elif issues <= 5:
            return "CAUTION"
        else:
            return "ALERT"

# Utility functions
async def setup_network_security(host: str = "127.0.0.1", port: int = 8145) -> NetworkSecurityManager:
    """Setup network security for WIRTHFORGE"""
    config = NetworkSecurityConfig()
    manager = NetworkSecurityManager(config)
    
    # Setup secure server
    server_config = manager.setup_secure_server(host, port)
    
    logger.info("Network security initialized")
    return manager

def validate_localhost_only(host: str, port: int) -> bool:
    """Quick validation that address is localhost only"""
    localhost_addresses = ["127.0.0.1", "localhost", "::1"]
    return host in localhost_addresses

# Example usage
if __name__ == "__main__":
    # Demo network security setup
    async def demo():
        manager = await setup_network_security()
        
        # Test validation
        print(f"Localhost validation: {manager.validate_bind_address('127.0.0.1', 8145)}")
        print(f"External validation: {manager.validate_bind_address('0.0.0.0', 8145)}")
        
        # Port scan
        ports = manager.scan_open_ports()
        print(f"Open localhost ports: {len(ports.get('localhost_ports', []))}")
        
        # Security status
        status = manager.get_security_status()
        print(f"Security level: {status['security_level']}")
    
    asyncio.run(demo())
