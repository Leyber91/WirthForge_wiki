# WF-UX-007 Error Handling Integration Guide

## Overview

This guide provides comprehensive integration instructions for implementing the WF-UX-007 Error Handling and Recovery framework in WIRTHFORGE applications. The framework ensures transparent failure handling, user trust preservation, and seamless recovery from errors at all system levels.

## Architecture Integration

### Core Components Integration

```typescript
// Main application integration
import ErrorBoundary from 'assets/code/WF-UX-007/error-boundary.tsx';
import { RecoveryManager } from 'assets/code/WF-UX-007/recovery-manager';
import { NetworkWatchdog } from 'assets/code/WF-UX-007/network-watchdog';
import { BackupRestoreUtility } from 'assets/code/WF-UX-007/backup-restore';

class WirthForgeErrorSystem {
  private recoveryManager: RecoveryManager;
  private networkWatchdog: NetworkWatchdog;
  private backupUtility: BackupRestoreUtility;

  constructor() {
    this.recoveryManager = new RecoveryManager();
    this.networkWatchdog = new NetworkWatchdog({
      url: 'ws://localhost:8080/ws',
      heartbeatInterval: 30000,
      maxReconnectAttempts: 5
    });
    this.backupUtility = new BackupRestoreUtility({
      backupDirectory: './data/backups',
      maxBackups: 50,
      backupInterval: 300000 // 5 minutes
    });

    this.setupIntegration();
  }

  private async setupIntegration() {
    // Initialize all components
    await this.recoveryManager.initialize();
    await this.networkWatchdog.initialize();
    await this.backupUtility.initialize();

    // Connect network events to recovery manager
    this.networkWatchdog.on('connectionLost', (event) => {
      this.recoveryManager.handleError({
        errorCode: 'NET_002',
        category: 'network',
        severity: 'error',
        message: 'WebSocket connection lost',
        source: 'networkWatchdog',
        timestamp: new Date().toISOString(),
        context: event
      });
    });

    // Connect recovery events to UI
    this.recoveryManager.on('userEscalation', (event) => {
      this.showErrorDialog(event);
    });

    this.recoveryManager.on('fallbackModeActivated', (event) => {
      this.activateUIFallback(event.mode);
    });
  }

  private showErrorDialog(errorEvent: any) {
    // Display user-friendly error dialog
    console.log('Showing error dialog:', errorEvent);
  }

  private activateUIFallback(mode: string) {
    // Activate appropriate UI fallback mode
    console.log('Activating fallback mode:', mode);
  }
}
```

### React Application Integration

```tsx
// App.tsx - Root application component
import React from 'react';
import ErrorBoundary, { setupGlobalErrorHandling } from 'assets/code/WF-UX-007/error-boundary.tsx';
import { WirthForgeErrorSystem } from './error-system';

// Setup global error handling
setupGlobalErrorHandling();

// Initialize error system
const errorSystem = new WirthForgeErrorSystem();

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Report to recovery manager
        errorSystem.reportError({
          errorCode: 'UI_001',
          category: 'uiComponent',
          severity: 'error',
          message: error.message,
          source: 'reactApp',
          timestamp: new Date().toISOString(),
          stackTrace: error.stack,
          context: { componentStack: errorInfo.componentStack }
        });
      }}
    >
      <div className="app">
        <Header />
        <MainContent />
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

// Component-level error boundaries
function MainContent() {
  return (
    <ErrorBoundary fallbackComponent={<SimpleFallback />}>
      <EnergyVisualization />
      <ChatInterface />
      <PluginContainer />
    </ErrorBoundary>
  );
}

function SimpleFallback() {
  return (
    <div className="simple-fallback">
      <h3>Feature temporarily unavailable</h3>
      <p>We're working to restore this feature. Core functionality remains available.</p>
    </div>
  );
}
```

### AI Engine Integration

```typescript
// ai-engine-wrapper.ts
import { RecoveryManager } from 'assets/code/WF-UX-007/recovery-manager';

class AIEngineWrapper {
  private recoveryManager: RecoveryManager;
  private aiProcess: any = null;

  constructor(recoveryManager: RecoveryManager) {
    this.recoveryManager = recoveryManager;
    this.setupAIErrorHandling();
  }

  private setupAIErrorHandling() {
    // Monitor AI process health
    setInterval(() => {
      this.checkAIHealth();
    }, 10000); // Every 10 seconds
  }

  private async checkAIHealth() {
    try {
      if (!this.aiProcess || !this.aiProcess.isAlive()) {
        await this.recoveryManager.handleError({
          errorCode: 'AI_003',
          category: 'aiModel',
          severity: 'error',
          message: 'AI model process is not responding',
          source: 'aiEngine',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      await this.recoveryManager.handleError({
        errorCode: 'AI_001',
        category: 'aiModel',
        severity: 'critical',
        message: `AI health check failed: ${error.message}`,
        source: 'aiEngine',
        timestamp: new Date().toISOString(),
        stackTrace: error.stack
      });
    }
  }

  async processPrompt(prompt: string): Promise<string> {
    try {
      const response = await this.aiProcess.generate(prompt);
      return response;
    } catch (error) {
      // Report AI processing error
      await this.recoveryManager.handleError({
        errorCode: 'AI_002',
        category: 'aiModel',
        severity: 'warning',
        message: `AI processing failed: ${error.message}`,
        source: 'aiEngine',
        timestamp: new Date().toISOString(),
        context: { prompt: prompt.substring(0, 100) }
      });
      
      // Return fallback response
      return "I'm experiencing technical difficulties. Please try again.";
    }
  }
}
```

### Plugin System Integration

```typescript
// plugin-manager.ts
import { RecoveryManager } from 'assets/code/WF-UX-007/recovery-manager';

class PluginManager {
  private recoveryManager: RecoveryManager;
  private activePlugins: Map<string, any> = new Map();

  constructor(recoveryManager: RecoveryManager) {
    this.recoveryManager = recoveryManager;
  }

  async loadPlugin(pluginId: string, pluginCode: string): Promise<boolean> {
    try {
      // Create sandboxed environment
      const sandbox = this.createPluginSandbox(pluginId);
      
      // Load plugin in sandbox
      const plugin = await sandbox.load(pluginCode);
      
      // Monitor plugin resource usage
      this.monitorPlugin(pluginId, sandbox);
      
      this.activePlugins.set(pluginId, { plugin, sandbox });
      return true;
      
    } catch (error) {
      await this.recoveryManager.handleError({
        errorCode: 'PLG_001',
        category: 'plugin',
        severity: 'warning',
        message: `Plugin load failed: ${error.message}`,
        source: 'pluginManager',
        timestamp: new Date().toISOString(),
        context: { pluginId }
      });
      return false;
    }
  }

  private monitorPlugin(pluginId: string, sandbox: any) {
    // Monitor resource usage
    setInterval(() => {
      const usage = sandbox.getResourceUsage();
      
      if (usage.memory > sandbox.memoryLimit) {
        this.recoveryManager.handleError({
          errorCode: 'PLG_003',
          category: 'plugin',
          severity: 'warning',
          message: 'Plugin exceeded memory limit',
          source: 'pluginManager',
          timestamp: new Date().toISOString(),
          context: { pluginId, memoryUsage: usage.memory }
        });
      }
      
      if (usage.cpu > sandbox.cpuLimit) {
        this.recoveryManager.handleError({
          errorCode: 'PLG_003',
          category: 'plugin',
          severity: 'warning',
          message: 'Plugin exceeded CPU limit',
          source: 'pluginManager',
          timestamp: new Date().toISOString(),
          context: { pluginId, cpuUsage: usage.cpu }
        });
      }
    }, 5000);
  }

  private createPluginSandbox(pluginId: string): any {
    // Create isolated sandbox with resource limits
    return {
      memoryLimit: 128 * 1024 * 1024, // 128MB
      cpuLimit: 80, // 80% CPU
      load: async (code: string) => {
        // Load plugin code safely
      },
      getResourceUsage: () => {
        // Return current resource usage
        return { memory: 0, cpu: 0 };
      }
    };
  }
}
```

## Error Message Integration

### Localized Error Messages

```typescript
// error-messages.ts
import errorMessages from 'assets/schemas/WF-UX-007/WF-UX-007-error-messages.json';

class ErrorMessageService {
  private messages: any;
  private currentLocale: string = 'en';

  constructor() {
    this.messages = errorMessages.definitions.predefinedMessages;
  }

  getMessage(messageId: string, placeholders?: Record<string, any>): string {
    const message = this.messages[messageId];
    if (!message) {
      return `Error: ${messageId}`;
    }

    let text = message.defaultText;
    
    // Replace placeholders
    if (placeholders && message.placeholders) {
      message.placeholders.forEach((placeholder: any) => {
        const value = placeholders[placeholder.key];
        if (value !== undefined) {
          text = text.replace(`{${placeholder.key}}`, value);
        }
      });
    }

    return text;
  }

  getMessageConfig(messageId: string): any {
    return this.messages[messageId];
  }
}

// Usage example
const messageService = new ErrorMessageService();

function showErrorNotification(errorCode: string, context?: any) {
  const messageId = `error.${errorCode.toLowerCase().replace('_', '.')}`;
  const config = messageService.getMessageConfig(messageId);
  const text = messageService.getMessage(messageId, context);

  // Create notification based on config
  const notification = {
    text,
    type: config?.ui?.displayType || 'toast',
    duration: config?.ui?.duration || 5000,
    dismissible: config?.ui?.dismissible !== false,
    icon: config?.ui?.icon,
    color: config?.ui?.color,
    accessibility: {
      announce: config?.accessibility?.announceViaScreenReader,
      priority: config?.accessibility?.priority
    }
  };

  displayNotification(notification);
}
```

### User Interface Integration

```tsx
// ErrorNotification.tsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface ErrorNotificationProps {
  message: string;
  type: 'toast' | 'dialog' | 'modal' | 'banner' | 'inline';
  severity: 'info' | 'warning' | 'error' | 'critical';
  dismissible?: boolean;
  duration?: number;
  onDismiss?: () => void;
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
}

export function ErrorNotification({
  message,
  type,
  severity,
  dismissible = true,
  duration = 5000,
  onDismiss,
  actions = []
}: ErrorNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0 && dismissible) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, dismissible, onDismiss]);

  if (!visible) return null;

  const getIcon = () => {
    switch (severity) {
      case 'info': return <Info size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'error': return <AlertCircle size={20} />;
      case 'critical': return <AlertTriangle size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getColorClass = () => {
    switch (severity) {
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'critical': return 'bg-red-100 border-red-300 text-red-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const baseClasses = `
    flex items-start p-4 border rounded-lg
    ${getColorClass()}
    ${type === 'banner' ? 'w-full' : 'max-w-md'}
  `;

  return (
    <div
      className={baseClasses}
      role="alert"
      aria-live={severity === 'critical' ? 'assertive' : 'polite'}
    >
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        
        {actions.length > 0 && (
          <div className="mt-3 flex gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`
                  px-3 py-1 text-xs font-medium rounded
                  ${action.primary 
                    ? 'bg-current text-white opacity-90 hover:opacity-100'
                    : 'bg-transparent border border-current hover:bg-current hover:text-white'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {dismissible && (
        <button
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="flex-shrink-0 ml-3 text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

## Recovery Workflow Integration

### Automatic Recovery Setup

```typescript
// recovery-workflows.ts
import { RecoveryManager } from 'assets/code/WF-UX-007/recovery-manager';
import recoveryPlans from 'assets/schemas/WF-UX-007/WF-UX-007-recovery-plans.json';

class RecoveryWorkflowManager {
  private recoveryManager: RecoveryManager;

  constructor(recoveryManager: RecoveryManager) {
    this.recoveryManager = recoveryManager;
    this.setupWorkflows();
  }

  private setupWorkflows() {
    // Network recovery workflow
    this.recoveryManager.on('userEscalation', async (event) => {
      if (event.errorCode === 'NET_002') {
        await this.handleNetworkRecovery(event);
      }
    });

    // AI recovery workflow
    this.recoveryManager.on('userEscalation', async (event) => {
      if (event.errorCode.startsWith('AI_')) {
        await this.handleAIRecovery(event);
      }
    });

    // Plugin recovery workflow
    this.recoveryManager.on('userEscalation', async (event) => {
      if (event.errorCode.startsWith('PLG_')) {
        await this.handlePluginRecovery(event);
      }
    });
  }

  private async handleNetworkRecovery(event: any) {
    const options = [
      {
        label: 'Retry Connection',
        action: () => this.recoveryManager.handleUserResponse(event.errorCode, 'manualRetry'),
        primary: true
      },
      {
        label: 'Work Offline',
        action: () => this.recoveryManager.handleUserResponse(event.errorCode, 'enableOfflineMode')
      }
    ];

    this.showRecoveryDialog(event.message, options);
  }

  private async handleAIRecovery(event: any) {
    const options = [
      {
        label: 'Restart AI Engine',
        action: () => this.recoveryManager.handleUserResponse(event.errorCode, 'restartAI'),
        primary: true
      },
      {
        label: 'Use Basic Mode',
        action: () => this.recoveryManager.handleUserResponse(event.errorCode, 'enableFallback')
      }
    ];

    this.showRecoveryDialog(event.message, options);
  }

  private async handlePluginRecovery(event: any) {
    const options = [
      {
        label: 'Restart Plugin',
        action: () => this.recoveryManager.handleUserResponse(event.errorCode, 'restartPlugin'),
        primary: true
      },
      {
        label: 'Disable Plugin',
        action: () => this.recoveryManager.handleUserResponse(event.errorCode, 'disablePlugin')
      }
    ];

    this.showRecoveryDialog(event.message, options);
  }

  private showRecoveryDialog(message: string, options: any[]) {
    // Display recovery dialog with options
    console.log('Recovery dialog:', message, options);
  }
}
```

## Testing Integration

### Automated Error Testing

```typescript
// error-testing-utils.ts
import { RecoveryManager } from 'assets/code/WF-UX-007/recovery-manager';

export class ErrorTestingUtils {
  static async simulateError(
    recoveryManager: RecoveryManager,
    errorCode: string,
    context?: any
  ): Promise<void> {
    const errorEvent = {
      errorCode,
      category: this.getCategoryFromCode(errorCode),
      severity: this.getSeverityFromCode(errorCode),
      message: `Simulated error: ${errorCode}`,
      source: 'testSuite',
      timestamp: new Date().toISOString(),
      context
    };

    await recoveryManager.handleError(errorEvent);
  }

  static getCategoryFromCode(errorCode: string): string {
    const prefix = errorCode.split('_')[0];
    const categoryMap: Record<string, string> = {
      'AI': 'aiModel',
      'NET': 'network',
      'PLG': 'plugin',
      'DAT': 'dataStorage',
      'SYS': 'systemResource',
      'UI': 'uiComponent',
      'USR': 'userInput'
    };
    return categoryMap[prefix] || 'unknown';
  }

  static getSeverityFromCode(errorCode: string): 'info' | 'warning' | 'error' | 'critical' {
    // Determine severity based on error code patterns
    if (errorCode.includes('001') || errorCode.includes('002')) return 'warning';
    if (errorCode.includes('003') || errorCode.includes('004')) return 'error';
    if (errorCode.includes('005')) return 'critical';
    return 'info';
  }

  static async waitForRecovery(
    recoveryManager: RecoveryManager,
    timeout: number = 5000
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeout);
      
      recoveryManager.once('recoverySuccess', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }
}

// Usage in tests
describe('Error Recovery Integration', () => {
  it('should handle AI model errors', async () => {
    const recoveryManager = new RecoveryManager();
    await recoveryManager.initialize();

    await ErrorTestingUtils.simulateError(recoveryManager, 'AI_003');
    const recovered = await ErrorTestingUtils.waitForRecovery(recoveryManager);
    
    expect(recovered).toBe(true);
  });
});
```

## Configuration and Deployment

### Environment Configuration

```typescript
// error-config.ts
export interface ErrorHandlingConfig {
  recoveryPlans: string; // Path to recovery plans JSON
  errorMessages: string; // Path to error messages JSON
  backupDirectory: string;
  maxBackups: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableTelemetry: boolean;
  fallbackModes: {
    network: 'offline' | 'limited';
    ai: 'basic' | 'disabled';
    plugins: 'safe' | 'disabled';
  };
}

export const getErrorConfig = (): ErrorHandlingConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig: ErrorHandlingConfig = {
    recoveryPlans: 'assets/schemas/WF-UX-007/WF-UX-007-recovery-plans.json',
    errorMessages: 'assets/schemas/WF-UX-007/WF-UX-007-error-messages.json',
    backupDirectory: './data/backups',
    maxBackups: 50,
    logLevel: 'info',
    enableTelemetry: false,
    fallbackModes: {
      network: 'offline',
      ai: 'basic',
      plugins: 'safe'
    }
  };

  // Environment-specific overrides
  if (env === 'production') {
    return {
      ...baseConfig,
      logLevel: 'warn',
      maxBackups: 100
    };
  }

  if (env === 'development') {
    return {
      ...baseConfig,
      logLevel: 'debug',
      enableTelemetry: true
    };
  }

  return baseConfig;
};
```

### Monitoring Integration

```typescript
// error-monitoring.ts
import { RecoveryManager } from 'assets/code/WF-UX-007/recovery-manager';

export class ErrorMonitoringService {
  private metrics: Map<string, number> = new Map();
  private recoveryManager: RecoveryManager;

  constructor(recoveryManager: RecoveryManager) {
    this.recoveryManager = recoveryManager;
    this.setupMonitoring();
  }

  private setupMonitoring() {
    this.recoveryManager.on('errorHandled', (event) => {
      this.recordMetric(`error.${event.errorCode}`, 1);
      this.recordMetric(`error.category.${event.category}`, 1);
      this.recordMetric(`error.severity.${event.severity}`, 1);
    });

    this.recoveryManager.on('recoverySuccess', (event) => {
      this.recordMetric(`recovery.success.${event.errorCode}`, 1);
    });

    this.recoveryManager.on('recoveryFailed', (event) => {
      this.recordMetric(`recovery.failed.${event.errorCode}`, 1);
    });

    // Export metrics periodically
    setInterval(() => {
      this.exportMetrics();
    }, 60000); // Every minute
  }

  private recordMetric(key: string, value: number) {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  private exportMetrics() {
    const metricsData = Object.fromEntries(this.metrics);
    
    // Export to local file (local-first approach)
    const fs = require('fs').promises;
    fs.writeFile(
      './data/metrics/error-metrics.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics: metricsData
      }, null, 2)
    ).catch(console.error);

    // Reset metrics after export
    this.metrics.clear();
  }

  getMetricsSummary(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}
```

## Best Practices

### Error Handling Patterns

1. **Fail Fast, Recover Gracefully**
   - Detect errors early in the process
   - Provide immediate user feedback
   - Attempt automatic recovery when possible
   - Escalate to user only when necessary

2. **Preserve User Context**
   - Always backup user state before recovery actions
   - Restore session after successful recovery
   - Maintain conversation history during errors

3. **Transparent Communication**
   - Use clear, non-technical language in error messages
   - Provide actionable recovery options
   - Show progress during recovery operations

4. **Local-First Reliability**
   - Never depend on external services for error handling
   - Store all error logs and backups locally
   - Ensure offline functionality during network errors

### Performance Considerations

1. **Minimize Recovery Overhead**
   - Use efficient backup strategies
   - Implement smart retry logic with backoff
   - Avoid blocking the main UI thread

2. **Resource Management**
   - Monitor plugin resource usage
   - Implement proper cleanup procedures
   - Use memory-efficient error logging

3. **Testing Strategy**
   - Include error scenarios in all test suites
   - Test recovery workflows end-to-end
   - Validate accessibility in error states

This integration guide ensures that the WF-UX-007 Error Handling framework is properly implemented across all WIRTHFORGE components, maintaining user trust through transparent and reliable error recovery.
