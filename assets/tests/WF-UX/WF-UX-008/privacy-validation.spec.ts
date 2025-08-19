/**
 * WF-UX-008 Privacy Validation Tests
 * Comprehensive test suite for privacy controls and data protection
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrivacyController } from '../code/WF-UX-008/privacy-controls';
import { SharingManager } from '../code/WF-UX-008/sharing-utilities';

describe('Privacy Controller', () => {
  let privacyController: PrivacyController;

  beforeEach(() => {
    privacyController = new PrivacyController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Settings Management', () => {
    it('initializes with secure default settings', () => {
      const settings = privacyController.getSettings();

      expect(settings.globalSettings.participationLevel).toBe('anonymous');
      expect(settings.globalSettings.dataMinimization).toBe(true);
      expect(settings.globalSettings.explicitConsentRequired).toBe(true);
      expect(settings.globalSettings.auditLogging).toBe(true);
    });

    it('validates privacy level transitions', () => {
      // Should allow anonymous -> pseudonymous
      privacyController.updateSettings({
        globalSettings: { participationLevel: 'pseudonymous' },
      });
      expect(privacyController.getSettings().globalSettings.participationLevel).toBe('pseudonymous');

      // Should allow pseudonymous -> identified
      privacyController.updateSettings({
        globalSettings: { participationLevel: 'identified' },
      });
      expect(privacyController.getSettings().globalSettings.participationLevel).toBe('identified');

      // Should allow identified -> anonymous (privacy upgrade)
      privacyController.updateSettings({
        globalSettings: { participationLevel: 'anonymous' },
      });
      expect(privacyController.getSettings().globalSettings.participationLevel).toBe('anonymous');
    });

    it('prevents invalid privacy settings', () => {
      expect(() => {
        privacyController.updateSettings({
          globalSettings: { participationLevel: 'invalid' as any },
        });
      }).toThrow('Invalid participation level');
    });

    it('enforces data minimization when enabled', () => {
      privacyController.updateSettings({
        globalSettings: { dataMinimization: true },
        sharingSettings: {
          achievementSharing: { enabled: true, autoShare: true, platforms: ['discord', 'twitter', 'reddit'] },
        },
      });

      const settings = privacyController.getSettings();
      // Data minimization should limit auto-sharing
      expect(settings.sharingSettings.achievementSharing.autoShare).toBe(false);
    });

    it('validates external platform configurations', () => {
      expect(() => {
        privacyController.updateSettings({
          externalPlatforms: {
            discord: { enabled: true, webhookUrl: 'invalid-url' },
          },
        });
      }).toThrow('Invalid webhook URL format');
    });
  });

  describe('Data Sanitization', () => {
    it('removes email addresses', () => {
      const data = {
        text: 'Contact me at user@example.com or admin@test.org',
        description: 'My email is personal@gmail.com',
      };

      const sanitized = privacyController.sanitizeData(data);
      
      expect(sanitized.text).not.toContain('user@example.com');
      expect(sanitized.text).not.toContain('admin@test.org');
      expect(sanitized.description).not.toContain('personal@gmail.com');
      expect(sanitized.text).toContain('[EMAIL_REMOVED]');
    });

    it('removes phone numbers', () => {
      const data = {
        text: 'Call me at +1-555-123-4567 or (555) 987-6543',
        bio: 'Phone: 555.111.2222',
      };

      const sanitized = privacyController.sanitizeData(data);
      
      expect(sanitized.text).not.toContain('+1-555-123-4567');
      expect(sanitized.text).not.toContain('(555) 987-6543');
      expect(sanitized.bio).not.toContain('555.111.2222');
      expect(sanitized.text).toContain('[PHONE_REMOVED]');
    });

    it('removes IP addresses', () => {
      const data = {
        text: 'Server at 192.168.1.1 or 2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        logs: 'Connection from 10.0.0.1',
      };

      const sanitized = privacyController.sanitizeData(data);
      
      expect(sanitized.text).not.toContain('192.168.1.1');
      expect(sanitized.text).not.toContain('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      expect(sanitized.logs).not.toContain('10.0.0.1');
      expect(sanitized.text).toContain('[IP_REMOVED]');
    });

    it('removes file paths', () => {
      const data = {
        text: 'File located at C:\\Users\\John\\Documents\\secret.txt',
        error: 'Cannot access /home/user/.ssh/id_rsa',
      };

      const sanitized = privacyController.sanitizeData(data);
      
      expect(sanitized.text).not.toContain('C:\\Users\\John\\Documents\\secret.txt');
      expect(sanitized.error).not.toContain('/home/user/.ssh/id_rsa');
      expect(sanitized.text).toContain('[PATH_REMOVED]');
    });

    it('optionally removes personal names', () => {
      const data = {
        text: 'Thanks to John Smith and Mary Johnson for their help',
        author: 'Written by Alice Brown',
      };

      const sanitized = privacyController.sanitizeData(data, { removeNames: true });
      
      expect(sanitized.text).not.toContain('John Smith');
      expect(sanitized.text).not.toContain('Mary Johnson');
      expect(sanitized.author).not.toContain('Alice Brown');
      expect(sanitized.text).toContain('[NAME_REMOVED]');
    });

    it('preserves non-sensitive data', () => {
      const data = {
        title: 'How to use WIRTHFORGE effectively',
        content: 'This tutorial covers the basics of local AI development',
        tags: ['tutorial', 'beginner', 'ai'],
        category: 'learning',
      };

      const sanitized = privacyController.sanitizeData(data);
      
      expect(sanitized.title).toBe(data.title);
      expect(sanitized.content).toBe(data.content);
      expect(sanitized.tags).toEqual(data.tags);
      expect(sanitized.category).toBe(data.category);
    });

    it('handles nested objects and arrays', () => {
      const data = {
        user: {
          profile: {
            bio: 'Contact me at user@example.com',
            achievements: [
              { name: 'First Steps', description: 'Email me at test@test.com' },
            ],
          },
        },
        comments: [
          { text: 'My phone is 555-1234' },
          { text: 'This is clean content' },
        ],
      };

      const sanitized = privacyController.sanitizeData(data);
      
      expect(sanitized.user.profile.bio).toContain('[EMAIL_REMOVED]');
      expect(sanitized.user.profile.achievements[0].description).toContain('[EMAIL_REMOVED]');
      expect(sanitized.comments[0].text).toContain('[PHONE_REMOVED]');
      expect(sanitized.comments[1].text).toBe('This is clean content');
    });
  });

  describe('Data Anonymization', () => {
    it('anonymizes user identifiers', () => {
      const userData = {
        userId: 'user_12345',
        displayName: 'JohnDoe',
        email: 'john@example.com',
        profile: {
          realName: 'John Doe',
          avatar: 'avatar_url',
        },
      };

      const anonymized = privacyController.anonymizeUserData(userData);
      
      expect(anonymized.userId).toMatch(/^anon_[a-f0-9]{8}$/);
      expect(anonymized.displayName).toMatch(/^User_[a-f0-9]{6}$/);
      expect(anonymized.email).toBeUndefined();
      expect(anonymized.profile.realName).toBeUndefined();
      expect(anonymized.profile.avatar).toBeDefined(); // Avatar can be kept
    });

    it('preserves non-identifying data', () => {
      const userData = {
        userId: 'user_12345',
        achievements: [
          { id: 'ach_001', name: 'First Steps', earnedDate: '2024-01-15' },
        ],
        reputation: 1250,
        joinDate: '2024-01-01',
        preferences: {
          theme: 'dark',
          language: 'en',
        },
      };

      const anonymized = privacyController.anonymizeUserData(userData);
      
      expect(anonymized.achievements).toEqual(userData.achievements);
      expect(anonymized.reputation).toBe(userData.reputation);
      expect(anonymized.joinDate).toBe(userData.joinDate);
      expect(anonymized.preferences).toEqual(userData.preferences);
    });

    it('generates consistent anonymous IDs for same user', () => {
      const userData = { userId: 'user_12345', name: 'John' };
      
      const anonymized1 = privacyController.anonymizeUserData(userData);
      const anonymized2 = privacyController.anonymizeUserData(userData);
      
      expect(anonymized1.userId).toBe(anonymized2.userId);
    });

    it('generates different anonymous IDs for different users', () => {
      const userData1 = { userId: 'user_12345', name: 'John' };
      const userData2 = { userId: 'user_67890', name: 'Jane' };
      
      const anonymized1 = privacyController.anonymizeUserData(userData1);
      const anonymized2 = privacyController.anonymizeUserData(userData2);
      
      expect(anonymized1.userId).not.toBe(anonymized2.userId);
    });
  });

  describe('Consent Management', () => {
    it('creates consent requests correctly', async () => {
      const consent = await privacyController.requestConsent(
        'achievement',
        'Share achievement with community',
        'pseudonymous',
        ['discord', 'reddit']
      );

      expect(consent).toHaveProperty('consentId');
      expect(consent.purpose).toBe('Share achievement with community');
      expect(consent.dataType).toBe('achievement');
      expect(consent.scope).toBe('pseudonymous');
      expect(consent.platforms).toEqual(['discord', 'reddit']);
      expect(consent.status).toBe('pending');
    });

    it('grants consent and updates status', async () => {
      const consent = await privacyController.requestConsent(
        'achievement',
        'Share achievement',
        'pseudonymous',
        ['discord']
      );

      await privacyController.grantConsent(consent.consentId);
      
      const settings = privacyController.getSettings();
      const consentRecord = settings.consentHistory.find(c => c.consentId === consent.consentId);
      
      expect(consentRecord?.status).toBe('granted');
      expect(consentRecord?.grantedAt).toBeDefined();
    });

    it('revokes consent and updates status', async () => {
      const consent = await privacyController.requestConsent(
        'achievement',
        'Share achievement',
        'pseudonymous',
        ['discord']
      );

      await privacyController.grantConsent(consent.consentId);
      await privacyController.revokeConsent(consent.consentId);
      
      const settings = privacyController.getSettings();
      const consentRecord = settings.consentHistory.find(c => c.consentId === consent.consentId);
      
      expect(consentRecord?.status).toBe('revoked');
      expect(consentRecord?.revokedAt).toBeDefined();
    });

    it('prevents duplicate consent requests', async () => {
      await privacyController.requestConsent(
        'achievement',
        'Share achievement',
        'pseudonymous',
        ['discord']
      );

      await expect(
        privacyController.requestConsent(
          'achievement',
          'Share achievement',
          'pseudonymous',
          ['discord']
        )
      ).rejects.toThrow('Similar consent request already exists');
    });

    it('expires consent after specified duration', async () => {
      const consent = await privacyController.requestConsent(
        'achievement',
        'Share achievement',
        'pseudonymous',
        ['discord']
      );

      // Mock time passage
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 25 * 60 * 60 * 1000); // 25 hours later

      const settings = privacyController.getSettings();
      const consentRecord = settings.consentHistory.find(c => c.consentId === consent.consentId);
      
      expect(privacyController.isConsentValid(consentRecord!)).toBe(false);

      Date.now = originalNow;
    });
  });

  describe('Data Export', () => {
    it('exports data in JSON format', async () => {
      const exportResult = await privacyController.exportData('json');
      
      expect(exportResult.format).toBe('json');
      expect(exportResult.data).toBeDefined();
      expect(exportResult.exportId).toMatch(/^export_/);
      expect(exportResult.timestamp).toBeDefined();
      
      const parsedData = JSON.parse(exportResult.data);
      expect(parsedData).toHaveProperty('settings');
      expect(parsedData).toHaveProperty('consentHistory');
      expect(parsedData).toHaveProperty('auditLog');
    });

    it('exports data in CSV format', async () => {
      const exportResult = await privacyController.exportData('csv');
      
      expect(exportResult.format).toBe('csv');
      expect(exportResult.data).toContain('timestamp,event,details');
      expect(exportResult.data).toContain(','); // CSV format
    });

    it('exports data in XML format', async () => {
      const exportResult = await privacyController.exportData('xml');
      
      expect(exportResult.format).toBe('xml');
      expect(exportResult.data).toContain('<?xml version="1.0"');
      expect(exportResult.data).toContain('<privacyData>');
      expect(exportResult.data).toContain('</privacyData>');
    });

    it('includes audit log in export', async () => {
      // Generate some audit events
      privacyController.updateSettings({ globalSettings: { participationLevel: 'pseudonymous' } });
      await privacyController.requestConsent('achievement', 'Test', 'pseudonymous', ['discord']);
      
      const exportResult = await privacyController.exportData('json');
      const parsedData = JSON.parse(exportResult.data);
      
      expect(parsedData.auditLog).toBeDefined();
      expect(parsedData.auditLog.length).toBeGreaterThan(0);
      expect(parsedData.auditLog[0]).toHaveProperty('event');
      expect(parsedData.auditLog[0]).toHaveProperty('timestamp');
    });
  });

  describe('Data Deletion', () => {
    it('initiates data deletion with grace period', async () => {
      const deletionResult = await privacyController.deleteData();
      
      expect(deletionResult.deletionId).toMatch(/^deletion_/);
      expect(deletionResult.gracePeriodEnd).toBeDefined();
      expect(deletionResult.status).toBe('scheduled');
      
      const gracePeriodEnd = new Date(deletionResult.gracePeriodEnd);
      const now = new Date();
      const daysDiff = (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      expect(daysDiff).toBeCloseTo(30, 1); // 30-day grace period
    });

    it('cancels scheduled deletion during grace period', async () => {
      const deletionResult = await privacyController.deleteData();
      const cancelled = await privacyController.cancelDataDeletion(deletionResult.deletionId);
      
      expect(cancelled).toBe(true);
    });

    it('prevents cancellation after grace period', async () => {
      const deletionResult = await privacyController.deleteData();
      
      // Mock time passage beyond grace period
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 32 * 24 * 60 * 60 * 1000); // 32 days later

      const cancelled = await privacyController.cancelDataDeletion(deletionResult.deletionId);
      
      expect(cancelled).toBe(false);

      Date.now = originalNow;
    });
  });

  describe('Audit Logging', () => {
    it('logs privacy setting changes', () => {
      const initialLogLength = privacyController.getAuditLog().length;
      
      privacyController.updateSettings({
        globalSettings: { participationLevel: 'pseudonymous' },
      });
      
      const auditLog = privacyController.getAuditLog();
      expect(auditLog.length).toBe(initialLogLength + 1);
      
      const latestEntry = auditLog[auditLog.length - 1];
      expect(latestEntry.event).toBe('settingsUpdated');
      expect(latestEntry.details).toContain('participationLevel');
    });

    it('logs consent events', async () => {
      const initialLogLength = privacyController.getAuditLog().length;
      
      const consent = await privacyController.requestConsent(
        'achievement',
        'Test consent',
        'pseudonymous',
        ['discord']
      );
      
      await privacyController.grantConsent(consent.consentId);
      
      const auditLog = privacyController.getAuditLog();
      expect(auditLog.length).toBe(initialLogLength + 2); // request + grant
      
      const consentRequestEntry = auditLog.find(entry => entry.event === 'consentRequested');
      const consentGrantEntry = auditLog.find(entry => entry.event === 'consentGranted');
      
      expect(consentRequestEntry).toBeDefined();
      expect(consentGrantEntry).toBeDefined();
    });

    it('logs data operations', async () => {
      const initialLogLength = privacyController.getAuditLog().length;
      
      await privacyController.exportData('json');
      await privacyController.deleteData();
      
      const auditLog = privacyController.getAuditLog();
      expect(auditLog.length).toBe(initialLogLength + 2);
      
      const exportEntry = auditLog.find(entry => entry.event === 'dataExported');
      const deleteEntry = auditLog.find(entry => entry.event === 'dataDeletionScheduled');
      
      expect(exportEntry).toBeDefined();
      expect(deleteEntry).toBeDefined();
    });

    it('filters audit log by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      privacyController.updateSettings({ globalSettings: { participationLevel: 'pseudonymous' } });
      
      const filteredLog = privacyController.getAuditLog(yesterday.toISOString(), now.toISOString());
      
      expect(filteredLog.length).toBeGreaterThan(0);
      filteredLog.forEach(entry => {
        const entryDate = new Date(entry.timestamp);
        expect(entryDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(entryDate.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('respects audit log retention policy', () => {
      // Mock old entries
      const oldTimestamp = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString(); // 366 days ago
      
      (privacyController as any).auditLog.push({
        id: 'old_entry',
        event: 'oldEvent',
        timestamp: oldTimestamp,
        details: 'Old entry that should be cleaned up',
      });
      
      // Trigger cleanup
      privacyController.updateSettings({ globalSettings: { participationLevel: 'anonymous' } });
      
      const auditLog = privacyController.getAuditLog();
      const oldEntry = auditLog.find(entry => entry.id === 'old_entry');
      
      expect(oldEntry).toBeUndefined(); // Should be cleaned up
    });
  });

  describe('Event System', () => {
    it('emits events for settings updates', (done) => {
      privacyController.on('settingsUpdated', (event) => {
        expect(event.settings).toBeDefined();
        expect(event.changes).toBeDefined();
        done();
      });

      privacyController.updateSettings({
        globalSettings: { participationLevel: 'pseudonymous' },
      });
    });

    it('emits events for consent changes', (done) => {
      privacyController.on('consentGranted', (event) => {
        expect(event.consentId).toBeDefined();
        expect(event.consent).toBeDefined();
        done();
      });

      privacyController.requestConsent('achievement', 'Test', 'pseudonymous', ['discord'])
        .then(consent => privacyController.grantConsent(consent.consentId));
    });

    it('emits events for data operations', (done) => {
      privacyController.on('dataExported', (event) => {
        expect(event.exportId).toBeDefined();
        expect(event.format).toBe('json');
        done();
      });

      privacyController.exportData('json');
    });
  });
});

describe('Privacy Integration with Sharing', () => {
  let privacyController: PrivacyController;
  let sharingManager: SharingManager;

  beforeEach(() => {
    privacyController = new PrivacyController();
    sharingManager = new SharingManager(privacyController);
  });

  it('respects privacy settings during sharing', async () => {
    // Disable achievement sharing
    privacyController.updateSettings({
      sharingSettings: {
        achievementSharing: { enabled: false, autoShare: false, platforms: [] },
      },
    });

    const achievement = {
      id: 'ach_001',
      name: 'Test Achievement',
      description: 'Test description',
      category: 'test',
      level: 1,
      energyReward: 50,
      earnedDate: '2024-01-15T10:30:00Z',
    };

    await expect(
      sharingManager.shareAchievement(achievement, ['discord'], 'pseudonymous')
    ).rejects.toThrow('Achievement sharing is disabled');
  });

  it('applies data sanitization before sharing', async () => {
    const achievement = {
      id: 'ach_001',
      name: 'Test Achievement',
      description: 'Contact me at user@example.com for help',
      category: 'test',
      level: 1,
      energyReward: 50,
      earnedDate: '2024-01-15T10:30:00Z',
    };

    // Mock the sharing platform to capture sanitized data
    const mockPlatform = {
      share: jest.fn().mockResolvedValue({
        success: true,
        shareId: 'test_share',
        platform: 'discord',
        anonymized: false,
      }),
    };

    (sharingManager as any).platforms.set('discord', mockPlatform);

    await sharingManager.shareAchievement(achievement, ['discord'], 'pseudonymous');

    expect(mockPlatform.share).toHaveBeenCalled();
    const sharedData = mockPlatform.share.mock.calls[0][0];
    expect(sharedData.description).not.toContain('user@example.com');
  });

  it('applies anonymization for anonymous sharing', async () => {
    const achievement = {
      id: 'ach_001',
      name: 'Test Achievement',
      description: 'Test description',
      category: 'test',
      level: 1,
      energyReward: 50,
      earnedDate: '2024-01-15T10:30:00Z',
    };

    const mockPlatform = {
      share: jest.fn().mockResolvedValue({
        success: true,
        shareId: 'test_share',
        platform: 'discord',
        anonymized: true,
      }),
    };

    (sharingManager as any).platforms.set('discord', mockPlatform);

    await sharingManager.shareAchievement(achievement, ['discord'], 'anonymous');

    expect(mockPlatform.share).toHaveBeenCalledWith(achievement, 'anonymous');
  });

  it('requires explicit consent when configured', async () => {
    privacyController.updateSettings({
      globalSettings: { explicitConsentRequired: true },
    });

    const achievement = {
      id: 'ach_001',
      name: 'Test Achievement',
      description: 'Test description',
      category: 'test',
      level: 1,
      energyReward: 50,
      earnedDate: '2024-01-15T10:30:00Z',
    };

    // Mock consent workflow
    const requestConsentSpy = jest.spyOn(privacyController, 'requestConsent');
    const grantConsentSpy = jest.spyOn(privacyController, 'grantConsent');

    await sharingManager.shareAchievement(achievement, ['discord'], 'pseudonymous');

    expect(requestConsentSpy).toHaveBeenCalledWith(
      'achievement',
      'Share achievement with community',
      'pseudonymous',
      ['discord']
    );
    expect(grantConsentSpy).toHaveBeenCalled();
  });
});
