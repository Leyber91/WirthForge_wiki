# WF-TECH-009 Web Dashboard Specifications

## Overview
Real-time observability dashboard for WIRTHFORGE local-core architecture, providing comprehensive system monitoring through a web-based interface served from the local WIRTHFORGE web server.

## Dashboard Architecture

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ WIRTHFORGE Observability Dashboard                         │
├─────────────────────────────────────────────────────────────┤
│ [Performance] [Energy] [Alerts] [History] [Settings]       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │ Frame Rate  │ │ Latency     │ │ Energy      │           │
│ │ Gauge       │ │ Chart       │ │ Fidelity    │           │
│ │ 60 FPS      │ │ P95: 1.2s   │ │ 95%         │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ System Performance Timeline (Last 60 minutes)        │   │
│ │ [Interactive Chart with Frame Rate, Latency, CPU]    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │ Error Count │ │ Resource    │ │ Progression │           │
│ │ 0 errors    │ │ Usage       │ │ Level 3     │           │
│ │ Last hour   │ │ CPU: 45%    │ │ 0.8 lvl/hr  │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 1. Performance Tab (Default View)

**Frame Rate Gauge**
- Circular gauge displaying current FPS (0-120 range)
- Color zones: Green (55-60), Yellow (45-55), Red (<45)
- Real-time updates every 100ms
- Target line at 60 FPS with 16.67ms frame budget indicator

**Latency Chart**
- Line chart showing P50, P95, P99 latencies over time
- 60-second rolling window
- Horizontal threshold lines at 1s (target) and 2s (alert)
- Tooltip showing breakdown: Model, DECIPHER, UI render times

**Energy Fidelity Meter**
- Circular progress indicator (0-100%)
- Color coding: Green (>90%), Yellow (80-90%), Red (<80%)
- Particle count and token ratio display
- Visual lag indicator in milliseconds

#### 2. Energy Tab

**Energy Flow Visualization**
- Real-time particle animation showing energy flow
- Energy units per second counter
- Coherence score with historical trend
- Visual-to-computed energy ratio graph

**Energy Metrics Grid**
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Visual Energy   │ Computed Energy │ Fidelity Ratio │
│ 1,250 EU        │ 1,315 EU        │ 95.1%          │
├─────────────────┼─────────────────┼─────────────────┤
│ Particle Count  │ Token/Particle  │ Visual Lag     │
│ 847 particles   │ 1.2:1           │ 5.2ms          │
└─────────────────┴─────────────────┴─────────────────┘
```

#### 3. Alerts Tab

**Active Alerts Panel**
- List of current alerts with severity indicators
- Alert details: metric, threshold, current value, duration
- Quick action buttons: Acknowledge, Snooze, Adjust Threshold

**Alert History**
- Chronological list of recent alerts
- Filter by severity, metric type, time range
- Export functionality for troubleshooting

#### 4. History Tab

**Time Range Selector**
- Last hour, 6 hours, 24 hours, 7 days
- Custom date/time range picker

**Historical Charts**
- Multi-metric overlay charts
- Session comparison view
- Trend analysis with regression lines
- Export data as JSON/CSV

#### 5. Settings Tab

**Alert Configuration**
- Threshold adjustment sliders
- Enable/disable specific alerts
- Notification preferences
- Auto-adaptation settings

**Display Preferences**
- Update frequency (100ms to 5s)
- Chart styles and colors
- Accessibility options
- Dashboard layout customization

## Real-Time Data Flow

### WebSocket Integration
```javascript
// WebSocket connection for real-time metrics
const metricsSocket = new WebSocket('ws://localhost:8080/metrics');

metricsSocket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateDashboard(data);
};

// Metrics update structure
{
  "type": "metrics_update",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "data": {
    "frame_rate": 58.5,
    "latency_p95": 1250,
    "energy_fidelity": 0.92,
    "alerts": [...],
    "resource_usage": {...}
  }
}
```

### Update Frequencies
- **High Priority Metrics** (100ms): Frame rate, current latency
- **Medium Priority Metrics** (1s): Resource usage, error counts
- **Low Priority Metrics** (5s): Historical aggregations, trends

## UI/UX Design Principles

### Visual Design
- **Color Palette**: WIRTHFORGE Three Doors theme
  - Primary: #1E3A8A (Deep Blue)
  - Success: #10B981 (Green)
  - Warning: #F59E0B (Amber)
  - Error: #EF4444 (Red)
  - Background: #0F172A (Dark Slate)

### Accessibility Features
- WCAG 2.2 AA compliance
- High contrast mode support
- Screen reader compatibility
- Keyboard navigation
- Reduced motion options
- Color-blind friendly indicators

### Responsive Design
- Desktop-first approach (primary use case)
- Tablet compatibility for portable monitoring
- Mobile view for basic status checking
- Minimum resolution: 1024x768

## Component Implementation

### React Component Structure
```jsx
// Main Dashboard Component
const ObservabilityDashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [activeTab, setActiveTab] = useState('performance');
  const [alerts, setAlerts] = useState([]);

  return (
    <div className="dashboard-container">
      <DashboardHeader />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === 'performance' && (
        <PerformanceTab metrics={metrics} alerts={alerts} />
      )}
      {activeTab === 'energy' && (
        <EnergyTab metrics={metrics} />
      )}
      {activeTab === 'alerts' && (
        <AlertsTab alerts={alerts} />
      )}
      {activeTab === 'history' && (
        <HistoryTab />
      )}
      {activeTab === 'settings' && (
        <SettingsTab />
      )}
    </div>
  );
};
```

### Chart Library Integration
- **Primary**: Chart.js with React wrapper
- **Alternative**: D3.js for custom visualizations
- **Performance**: Canvas rendering for 60Hz updates
- **Accessibility**: Chart.js accessibility plugin

## Performance Considerations

### Rendering Optimization
- Virtual scrolling for large datasets
- Canvas-based charts for smooth animations
- Debounced updates to prevent UI stuttering
- Web Workers for heavy calculations

### Memory Management
- Circular buffers for real-time data
- Automatic cleanup of old chart data
- Lazy loading of historical data
- Efficient DOM updates using React hooks

### Network Efficiency
- WebSocket compression
- Delta updates (only changed metrics)
- Configurable update rates
- Graceful degradation on slow connections

## Integration Points

### API Endpoints
```
GET  /api/metrics/current          - Current metrics snapshot
GET  /api/metrics/history          - Historical metrics data
GET  /api/alerts/active            - Active alerts
POST /api/alerts/acknowledge       - Acknowledge alert
GET  /api/config/thresholds        - Alert thresholds
PUT  /api/config/thresholds        - Update thresholds
```

### WebSocket Channels
```
/metrics          - Real-time metrics updates
/alerts           - Alert notifications
/system           - System status updates
```

### Local Storage
- Dashboard preferences
- Custom threshold configurations
- View state persistence
- Offline data caching

## Security Considerations

### Local-First Security
- All communication over localhost
- Optional HTTPS for local connections
- Authentication token validation
- CORS protection for local resources

### Data Privacy
- No external analytics tracking
- Local-only data storage
- User-controlled data export
- Configurable data retention

## Testing Strategy

### Unit Tests
- Component rendering tests
- Metrics calculation validation
- WebSocket connection handling
- Alert threshold logic

### Integration Tests
- End-to-end dashboard functionality
- Real-time data flow validation
- Cross-browser compatibility
- Performance under load

### Accessibility Tests
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation
- Motion sensitivity compliance

## Deployment Integration

### Build Process
- Webpack bundling with code splitting
- CSS optimization and minification
- Asset compression and caching
- Development vs production builds

### Local Server Integration
- Express.js route handlers
- WebSocket server setup
- Static asset serving
- API middleware integration

This specification provides the foundation for a comprehensive, user-friendly observability dashboard that maintains WIRTHFORGE's local-first principles while delivering enterprise-grade monitoring capabilities.
