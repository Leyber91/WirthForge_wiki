/**
 * WF-UX-007 Recovery Orchestrator
 * 
 * Core TypeScript module in the backend/orchestrator that coordinates error detection 
 * and recovery actions. Listens to low-level error events and consults Recovery Plan 
 * definitions to execute appropriate recovery strategies.
 */

import { EventEmitter } from 'events';
import { BackupRestoreUtility } from './backup-restore';
import { NetworkWatchdog } from './network-watchdog';

// Type definitions
interface ErrorEvent {
  errorCode: string;
  category: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  timestamp: string;
  context?: Record<string, any>;
  stackTrace?: string;
}

interface RecoveryPlan {
  errorCode: string;
  autoRetry: boolean;
  maxRetries: number;
  retryInterval: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  backoffMultiplier: number;
  fallbackMode: 'none' | 'limitedUI' | 'offlineMode' | 'safeMode' | 'emergencyMode';
  userPrompt: 'none' | 'notification' | 'dialog' | 'modal' | 'emergency';
  preserveState: boolean;
  backupRequired: boolean;
  isolateComponent: boolean;
  restartRequired: boolean;
  escalationThreshold: number;
  recoveryActions: RecoveryAction[];
  userOptions: UserOption[];
  monitoring: MonitoringConfig;
}

interface RecoveryAction {
  action: 'retry' | 'restart' | 'fallback' | 'isolate' | 'backup' | 'restore' | 'cleanup' | 'notify' | 'escalate' | 'shutdown';
  target: string;
  parameters?: Record<string, any>;
  timeout: number;
  onSuccess?: string;
  onFailure?: string;
}

interface UserOption {
  label: string;
  action: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  recommended: boolean;
}

interface MonitoringConfig {
  healthCheck: boolean;
  healthCheckInterval: number;
  alertThreshold: number;
  metrics: string[];
}

interface RecoveryState {
  errorCode: string;
  retryCount: number;
  startTime: number;
  lastAttempt: number;
  escalated: boolean;
  userNotified: boolean;
  backupCreated: boolean;
  fallbackActive: boolean;
}

class RecoveryManager extends EventEmitter {
  private recoveryPlans: Map<string, RecoveryPlan> = new Map();
  private activeRecoveries: Map<string, RecoveryState> = new Map();
  private backupUtility: BackupRestoreUtility;
  private networkWatchdog: NetworkWatchdog;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown: boolean = false;

  constructor() {
    super();
    this.backupUtility = new BackupRestoreUtility();
    this.networkWatchdog = new NetworkWatchdog();
    this.setupEventListeners();
    this.loadRecoveryPlans();
  }

  /**
   * Initialize the recovery manager and start monitoring
   */
  public async initialize(): Promise<void> {
    try {
      await this.backupUtility.initialize();
      await this.networkWatchdog.initialize();
      
      // Start health monitoring
      this.startGlobalHealthMonitoring();
      
      this.emit('initialized');
      console.log('Recovery Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Recovery Manager:', error);
      throw error;
    }
  }

  /**
   * Handle incoming error events
   */
  public async handleError(errorEvent: ErrorEvent): Promise<void> {
    if (this.isShuttingDown) {
      console.log('Ignoring error during shutdown:', errorEvent.errorCode);
      return;
    }

    try {
      // Log the error
      await this.logError(errorEvent);

      // Get recovery plan
      const plan = this.getRecoveryPlan(errorEvent.errorCode);
      if (!plan) {
        console.warn(`No recovery plan found for error: ${errorEvent.errorCode}`);
        await this.handleUnknownError(errorEvent);
        return;
      }

      // Check if already handling this error
      const recoveryKey = `${errorEvent.errorCode}_${errorEvent.source}`;
      let recoveryState = this.activeRecoveries.get(recoveryKey);

      if (!recoveryState) {
        // Initialize new recovery
        recoveryState = {
          errorCode: errorEvent.errorCode,
          retryCount: 0,
          startTime: Date.now(),
          lastAttempt: 0,
          escalated: false,
          userNotified: false,
          backupCreated: false,
          fallbackActive: false
        };
        this.activeRecoveries.set(recoveryKey, recoveryState);
      }

      // Execute recovery strategy
      await this.executeRecoveryPlan(plan, recoveryState, errorEvent);

    } catch (error) {
      console.error('Error in recovery handling:', error);
      await this.escalateToEmergencyMode(errorEvent);
    }
  }

  /**
   * Execute a recovery plan
   */
  private async executeRecoveryPlan(
    plan: RecoveryPlan, 
    state: RecoveryState, 
    errorEvent: ErrorEvent
  ): Promise<void> {
    const now = Date.now();

    // Check if we should escalate immediately
    if (plan.userPrompt === 'emergency' || errorEvent.severity === 'critical') {
      await this.escalateToUser(plan, state, errorEvent);
      return;
    }

    // Check retry limits
    if (state.retryCount >= plan.maxRetries) {
      await this.escalateToUser(plan, state, errorEvent);
      return;
    }

    // Check escalation threshold
    if (state.retryCount >= plan.escalationThreshold && !state.escalated) {
      state.escalated = true;
      await this.escalateToUser(plan, state, errorEvent);
      return;
    }

    // Execute auto-recovery if enabled
    if (plan.autoRetry && state.retryCount < plan.maxRetries) {
      await this.executeAutoRecovery(plan, state, errorEvent);
    } else {
      await this.escalateToUser(plan, state, errorEvent);
    }
  }

  /**
   * Execute automatic recovery actions
   */
  private async executeAutoRecovery(
    plan: RecoveryPlan, 
    state: RecoveryState, 
    errorEvent: ErrorEvent
  ): Promise<void> {
    state.retryCount++;
    state.lastAttempt = Date.now();

    // Calculate backoff delay
    const delay = this.calculateBackoffDelay(plan, state.retryCount);
    
    if (delay > 0) {
      await this.sleep(delay);
    }

    // Create backup if required
    if (plan.backupRequired && !state.backupCreated) {
      try {
        await this.backupUtility.createBackup(`recovery_${errorEvent.errorCode}_${Date.now()}`);
        state.backupCreated = true;
      } catch (backupError) {
        console.error('Backup failed during recovery:', backupError);
      }
    }

    // Execute recovery actions
    for (const action of plan.recoveryActions) {
      try {
        const success = await this.executeRecoveryAction(action, errorEvent);
        
        if (success && action.onSuccess) {
          await this.handleActionResult(action.onSuccess, plan, state, errorEvent);
          return;
        } else if (!success && action.onFailure) {
          await this.handleActionResult(action.onFailure, plan, state, errorEvent);
          return;
        }
      } catch (actionError) {
        console.error(`Recovery action ${action.action} failed:`, actionError);
        
        if (action.onFailure) {
          await this.handleActionResult(action.onFailure, plan, state, errorEvent);
          return;
        }
      }
    }

    // If we get here, recovery actions completed but didn't explicitly succeed
    // Schedule next retry or escalate
    if (state.retryCount < plan.maxRetries) {
      // Will retry on next error occurrence
      console.log(`Recovery attempt ${state.retryCount} completed, waiting for next occurrence`);
    } else {
      await this.escalateToUser(plan, state, errorEvent);
    }
  }

  /**
   * Execute a specific recovery action
   */
  private async executeRecoveryAction(action: RecoveryAction, errorEvent: ErrorEvent): Promise<boolean> {
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Action timeout')), action.timeout);
    });

    const actionPromise = this.performAction(action, errorEvent);

    try {
      return await Promise.race([actionPromise, timeoutPromise]);
    } catch (error) {
      console.error(`Action ${action.action} failed or timed out:`, error);
      return false;
    }
  }

  /**
   * Perform the actual recovery action
   */
  private async performAction(action: RecoveryAction, errorEvent: ErrorEvent): Promise<boolean> {
    switch (action.action) {
      case 'retry':
        return await this.retryOperation(action.target, action.parameters);
      
      case 'restart':
        return await this.restartComponent(action.target, action.parameters);
      
      case 'fallback':
        return await this.activateFallback(action.target, action.parameters);
      
      case 'isolate':
        return await this.isolateComponent(action.target, action.parameters);
      
      case 'backup':
        return await this.createBackup(action.target, action.parameters);
      
      case 'restore':
        return await this.restoreFromBackup(action.target, action.parameters);
      
      case 'cleanup':
        return await this.performCleanup(action.target, action.parameters);
      
      case 'notify':
        return await this.notifyUser(action.target, action.parameters, errorEvent);
      
      case 'escalate':
        return await this.escalateError(action.target, action.parameters, errorEvent);
      
      case 'shutdown':
        return await this.performShutdown(action.target, action.parameters);
      
      default:
        console.warn(`Unknown recovery action: ${action.action}`);
        return false;
    }
  }

  /**
   * Escalate error to user interface
   */
  private async escalateToUser(
    plan: RecoveryPlan, 
    state: RecoveryState, 
    errorEvent: ErrorEvent
  ): Promise<void> {
    if (state.userNotified) {
      return; // Already notified
    }

    state.userNotified = true;

    const userMessage = {
      errorCode: errorEvent.errorCode,
      severity: errorEvent.severity,
      message: errorEvent.message,
      options: plan.userOptions,
      promptType: plan.userPrompt,
      retryCount: state.retryCount,
      maxRetries: plan.maxRetries,
      timestamp: new Date().toISOString()
    };

    // Send to UI via WebSocket or event system
    this.emit('userEscalation', userMessage);

    // Activate fallback mode if specified
    if (plan.fallbackMode !== 'none') {
      await this.activateFallbackMode(plan.fallbackMode, errorEvent);
    }
  }

  /**
   * Handle user response to error escalation
   */
  public async handleUserResponse(
    errorCode: string, 
    action: string, 
    parameters?: Record<string, any>
  ): Promise<void> {
    const plan = this.getRecoveryPlan(errorCode);
    if (!plan) {
      console.warn(`No recovery plan found for user response: ${errorCode}`);
      return;
    }

    try {
      switch (action) {
        case 'manualRetry':
          await this.handleManualRetry(errorCode);
          break;
        
        case 'enableOfflineMode':
          await this.activateFallbackMode('offlineMode', { errorCode } as ErrorEvent);
          break;
        
        case 'restartAI':
          await this.restartComponent('aiModel', parameters);
          break;
        
        case 'restartPlugin':
          await this.restartComponent('plugin', parameters);
          break;
        
        case 'exportSession':
          await this.backupUtility.exportUserSession();
          break;
        
        case 'emergencyRestart':
          await this.performEmergencyRestart();
          break;
        
        default:
          console.warn(`Unknown user action: ${action}`);
      }
    } catch (error) {
      console.error('Error handling user response:', error);
    }
  }

  /**
   * Calculate backoff delay for retries
   */
  private calculateBackoffDelay(plan: RecoveryPlan, retryCount: number): number {
    switch (plan.backoffStrategy) {
      case 'linear':
        return plan.retryInterval * retryCount;
      
      case 'exponential':
        return plan.retryInterval * Math.pow(plan.backoffMultiplier, retryCount - 1);
      
      case 'fixed':
      default:
        return plan.retryInterval;
    }
  }

  /**
   * Load recovery plans from configuration
   */
  private async loadRecoveryPlans(): Promise<void> {
    try {
      // In a real implementation, this would load from a configuration file
      // For now, we'll use the predefined plans from the schema
      const defaultPlans = await this.getDefaultRecoveryPlans();
      
      for (const plan of defaultPlans) {
        this.recoveryPlans.set(plan.errorCode, plan);
      }
      
      console.log(`Loaded ${this.recoveryPlans.size} recovery plans`);
    } catch (error) {
      console.error('Failed to load recovery plans:', error);
    }
  }

  /**
   * Get recovery plan for error code
   */
  private getRecoveryPlan(errorCode: string): RecoveryPlan | undefined {
    return this.recoveryPlans.get(errorCode);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for network events
    this.networkWatchdog.on('connectionLost', (event) => {
      this.handleError({
        errorCode: 'NET_002',
        category: 'network',
        severity: 'error',
        message: 'WebSocket connection lost',
        source: 'networkWatchdog',
        timestamp: new Date().toISOString(),
        context: event
      });
    });

    // Listen for system events
    process.on('uncaughtException', (error) => {
      this.handleError({
        errorCode: 'SYS_999',
        category: 'system',
        severity: 'critical',
        message: `Uncaught exception: ${error.message}`,
        source: 'process',
        timestamp: new Date().toISOString(),
        stackTrace: error.stack
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.handleError({
        errorCode: 'SYS_998',
        category: 'system',
        severity: 'error',
        message: `Unhandled promise rejection: ${reason}`,
        source: 'process',
        timestamp: new Date().toISOString(),
        context: { promise: promise.toString() }
      });
    });
  }

  /**
   * Utility methods for recovery actions
   */
  private async retryOperation(target: string, parameters?: Record<string, any>): Promise<boolean> {
    // Implementation depends on the target operation
    console.log(`Retrying operation: ${target}`, parameters);
    return true; // Placeholder
  }

  private async restartComponent(target: string, parameters?: Record<string, any>): Promise<boolean> {
    console.log(`Restarting component: ${target}`, parameters);
    // Implementation would restart the specified component
    return true; // Placeholder
  }

  private async activateFallback(target: string, parameters?: Record<string, any>): Promise<boolean> {
    console.log(`Activating fallback: ${target}`, parameters);
    return true; // Placeholder
  }

  private async isolateComponent(target: string, parameters?: Record<string, any>): Promise<boolean> {
    console.log(`Isolating component: ${target}`, parameters);
    return true; // Placeholder
  }

  private async createBackup(target: string, parameters?: Record<string, any>): Promise<boolean> {
    try {
      await this.backupUtility.createBackup(`${target}_${Date.now()}`);
      return true;
    } catch (error) {
      console.error('Backup creation failed:', error);
      return false;
    }
  }

  private async restoreFromBackup(target: string, parameters?: Record<string, any>): Promise<boolean> {
    try {
      await this.backupUtility.restoreBackup(parameters?.backupId);
      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      return false;
    }
  }

  private async performCleanup(target: string, parameters?: Record<string, any>): Promise<boolean> {
    console.log(`Performing cleanup: ${target}`, parameters);
    return true; // Placeholder
  }

  private async notifyUser(target: string, parameters?: Record<string, any>, errorEvent?: ErrorEvent): Promise<boolean> {
    this.emit('userNotification', {
      target,
      parameters,
      errorEvent,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  private async escalateError(target: string, parameters?: Record<string, any>, errorEvent?: ErrorEvent): Promise<boolean> {
    this.emit('errorEscalation', {
      target,
      parameters,
      errorEvent,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  private async performShutdown(target: string, parameters?: Record<string, any>): Promise<boolean> {
    console.log(`Performing shutdown: ${target}`, parameters);
    this.isShuttingDown = true;
    return true;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async logError(errorEvent: ErrorEvent): Promise<void> {
    // Log to local file system or logging service
    console.error('Error logged:', errorEvent);
  }

  private async handleUnknownError(errorEvent: ErrorEvent): Promise<void> {
    // Handle errors without specific recovery plans
    console.warn('Unknown error, applying default handling:', errorEvent);
  }

  private async escalateToEmergencyMode(errorEvent: ErrorEvent): Promise<void> {
    console.error('Escalating to emergency mode:', errorEvent);
    this.emit('emergencyMode', errorEvent);
  }

  private async activateFallbackMode(mode: string, errorEvent: ErrorEvent): Promise<void> {
    console.log(`Activating fallback mode: ${mode}`, errorEvent);
    this.emit('fallbackModeActivated', { mode, errorEvent });
  }

  private async handleManualRetry(errorCode: string): Promise<void> {
    // Reset retry counters for manual retry
    const recoveryKey = Object.keys(this.activeRecoveries).find(key => key.startsWith(errorCode));
    if (recoveryKey) {
      const state = this.activeRecoveries.get(recoveryKey);
      if (state) {
        state.retryCount = 0;
        state.escalated = false;
        state.userNotified = false;
      }
    }
  }

  private async performEmergencyRestart(): Promise<void> {
    try {
      // Create emergency backup
      await this.backupUtility.createEmergencyBackup();
      
      // Notify about restart
      this.emit('emergencyRestart', { timestamp: new Date().toISOString() });
      
      // Perform restart (implementation specific)
      console.log('Emergency restart initiated');
    } catch (error) {
      console.error('Emergency restart failed:', error);
    }
  }

  private startGlobalHealthMonitoring(): void {
    // Start periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    // Check system health and emit events if issues detected
    try {
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      if (memoryPercent > 90) {
        await this.handleError({
          errorCode: 'SYS_001',
          category: 'system',
          severity: 'warning',
          message: `High memory usage: ${memoryPercent.toFixed(1)}%`,
          source: 'healthCheck',
          timestamp: new Date().toISOString(),
          context: { memoryUsage }
        });
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  private async getDefaultRecoveryPlans(): Promise<RecoveryPlan[]> {
    // Return default recovery plans (would normally load from config)
    return []; // Placeholder - would load from WF-UX-007-recovery-plans.json
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    // Clear all intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    
    // Shutdown components
    await this.networkWatchdog.shutdown();
    await this.backupUtility.shutdown();
    
    console.log('Recovery Manager shutdown complete');
  }
}

export { RecoveryManager, ErrorEvent, RecoveryPlan, RecoveryAction, UserOption };
