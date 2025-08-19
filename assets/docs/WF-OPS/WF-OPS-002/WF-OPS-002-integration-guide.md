# WF-OPS-002 Integration Guide

## WIRTHFORGE Monitoring & Performance Management System

**Version:** 1.0.0  
**Last Updated:** 2025-01-19  
**Document ID:** WF-OPS-002-INTEGRATION

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [System Requirements](#system-requirements)
4. [Installation & Setup](#installation--setup)
5. [Configuration](#configuration)
6. [Usage Patterns](#usage-patterns)
7. [Performance Optimization](#performance-optimization)
8. [Security & Privacy](#security--privacy)
9. [Troubleshooting](#troubleshooting)
10. [Testing Strategy](#testing-strategy)
11. [Maintenance](#maintenance)

---

## Architecture Overview

The WF-OPS-002 monitoring system implements a **local-first, privacy-preserving architecture** with real-time 60Hz performance monitoring and energy-truth visualization.

### Core Components

- **System Collector** (10Hz): Cross-platform system metrics
- **Model Collector** (60Hz): AI model performance tracking
- **Metrics Aggregator**: Time-windowed statistical processing
- **Alert Engine**: Rule-based notification system
- **WebSocket Server**: Real-time dashboard streaming
- **Dashboard Components**: React-based visualization
- **Analytics Engine**: Privacy-preserving data analysis

### Key Design Principles

- **60Hz Frame Budget**: ≤16.67ms processing per frame
- **Local-First**: No external network dependencies
- **Privacy-Preserving**: User consent and data minimization
- **Energy-Aware**: Visual mapping of actual resource usage
- **Cross-Platform**: Windows, macOS, Linux support

---

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/wirthforge/monitoring-system.git
cd monitoring-system

# Install dependencies
npm install

# Run setup script
npm run setup
```

### 2. Basic Configuration

```javascript
// monitoring-config.json
{
  "collectors": {
    "system": { "enabled": true, "sampleRate": 10 },
    "model": { "enabled": true, "sampleRate": 60 }
  },
  "server": {
    "port": 8080,
    "host": "127.0.0.1"
  },
  "privacy": {
    "level": "strict",
    "consentRequired": true
  }
}
```

### 3. Start Monitoring

```bash
# Start the monitoring system
npm start

# Access dashboard
open http://127.0.0.1:8080
```

---

## System Requirements

### Minimum Requirements

- **Node.js**: ≥18.0.0
- **Memory**: 512MB available RAM
- **Disk**: 100MB free space
- **Network**: Localhost access only
- **Permissions**: File system, process monitoring

### Recommended Specifications

- **CPU**: Multi-core processor (for 60Hz performance)
- **Memory**: 1GB+ available RAM
- **GPU**: Dedicated GPU (for enhanced energy visualization)
- **Display**: 1920x1080+ resolution

### Platform Support

| Platform | System Collector | Model Collector | Dashboard |
|----------|------------------|-----------------|-----------|
| Windows  | ✅ Full          | ✅ Full         | ✅ Full   |
| macOS    | ✅ Full          | ✅ Full         | ✅ Full   |
| Linux    | ✅ Full          | ✅ Full         | ✅ Full   |
| Browser  | ❌ N/A           | ❌ N/A          | ✅ Full   |

---

## Installation & Setup

### 1. Environment Preparation

```bash
# Verify Node.js version
node --version  # Should be ≥18.0.0

# Set environment variables
export WF_MONITORING_PORT=8080
export WF_FRAME_BUDGET_MS=16.67
export WF_PRIVACY_LEVEL=strict
export WF_RETENTION_DAYS=30
```

### 2. Component Installation

```javascript
// Install core monitoring system
const { SystemCollector } = require('./assets/code/WF-OPS/WF-OPS-002/system-collector');
const { ModelCollector } = require('./assets/code/WF-OPS/WF-OPS-002/model-collector');
const { MetricsAggregator } = require('./assets/code/WF-OPS/WF-OPS-002/aggregator');
const { AlertEngine } = require('./assets/code/WF-OPS/WF-OPS-002/alert-engine');
const { WirthForgeWSServer } = require('./assets/code/WF-OPS/WF-OPS-002/ws-server');
const { WirthForgeAnalytics } = require('./assets/code/WF-OPS/WF-OPS-002/analytics');

// Initialize components
const systemCollector = new SystemCollector({ sampleRate: 10 });
const modelCollector = new ModelCollector({ sampleRate: 60 });
const aggregator = new MetricsAggregator({ windowSizes: ['1s', '5s', '30s'] });
const alertEngine = new AlertEngine({ frameBudgetMs: 16.67 });
const wsServer = new WirthForgeWSServer({ port: 8080 });
const analytics = new WirthForgeAnalytics({ privacyLevel: 'strict' });
```

### 3. Startup Sequence

```javascript
async function startMonitoring() {
  try {
    // 1. Initialize collectors
    await systemCollector.start();
    await modelCollector.start();
    
    // 2. Start aggregation
    await aggregator.start();
    
    // 3. Load and start alert engine
    const alertRules = await loadAlertRules('./config/alert-rules.json');
    await alertEngine.start();
    await alertEngine.loadRules(alertRules);
    
    // 4. Start WebSocket server
    await wsServer.start();
    
    // 5. Initialize analytics
    await analytics.start();
    
    // 6. Connect data pipeline
    connectDataPipeline();
    
    console.log('✅ Monitoring system started successfully');
    
  } catch (error) {
    console.error('❌ Failed to start monitoring system:', error);
    process.exit(1);
  }
}

function connectDataPipeline() {
  // System metrics → Aggregator
  systemCollector.on('metrics', (metric) => {
    aggregator.addMetric(metric);
    analytics.processMetrics([metric]);
  });
  
  // Model metrics → Aggregator
  modelCollector.on('metrics', (metric) => {
    aggregator.addMetric(metric);
    analytics.processMetrics([metric]);
  });
  
  // Aggregated data → Alert Engine
  aggregator.on('aggregated', (aggregation) => {
    alertEngine.evaluateMetrics([aggregation]);
  });
  
  // Metrics → WebSocket streaming
  systemCollector.on('metrics', (metric) => {
    wsServer.queueMessage('metrics', {
      type: 'metrics',
      source: metric.source,
      data: metric.data,
      timestamp: metric.timestamp
    });
  });
  
  // Alerts → WebSocket streaming
  alertEngine.on('alertsTriggered', (alerts) => {
    alerts.forEach(alert => {
      wsServer.queueMessage('alerts', {
        type: 'alert',
        ...alert
      });
    });
  });
}
```

---

## Configuration

### 1. Monitoring Configuration

```json
{
  "collectors": {
    "system": {
      "enabled": true,
      "sampleRate": 10,
      "metrics": ["cpu", "memory", "gpu", "disk", "network"],
      "frameBudgetMs": 16.67
    },
    "model": {
      "enabled": true,
      "sampleRate": 60,
      "metrics": ["tokens", "ttft", "energy", "entropy"],
      "energyCalculation": true
    }
  },
  "aggregation": {
    "windowSizes": ["1s", "5s", "30s", "5m", "1h"],
    "flushInterval": 1000,
    "maxBufferSize": 10000
  },
  "alerts": {
    "evaluationBudgetMs": 2.0,
    "maxAlertsPerSecond": 10,
    "defaultCooldownMs": 30000
  },
  "server": {
    "port": 8080,
    "host": "127.0.0.1",
    "maxConnections": 100,
    "frameBudgetMs": 16.67
  },
  "analytics": {
    "privacyLevel": "strict",
    "consentRequired": true,
    "retentionDays": 30,
    "exportFormats": ["json", "csv"]
  }
}
```

### 2. Alert Rules Configuration

```json
{
  "rules": [
    {
      "id": "cpu_high",
      "name": "High CPU Usage",
      "enabled": true,
      "severity": "warning",
      "category": "performance",
      "conditions": {
        "when_all": [
          {
            "metric": "system.data.cpu_percent",
            "operator": ">",
            "value": 80,
            "window": "5m",
            "aggregation": "avg"
          }
        ]
      },
      "actions": [
        {
          "type": "notify.toast",
          "level": "warning",
          "message": "CPU usage is high ({{cpu_percent}}%)",
          "duration_ms": 5000
        },
        {
          "type": "log.audit",
          "category": "performance",
          "message": "High CPU usage detected"
        }
      ],
      "debounce": {
        "cooldown_ms": 60000
      }
    },
    {
      "id": "memory_critical",
      "name": "Critical Memory Usage",
      "enabled": true,
      "severity": "critical",
      "category": "performance",
      "conditions": {
        "when_all": [
          {
            "metric": "system.data.memory_percent",
            "operator": ">=",
            "value": 90,
            "window": "1m",
            "aggregation": "max"
          }
        ]
      },
      "actions": [
        {
          "type": "notify.toast",
          "level": "critical",
          "message": "Memory usage is critical ({{memory_percent}}%)"
        },
        {
          "type": "suggest.mitigation",
          "target": "memory_optimization",
          "message": "Consider closing unused applications or increasing system memory"
        }
      ]
    }
  ]
}
```

### 3. Dashboard Layout Configuration

```json
{
  "layout": {
    "id": "default_layout",
    "name": "Default Monitoring Layout",
    "version": "1.0",
    "grid": {
      "columns": 4,
      "rows": 3,
      "gap": 8
    },
    "panels": [
      {
        "id": "system_overview",
        "type": "system_overview",
        "title": "System Overview",
        "position": { "x": 0, "y": 0 },
        "size": { "width": 2, "height": 1 },
        "config": {
          "sources": ["system"],
          "metrics": ["cpu_percent", "memory_percent"]
        }
      },
      {
        "id": "energy_viz",
        "type": "energy_viz",
        "title": "Energy Visualization",
        "position": { "x": 2, "y": 0 },
        "size": { "width": 2, "height": 2 },
        "config": {
          "sources": ["system", "model"],
          "visualization": "ribbons_particles"
        }
      },
      {
        "id": "performance_chart",
        "type": "performance_chart",
        "title": "Performance Trends",
        "position": { "x": 0, "y": 1 },
        "size": { "width": 2, "height": 1 },
        "config": {
          "metrics": [
            { "source": "system", "metric": "cpu_percent", "name": "CPU" },
            { "source": "model", "metric": "tokens_per_second", "name": "Tokens/sec" }
          ],
          "timeWindow": "5m"
        }
      },
      {
        "id": "alerts",
        "type": "alert_list",
        "title": "Active Alerts",
        "position": { "x": 0, "y": 2 },
        "size": { "width": 4, "height": 1 },
        "config": {
          "severityFilter": ["critical", "warning"],
          "maxAlerts": 10
        }
      }
    ],
    "theme": {
      "name": "dark",
      "colors": {
        "background": "#1a1a1a",
        "surface": "#2d2d2d",
        "primary": "#00ff88",
        "warning": "#ffaa00",
        "critical": "#ff4444"
      }
    }
  }
}
```

---

## Usage Patterns

### 1. Basic Monitoring Setup

```javascript
// Simple monitoring setup
const monitor = new WirthForgeMonitor({
  collectors: ['system', 'model'],
  dashboard: true,
  alerts: './config/basic-alerts.json'
});

await monitor.start();

// Monitor specific metrics
monitor.on('metrics', (metric) => {
  console.log(`${metric.source}: ${JSON.stringify(metric.data)}`);
});

// Handle alerts
monitor.on('alert', (alert) => {
  console.log(`🚨 ${alert.severity}: ${alert.message}`);
});
```

### 2. Custom Alert Rules

```javascript
// Define custom alert rule
const customRule = {
  id: 'model_performance',
  name: 'Model Performance Degradation',
  enabled: true,
  severity: 'warning',
  conditions: {
    when_all: [
      {
        metric: 'model.data.tokens_per_second',
        operator: '<',
        value: 10,
        window: '2m',
        aggregation: 'avg'
      },
      {
        metric: 'model.data.ttft_ms',
        operator: '>',
        value: 500,
        window: '1m',
        aggregation: 'p95'
      }
    ]
  },
  actions: [
    {
      type: 'suggest.diagnostic',
      target: 'model_optimization',
      message: 'Model performance has degraded. Consider checking GPU utilization and memory usage.'
    }
  ]
};

await alertEngine.loadRules([customRule]);
```

### 3. Energy Visualization Integration

```javascript
// Custom energy visualization
const EnergyDashboard = () => {
  const [metrics, setMetrics] = useState({});
  
  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8080');
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'metrics') {
        setMetrics(prev => ({
          ...prev,
          [message.source]: message.data
        }));
      }
    };
    
    return () => ws.close();
  }, []);
  
  return (
    <div className="energy-dashboard">
      <EnergyVisualization 
        cpuUsage={metrics.system?.cpu_percent || 0}
        memoryUsage={metrics.system?.memory_percent || 0}
        tokensPerSec={metrics.model?.tokens_per_second || 0}
        energyJoules={metrics.model?.energy_joules || 0}
      />
    </div>
  );
};
```

### 4. Privacy-Preserving Analytics

```javascript
// Set up analytics with privacy controls
const analytics = new WirthForgeAnalytics({
  privacyLevel: 'strict',
  consentRequired: true,
  retentionDays: 7
});

// Record user consent
await analytics.recordConsent('user123', {
  scopes: ['aggregated_metrics', 'trend_analysis'],
  granted_at: Date.now(),
  expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
});

// Generate privacy-preserving export
const exportConfig = {
  user_id: 'user123',
  data_scope: [
    {
      type: 'statistical_summary',
      source: 'system',
      time_range: { start: Date.now() - 86400000, end: Date.now() }
    }
  ],
  output: { format: 'json' },
  privacy: {
    anonymize_timestamps: true,
    remove_identifiers: true
  }
};

const exportResult = await analytics.createExport(exportConfig);
```

---

## Performance Optimization

### 1. Frame Budget Management

```javascript
// Monitor frame budget compliance
const frameMonitor = {
  budget: 16.67, // 60Hz
  violations: 0,
  
  checkFrame(startTime) {
    const frameTime = performance.now() - startTime;
    if (frameTime > this.budget) {
      this.violations++;
      console.warn(`Frame overrun: ${frameTime.toFixed(2)}ms (budget: ${this.budget}ms)`);
    }
    return frameTime;
  }
};

// Use in collectors
systemCollector.on('frameTime', (frameTime) => {
  frameMonitor.checkFrame(frameTime);
});
```

### 2. Memory Optimization

```javascript
// Configure memory limits
const memoryConfig = {
  maxRawDataPoints: 50000,
  maxAggregations: 10000,
  cleanupInterval: 300000, // 5 minutes
  
  // Automatic cleanup
  startCleanup() {
    setInterval(() => {
      this.cleanupOldData();
      this.compactBuffers();
    }, this.cleanupInterval);
  }
};
```

### 3. Network Optimization

```javascript
// WebSocket optimization
const wsConfig = {
  compressionThreshold: 1024,
  maxMessageSize: 1024 * 1024, // 1MB
  heartbeatInterval: 30000,
  
  // Message batching
  batchMessages(messages) {
    return messages.reduce((batches, message) => {
      const lastBatch = batches[batches.length - 1];
      if (lastBatch && lastBatch.length < 10) {
        lastBatch.push(message);
      } else {
        batches.push([message]);
      }
      return batches;
    }, []);
  }
};
```

---

## Security & Privacy

### 1. Network Security

- **Localhost Only**: All network traffic restricted to 127.0.0.1
- **No External Calls**: Zero external network dependencies
- **Encrypted Storage**: Sensitive data encrypted at rest
- **Secure WebSockets**: WSS for production deployments

### 2. Privacy Controls

```javascript
// Privacy configuration
const privacyConfig = {
  level: 'strict', // 'permissive', 'balanced', 'strict'
  consentRequired: true,
  dataMinimization: true,
  retentionPolicy: {
    rawData: 7, // days
    aggregatedData: 30,
    exportData: 1
  },
  anonymization: {
    timestampPrecision: 'hour', // 'second', 'minute', 'hour'
    removeIdentifiers: true,
    hashSensitiveData: true
  }
};
```

### 3. Consent Management

```javascript
// Implement consent UI
const ConsentManager = () => {
  const [consents, setConsents] = useState({});
  
  const handleConsentChange = async (scope, granted) => {
    if (granted) {
      await analytics.recordConsent(userId, {
        scopes: [scope],
        granted_at: Date.now(),
        expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000)
      });
    } else {
      await analytics.revokeConsent(userId, scope);
    }
    
    setConsents(prev => ({ ...prev, [scope]: granted }));
  };
  
  return (
    <div className="consent-manager">
      <h3>Data Usage Consent</h3>
      {['raw_metrics', 'aggregated_metrics', 'trend_analysis'].map(scope => (
        <label key={scope}>
          <input
            type="checkbox"
            checked={consents[scope] || false}
            onChange={(e) => handleConsentChange(scope, e.target.checked)}
          />
          {scope.replace('_', ' ').toUpperCase()}
        </label>
      ))}
    </div>
  );
};
```

---

## Troubleshooting

### Common Issues

#### 1. High Frame Times

**Symptoms**: Dashboard stuttering, frame overruns
**Causes**: Heavy computation, memory pressure, too many metrics
**Solutions**:
```javascript
// Reduce sampling rates
systemCollector.setSampleRate(5); // From 10Hz to 5Hz
modelCollector.setSampleRate(30); // From 60Hz to 30Hz

// Limit metric collection
const limitedMetrics = ['cpu_percent', 'memory_percent']; // Only essential metrics
```

#### 2. Memory Leaks

**Symptoms**: Increasing memory usage over time
**Causes**: Unbounded data structures, event listener leaks
**Solutions**:
```javascript
// Enable automatic cleanup
aggregator.setCleanupInterval(60000); // 1 minute
analytics.setRetentionDays(7); // Shorter retention

// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(`Memory: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
}, 30000);
```

#### 3. WebSocket Connection Issues

**Symptoms**: Dashboard not updating, connection errors
**Causes**: Port conflicts, firewall blocking, server overload
**Solutions**:
```javascript
// Check port availability
const net = require('net');
const server = net.createServer();
server.listen(8080, (err) => {
  if (err) {
    console.error('Port 8080 is in use');
    // Try alternative port
    wsServer.setPort(8081);
  }
  server.close();
});

// Implement reconnection logic
const connectWithRetry = () => {
  const ws = new WebSocket('ws://127.0.0.1:8080');
  
  ws.onclose = () => {
    setTimeout(connectWithRetry, 3000); // Retry after 3 seconds
  };
};
```

#### 4. Alert Engine Performance

**Symptoms**: Delayed alerts, high CPU usage
**Causes**: Complex rules, too many rules, inefficient conditions
**Solutions**:
```javascript
// Optimize alert rules
const optimizedRule = {
  conditions: {
    when_all: [
      {
        metric: 'system.data.cpu_percent',
        operator: '>',
        value: 80,
        window: '1m', // Shorter window
        aggregation: 'last' // Faster than avg
      }
    ]
  }
};

// Limit rule evaluation frequency
alertEngine.setEvaluationInterval(1000); // 1 second instead of real-time
```

### Diagnostic Commands

```bash
# Check system resources
npm run diagnostics

# Validate configuration
npm run validate-config

# Test alert rules
npm run test-alerts

# Performance profiling
npm run profile

# Memory analysis
npm run memory-check
```

---

## Testing Strategy

### 1. Unit Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=sampling-accuracy
npm test -- --testPathPattern=alert-triggering
npm test -- --testPathPattern=ui-performance
npm test -- --testPathPattern=privacy-export

# Run with coverage
npm run test:coverage
```

### 2. Integration Tests

```javascript
// Example integration test
describe('Full Pipeline Integration', () => {
  test('should process metrics end-to-end', async () => {
    // Start all components
    await systemCollector.start();
    await aggregator.start();
    await alertEngine.start();
    await wsServer.start();
    
    // Inject test metric
    const testMetric = {
      timestamp: Date.now(),
      source: 'system',
      data: { cpu_percent: 85 }
    };
    
    // Verify processing through pipeline
    const alertPromise = waitForAlert(alertEngine, 'cpu_high');
    const wsPromise = waitForWSMessage(wsServer, 'metrics');
    
    systemCollector.emit('metrics', testMetric);
    
    await Promise.all([alertPromise, wsPromise]);
  });
});
```

### 3. Performance Tests

```javascript
// Frame budget compliance test
test('should maintain 60Hz performance', async () => {
  const frameTimes = [];
  const testDuration = 5000; // 5 seconds
  
  const startTime = performance.now();
  
  while (performance.now() - startTime < testDuration) {
    const frameStart = performance.now();
    
    // Simulate full processing cycle
    await processMetrics();
    await updateDashboard();
    
    const frameTime = performance.now() - frameStart;
    frameTimes.push(frameTime);
    
    await new Promise(resolve => setTimeout(resolve, 16.67));
  }
  
  const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
  const overBudgetFrames = frameTimes.filter(t => t > 16.67);
  
  expect(avgFrameTime).toBeLessThan(16.67);
  expect(overBudgetFrames.length / frameTimes.length).toBeLessThan(0.05); // <5% overruns
});
```

---

## Maintenance

### 1. Regular Maintenance Tasks

```bash
# Weekly maintenance
npm run maintenance:weekly

# Monthly updates
npm run maintenance:monthly

# Backup configuration
npm run backup:config

# Clean old logs
npm run cleanup:logs
```

### 2. Monitoring Health

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    components: {
      systemCollector: systemCollector.isRunning,
      modelCollector: modelCollector.isRunning,
      aggregator: aggregator.isRunning,
      alertEngine: alertEngine.isRunning,
      wsServer: wsServer.isRunning,
      analytics: analytics.isRunning
    },
    metrics: {
      frameTime: frameMonitor.getAverageFrameTime(),
      memoryUsage: process.memoryUsage().heapUsed,
      activeConnections: wsServer.getConnectionCount(),
      alertsPerMinute: alertEngine.getAlertRate()
    }
  };
  
  const isHealthy = Object.values(health.components).every(status => status);
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 3. Update Procedures

```bash
# Update system
git pull origin main
npm install
npm run migrate:config
npm test
npm start
```

---

## Support & Resources

### Documentation
- **API Reference**: `/docs/api/`
- **Schema Documentation**: `/docs/schemas/`
- **Architecture Guide**: `/docs/architecture/`

### Community
- **GitHub Issues**: [Report bugs and feature requests](https://github.com/wirthforge/monitoring/issues)
- **Discussions**: [Community discussions](https://github.com/wirthforge/monitoring/discussions)
- **Wiki**: [Community wiki](https://github.com/wirthforge/monitoring/wiki)

### Enterprise Support
- **Professional Services**: Available for custom implementations
- **Training**: On-site and remote training available
- **SLA Options**: 24/7 support with guaranteed response times

---

**End of Integration Guide**

*For additional support, please refer to the GitHub repository or contact the WIRTHFORGE engineering team.*
