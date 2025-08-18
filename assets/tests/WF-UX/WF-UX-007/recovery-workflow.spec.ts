/**
 * WF-UX-007 Recovery Workflow Tests
 * 
 * Test suite for end-to-end recovery processes. Validates multi-step flows like
 * causing a transient error that should auto-retry and succeed on second try,
 * or simulating non-recoverable errors with proper user escalation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RecoveryManager } from '../../../code/WF-UX-007/recovery-manager';
import { NetworkWatchdog } from '../../../code/WF-UX-007/network-watchdog';
import { BackupRestoreUtility } from '../../../code/WF-UX-007/backup-restore';

// Mock external dependencies
jest.mock('ws');
jest.mock('fs/promises');

describe('WF-UX-007 Recovery Workflow Tests', () => {
  let recoveryManager: RecoveryManager;
  let networkWatchdog: NetworkWatchdog;
  let backupUtility: BackupRestoreUtility;
  
  beforeEach(async () => {
    recoveryManager = new RecoveryManager();
    networkWatchdog = new NetworkWatchdog({
      url: 'ws://localhost:8080/test',
      heartbeatInterval: 500,
      maxReconnectAttempts: 3,
      reconnectInterval: 100
    });
    backupUtility = new BackupRestoreUtility({
      backupDirectory: './test-backups',
      maxBackups: 5
    });

    await recoveryManager.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await recoveryManager.shutdown();
    await networkWatchdog.shutdown();
    await backupUtility.shutdown();
  });

  describe('Automatic Recovery Workflows', () => {
    it('should complete successful auto-retry workflow', async () => {
      const events: any[] = [];
      
      // Track recovery events
      recoveryManager.on('autoRetryStarted', (event) => events.push({ type: 'retryStarted', ...event }));
      recoveryManager.on('autoRetrySuccess', (event) => events.push({ type: 'retrySuccess', ...event }));
      recoveryManager.on('userNotification', (event) => events.push({ type: 'notification', ...event }));

      // Simulate transient network error
      const errorEvent = {
        errorCode: 'NET_001',
        category: 'network',
        severity: 'warning' as const,
        message: 'Connection timeout - transient failure',
        source: 'networkWatchdog',
        timestamp: new Date().toISOString(),
        context: { attempt: 1, transient: true }
      };

      // Mock successful retry on second attempt
      let retryCount = 0;
      const mockRetry = jest.fn().mockImplementation(() => {
        retryCount++;
        return retryCount >= 2; // Succeed on second try
      });

      // Inject mock retry function
      (recoveryManager as any).retryOperation = mockRetry;

      await recoveryManager.handleError(errorEvent);

      // Wait for async retry operations
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify workflow progression
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'retryStarted' }),
          expect.objectContaining({ type: 'retrySuccess' })
        ])
      );

      // Verify retry was attempted exactly twice
      expect(mockRetry).toHaveBeenCalledTimes(2);
    });

    it('should escalate after max retries exceeded', async () => {
      const events: any[] = [];
      
      recoveryManager.on('autoRetryFailed', (event) => events.push({ type: 'retryFailed', ...event }));
      recoveryManager.on('userEscalation', (event) => events.push({ type: 'escalation', ...event }));

      const errorEvent = {
        errorCode: 'NET_001',
        category: 'network',
        severity: 'warning' as const,
        message: 'Persistent connection failure',
        source: 'networkWatchdog',
        timestamp: new Date().toISOString()
      };

      // Mock persistent failure
      const mockRetry = jest.fn().mockResolvedValue(false);
      (recoveryManager as any).retryOperation = mockRetry;

      await recoveryManager.handleError(errorEvent);

      // Wait for retry cycles to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify escalation after max retries
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'retryFailed' }),
          expect.objectContaining({ type: 'escalation' })
        ])
      );

      expect(mockRetry).toHaveBeenCalledTimes(3); // Max retry attempts
    });

    it('should handle backup-restore workflow during AI restart', async () => {
      const backupSpy = jest.spyOn(backupUtility, 'createBackup');
      const restoreSpy = jest.spyOn(backupUtility, 'restoreBackup');
      
      backupSpy.mockResolvedValue('ai_restart_backup_123');
      restoreSpy.mockResolvedValue(true);

      const events: any[] = [];
      recoveryManager.on('backupCreated', (event) => events.push({ type: 'backup', ...event }));
      recoveryManager.on('componentRestarted', (event) => events.push({ type: 'restart', ...event }));
      recoveryManager.on('sessionRestored', (event) => events.push({ type: 'restore', ...event }));

      const errorEvent = {
        errorCode: 'AI_001',
        category: 'aiModel',
        severity: 'critical' as const,
        message: 'AI model loading failed - restart required',
        source: 'aiEngine',
        timestamp: new Date().toISOString()
      };

      // Mock successful AI restart
      const mockRestart = jest.fn().mockResolvedValue(true);
      (recoveryManager as any).restartComponent = mockRestart;

      await recoveryManager.handleError(errorEvent);

      // Wait for workflow completion
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify backup-restart-restore sequence
      expect(backupSpy).toHaveBeenCalledWith(
        expect.stringContaining('recovery_AI_001'),
        'recovery',
        expect.any(String)
      );
      expect(mockRestart).toHaveBeenCalledWith('aiModel', expect.any(Object));
      expect(restoreSpy).toHaveBeenCalled();
    });
  });

  describe('User-Directed Recovery Workflows', () => {
    it('should handle manual retry workflow', async () => {
      const events: any[] = [];
      
      recoveryManager.on('userEscalation', (event) => events.push({ type: 'escalation', ...event }));
      recoveryManager.on('manualRetryStarted', (event) => events.push({ type: 'manualRetry', ...event }));
      recoveryManager.on('recoverySuccess', (event) => events.push({ type: 'success', ...event }));

      // Initial error that escalates to user
      const errorEvent = {
        errorCode: 'AI_003',
        category: 'aiModel',
        severity: 'error' as const,
        message: 'AI model crashed',
        source: 'aiEngine',
        timestamp: new Date().toISOString()
      };

      await recoveryManager.handleError(errorEvent);

      // Wait for escalation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify user escalation occurred
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'escalation' })
        ])
      );

      // Simulate user choosing manual retry
      const mockRetry = jest.fn().mockResolvedValue(true);
      (recoveryManager as any).retryOperation = mockRetry;

      await recoveryManager.handleUserResponse('AI_003', 'manualRetry');

      // Wait for manual retry completion
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify manual retry workflow
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'manualRetry' }),
          expect.objectContaining({ type: 'success' })
        ])
      );
    });

    it('should handle offline mode activation workflow', async () => {
      const events: any[] = [];
      
      recoveryManager.on('fallbackModeActivated', (event) => events.push({ type: 'fallback', ...event }));
      recoveryManager.on('offlineModeEnabled', (event) => events.push({ type: 'offline', ...event }));

      const errorEvent = {
        errorCode: 'NET_002',
        category: 'network',
        severity: 'error' as const,
        message: 'WebSocket connection lost',
        source: 'networkWatchdog',
        timestamp: new Date().toISOString()
      };

      await recoveryManager.handleError(errorEvent);

      // Simulate user choosing offline mode
      await recoveryManager.handleUserResponse('NET_002', 'enableOfflineMode');

      // Verify offline mode activation
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            type: 'fallback',
            mode: 'offlineMode'
          })
        ])
      );
    });

    it('should handle emergency restart workflow', async () => {
      const emergencyBackupSpy = jest.spyOn(backupUtility, 'createEmergencyBackup');
      emergencyBackupSpy.mockResolvedValue('emergency_restart_123');

      const events: any[] = [];
      recoveryManager.on('emergencyBackupCreated', (event) => events.push({ type: 'emergencyBackup', ...event }));
      recoveryManager.on('emergencyRestart', (event) => events.push({ type: 'emergencyRestart', ...event }));

      const errorEvent = {
        errorCode: 'SYS_002',
        category: 'systemResource',
        severity: 'critical' as const,
        message: 'System memory critically low',
        source: 'systemMonitor',
        timestamp: new Date().toISOString()
      };

      await recoveryManager.handleError(errorEvent);

      // Simulate user choosing emergency restart
      await recoveryManager.handleUserResponse('SYS_002', 'emergencyRestart');

      // Verify emergency restart workflow
      expect(emergencyBackupSpy).toHaveBeenCalled();
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'emergencyBackup' }),
          expect.objectContaining({ type: 'emergencyRestart' })
        ])
      );
    });
  });

  describe('Plugin Recovery Workflows', () => {
    it('should handle plugin isolation and restart workflow', async () => {
      const events: any[] = [];
      
      recoveryManager.on('pluginIsolated', (event) => events.push({ type: 'isolated', ...event }));
      recoveryManager.on('pluginRestarted', (event) => events.push({ type: 'restarted', ...event }));
      recoveryManager.on('pluginRecovered', (event) => events.push({ type: 'recovered', ...event }));

      const errorEvent = {
        errorCode: 'PLG_002',
        category: 'plugin',
        severity: 'error' as const,
        message: 'Plugin crashed due to memory violation',
        source: 'pluginSandbox',
        timestamp: new Date().toISOString(),
        context: { pluginId: 'test-plugin-123' }
      };

      // Mock plugin operations
      const mockIsolate = jest.fn().mockResolvedValue(true);
      const mockRestart = jest.fn().mockResolvedValue(true);
      
      (recoveryManager as any).isolateComponent = mockIsolate;
      (recoveryManager as any).restartComponent = mockRestart;

      await recoveryManager.handleError(errorEvent);

      // Wait for workflow completion
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify plugin recovery workflow
      expect(mockIsolate).toHaveBeenCalledWith('pluginSandbox', expect.any(Object));
      expect(mockRestart).toHaveBeenCalledWith('plugin', expect.objectContaining({ cleanStart: true }));
      
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'isolated' }),
          expect.objectContaining({ type: 'restarted' })
        ])
      );
    });

    it('should handle plugin quarantine workflow', async () => {
      const events: any[] = [];
      
      recoveryManager.on('pluginQuarantined', (event) => events.push({ type: 'quarantined', ...event }));
      recoveryManager.on('securityAlert', (event) => events.push({ type: 'security', ...event }));

      const errorEvent = {
        errorCode: 'PLG_004',
        category: 'plugin',
        severity: 'critical' as const,
        message: 'Plugin security violation detected',
        source: 'pluginSandbox',
        timestamp: new Date().toISOString(),
        context: { 
          pluginId: 'malicious-plugin',
          violation: 'unauthorized_network_access'
        }
      };

      await recoveryManager.handleError(errorEvent);

      // Verify immediate quarantine for security violations
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            type: 'quarantined',
            pluginId: 'malicious-plugin'
          }),
          expect.objectContaining({ type: 'security' })
        ])
      );
    });
  });

  describe('Data Recovery Workflows', () => {
    it('should handle data corruption recovery workflow', async () => {
      const backupSpy = jest.spyOn(backupUtility, 'createBackup');
      const restoreSpy = jest.spyOn(backupUtility, 'restoreBackup');
      const verifySpy = jest.spyOn(backupUtility, 'verifyBackup');
      
      backupSpy.mockResolvedValue('corruption_backup_123');
      restoreSpy.mockResolvedValue(true);
      verifySpy.mockResolvedValue(true);

      const events: any[] = [];
      recoveryManager.on('dataCorruptionDetected', (event) => events.push({ type: 'corruption', ...event }));
      recoveryManager.on('dataBackupCreated', (event) => events.push({ type: 'backup', ...event }));
      recoveryManager.on('dataRestored', (event) => events.push({ type: 'restored', ...event }));

      const errorEvent = {
        errorCode: 'DAT_002',
        category: 'dataStorage',
        severity: 'critical' as const,
        message: 'Data corruption detected in user session',
        source: 'dataValidator',
        timestamp: new Date().toISOString(),
        context: { 
          file: 'user_session.json',
          corruptionType: 'checksum_mismatch'
        }
      };

      await recoveryManager.handleError(errorEvent);

      // Wait for recovery workflow
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify data recovery sequence
      expect(backupSpy).toHaveBeenCalledWith(
        expect.stringContaining('corruption'),
        'emergency',
        expect.stringContaining('corrupted data')
      );
      expect(restoreSpy).toHaveBeenCalled();
      expect(verifySpy).toHaveBeenCalled();
    });

    it('should handle backup failure during recovery', async () => {
      const backupSpy = jest.spyOn(backupUtility, 'createBackup');
      backupSpy.mockRejectedValue(new Error('Disk full'));

      const events: any[] = [];
      recoveryManager.on('backupFailed', (event) => events.push({ type: 'backupFailed', ...event }));
      recoveryManager.on('emergencyMode', (event) => events.push({ type: 'emergency', ...event }));

      const errorEvent = {
        errorCode: 'DAT_005',
        category: 'dataStorage',
        severity: 'error' as const,
        message: 'Backup operation failed',
        source: 'backupUtility',
        timestamp: new Date().toISOString()
      };

      await recoveryManager.handleError(errorEvent);

      // Verify escalation to emergency mode on backup failure
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'backupFailed' }),
          expect.objectContaining({ type: 'emergency' })
        ])
      );
    });
  });

  describe('Network Recovery Workflows', () => {
    it('should handle connection recovery with state preservation', async () => {
      const sessionSpy = jest.spyOn(backupUtility, 'updateSession');
      sessionSpy.mockResolvedValue();

      const events: any[] = [];
      networkWatchdog.on('connectionLost', (event) => events.push({ type: 'connectionLost', ...event }));
      networkWatchdog.on('reconnectScheduled', (event) => events.push({ type: 'reconnectScheduled', ...event }));
      networkWatchdog.on('connected', (event) => events.push({ type: 'connected', ...event }));

      // Simulate connection loss and recovery
      const errorEvent = {
        errorCode: 'NET_002',
        category: 'network',
        severity: 'error' as const,
        message: 'WebSocket connection lost',
        source: 'networkWatchdog',
        timestamp: new Date().toISOString()
      };

      await recoveryManager.handleError(errorEvent);

      // Verify session preservation during network recovery
      expect(sessionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle network health degradation workflow', async () => {
      const events: any[] = [];
      
      networkWatchdog.on('healthCheck', (event) => events.push({ type: 'healthCheck', ...event }));
      recoveryManager.on('networkDegradation', (event) => events.push({ type: 'degradation', ...event }));

      // Simulate multiple failed health checks
      for (let i = 0; i < 5; i++) {
        const healthResult = {
          timestamp: Date.now(),
          responseTime: 5000 + (i * 1000), // Increasing response times
          success: i < 2, // First 2 succeed, rest fail
          error: i >= 2 ? 'Timeout' : undefined
        };

        networkWatchdog.emit('healthCheck', healthResult);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify health degradation detection
      const healthChecks = events.filter(e => e.type === 'healthCheck');
      expect(healthChecks).toHaveLength(5);
      
      const failedChecks = healthChecks.filter(e => !e.success);
      expect(failedChecks).toHaveLength(3);
    });
  });

  describe('Workflow Timing and Performance', () => {
    it('should complete recovery workflow within time limits', async () => {
      const startTime = Date.now();
      
      const errorEvent = {
        errorCode: 'AI_002',
        category: 'aiModel',
        severity: 'warning' as const,
        message: 'AI processing timeout',
        source: 'aiEngine',
        timestamp: new Date().toISOString()
      };

      // Mock quick recovery
      const mockRetry = jest.fn().mockResolvedValue(true);
      (recoveryManager as any).retryOperation = mockRetry;

      await recoveryManager.handleError(errorEvent);

      const recoveryTime = Date.now() - startTime;

      // Recovery should complete within 1 second for warning-level errors
      expect(recoveryTime).toBeLessThan(1000);
    });

    it('should handle concurrent recovery workflows', async () => {
      const errors = [
        {
          errorCode: 'NET_001',
          category: 'network',
          severity: 'warning' as const,
          message: 'Network timeout',
          source: 'networkWatchdog',
          timestamp: new Date().toISOString()
        },
        {
          errorCode: 'PLG_003',
          category: 'plugin',
          severity: 'warning' as const,
          message: 'Plugin resource limit',
          source: 'pluginSandbox',
          timestamp: new Date().toISOString()
        },
        {
          errorCode: 'UI_002',
          category: 'uiComponent',
          severity: 'warning' as const,
          message: 'Component warning',
          source: 'errorBoundary',
          timestamp: new Date().toISOString()
        }
      ];

      const recoveryPromises = errors.map(error => recoveryManager.handleError(error));
      
      const startTime = Date.now();
      await Promise.all(recoveryPromises);
      const totalTime = Date.now() - startTime;

      // Concurrent recovery should not significantly increase total time
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Workflow State Management', () => {
    it('should maintain recovery state across multiple error occurrences', async () => {
      const errorEvent = {
        errorCode: 'NET_001',
        category: 'network',
        severity: 'warning' as const,
        message: 'Connection timeout',
        source: 'networkWatchdog',
        timestamp: new Date().toISOString()
      };

      // Mock failing retries
      const mockRetry = jest.fn().mockResolvedValue(false);
      (recoveryManager as any).retryOperation = mockRetry;

      // Handle same error multiple times
      await recoveryManager.handleError(errorEvent);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await recoveryManager.handleError(errorEvent);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await recoveryManager.handleError(errorEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify retry count accumulates across occurrences
      expect(mockRetry).toHaveBeenCalledTimes(3);
    });

    it('should reset recovery state after successful resolution', async () => {
      const events: any[] = [];
      recoveryManager.on('recoveryStateReset', (event) => events.push({ type: 'stateReset', ...event }));

      const errorEvent = {
        errorCode: 'AI_002',
        category: 'aiModel',
        severity: 'warning' as const,
        message: 'AI timeout',
        source: 'aiEngine',
        timestamp: new Date().toISOString()
      };

      // Mock successful recovery
      const mockRetry = jest.fn().mockResolvedValue(true);
      (recoveryManager as any).retryOperation = mockRetry;

      await recoveryManager.handleError(errorEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Handle same error again - should start fresh
      await recoveryManager.handleError(errorEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify state was reset after successful recovery
      expect(mockRetry).toHaveBeenCalledTimes(2); // Once for each error occurrence
    });
  });
});
