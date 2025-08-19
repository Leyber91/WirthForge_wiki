# WF-OPS-002 Alert Flow Diagram

## Overview
This diagram illustrates the complete alert processing flow from metric evaluation through local notification delivery, emphasizing user control, local-only operation, and integration with the 60Hz performance constraints.

## Alert Flow Diagram

```mermaid
flowchart TD
    subgraph "Metric Sources"
        SYS_M[System Metrics<br/>CPU/GPU/Memory<br/>10Hz sampling]
        MOD_M[Model Metrics<br/>TPS/TTFT/Energy<br/>60Hz sampling]
        UX_M[UX Metrics<br/>Frame Time/Jank<br/>60Hz sampling]
        NET_M[Network Metrics<br/>Localhost Traffic<br/>1Hz sampling]
    end
    
    subgraph "Alert Engine Core"
        EVAL[Rule Evaluator<br/>DSL processor<br/>Window-based logic]
        STATE[Alert State Manager<br/>Debouncing<br/>Escalation tracking]
        FILTER[Alert Filter<br/>User preferences<br/>Severity gating]
    end
    
    subgraph "Rule Management"
        RULES[(Alert Rules<br/>JSON DSL configs<br/>User-defined)]
        TEMPLATES[Rule Templates<br/>Novice-friendly<br/>Best practices]
        VALIDATOR[Rule Validator<br/>Syntax checking<br/>Performance impact]
    end
    
    subgraph "Notification System"
        BROKER[Notification Broker<br/>Local delivery only<br/>No external calls]
        TOAST[Toast Notifications<br/>Desktop integration<br/>Dismissible]
        SOUND[Audio Alerts<br/>System sounds<br/>Volume controlled]
        LOG[Alert Logging<br/>Audit trail<br/>SQLite storage]
    end
    
    subgraph "User Interface"
        DASH_ALERTS[Dashboard Alerts<br/>Real-time panel<br/>Visual indicators]
        SETTINGS[Alert Settings<br/>Rule management<br/>Preference controls]
        HISTORY[Alert History<br/>Timeline view<br/>Pattern analysis]
    end
    
    subgraph "Integration Points"
        BACKUP_SIG[Backup Signals<br/>To WF-OPS-003<br/>System health]
        PERF_FEEDBACK[Performance Feedback<br/>Self-monitoring<br/>Alert overhead]
        MITIGATION[Auto-Mitigation<br/>Suggestions only<br/>User approval]
    end
    
    %% Main Flow
    SYS_M --> EVAL
    MOD_M --> EVAL
    UX_M --> EVAL
    NET_M --> EVAL
    
    EVAL --> RULES
    RULES --> EVAL
    EVAL --> STATE
    STATE --> FILTER
    
    FILTER --> BROKER
    BROKER --> TOAST
    BROKER --> SOUND
    BROKER --> LOG
    BROKER --> DASH_ALERTS
    
    %% Management Flow
    TEMPLATES --> RULES
    VALIDATOR --> RULES
    SETTINGS --> RULES
    SETTINGS --> FILTER
    
    %% Integration Flow
    STATE -.->|Health Signals| BACKUP_SIG
    EVAL -.->|Performance Impact| PERF_FEEDBACK
    BROKER -.->|Suggestions| MITIGATION
    
    %% History and Analysis
    LOG --> HISTORY
    DASH_ALERTS --> HISTORY
    
    classDef metrics fill:#ddd,stroke:#999,stroke-width:1px
    classDef engine fill:#74b9ff,stroke:#0984e3,stroke-width:2px
    classDef notification fill:#00b894,stroke:#00a085,stroke-width:2px
    classDef ui fill:#fd79a8,stroke:#e84393,stroke-width:2px
    classDef integration fill:#fdcb6e,stroke:#e17055,stroke-width:2px
    
    class SYS_M,MOD_M,UX_M,NET_M metrics
    class EVAL,STATE,FILTER,RULES engine
    class BROKER,TOAST,SOUND,LOG notification
    class DASH_ALERTS,SETTINGS,HISTORY ui
    class BACKUP_SIG,PERF_FEEDBACK,MITIGATION integration
```

## Alert Processing Sequence

```mermaid
sequenceDiagram
    participant M as Metrics Stream
    participant E as Rule Evaluator
    participant S as State Manager
    participant F as Alert Filter
    participant B as Notification Broker
    participant U as User Interface
    participant L as Alert Log

    Note over M,L: Alert Processing Flow (≤2ms per evaluation)

    M->>E: Metric Update<br/>{cpu: 87%, fps: 56}
    E->>E: Evaluate Rules<br/>Check thresholds & windows
    
    alt Rule Triggered
        E->>S: Alert Candidate<br/>{rule: "fps_cpu_pressure", severity: "warning"}
        S->>S: Check Debouncing<br/>Prevent alert spam
        S->>S: Update State<br/>Track escalation
        
        alt Not Debounced
            S->>F: Alert Ready<br/>{id: "alert_001", type: "performance"}
            F->>F: Apply User Filters<br/>Severity, categories
            
            alt Passes Filter
                F->>B: Deliver Alert<br/>{message: "Frame budget breach + high CPU"}
                
                par Notification Delivery
                    B->>U: Toast Notification<br/>Desktop popup
                and
                    B->>U: Dashboard Update<br/>Visual indicator
                and
                    B->>L: Log Entry<br/>Audit record
                end
                
                B->>U: Mitigation Suggestion<br/>"Consider reducing model parallel tasks"
            else Filtered Out
                F->>L: Suppressed Alert<br/>Log for analysis
            end
        else Debounced
            S->>L: Debounced Event<br/>State tracking only
        end
    else Rule Not Triggered
        E->>S: No Alert<br/>Continue monitoring
    end
```

## Alert Rule DSL Examples

### 1. Frame Budget Violation Alert
```json
{
  "id": "rule.frame_budget_breach",
  "version": "1.0",
  "name": "Frame Budget Breach",
  "description": "Detects sustained frame timing violations",
  "enabled": true,
  "severity": "warning",
  "conditions": {
    "when_all": [
      {
        "metric": "ui.frame_time_ms.p95",
        "operator": ">",
        "value": 16.67,
        "window": "10s"
      },
      {
        "metric": "ui.dropped_frames",
        "operator": ">",
        "value": 2,
        "window": "10s"
      }
    ]
  },
  "actions": [
    {
      "type": "notify.toast",
      "level": "warning",
      "message": "Frame budget exceeded - UI performance degraded",
      "duration_ms": 5000
    },
    {
      "type": "suggest.mitigation",
      "target": "performance.reduce_quality",
      "message": "Consider reducing visual quality or model load"
    },
    {
      "type": "log.audit",
      "category": "performance",
      "details": "sustained_frame_budget_breach"
    }
  ],
  "debounce": {
    "cooldown_ms": 30000,
    "max_frequency": "1_per_minute"
  },
  "privacy": "local_only",
  "user_configurable": true
}
```

### 2. Model Performance Degradation Alert
```json
{
  "id": "rule.model_performance_drop",
  "version": "1.0",
  "name": "Model Performance Drop",
  "description": "Detects significant drops in model throughput",
  "enabled": true,
  "severity": "info",
  "conditions": {
    "when_any": [
      {
        "metric": "model.tokens_per_second",
        "operator": "<",
        "value": 10.0,
        "window": "30s",
        "baseline": "5m_avg"
      },
      {
        "metric": "model.ttft_ms",
        "operator": ">",
        "value": 500,
        "window": "30s"
      }
    ]
  },
  "actions": [
    {
      "type": "notify.dashboard",
      "panel": "model_performance",
      "highlight": "throughput_chart"
    },
    {
      "type": "suggest.diagnostic",
      "message": "Run model diagnostics to identify bottlenecks",
      "action": "diagnostics.run_model_check"
    }
  ],
  "debounce": {
    "cooldown_ms": 60000,
    "escalation": {
      "after_count": 3,
      "upgrade_to": "warning"
    }
  },
  "privacy": "local_only",
  "user_configurable": true
}
```

### 3. System Resource Pressure Alert
```json
{
  "id": "rule.resource_pressure",
  "version": "1.0",
  "name": "System Resource Pressure",
  "description": "Multi-resource pressure detection with escalation",
  "enabled": true,
  "severity": "warning",
  "conditions": {
    "when_all": [
      {
        "metric": "system.cpu_percent",
        "operator": ">",
        "value": 85,
        "window": "15s"
      },
      {
        "metric": "system.memory_percent",
        "operator": ">",
        "value": 90,
        "window": "15s"
      }
    ],
    "when_any": [
      {
        "metric": "system.gpu_utilization",
        "operator": ">",
        "value": 95,
        "window": "10s"
      },
      {
        "metric": "ui.frame_time_ms.avg",
        "operator": ">",
        "value": 20,
        "window": "10s"
      }
    ]
  },
  "actions": [
    {
      "type": "notify.toast",
      "level": "warning",
      "message": "High system resource usage detected",
      "duration_ms": 8000
    },
    {
      "type": "notify.sound",
      "sound": "system_warning",
      "volume": 0.7
    },
    {
      "type": "suggest.mitigation",
      "target": "system.reduce_load",
      "message": "Consider pausing non-critical tasks",
      "actions": [
        "models.pause_background",
        "ui.reduce_effects",
        "monitoring.reduce_frequency"
      ]
    },
    {
      "type": "signal.backup",
      "message": "defer_backup_high_load",
      "duration_ms": 300000
    }
  ],
  "debounce": {
    "cooldown_ms": 120000,
    "escalation": {
      "after_duration_ms": 300000,
      "upgrade_to": "critical"
    }
  },
  "privacy": "local_only",
  "user_configurable": true
}
```

## Alert State Management

```mermaid
stateDiagram-v2
    [*] --> Monitoring
    Monitoring --> Triggered: Condition Met
    Triggered --> Debouncing: Check Cooldown
    Debouncing --> Suppressed: Within Cooldown
    Debouncing --> Active: Cooldown Expired
    Suppressed --> Monitoring: Reset
    Active --> Escalated: Escalation Rules
    Active --> Resolved: Condition Cleared
    Escalated --> Resolved: Condition Cleared
    Resolved --> Monitoring: Reset State
    
    Monitoring : Normal monitoring state
    Triggered : Rule condition triggered
    Debouncing : Cooldown period check
    Suppressed : Alert suppressed by debouncing
    Active : Alert delivered to user
    Escalated : Severity increased
    Resolved : Condition no longer met
```

## Notification Delivery System

### Local-Only Notification Types
```mermaid
graph LR
    subgraph "Notification Channels"
        TOAST[Toast Notifications<br/>Desktop popups<br/>Auto-dismiss]
        SOUND[Audio Alerts<br/>System sounds<br/>Volume controlled]
        VISUAL[Visual Indicators<br/>Dashboard badges<br/>Color coding]
        LOG[Persistent Logging<br/>SQLite storage<br/>Searchable history]
    end
    
    subgraph "User Controls"
        ENABLE[Enable/Disable<br/>Per alert type<br/>Global toggle]
        SEVERITY[Severity Filtering<br/>Info/Warning/Critical<br/>Custom thresholds]
        SCHEDULE[Quiet Hours<br/>Time-based rules<br/>Do not disturb]
        CATEGORIES[Category Filters<br/>System/Model/UX<br/>Selective alerts]
    end
    
    ENABLE --> TOAST
    ENABLE --> SOUND
    ENABLE --> VISUAL
    
    SEVERITY --> TOAST
    SEVERITY --> SOUND
    SEVERITY --> VISUAL
    
    SCHEDULE --> TOAST
    SCHEDULE --> SOUND
    
    CATEGORIES --> TOAST
    CATEGORIES --> SOUND
    CATEGORIES --> VISUAL
    
    classDef notification fill:#00b894,stroke:#00a085,stroke-width:2px
    classDef control fill:#fd79a8,stroke:#e84393,stroke-width:2px
    
    class TOAST,SOUND,VISUAL,LOG notification
    class ENABLE,SEVERITY,SCHEDULE,CATEGORIES control
```

## Performance Constraints

### Alert Processing Budget
- **Rule Evaluation**: ≤2ms per metric update
- **State Management**: ≤1ms per alert state change
- **Notification Delivery**: ≤5ms per notification
- **Total Alert Overhead**: ≤1% of system CPU

### Memory Usage Limits
- **Rule Storage**: ≤10MB for all active rules
- **Alert History**: ≤50MB with automatic rotation
- **State Tracking**: ≤5MB for active alert states

### Scalability Constraints
- **Maximum Rules**: 1000 active rules per system
- **Alert Frequency**: Maximum 10 alerts per second
- **History Retention**: 30 days default, user configurable

## Integration with WF-OPS-003 Backup System

### Backup Health Signals
```javascript
// Alert engine signals to backup system
const backupSignals = {
  // System health indicators
  system_healthy: cpu < 60 && memory < 80 && fps > 58,
  
  // Safe backup windows
  safe_backup_window: !activeAlerts.some(a => 
    a.severity === 'critical' || a.category === 'performance'
  ),
  
  // Defer backup recommendations
  defer_backup: {
    high_load: cpu > 85 || memory > 90,
    performance_issues: fps < 55 || frame_time > 18,
    active_critical_alerts: criticalAlerts.length > 0
  }
};
```

## Privacy and Security

### Local-Only Operation
- **No External Calls**: All notifications delivered locally
- **Data Retention**: User-controlled alert history retention
- **Privacy Compliance**: No PII in alert messages by default

### User Control
- **Granular Permissions**: Per-alert-type enable/disable
- **Transparency**: Clear indication of what triggers alerts
- **Reversibility**: All alert settings user-modifiable

---

*This alert flow diagram is part of the WF-OPS-002 asset collection and demonstrates the complete local-first alert processing system.*
