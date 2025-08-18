/**
 * WF-UX-007 Backup & Restore Utility
 * 
 * Utility library responsible for maintaining backup snapshots of user data and state,
 * and for restoring them. Ensures recovery procedures prioritize data integrity and
 * continuity of user experience.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'manual' | 'automatic' | 'emergency' | 'recovery';
  description: string;
  size: number;
  checksum: string;
  version: string;
  dataTypes: string[];
  compressed: boolean;
}

interface UserSession {
  conversationHistory: any[];
  userSettings: Record<string, any>;
  energyMetrics: any[];
  pluginStates: Record<string, any>;
  uiState: Record<string, any>;
  timestamp: string;
}

interface BackupConfig {
  maxBackups: number;
  backupInterval: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  backupDirectory: string;
  retentionDays: number;
}

class BackupRestoreUtility extends EventEmitter {
  private config: BackupConfig;
  private backupDirectory: string;
  private isInitialized: boolean = false;
  private backupTimer: NodeJS.Timeout | null = null;
  private currentSession: UserSession | null = null;

  constructor(config?: Partial<BackupConfig>) {
    super();
    
    this.config = {
      maxBackups: 50,
      backupInterval: 300000, // 5 minutes
      compressionEnabled: true,
      encryptionEnabled: false, // Local-first, no encryption by default
      backupDirectory: path.join(process.cwd(), 'data', 'backups'),
      retentionDays: 30,
      ...config
    };

    this.backupDirectory = this.config.backupDirectory;
  }

  /**
   * Initialize the backup utility
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDirectory, { recursive: true });
      
      // Load current session if exists
      await this.loadCurrentSession();
      
      // Start automatic backup timer
      this.startAutomaticBackups();
      
      // Clean old backups
      await this.cleanOldBackups();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('Backup & Restore utility initialized');
    } catch (error) {
      console.error('Failed to initialize backup utility:', error);
      throw error;
    }
  }

  /**
   * Create a backup with specified ID and type
   */
  public async createBackup(
    backupId?: string, 
    type: 'manual' | 'automatic' | 'emergency' | 'recovery' = 'manual',
    description?: string
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Backup utility not initialized');
    }

    const id = backupId || this.generateBackupId();
    const timestamp = new Date().toISOString();
    
    try {
      // Gather all data to backup
      const backupData = await this.gatherBackupData();
      
      // Create backup file
      const backupPath = path.join(this.backupDirectory, `${id}.json`);
      const serializedData = JSON.stringify(backupData, null, 2);
      
      // Calculate checksum
      const checksum = this.calculateChecksum(serializedData);
      
      // Compress if enabled
      let finalData = serializedData;
      if (this.config.compressionEnabled) {
        finalData = await this.compressData(serializedData);
      }
      
      // Write backup file
      await fs.writeFile(backupPath, finalData, 'utf8');
      
      // Create metadata
      const metadata: BackupMetadata = {
        id,
        timestamp,
        type,
        description: description || `${type} backup`,
        size: finalData.length,
        checksum,
        version: '1.0.0',
        dataTypes: Object.keys(backupData),
        compressed: this.config.compressionEnabled
      };
      
      // Save metadata
      const metadataPath = path.join(this.backupDirectory, `${id}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      
      // Update backup registry
      await this.updateBackupRegistry(metadata);
      
      this.emit('backupCreated', { id, type, size: metadata.size });
      console.log(`Backup created: ${id} (${type})`);
      
      return id;
    } catch (error) {
      console.error(`Failed to create backup ${id}:`, error);
      this.emit('backupFailed', { id, type, error: error.message });
      throw error;
    }
  }

  /**
   * Restore from a specific backup
   */
  public async restoreBackup(backupId?: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Backup utility not initialized');
    }

    try {
      // Use latest backup if no ID specified
      const id = backupId || await this.getLatestBackupId();
      if (!id) {
        throw new Error('No backups available');
      }

      // Load metadata
      const metadata = await this.loadBackupMetadata(id);
      if (!metadata) {
        throw new Error(`Backup metadata not found: ${id}`);
      }

      // Load backup data
      const backupPath = path.join(this.backupDirectory, `${id}.json`);
      let rawData = await fs.readFile(backupPath, 'utf8');
      
      // Decompress if needed
      if (metadata.compressed) {
        rawData = await this.decompressData(rawData);
      }
      
      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(rawData);
      if (calculatedChecksum !== metadata.checksum) {
        throw new Error(`Backup integrity check failed: ${id}`);
      }
      
      // Parse backup data
      const backupData = JSON.parse(rawData);
      
      // Create current state backup before restore
      await this.createBackup(
        `pre_restore_${Date.now()}`, 
        'automatic', 
        `Backup before restoring ${id}`
      );
      
      // Restore data
      await this.restoreData(backupData);
      
      this.emit('backupRestored', { id, timestamp: metadata.timestamp });
      console.log(`Backup restored: ${id}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to restore backup ${backupId}:`, error);
      this.emit('restoreFailed', { id: backupId, error: error.message });
      return false;
    }
  }

  /**
   * Create emergency backup (critical data only)
   */
  public async createEmergencyBackup(): Promise<string> {
    try {
      const emergencyData = {
        conversationHistory: this.currentSession?.conversationHistory || [],
        userSettings: this.currentSession?.userSettings || {},
        timestamp: new Date().toISOString(),
        emergencyFlag: true
      };

      const id = `emergency_${Date.now()}`;
      const backupPath = path.join(this.backupDirectory, `${id}.json`);
      
      await fs.writeFile(backupPath, JSON.stringify(emergencyData, null, 2), 'utf8');
      
      this.emit('emergencyBackupCreated', { id });
      console.log(`Emergency backup created: ${id}`);
      
      return id;
    } catch (error) {
      console.error('Failed to create emergency backup:', error);
      throw error;
    }
  }

  /**
   * Export user session for manual backup
   */
  public async exportUserSession(): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No active session to export');
    }

    try {
      const exportData = {
        ...this.currentSession,
        exportTimestamp: new Date().toISOString(),
        exportVersion: '1.0.0'
      };

      const exportId = `export_${Date.now()}`;
      const exportPath = path.join(this.backupDirectory, `${exportId}_export.json`);
      
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
      
      this.emit('sessionExported', { id: exportId, path: exportPath });
      console.log(`Session exported: ${exportId}`);
      
      return exportPath;
    } catch (error) {
      console.error('Failed to export session:', error);
      throw error;
    }
  }

  /**
   * Update current session data
   */
  public async updateSession(sessionData: Partial<UserSession>): Promise<void> {
    if (!this.currentSession) {
      this.currentSession = {
        conversationHistory: [],
        userSettings: {},
        energyMetrics: [],
        pluginStates: {},
        uiState: {},
        timestamp: new Date().toISOString()
      };
    }

    // Merge with existing session
    this.currentSession = {
      ...this.currentSession,
      ...sessionData,
      timestamp: new Date().toISOString()
    };

    // Save current session
    await this.saveCurrentSession();
  }

  /**
   * Get list of available backups
   */
  public async getBackupList(): Promise<BackupMetadata[]> {
    try {
      const registryPath = path.join(this.backupDirectory, 'backup_registry.json');
      
      try {
        const registryData = await fs.readFile(registryPath, 'utf8');
        const registry = JSON.parse(registryData);
        return registry.backups || [];
      } catch {
        // Registry doesn't exist, scan directory
        return await this.scanBackupDirectory();
      }
    } catch (error) {
      console.error('Failed to get backup list:', error);
      return [];
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  public async cleanOldBackups(): Promise<void> {
    try {
      const backups = await this.getBackupList();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const toDelete = backups.filter(backup => {
        const backupDate = new Date(backup.timestamp);
        return backupDate < cutoffDate && backup.type !== 'manual';
      });

      // Keep at least 5 backups regardless of age
      const sortedBackups = backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      const toKeep = sortedBackups.slice(0, 5).map(b => b.id);
      const finalToDelete = toDelete.filter(backup => !toKeep.includes(backup.id));

      for (const backup of finalToDelete) {
        await this.deleteBackup(backup.id);
      }

      if (finalToDelete.length > 0) {
        console.log(`Cleaned ${finalToDelete.length} old backups`);
      }
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  }

  /**
   * Verify backup integrity
   */
  public async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const metadata = await this.loadBackupMetadata(backupId);
      if (!metadata) {
        return false;
      }

      const backupPath = path.join(this.backupDirectory, `${backupId}.json`);
      let rawData = await fs.readFile(backupPath, 'utf8');
      
      if (metadata.compressed) {
        rawData = await this.decompressData(rawData);
      }
      
      const calculatedChecksum = this.calculateChecksum(rawData);
      return calculatedChecksum === metadata.checksum;
    } catch (error) {
      console.error(`Failed to verify backup ${backupId}:`, error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private async gatherBackupData(): Promise<Record<string, any>> {
    return {
      userSession: this.currentSession,
      systemState: await this.getSystemState(),
      pluginStates: await this.getPluginStates(),
      energyMetrics: await this.getEnergyMetrics(),
      uiState: await this.getUIState(),
      timestamp: new Date().toISOString()
    };
  }

  private async restoreData(backupData: Record<string, any>): Promise<void> {
    // Restore user session
    if (backupData.userSession) {
      this.currentSession = backupData.userSession;
      await this.saveCurrentSession();
    }

    // Restore system state
    if (backupData.systemState) {
      await this.restoreSystemState(backupData.systemState);
    }

    // Restore plugin states
    if (backupData.pluginStates) {
      await this.restorePluginStates(backupData.pluginStates);
    }

    // Restore UI state
    if (backupData.uiState) {
      await this.restoreUIState(backupData.uiState);
    }
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 6);
    return `backup_${timestamp}_${random}`;
  }

  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression placeholder - would use zlib in real implementation
    return data;
  }

  private async decompressData(data: string): Promise<string> {
    // Simple decompression placeholder - would use zlib in real implementation
    return data;
  }

  private async loadCurrentSession(): Promise<void> {
    try {
      const sessionPath = path.join(this.backupDirectory, 'current_session.json');
      const sessionData = await fs.readFile(sessionPath, 'utf8');
      this.currentSession = JSON.parse(sessionData);
    } catch {
      // No existing session, start fresh
      this.currentSession = {
        conversationHistory: [],
        userSettings: {},
        energyMetrics: [],
        pluginStates: {},
        uiState: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  private async saveCurrentSession(): Promise<void> {
    try {
      const sessionPath = path.join(this.backupDirectory, 'current_session.json');
      await fs.writeFile(sessionPath, JSON.stringify(this.currentSession, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save current session:', error);
    }
  }

  private async loadBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const metadataPath = path.join(this.backupDirectory, `${backupId}.meta.json`);
      const metadataData = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(metadataData);
    } catch {
      return null;
    }
  }

  private async getLatestBackupId(): Promise<string | null> {
    const backups = await this.getBackupList();
    if (backups.length === 0) {
      return null;
    }
    
    const sorted = backups.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return sorted[0].id;
  }

  private async updateBackupRegistry(metadata: BackupMetadata): Promise<void> {
    try {
      const registryPath = path.join(this.backupDirectory, 'backup_registry.json');
      let registry = { backups: [] };
      
      try {
        const registryData = await fs.readFile(registryPath, 'utf8');
        registry = JSON.parse(registryData);
      } catch {
        // Registry doesn't exist, create new
      }
      
      registry.backups = registry.backups || [];
      registry.backups.push(metadata);
      
      // Keep only recent backups in registry
      registry.backups = registry.backups
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.config.maxBackups);
      
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to update backup registry:', error);
    }
  }

  private async scanBackupDirectory(): Promise<BackupMetadata[]> {
    try {
      const files = await fs.readdir(this.backupDirectory);
      const metadataFiles = files.filter(f => f.endsWith('.meta.json'));
      
      const backups: BackupMetadata[] = [];
      for (const file of metadataFiles) {
        try {
          const metadataPath = path.join(this.backupDirectory, file);
          const metadataData = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataData);
          backups.push(metadata);
        } catch (error) {
          console.error(`Failed to read metadata file ${file}:`, error);
        }
      }
      
      return backups;
    } catch (error) {
      console.error('Failed to scan backup directory:', error);
      return [];
    }
  }

  private async deleteBackup(backupId: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDirectory, `${backupId}.json`);
      const metadataPath = path.join(this.backupDirectory, `${backupId}.meta.json`);
      
      await fs.unlink(backupPath).catch(() => {}); // Ignore if doesn't exist
      await fs.unlink(metadataPath).catch(() => {}); // Ignore if doesn't exist
      
      console.log(`Deleted backup: ${backupId}`);
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
    }
  }

  private startAutomaticBackups(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
    
    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup(undefined, 'automatic', 'Scheduled automatic backup');
      } catch (error) {
        console.error('Automatic backup failed:', error);
      }
    }, this.config.backupInterval);
  }

  // Placeholder methods for system integration
  private async getSystemState(): Promise<any> {
    return { timestamp: new Date().toISOString() };
  }

  private async getPluginStates(): Promise<any> {
    return {};
  }

  private async getEnergyMetrics(): Promise<any> {
    return [];
  }

  private async getUIState(): Promise<any> {
    return {};
  }

  private async restoreSystemState(state: any): Promise<void> {
    console.log('Restoring system state:', state);
  }

  private async restorePluginStates(states: any): Promise<void> {
    console.log('Restoring plugin states:', states);
  }

  private async restoreUIState(state: any): Promise<void> {
    console.log('Restoring UI state:', state);
  }

  /**
   * Shutdown and cleanup
   */
  public async shutdown(): Promise<void> {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
    
    // Save final session state
    if (this.currentSession) {
      await this.saveCurrentSession();
    }
    
    console.log('Backup & Restore utility shutdown complete');
  }
}

export { BackupRestoreUtility, BackupMetadata, UserSession, BackupConfig };
