/**
 * WF-UX-008 Privacy Controls
 * Privacy management and data control utilities for WIRTHFORGE social features
 */

import { EventEmitter } from 'eventemitter3';

// Types
interface PrivacySettings {
  globalSettings: {
    privacyLevel: 'minimal' | 'standard' | 'enhanced' | 'maximum';
    dataMinimization: boolean;
    explicitConsentRequired: boolean;
    automaticDataDeletion: boolean;
    dataRetentionDays: number;
    allowAnalytics: boolean;
    allowTelemetry: boolean;
  };
  identitySettings: {
    defaultParticipationLevel: 'anonymous' | 'pseudonymous' | 'identified';
    allowPseudonymousMode: boolean;
    allowIdentifiedMode: boolean;
    aliasSettings: {
      allowCustomAlias: boolean;
      aliasChangeFrequency: 'never' | 'monthly' | 'weekly' | 'daily';
      generateRandomAlias: boolean;
    };
    profileVisibility: {
      showLevel: boolean;
      showPaths: boolean;
      showAchievements: boolean;
      showEnergyStats: boolean;
      showJoinDate: boolean;
    };
  };
  sharingSettings: {
    achievementSharing: {
      enabled: boolean;
      autoShare: boolean;
      shareScope: 'anonymous' | 'pseudonymous' | 'identified';
      platforms: string[];
      includeStats: boolean;
      includeTimestamp: boolean;
    };
    challengeParticipation: {
      enabled: boolean;
      shareResults: boolean;
      shareScope: 'anonymous' | 'pseudonymous' | 'identified';
      allowLeaderboards: boolean;
      allowRealTimeUpdates: boolean;
    };
    contentSharing: {
      enabled: boolean;
      allowQuestions: boolean;
      allowAnswers: boolean;
      allowTutorials: boolean;
      shareScope: 'anonymous' | 'pseudonymous' | 'identified';
      moderationConsent: boolean;
    };
    mentorshipSharing: {
      enabled: boolean;
      shareProgress: boolean;
      shareSettings: boolean;
      shareAchievements: boolean;
      allowDirectMessages: boolean;
      encryptMessages: boolean;
    };
  };
  externalPlatforms: {
    [platform: string]: {
      enabled: boolean;
      [key: string]: any;
    };
  };
  dataControl: {
    dataExportSettings: {
      allowExport: boolean;
      exportFormat: 'json' | 'csv' | 'xml';
      includeMetadata: boolean;
      encryptExport: boolean;
    };
    dataDeletionSettings: {
      allowDeletion: boolean;
      confirmationRequired: boolean;
      gracePeriodDays: number;
      deleteFromExternalPlatforms: boolean;
    };
    auditSettings: {
      enableAuditLog: boolean;
      logDataAccess: boolean;
      logDataSharing: boolean;
      logConfigChanges: boolean;
      auditRetentionDays: number;
    };
  };
  consentHistory: ConsentRecord[];
  lastUpdated: string;
  settingsVersion: string;
}

interface ConsentRecord {
  consentId: string;
  dataType: 'achievement' | 'challenge_result' | 'profile' | 'content' | 'mentorship_data';
  purpose: string;
  scope: 'anonymous' | 'pseudonymous' | 'identified';
  platforms: string[];
  status: 'granted' | 'denied' | 'pending' | 'revoked';
  grantedDate: string;
  expiryDate?: string;
  revokedDate?: string;
  revokeReason?: string;
}

interface DataSanitizationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  replacement: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  dataType: string;
  userId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Privacy Controller Class
export class PrivacyController extends EventEmitter {
  private settings: PrivacySettings;
  private sanitizationRules: DataSanitizationRule[];
  private auditLog: AuditLogEntry[];
  private consentCache: Map<string, ConsentRecord>;

  constructor(initialSettings?: Partial<PrivacySettings>) {
    super();
    this.settings = this.getDefaultSettings();
    this.sanitizationRules = this.getDefaultSanitizationRules();
    this.auditLog = [];
    this.consentCache = new Map();

    if (initialSettings) {
      this.updateSettings(initialSettings);
    }

    this.setupDefaultRules();
  }

  // Default Settings
  private getDefaultSettings(): PrivacySettings {
    return {
      globalSettings: {
        privacyLevel: 'enhanced',
        dataMinimization: true,
        explicitConsentRequired: true,
        automaticDataDeletion: false,
        dataRetentionDays: 90,
        allowAnalytics: false,
        allowTelemetry: false,
      },
      identitySettings: {
        defaultParticipationLevel: 'anonymous',
        allowPseudonymousMode: true,
        allowIdentifiedMode: false,
        aliasSettings: {
          allowCustomAlias: true,
          aliasChangeFrequency: 'monthly',
          generateRandomAlias: true,
        },
        profileVisibility: {
          showLevel: false,
          showPaths: false,
          showAchievements: false,
          showEnergyStats: false,
          showJoinDate: false,
        },
      },
      sharingSettings: {
        achievementSharing: {
          enabled: false,
          autoShare: false,
          shareScope: 'anonymous',
          platforms: ['community'],
          includeStats: true,
          includeTimestamp: false,
        },
        challengeParticipation: {
          enabled: false,
          shareResults: false,
          shareScope: 'anonymous',
          allowLeaderboards: false,
          allowRealTimeUpdates: false,
        },
        contentSharing: {
          enabled: false,
          allowQuestions: false,
          allowAnswers: false,
          allowTutorials: false,
          shareScope: 'pseudonymous',
          moderationConsent: true,
        },
        mentorshipSharing: {
          enabled: false,
          shareProgress: false,
          shareSettings: false,
          shareAchievements: false,
          allowDirectMessages: true,
          encryptMessages: true,
        },
      },
      externalPlatforms: {
        discord: { enabled: false },
        twitch: { enabled: false },
        reddit: { enabled: false },
        twitter: { enabled: false },
      },
      dataControl: {
        dataExportSettings: {
          allowExport: true,
          exportFormat: 'json',
          includeMetadata: true,
          encryptExport: false,
        },
        dataDeletionSettings: {
          allowDeletion: true,
          confirmationRequired: true,
          gracePeriodDays: 7,
          deleteFromExternalPlatforms: true,
        },
        auditSettings: {
          enableAuditLog: true,
          logDataAccess: true,
          logDataSharing: true,
          logConfigChanges: true,
          auditRetentionDays: 90,
        },
      },
      consentHistory: [],
      lastUpdated: new Date().toISOString(),
      settingsVersion: '1.0.0',
    };
  }

  // Default Sanitization Rules
  private getDefaultSanitizationRules(): DataSanitizationRule[] {
    return [
      {
        id: 'email_addresses',
        name: 'Email Addresses',
        description: 'Remove email addresses from shared content',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL_REDACTED]',
        severity: 'high',
        enabled: true,
      },
      {
        id: 'phone_numbers',
        name: 'Phone Numbers',
        description: 'Remove phone numbers from shared content',
        pattern: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        replacement: '[PHONE_REDACTED]',
        severity: 'high',
        enabled: true,
      },
      {
        id: 'ip_addresses',
        name: 'IP Addresses',
        description: 'Remove IP addresses from shared content',
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '[IP_REDACTED]',
        severity: 'medium',
        enabled: true,
      },
      {
        id: 'file_paths',
        name: 'File Paths',
        description: 'Remove local file paths from shared content',
        pattern: /[A-Za-z]:\\[^\\/:*?"<>|\r\n]+|\/[^\\/:*?"<>|\r\n]+/g,
        replacement: '[PATH_REDACTED]',
        severity: 'medium',
        enabled: true,
      },
      {
        id: 'personal_names',
        name: 'Personal Names',
        description: 'Remove common personal names from shared content',
        pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
        replacement: '[NAME_REDACTED]',
        severity: 'low',
        enabled: false, // Disabled by default as it may have false positives
      },
    ];
  }

  private setupDefaultRules(): void {
    // Set up automatic data deletion if enabled
    if (this.settings.globalSettings.automaticDataDeletion) {
      this.scheduleDataCleanup();
    }

    // Set up audit log cleanup
    if (this.settings.dataControl.auditSettings.enableAuditLog) {
      this.scheduleAuditCleanup();
    }
  }

  // Settings Management
  public getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<PrivacySettings>): void {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };
    this.settings.lastUpdated = new Date().toISOString();

    this.logAuditEvent('settings_updated', 'privacy_settings', {
      changes: this.getSettingsChanges(oldSettings, this.settings),
    });

    this.emit('settingsUpdated', this.settings);
  }

  private getSettingsChanges(oldSettings: PrivacySettings, newSettings: PrivacySettings): Record<string, any> {
    const changes: Record<string, any> = {};
    
    // Compare settings recursively (simplified version)
    const compareObjects = (obj1: any, obj2: any, path = ''): void => {
      for (const key in obj2) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof obj2[key] === 'object' && obj2[key] !== null && !Array.isArray(obj2[key])) {
          compareObjects(obj1[key] || {}, obj2[key], currentPath);
        } else if (obj1[key] !== obj2[key]) {
          changes[currentPath] = { from: obj1[key], to: obj2[key] };
        }
      }
    };

    compareObjects(oldSettings, newSettings);
    return changes;
  }

  // Consent Management
  public async requestConsent(
    dataType: ConsentRecord['dataType'],
    purpose: string,
    scope: ConsentRecord['scope'],
    platforms: string[],
    expiryDate?: string
  ): Promise<ConsentRecord> {
    const consentId = this.generateConsentId();
    
    const consentRecord: ConsentRecord = {
      consentId,
      dataType,
      purpose,
      scope,
      platforms,
      status: 'pending',
      grantedDate: new Date().toISOString(),
      expiryDate,
    };

    this.consentCache.set(consentId, consentRecord);
    
    this.logAuditEvent('consent_requested', dataType, {
      consentId,
      purpose,
      scope,
      platforms,
    });

    this.emit('consentRequested', consentRecord);
    return consentRecord;
  }

  public async grantConsent(consentId: string): Promise<void> {
    const consent = this.consentCache.get(consentId);
    if (!consent) {
      throw new Error('Consent record not found');
    }

    consent.status = 'granted';
    consent.grantedDate = new Date().toISOString();
    
    this.settings.consentHistory.push(consent);
    this.consentCache.delete(consentId);

    this.logAuditEvent('consent_granted', consent.dataType, {
      consentId,
      purpose: consent.purpose,
    });

    this.emit('consentGranted', consent);
  }

  public async revokeConsent(consentId: string, reason?: string): Promise<void> {
    const consentIndex = this.settings.consentHistory.findIndex(c => c.consentId === consentId);
    if (consentIndex === -1) {
      throw new Error('Consent record not found');
    }

    const consent = this.settings.consentHistory[consentIndex];
    consent.status = 'revoked';
    consent.revokedDate = new Date().toISOString();
    consent.revokeReason = reason;

    this.logAuditEvent('consent_revoked', consent.dataType, {
      consentId,
      reason,
    });

    this.emit('consentRevoked', consent);
  }

  // Data Sanitization
  public sanitizeData(data: any, context: string = 'general'): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data, context);
    } else if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, context));
    } else if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value, context);
      }
      return sanitized;
    }
    return data;
  }

  private sanitizeString(text: string, context: string): string {
    let sanitized = text;
    
    for (const rule of this.sanitizationRules) {
      if (rule.enabled && this.shouldApplyRule(rule, context)) {
        sanitized = sanitized.replace(rule.pattern, rule.replacement);
      }
    }

    return sanitized;
  }

  private shouldApplyRule(rule: DataSanitizationRule, context: string): boolean {
    // Apply rules based on privacy level and context
    const privacyLevel = this.settings.globalSettings.privacyLevel;
    
    switch (privacyLevel) {
      case 'minimal':
        return rule.severity === 'critical';
      case 'standard':
        return ['critical', 'high'].includes(rule.severity);
      case 'enhanced':
        return ['critical', 'high', 'medium'].includes(rule.severity);
      case 'maximum':
        return true;
      default:
        return rule.severity === 'high';
    }
  }

  // Data Anonymization
  public anonymizeUserData(data: any): any {
    const anonymized = { ...data };
    
    // Remove direct identifiers
    delete anonymized.userId;
    delete anonymized.email;
    delete anonymized.name;
    delete anonymized.ipAddress;
    delete anonymized.deviceId;

    // Generate anonymous identifier if needed
    if (this.settings.identitySettings.defaultParticipationLevel !== 'identified') {
      anonymized.anonymousId = this.generateAnonymousId();
    }

    // Apply data minimization
    if (this.settings.globalSettings.dataMinimization) {
      anonymized = this.minimizeData(anonymized);
    }

    return this.sanitizeData(anonymized);
  }

  private minimizeData(data: any): any {
    // Remove unnecessary fields based on context
    const minimized = { ...data };
    
    // Remove timestamps if not essential
    if (!this.settings.sharingSettings.achievementSharing.includeTimestamp) {
      delete minimized.timestamp;
      delete minimized.createdAt;
      delete minimized.updatedAt;
    }

    // Remove detailed stats if not needed
    if (!this.settings.sharingSettings.achievementSharing.includeStats) {
      delete minimized.detailedStats;
      delete minimized.performanceMetrics;
    }

    return minimized;
  }

  // Data Export
  public async exportUserData(format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    if (!this.settings.dataControl.dataExportSettings.allowExport) {
      throw new Error('Data export is disabled');
    }

    const exportData = {
      settings: this.settings,
      consentHistory: this.settings.consentHistory,
      auditLog: this.settings.dataControl.auditSettings.enableAuditLog ? this.auditLog : [],
      exportDate: new Date().toISOString(),
      version: this.settings.settingsVersion,
    };

    this.logAuditEvent('data_exported', 'user_data', {
      format,
      includeMetadata: this.settings.dataControl.dataExportSettings.includeMetadata,
    });

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this.convertToCSV(exportData);
      case 'xml':
        return this.convertToXML(exportData);
      default:
        throw new Error('Unsupported export format');
    }
  }

  // Data Deletion
  public async deleteAllUserData(confirmationToken: string): Promise<void> {
    if (!this.settings.dataControl.dataDeletionSettings.allowDeletion) {
      throw new Error('Data deletion is disabled');
    }

    // Verify confirmation token (implementation depends on your auth system)
    if (!this.verifyDeletionToken(confirmationToken)) {
      throw new Error('Invalid confirmation token');
    }

    this.logAuditEvent('data_deletion_initiated', 'user_data', {
      gracePeriod: this.settings.dataControl.dataDeletionSettings.gracePeriodDays,
    });

    // Schedule deletion after grace period
    if (this.settings.dataControl.dataDeletionSettings.gracePeriodDays > 0) {
      setTimeout(() => {
        this.performDataDeletion();
      }, this.settings.dataControl.dataDeletionSettings.gracePeriodDays * 24 * 60 * 60 * 1000);
    } else {
      await this.performDataDeletion();
    }

    this.emit('dataDeletionScheduled', {
      gracePeriodDays: this.settings.dataControl.dataDeletionSettings.gracePeriodDays,
    });
  }

  private async performDataDeletion(): Promise<void> {
    // Reset to default settings
    this.settings = this.getDefaultSettings();
    this.consentCache.clear();
    this.auditLog = [];

    this.logAuditEvent('data_deleted', 'user_data', {
      deletedAt: new Date().toISOString(),
    });

    this.emit('dataDeleted');
  }

  // Audit Logging
  private logAuditEvent(action: string, dataType: string, details: Record<string, any>): void {
    if (!this.settings.dataControl.auditSettings.enableAuditLog) {
      return;
    }

    const entry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      action,
      dataType,
      userId: 'local_user', // In a real implementation, this would be the actual user ID
      details,
    };

    this.auditLog.push(entry);

    // Emit audit event
    this.emit('auditEvent', entry);
  }

  public getAuditLog(limit?: number): AuditLogEntry[] {
    const log = this.auditLog.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return limit ? log.slice(0, limit) : log;
  }

  // Utility Methods
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnonymousId(): string {
    return `anon_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private verifyDeletionToken(token: string): boolean {
    // Implementation would depend on your authentication system
    // This is a placeholder
    return token === 'DELETE_CONFIRMED';
  }

  private scheduleDataCleanup(): void {
    const cleanupInterval = 24 * 60 * 60 * 1000; // Daily cleanup
    
    setInterval(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.globalSettings.dataRetentionDays);
      
      // Clean up old consent records
      this.settings.consentHistory = this.settings.consentHistory.filter(
        consent => new Date(consent.grantedDate) > cutoffDate
      );
      
      this.logAuditEvent('data_cleanup', 'automated', {
        cutoffDate: cutoffDate.toISOString(),
        recordsRemaining: this.settings.consentHistory.length,
      });
    }, cleanupInterval);
  }

  private scheduleAuditCleanup(): void {
    const cleanupInterval = 24 * 60 * 60 * 1000; // Daily cleanup
    
    setInterval(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.dataControl.auditSettings.auditRetentionDays);
      
      this.auditLog = this.auditLog.filter(
        entry => new Date(entry.timestamp) > cutoffDate
      );
    }, cleanupInterval);
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in practice, you'd want a more robust implementation
    return JSON.stringify(data);
  }

  private convertToXML(data: any): string {
    // Simplified XML conversion - in practice, you'd want a more robust implementation
    return `<export>${JSON.stringify(data)}</export>`;
  }
}

export default PrivacyController;
