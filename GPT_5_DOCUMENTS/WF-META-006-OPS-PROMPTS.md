# WF-META-006: Operations Document Generation Prompts

## Overview
This document contains detailed generation prompts for all WIRTHFORGE Operations documents (WF-OPS-001 through WF-OPS-003). Each prompt emphasizes the **web-engaged local-core** philosophy: mandatory web UI engagement with all core AI computation and data processing running locally on the user's device.

## Core Operations Principles
- **Local-First Operations**: All operational processes run locally without cloud dependencies
- **Web-Engaged Management**: Rich web interfaces for all operational tasks
- **Energy-Aware Resource Management**: Operations reflect actual computational costs
- **Zero-Docker Core**: No containerization in core runtime paths
- **Privacy-Preserving Telemetry**: Optional, user-controlled operational data sharing

---

## WF-OPS-001: Deployment & Installation

### Core Objective
Create comprehensive deployment and installation procedures that enable users to run WIRTHFORGE entirely locally with web-based management interfaces, ensuring zero cloud dependencies in core operations.

### Required Deliverables
1. **Installation Framework** (40 pages)
   - Local installation procedures for all platforms (Windows, macOS, Linux)
   - Web-based installation wizard and progress tracking
   - Local AI model download and verification
   - Dependency management without Docker
   - Post-installation validation and testing

2. **Deployment Architecture** (30 pages)
   - Local web server setup and configuration
   - File system organization and permissions
   - Local database initialization (SQLite/IndexedDB)
   - Security configuration for local HTTPS
   - Port management and conflict resolution

3. **Update & Maintenance Systems** (25 pages)
   - Local update mechanisms and rollback procedures
   - Web-based update management interface
   - Incremental model updates and optimization
   - Health monitoring and diagnostic tools
   - Backup and recovery procedures

### Dependencies
- **WF-FND-001**: Vision & Principles (local-first philosophy)
- **WF-FND-003**: Architecture (deployment constraints)
- **WF-TECH-001**: Core Platform (technical foundation)
- **WF-TECH-002**: Local AI Integration (model management)

### Architecture Notes
- Installation must work **entirely offline** after initial download
- Web UI for all installation and management tasks
- No Docker containers in core runtime paths
- Local HTTPS/TLS for secure web interface
- All AI models and data stored locally
- Zero cloud dependencies for core functionality

### Asset Inventory
- **Diagrams**: Installation flow, deployment architecture, update process (4 Mermaid)
- **Schemas**: Installation config, deployment manifest, update metadata (4 JSON)
- **Code**: Installation scripts, web installer, update manager (6 files)
- **Tests**: Installation validation, deployment testing, update verification (4 suites)

---

## WF-OPS-002: Monitoring & Performance Management

### Core Objective
Implement comprehensive monitoring and performance management systems that provide real-time insights into WIRTHFORGE operations through web interfaces while maintaining local-first principles.

### Required Deliverables
1. **Monitoring Infrastructure** (35 pages)
   - Real-time performance dashboards (web-based)
   - Local AI model performance tracking
   - Resource usage monitoring (CPU, memory, GPU, storage)
   - Energy consumption and efficiency metrics
   - User experience performance indicators

2. **Alert & Notification Systems** (25 pages)
   - Threshold-based alerting for resource issues
   - Performance degradation detection
   - Model accuracy and quality monitoring
   - User-configurable notification preferences
   - Emergency shutdown and recovery procedures

3. **Analytics & Reporting** (20 pages)
   - Local analytics data collection and storage
   - Privacy-preserving usage statistics
   - Performance trend analysis and reporting
   - Capacity planning and optimization recommendations
   - Export capabilities for external analysis

### Dependencies
- **WF-OPS-001**: Deployment (monitoring infrastructure)
- **WF-TECH-002**: Local AI Integration (performance data sources)
- **WF-UX-006**: Performance Optimization (user experience metrics)
- **WF-FND-006**: Governance (monitoring policies)

### Architecture Notes
- All monitoring data stays **local** unless explicitly shared
- Web-based dashboards for real-time monitoring
- Energy-aware performance metrics
- No external monitoring service dependencies
- User controls all telemetry and analytics data
- Privacy-preserving aggregation for optional sharing

### Asset Inventory
- **Diagrams**: Monitoring architecture, alert flow, analytics pipeline (4 Mermaid)
- **Schemas**: Metrics definitions, alert rules, analytics data models (4 JSON)
- **Code**: Monitoring agents, dashboard components, analytics engine (7 files)
- **Tests**: Monitoring validation, alert testing, analytics accuracy (4 suites)

---

## WF-OPS-003: Backup, Recovery & Data Management

### Core Objective
Design robust backup, recovery, and data management systems that ensure user data integrity and system reliability while maintaining complete local control and privacy.

### Required Deliverables
1. **Backup Systems** (35 pages)
   - Automated local backup scheduling
   - Incremental and differential backup strategies
   - Web-based backup management interface
   - Cross-platform backup compatibility
   - Backup verification and integrity checking

2. **Recovery Procedures** (30 pages)
   - Disaster recovery planning and procedures
   - Point-in-time recovery capabilities
   - Selective data restoration options
   - System state recovery and rollback
   - Emergency recovery from minimal backups

3. **Data Management Framework** (25 pages)
   - Local data lifecycle management
   - Storage optimization and compression
   - Data migration and export utilities
   - Privacy-preserving data sharing options
   - Data retention policies and cleanup

### Dependencies
- **WF-OPS-001**: Deployment (backup infrastructure)
- **WF-OPS-002**: Monitoring (backup health tracking)
- **WF-TECH-007**: Security & Privacy (data protection)
- **WF-FND-006**: Governance (data policies)

### Architecture Notes
- All backups stored **locally** by default
- Optional encrypted cloud backup with user control
- Web interface for all backup and recovery operations
- Zero data loss tolerance for user-generated content
- Complete user control over data location and sharing
- Recovery procedures work without internet connectivity

### Asset Inventory
- **Diagrams**: Backup architecture, recovery flow, data lifecycle (4 Mermaid)
- **Schemas**: Backup metadata, recovery procedures, data policies (4 JSON)
- **Code**: Backup engine, recovery utilities, data management tools (6 files)
- **Tests**: Backup validation, recovery testing, data integrity (4 suites)

---

## Asset Summary for Operations Documents

### Total Asset Inventory
- **Mermaid Diagrams**: 12 diagrams across all OPS documents
- **JSON Schemas**: 12 schemas for configurations and data structures
- **Code Files**: 19 implementation files (scripts, utilities, web interfaces)
- **Test Suites**: 12 comprehensive testing suites

### Key Themes
- **Local-First Operations**: All operational processes run locally
- **Web-Engaged Management**: Rich web interfaces for operational tasks
- **Zero Cloud Dependencies**: Core operations work entirely offline
- **Privacy-Preserving**: User controls all operational data
- **Energy-Aware**: Operations reflect actual computational costs
- **Reliability**: Robust backup, recovery, and monitoring systems

### Implementation Notes
- All OPS documents emphasize **web-engaged local-core** architecture
- Installation and deployment work without Docker containers
- Monitoring and analytics respect user privacy and local-first principles
- Backup and recovery systems ensure data integrity and user control
- Web interfaces provide rich operational management capabilities
- All operational data stays local unless explicitly shared by user
