# WF-OPS-001 Integration Guide

## Overview

This integration guide provides comprehensive instructions for utilizing all WF-OPS-001 deployment and installation assets. The assets include diagrams, schemas, code modules, test suites, and supporting documentation designed to enable secure, local-first deployment of WIRTHFORGE.

## Asset Categories

### 1. Architecture Diagrams (4 Mermaid Diagrams)

#### Installation Flow Diagram
- **Path**: `assets/diagrams/WF-OPS/WF-OPS-001/WF-OPS-001-installation-flow.md`
- **Purpose**: Visual representation of the complete installation process
- **Usage**: Reference during installation planning and troubleshooting
- **Dependencies**: System requirements validation

#### Deployment Architecture Diagram  
- **Path**: `assets/diagrams/WF-OPS/WF-OPS-001/WF-OPS-001-deployment-architecture.md`
- **Purpose**: Shows local deployment system architecture and security layers
- **Usage**: System design reference and security planning
- **Dependencies**: Local server and platform scripts

#### Update Process Diagram
- **Path**: `assets/diagrams/WF-OPS/WF-OPS-001/WF-OPS-001-update-process.md`
- **Purpose**: Illustrates update workflow with backup and rollback procedures
- **Usage**: Update planning and failure recovery procedures
- **Dependencies**: Update manager and backup-restore modules

#### System Integration Diagram
- **Path**: `assets/diagrams/WF-OPS/WF-OPS-001/WF-OPS-001-system-integration.md`
- **Purpose**: Cross-platform OS integration and service management
- **Usage**: Platform-specific integration planning
- **Dependencies**: Platform scripts and diagnostics modules

### 2. JSON Schemas (4 Validation Schemas)

#### Installation Configuration Schema
- **Path**: `assets/schemas/WF-OPS/WF-OPS-001/WF-OPS-001-installation-config.json`
- **Purpose**: Validates installation configuration parameters
- **Usage**: 
  ```javascript
  const schema = require('./WF-OPS-001-installation-config.json');
  const Ajv = require('ajv');
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(configData);
  ```

#### Deployment Manifest Schema
- **Path**: `assets/schemas/WF-OPS/WF-OPS-001/WF-OPS-001-deployment-manifest.json`
- **Purpose**: Tracks deployment state and runtime status
- **Usage**: Validate deployment manifests and state files

#### Update Metadata Schema
- **Path**: `assets/schemas/WF-OPS/WF-OPS-001/WF-OPS-001-update-metadata.json`
- **Purpose**: Validates update packages and verification metadata
- **Usage**: Ensure update package integrity and compatibility

#### System Requirements Schema
- **Path**: `assets/schemas/WF-OPS/WF-OPS-001/WF-OPS-001-system-requirements.json`
- **Purpose**: Validates system compatibility and requirements
- **Usage**: Pre-installation system validation

### 3. Code Modules (6 JavaScript Modules)

#### Web Installer Module
- **Path**: `assets/code/WF-OPS/WF-OPS-001/web-installer.js`
- **Purpose**: Secure localhost web interface for installation
- **Usage**:
  ```javascript
  const { WirthForgeWebInstaller } = require('./web-installer');
  const installer = new WirthForgeWebInstaller({
    port: 9443,
    installPath: '/path/to/install'
  });
  await installer.start();
  ```
- **Dependencies**: Express, WebSocket, HTTPS
- **Platforms**: Cross-platform

#### Platform Scripts Module
- **Path**: `assets/code/WF-OPS/WF-OPS-001/platform-scripts.js`
- **Purpose**: OS-specific installation utilities
- **Usage**:
  ```javascript
  const { PlatformScripts } = require('./platform-scripts');
  const scripts = new PlatformScripts();
  await scripts.installService();
  await scripts.configureFirewall();
  ```
- **Dependencies**: child_process, fs, path
- **Platforms**: Windows, macOS, Linux

#### Local Server Module
- **Path**: `assets/code/WF-OPS/WF-OPS-001/local-server.js`
- **Purpose**: Secure HTTPS server with AI integration
- **Usage**:
  ```javascript
  const { WirthForgeLocalServer } = require('./local-server');
  const server = new WirthForgeLocalServer({
    port: 9443,
    dataPath: './data'
  });
  await server.start();
  ```
- **Dependencies**: HTTPS, WebSocket, Express, SQLite3
- **Platforms**: Cross-platform

#### Update Manager Module
- **Path**: `assets/code/WF-OPS/WF-OPS-001/update-manager.js`
- **Purpose**: Handles updates with backup and rollback
- **Usage**:
  ```javascript
  const { WirthForgeUpdateManager } = require('./update-manager');
  const updater = new WirthForgeUpdateManager();
  await updater.checkForUpdates();
  await updater.downloadAndInstall();
  ```
- **Dependencies**: fs, crypto, child_process
- **Platforms**: Cross-platform

#### Diagnostics Module
- **Path**: `assets/code/WF-OPS/WF-OPS-001/diagnostics.js`
- **Purpose**: System health monitoring and diagnostics
- **Usage**:
  ```javascript
  const { WirthForgeDiagnostics } = require('./diagnostics');
  const diagnostics = new WirthForgeDiagnostics();
  const report = await diagnostics.generateReport();
  ```
- **Dependencies**: fs, os, child_process
- **Platforms**: Cross-platform

#### Backup & Restore Module
- **Path**: `assets/code/WF-OPS/WF-OPS-001/backup-restore.js`
- **Purpose**: Automated backup and restoration
- **Usage**:
  ```javascript
  const { WirthForgeBackupRestore } = require('./backup-restore');
  const backup = new WirthForgeBackupRestore();
  await backup.createBackup();
  await backup.restoreFromBackup(backupId);
  ```
- **Dependencies**: fs, crypto, zlib, stream
- **Platforms**: Cross-platform

### 4. Test Suites (4 Jest Test Suites)

#### Installation Validation Tests
- **Path**: `assets/tests/WF-OPS/WF-OPS-001/installation-validation.test.js`
- **Purpose**: Validates installation integrity
- **Usage**: `npm test installation-validation.test.js`
- **Coverage**: 92% (Target: 90%)

#### Deployment Testing Suite
- **Path**: `assets/tests/WF-OPS/WF-OPS-001/deployment-testing.test.js`
- **Purpose**: Tests deployment functionality and APIs
- **Usage**: `npm test deployment-testing.test.js`
- **Coverage**: 88% (Target: 85%)

#### Update Verification Tests
- **Path**: `assets/tests/WF-OPS/WF-OPS-001/update-verification.test.js`
- **Purpose**: Tests update processes and rollback
- **Usage**: `npm test update-verification.test.js`
- **Coverage**: 91% (Target: 88%)

#### System Diagnostics Tests
- **Path**: `assets/tests/WF-OPS/WF-OPS-001/system-diagnostics.test.js`
- **Purpose**: Tests diagnostics and health monitoring
- **Usage**: `npm test system-diagnostics.test.js`
- **Coverage**: 87% (Target: 85%)

## Integration Workflow

### 1. Pre-Installation Phase

1. **System Requirements Validation**
   ```javascript
   const schema = require('./schemas/WF-OPS-001-system-requirements.json');
   const systemInfo = await diagnostics.getSystemInfo();
   const isCompatible = validate(schema, systemInfo);
   ```

2. **Run Pre-Installation Tests**
   ```bash
   npm test installation-validation.test.js
   ```

### 2. Installation Phase

1. **Initialize Web Installer**
   ```javascript
   const installer = new WirthForgeWebInstaller({
     port: 9443,
     installPath: getDefaultInstallPath()
   });
   await installer.start();
   ```

2. **Execute Platform-Specific Scripts**
   ```javascript
   const scripts = new PlatformScripts();
   await scripts.createInstallDirectory();
   await scripts.installService();
   await scripts.configureFirewall();
   ```

3. **Validate Installation**
   ```bash
   npm test installation-validation.test.js
   ```

### 3. Deployment Phase

1. **Start Local Server**
   ```javascript
   const server = new WirthForgeLocalServer({
     port: 9443,
     httpsPort: 9444,
     dataPath: './data'
   });
   await server.start();
   ```

2. **Run Deployment Tests**
   ```bash
   npm test deployment-testing.test.js
   ```

### 4. Post-Deployment Phase

1. **Setup Diagnostics Monitoring**
   ```javascript
   const diagnostics = new WirthForgeDiagnostics();
   diagnostics.startMonitoring();
   ```

2. **Configure Backup System**
   ```javascript
   const backup = new WirthForgeBackupRestore();
   await backup.scheduleBackups('daily');
   ```

3. **Initialize Update Manager**
   ```javascript
   const updater = new WirthForgeUpdateManager();
   updater.enableAutoUpdates();
   ```

## Environment Configuration

### Required Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "ws": "^8.13.0",
    "sqlite3": "^5.1.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "ajv": "^8.12.0"
  }
}
```

### Environment Variables

```bash
# Installation Configuration
WIRTHFORGE_INSTALL_PATH=/path/to/install
WIRTHFORGE_DATA_PATH=/path/to/data
WIRTHFORGE_LOG_PATH=/path/to/logs

# Server Configuration
WIRTHFORGE_PORT=9443
WIRTHFORGE_HTTPS_PORT=9444
WIRTHFORGE_HOST=127.0.0.1

# Security Configuration
WIRTHFORGE_CERT_PATH=/path/to/certs
WIRTHFORGE_KEY_PATH=/path/to/keys
WIRTHFORGE_SESSION_SECRET=your-secret-key

# Update Configuration
WIRTHFORGE_UPDATE_URL=https://updates.wirthforge.org
WIRTHFORGE_UPDATE_CHECK_INTERVAL=86400000

# Backup Configuration
WIRTHFORGE_BACKUP_PATH=/path/to/backups
WIRTHFORGE_BACKUP_RETENTION=30
WIRTHFORGE_BACKUP_ENCRYPTION_KEY=your-encryption-key
```

## Security Considerations

### 1. HTTPS Configuration
- All web interfaces use HTTPS with self-signed certificates
- Certificates are bound to localhost only
- No external network access required

### 2. File Permissions
- Installation directories have restricted permissions
- Service accounts have minimal required privileges
- Backup files are encrypted at rest

### 3. Network Security
- All services bind to localhost (127.0.0.1) only
- Firewall rules restrict external access
- WebSocket connections use secure protocols

## Troubleshooting

### Common Issues

1. **Installation Fails**
   - Check system requirements with diagnostics module
   - Verify file permissions
   - Review installation logs

2. **Server Won't Start**
   - Check port availability
   - Verify certificate generation
   - Review server logs

3. **Updates Fail**
   - Check network connectivity
   - Verify backup creation
   - Test rollback functionality

### Diagnostic Commands

```javascript
// Generate comprehensive diagnostic report
const diagnostics = new WirthForgeDiagnostics();
const report = await diagnostics.generateReport();
console.log(JSON.stringify(report, null, 2));

// Check specific system component
const healthCheck = await diagnostics.checkSystemHealth();
const networkCheck = await diagnostics.checkNetworkConnectivity();
const storageCheck = await diagnostics.checkStorageHealth();
```

## Testing Strategy

### 1. Unit Tests
- Individual module functionality
- Error handling and edge cases
- Platform-specific code paths

### 2. Integration Tests
- Cross-module interactions
- End-to-end workflows
- System integration points

### 3. Performance Tests
- Load testing for web installer
- Memory usage monitoring
- Disk I/O performance

### 4. Security Tests
- Certificate validation
- Permission checks
- Network isolation

## Maintenance

### 1. Regular Health Checks
```javascript
// Schedule daily health checks
setInterval(async () => {
  const report = await diagnostics.generateReport();
  if (report.healthScore < 80) {
    console.warn('System health degraded:', report);
  }
}, 24 * 60 * 60 * 1000);
```

### 2. Log Rotation
```javascript
// Configure log rotation
const logRotation = {
  maxSize: '10MB',
  maxFiles: 10,
  compress: true
};
```

### 3. Backup Management
```javascript
// Automated backup cleanup
await backup.cleanupOldBackups(30); // Keep 30 days
```

## Support and Documentation

### Additional Resources
- WF-OPS-001 main document: `core-documents/ops/WF-OPS-001-DEPLOYMENT-INSTALLATION.md`
- Asset manifest: `assets/WF-OPS/WF-OPS-001/WF-OPS-001-asset-manifest.json`
- Architecture diagrams: `assets/diagrams/WF-OPS/WF-OPS-001/`
- JSON schemas: `assets/schemas/WF-OPS/WF-OPS-001/`

### Contact Information
For technical support and questions regarding WF-OPS-001 assets, refer to the main WIRTHFORGE documentation or submit issues through the appropriate channels.

---

*This integration guide is part of the WF-OPS-001 asset collection and should be used in conjunction with all other provided assets for complete deployment and installation capabilities.*
