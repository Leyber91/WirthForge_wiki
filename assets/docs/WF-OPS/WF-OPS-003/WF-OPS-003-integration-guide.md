# WF-OPS-003 Integration Guide
## Backup, Recovery & Data Management System

**Version:** 1.0.0  
**Last Updated:** 2025-01-19  
**Component:** WF-OPS-003  

---

## Overview

This integration guide provides comprehensive instructions for deploying, configuring, and integrating the WF-OPS-003 Backup, Recovery & Data Management system with the broader WirthForge ecosystem, specifically WF-OPS-001 (Deployment & Installation) and WF-OPS-002 (Monitoring & Performance).

### Key Integration Points

- **WF-OPS-001**: Service management, installation procedures, and deployment coordination
- **WF-OPS-002**: Energy-aware scheduling, performance monitoring, and health signal integration
- **Local-First Architecture**: Native filesystem operations with no external dependencies
- **Privacy-Preserving Design**: Optional encrypted exports with explicit user consent

---

## Prerequisites

### System Requirements

```bash
# Python Environment
Python >= 3.8
pip >= 21.0

# Required Libraries
cryptography >= 3.4.8
psutil >= 5.8.0
tkinter (included with Python)

# System Resources
Minimum 1GB available disk space
Minimum 512MB available RAM
SQLite support (included with Python)
```

### WF-OPS-001 Integration Requirements

```json
{
  "service_name": "wf-ops-003-backup",
  "service_type": "system_service",
  "dependencies": ["wf-ops-002-monitoring"],
  "installation_method": "native_python",
  "configuration_files": [
    "backup_config.json",
    "retention_policy.json",
    "encryption_settings.json"
  ]
}
```

### WF-OPS-002 Integration Requirements

```json
{
  "monitoring_endpoints": [
    "/health/backup-engine",
    "/health/recovery-engine", 
    "/health/audit-system"
  ],
  "metrics_collection": [
    "backup_performance",
    "recovery_performance",
    "frame_budget_compliance",
    "integrity_verification_status"
  ],
  "energy_awareness": true
}
```

---

## Installation Procedure

### Step 1: WF-OPS-001 Service Registration

```python
# Register with WF-OPS-001 deployment system
from wf_ops_001 import ServiceManager

service_config = {
    "service_id": "wf-ops-003",
    "service_name": "Backup & Recovery System",
    "version": "1.0.0",
    "dependencies": ["wf-ops-002"],
    "installation_path": "/opt/wirthforge/wf-ops-003",
    "configuration_path": "/etc/wirthforge/wf-ops-003",
    "data_path": "/var/lib/wirthforge/wf-ops-003"
}

service_manager = ServiceManager()
service_manager.register_service(service_config)
```

### Step 2: Directory Structure Setup

```bash
# Create directory structure
mkdir -p /opt/wirthforge/wf-ops-003/{code,schemas,tests}
mkdir -p /etc/wirthforge/wf-ops-003
mkdir -p /var/lib/wirthforge/wf-ops-003/{backups,audit,temp}
mkdir -p /var/log/wirthforge/wf-ops-003

# Set permissions
chown -R wirthforge:wirthforge /opt/wirthforge/wf-ops-003
chown -R wirthforge:wirthforge /etc/wirthforge/wf-ops-003
chown -R wirthforge:wirthforge /var/lib/wirthforge/wf-ops-003
chown -R wirthforge:wirthforge /var/log/wirthforge/wf-ops-003

chmod 755 /opt/wirthforge/wf-ops-003
chmod 750 /etc/wirthforge/wf-ops-003
chmod 750 /var/lib/wirthforge/wf-ops-003
```

### Step 3: Code Deployment

```bash
# Deploy code modules
cp assets/code/WF-OPS/WF-OPS-003/*.py /opt/wirthforge/wf-ops-003/code/
cp assets/schemas/WF-OPS/WF-OPS-003/*.json /opt/wirthforge/wf-ops-003/schemas/
cp assets/tests/WF-OPS/WF-OPS-003/*.py /opt/wirthforge/wf-ops-003/tests/

# Set executable permissions
chmod +x /opt/wirthforge/wf-ops-003/code/*.py
```

### Step 4: Configuration Files

Create `/etc/wirthforge/wf-ops-003/backup_config.json`:

```json
{
  "backup_engine": {
    "frame_budget_ms": 16.67,
    "chunk_size": 8192,
    "hash_algorithm": "sha256",
    "backup_directory": "/var/lib/wirthforge/wf-ops-003/backups",
    "temp_directory": "/var/lib/wirthforge/wf-ops-003/temp"
  },
  "recovery_engine": {
    "safety_checks_enabled": true,
    "rollback_enabled": true,
    "emergency_backup_enabled": true,
    "smoke_tests_enabled": true
  },
  "audit_system": {
    "database_path": "/var/lib/wirthforge/wf-ops-003/audit/audit.db",
    "retention_days": 365,
    "immutable_logging": true
  },
  "integration": {
    "wf_ops_001_endpoint": "http://localhost:8001",
    "wf_ops_002_endpoint": "http://localhost:8002",
    "health_check_interval": 30
  }
}
```

Create `/etc/wirthforge/wf-ops-003/retention_policy.json`:

```json
{
  "policies": [
    {
      "name": "daily_backups",
      "retention_days": 30,
      "backup_type": "incremental",
      "auto_cleanup": true
    },
    {
      "name": "weekly_backups", 
      "retention_days": 90,
      "backup_type": "full",
      "auto_cleanup": true
    },
    {
      "name": "monthly_backups",
      "retention_days": 365,
      "backup_type": "full",
      "auto_cleanup": false
    }
  ],
  "cleanup_schedule": {
    "enabled": true,
    "schedule": "0 2 * * *",
    "energy_aware": true
  }
}
```

---

## WF-OPS-002 Monitoring Integration

### Health Check Endpoints

```python
# health_endpoints.py
from flask import Flask, jsonify
import psutil
import time

app = Flask(__name__)

@app.route('/health/backup-engine')
def backup_engine_health():
    """Health check for backup engine"""
    try:
        from backup_engine import BackupEngine
        engine = BackupEngine()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'frame_budget_compliance': True,
            'active_backups': 0,
            'last_backup': None
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }), 500

@app.route('/health/recovery-engine')
def recovery_engine_health():
    """Health check for recovery engine"""
    try:
        from recovery_engine import RecoveryEngine
        engine = RecoveryEngine()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'active_recoveries': 0,
            'rollback_available': True,
            'emergency_backup_ready': True
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }), 500

@app.route('/health/audit-system')
def audit_system_health():
    """Health check for audit system"""
    try:
        from audit_verify import AuditVerifyManager
        from pathlib import Path
        
        db_path = Path('/var/lib/wirthforge/wf-ops-003/audit/audit.db')
        manager = AuditVerifyManager(db_path)
        
        return jsonify({
            'status': 'healthy',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'database_accessible': db_path.exists(),
            'audit_trail_integrity': True
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8003)
```

### Metrics Collection Integration

```python
# metrics_collector.py
import time
import json
import requests
from typing import Dict, Any

class WFOps002MetricsIntegration:
    """Integration with WF-OPS-002 monitoring system"""
    
    def __init__(self, monitoring_endpoint: str = "http://localhost:8002"):
        self.monitoring_endpoint = monitoring_endpoint
        
    def report_backup_metrics(self, metrics: Dict[str, Any]):
        """Report backup performance metrics"""
        payload = {
            'component': 'wf-ops-003',
            'subsystem': 'backup-engine',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'metrics': {
                'files_backed_up': metrics.get('files_backed_up', 0),
                'bytes_backed_up': metrics.get('bytes_backed_up', 0),
                'duration_seconds': metrics.get('duration_seconds', 0),
                'frame_budget_compliance': metrics.get('frame_budget_compliance', True),
                'integrity_verified': metrics.get('integrity_verified', True)
            }
        }
        
        try:
            response = requests.post(
                f"{self.monitoring_endpoint}/metrics/backup",
                json=payload,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Failed to report backup metrics: {e}")
            return False
            
    def report_recovery_metrics(self, metrics: Dict[str, Any]):
        """Report recovery performance metrics"""
        payload = {
            'component': 'wf-ops-003',
            'subsystem': 'recovery-engine',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'metrics': {
                'files_recovered': metrics.get('files_recovered', 0),
                'bytes_recovered': metrics.get('bytes_recovered', 0),
                'duration_seconds': metrics.get('duration_seconds', 0),
                'safety_checks_passed': metrics.get('safety_checks_passed', True),
                'rollback_available': metrics.get('rollback_available', True)
            }
        }
        
        try:
            response = requests.post(
                f"{self.monitoring_endpoint}/metrics/recovery",
                json=payload,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Failed to report recovery metrics: {e}")
            return False
            
    def get_energy_status(self) -> str:
        """Get current energy status from WF-OPS-002"""
        try:
            response = requests.get(
                f"{self.monitoring_endpoint}/energy/status",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('energy_level', 'optimal')
        except Exception as e:
            print(f"Failed to get energy status: {e}")
            
        return 'optimal'  # Default fallback
```

---

## Energy-Aware Scheduling Integration

### Backup Planner Integration

```python
# energy_aware_planner.py
from planner import BackupPlanner
from metrics_collector import WFOps002MetricsIntegration
import time

class EnergyAwareBackupPlanner(BackupPlanner):
    """Extended backup planner with WF-OPS-002 energy awareness"""
    
    def __init__(self, config=None):
        super().__init__(config)
        self.monitoring_integration = WFOps002MetricsIntegration()
        
    def should_schedule_backup(self, backup_type: str = 'incremental') -> bool:
        """Check if backup should be scheduled based on energy status"""
        energy_level = self.monitoring_integration.get_energy_status()
        
        # Energy-aware scheduling logic
        if energy_level == 'low':
            # Only critical backups during low energy
            return backup_type == 'critical'
        elif energy_level == 'medium':
            # Allow incremental backups during medium energy
            return backup_type in ['critical', 'incremental']
        else:  # optimal energy
            # Allow all backup types during optimal energy
            return True
            
    def create_energy_aware_backup_plan(self, source_paths, backup_type='incremental'):
        """Create backup plan considering current energy status"""
        if not self.should_schedule_backup(backup_type):
            return {
                'status': 'deferred',
                'reason': 'energy_conservation',
                'retry_after': 3600  # Retry in 1 hour
            }
            
        # Create normal backup plan
        plan = self.create_backup_plan(source_paths)
        
        # Add energy-aware optimizations
        energy_level = self.monitoring_integration.get_energy_status()
        if energy_level == 'medium':
            # Reduce chunk size for lower CPU usage
            plan['performance_settings'] = {
                'chunk_size': 4096,  # Smaller chunks
                'max_concurrent_files': 2,
                'frame_budget_ms': 20.0  # Slightly relaxed
            }
        elif energy_level == 'low':
            # Minimal resource usage
            plan['performance_settings'] = {
                'chunk_size': 2048,  # Even smaller chunks
                'max_concurrent_files': 1,
                'frame_budget_ms': 33.33  # 30 FPS instead of 60
            }
            
        return plan
```

---

## Service Management Integration

### WF-OPS-001 Service Definition

Create `/etc/wirthforge/wf-ops-001/services/wf-ops-003.json`:

```json
{
  "service_definition": {
    "id": "wf-ops-003",
    "name": "Backup & Recovery System",
    "version": "1.0.0",
    "type": "system_service",
    "category": "operations"
  },
  "dependencies": [
    {
      "service_id": "wf-ops-002",
      "type": "required",
      "minimum_version": "1.0.0"
    }
  ],
  "installation": {
    "method": "native_python",
    "source_path": "assets/code/WF-OPS/WF-OPS-003",
    "target_path": "/opt/wirthforge/wf-ops-003",
    "configuration_template": "assets/configs/WF-OPS/WF-OPS-003"
  },
  "runtime": {
    "start_command": "python /opt/wirthforge/wf-ops-003/code/ui-module.py",
    "stop_command": "pkill -f wf-ops-003",
    "health_check": "http://localhost:8003/health/backup-engine",
    "restart_policy": "on-failure",
    "environment_variables": {
      "WF_OPS_003_CONFIG": "/etc/wirthforge/wf-ops-003/backup_config.json",
      "WF_OPS_003_DATA": "/var/lib/wirthforge/wf-ops-003"
    }
  },
  "monitoring": {
    "health_endpoints": [
      "http://localhost:8003/health/backup-engine",
      "http://localhost:8003/health/recovery-engine",
      "http://localhost:8003/health/audit-system"
    ],
    "metrics_endpoints": [
      "http://localhost:8003/metrics/backup",
      "http://localhost:8003/metrics/recovery"
    ],
    "log_files": [
      "/var/log/wirthforge/wf-ops-003/backup.log",
      "/var/log/wirthforge/wf-ops-003/recovery.log",
      "/var/log/wirthforge/wf-ops-003/audit.log"
    ]
  }
}
```

### Service Lifecycle Management

```python
# service_manager.py
import subprocess
import requests
import time
from pathlib import Path

class WFOps003ServiceManager:
    """Service lifecycle management for WF-OPS-003"""
    
    def __init__(self):
        self.service_name = "wf-ops-003"
        self.config_path = Path("/etc/wirthforge/wf-ops-003")
        self.runtime_path = Path("/opt/wirthforge/wf-ops-003")
        
    def start_service(self) -> bool:
        """Start WF-OPS-003 service"""
        try:
            # Start health check endpoints
            subprocess.Popen([
                "python", 
                str(self.runtime_path / "code" / "health_endpoints.py")
            ])
            
            # Start main UI application
            subprocess.Popen([
                "python",
                str(self.runtime_path / "code" / "ui-module.py")
            ])
            
            # Wait for service to be ready
            time.sleep(5)
            
            # Verify service is healthy
            return self.check_health()
            
        except Exception as e:
            print(f"Failed to start WF-OPS-003 service: {e}")
            return False
            
    def stop_service(self) -> bool:
        """Stop WF-OPS-003 service"""
        try:
            # Gracefully stop processes
            subprocess.run(["pkill", "-f", "wf-ops-003"], check=False)
            return True
        except Exception as e:
            print(f"Failed to stop WF-OPS-003 service: {e}")
            return False
            
    def check_health(self) -> bool:
        """Check service health"""
        health_endpoints = [
            "http://localhost:8003/health/backup-engine",
            "http://localhost:8003/health/recovery-engine",
            "http://localhost:8003/health/audit-system"
        ]
        
        for endpoint in health_endpoints:
            try:
                response = requests.get(endpoint, timeout=5)
                if response.status_code != 200:
                    return False
            except Exception:
                return False
                
        return True
        
    def restart_service(self) -> bool:
        """Restart WF-OPS-003 service"""
        if self.stop_service():
            time.sleep(2)
            return self.start_service()
        return False
```

---

## Testing Integration

### Integration Test Suite

```python
# integration_test.py
import unittest
import requests
import time
import subprocess
from pathlib import Path

class WFOps003IntegrationTest(unittest.TestCase):
    """Integration tests for WF-OPS-003 with WF-OPS-001 and WF-OPS-002"""
    
    def setUp(self):
        """Set up integration test environment"""
        self.wf_ops_001_endpoint = "http://localhost:8001"
        self.wf_ops_002_endpoint = "http://localhost:8002"
        self.wf_ops_003_endpoint = "http://localhost:8003"
        
    def test_service_registration(self):
        """Test service registration with WF-OPS-001"""
        response = requests.get(f"{self.wf_ops_001_endpoint}/services/wf-ops-003")
        self.assertEqual(response.status_code, 200)
        
        service_info = response.json()
        self.assertEqual(service_info['id'], 'wf-ops-003')
        self.assertEqual(service_info['status'], 'running')
        
    def test_health_monitoring(self):
        """Test health monitoring integration with WF-OPS-002"""
        # Check that WF-OPS-002 can reach our health endpoints
        health_endpoints = [
            f"{self.wf_ops_003_endpoint}/health/backup-engine",
            f"{self.wf_ops_003_endpoint}/health/recovery-engine",
            f"{self.wf_ops_003_endpoint}/health/audit-system"
        ]
        
        for endpoint in health_endpoints:
            response = requests.get(endpoint)
            self.assertEqual(response.status_code, 200)
            
            health_data = response.json()
            self.assertEqual(health_data['status'], 'healthy')
            
    def test_energy_awareness(self):
        """Test energy-aware scheduling integration"""
        # Get energy status from WF-OPS-002
        response = requests.get(f"{self.wf_ops_002_endpoint}/energy/status")
        self.assertEqual(response.status_code, 200)
        
        energy_data = response.json()
        self.assertIn('energy_level', energy_data)
        
        # Test that backup planner respects energy status
        from energy_aware_planner import EnergyAwareBackupPlanner
        planner = EnergyAwareBackupPlanner()
        
        # Should adapt behavior based on energy level
        can_schedule = planner.should_schedule_backup('incremental')
        self.assertIsInstance(can_schedule, bool)
        
    def test_metrics_reporting(self):
        """Test metrics reporting to WF-OPS-002"""
        from metrics_collector import WFOps002MetricsIntegration
        
        integration = WFOps002MetricsIntegration()
        
        # Test backup metrics reporting
        backup_metrics = {
            'files_backed_up': 10,
            'bytes_backed_up': 1024000,
            'duration_seconds': 30.5,
            'frame_budget_compliance': True
        }
        
        result = integration.report_backup_metrics(backup_metrics)
        self.assertTrue(result, "Failed to report backup metrics")
        
    def test_end_to_end_backup_recovery(self):
        """Test complete backup and recovery workflow"""
        # This would test the full integration workflow
        # For now, verify components are accessible
        
        from backup_engine import BackupEngine
        from recovery_engine import RecoveryEngine
        from audit_verify import AuditVerifyManager
        
        # Verify all components can be instantiated
        backup_engine = BackupEngine()
        recovery_engine = RecoveryEngine()
        audit_manager = AuditVerifyManager(Path("/tmp/test_audit.db"))
        
        self.assertIsNotNone(backup_engine)
        self.assertIsNotNone(recovery_engine)
        self.assertIsNotNone(audit_manager)

if __name__ == '__main__':
    unittest.main()
```

---

## Deployment Checklist

### Pre-Deployment Verification

- [ ] Python 3.8+ installed and accessible
- [ ] Required libraries installed (cryptography, psutil)
- [ ] WF-OPS-001 deployment system running
- [ ] WF-OPS-002 monitoring system running and accessible
- [ ] Directory structure created with proper permissions
- [ ] Configuration files created and validated
- [ ] Network connectivity between components verified

### Deployment Steps

1. **Service Registration**
   ```bash
   # Register with WF-OPS-001
   curl -X POST http://localhost:8001/services/register \
     -H "Content-Type: application/json" \
     -d @/etc/wirthforge/wf-ops-001/services/wf-ops-003.json
   ```

2. **Code Deployment**
   ```bash
   # Deploy code and configuration
   python /opt/wirthforge/wf-ops-001/deploy.py \
     --service wf-ops-003 \
     --source assets/code/WF-OPS/WF-OPS-003 \
     --config assets/configs/WF-OPS/WF-OPS-003
   ```

3. **Service Startup**
   ```bash
   # Start WF-OPS-003 services
   python /opt/wirthforge/wf-ops-003/service_manager.py start
   ```

4. **Health Verification**
   ```bash
   # Verify all health endpoints
   curl http://localhost:8003/health/backup-engine
   curl http://localhost:8003/health/recovery-engine
   curl http://localhost:8003/health/audit-system
   ```

5. **Integration Testing**
   ```bash
   # Run integration tests
   cd /opt/wirthforge/wf-ops-003/tests
   python integration_test.py
   ```

### Post-Deployment Verification

- [ ] All health endpoints return 200 status
- [ ] Service registered successfully with WF-OPS-001
- [ ] Metrics reporting to WF-OPS-002 functioning
- [ ] Energy-aware scheduling responding to WF-OPS-002 signals
- [ ] UI application launches and responds within frame budget
- [ ] Backup and recovery operations complete successfully
- [ ] Audit trails are being created and are immutable
- [ ] Integration tests pass completely

---

## Troubleshooting

### Common Issues

**Service fails to start:**
- Check Python version and library dependencies
- Verify directory permissions and ownership
- Check configuration file syntax and paths
- Review system logs for error messages

**Health checks failing:**
- Verify network connectivity between components
- Check firewall settings and port availability
- Ensure WF-OPS-002 monitoring system is accessible
- Validate configuration endpoints and credentials

**Performance issues:**
- Monitor frame budget compliance in logs
- Check system resource usage (CPU, memory, disk)
- Verify energy-aware scheduling is functioning
- Review backup/recovery operation logs for bottlenecks

**Integration problems:**
- Verify WF-OPS-001 service registration
- Check WF-OPS-002 monitoring endpoint connectivity
- Validate configuration file compatibility
- Test individual components in isolation

### Log Analysis

```bash
# Check service logs
tail -f /var/log/wirthforge/wf-ops-003/backup.log
tail -f /var/log/wirthforge/wf-ops-003/recovery.log
tail -f /var/log/wirthforge/wf-ops-003/audit.log

# Check system integration logs
journalctl -u wf-ops-003 -f

# Monitor performance metrics
watch -n 1 'curl -s http://localhost:8003/health/backup-engine | jq'
```

---

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Audit Database Maintenance**
   - Monitor database size and performance
   - Verify audit trail integrity periodically
   - Implement retention policy cleanup

2. **Backup Verification**
   - Run integrity verification tests monthly
   - Verify recovery procedures quarterly
   - Test emergency recovery scenarios

3. **Performance Monitoring**
   - Monitor frame budget compliance
   - Track resource usage trends
   - Optimize based on performance metrics

4. **Security Updates**
   - Keep cryptography libraries updated
   - Review and update encryption settings
   - Audit user consent and privacy controls

### Update Procedures

Updates should be coordinated through WF-OPS-001 deployment system:

```bash
# Prepare update
python /opt/wirthforge/wf-ops-001/update.py \
  --service wf-ops-003 \
  --version 1.1.0 \
  --backup-config

# Apply update with rollback capability
python /opt/wirthforge/wf-ops-001/update.py \
  --service wf-ops-003 \
  --apply \
  --rollback-enabled

# Verify update
python /opt/wirthforge/wf-ops-003/tests/integration_test.py
```

---

## Conclusion

This integration guide provides comprehensive instructions for deploying and integrating WF-OPS-003 with the WirthForge ecosystem. The system is designed to work seamlessly with WF-OPS-001 for service management and WF-OPS-002 for monitoring and energy awareness, while maintaining its local-first, privacy-preserving architecture.

For additional support or questions about integration, refer to the component documentation and test suites provided with this asset package.
