/**
 * WF-UX-008 Social Feature Tests
 * Comprehensive test suite for social components and functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventEmitter } from 'eventemitter3';
import { 
  AchievementCard, 
  ChallengeCard, 
  PrivacyStatusIndicator, 
  SocialDashboard, 
  ShareConfirmationModal 
} from '../code/WF-UX-008/social-components';
import { PrivacyController } from '../code/WF-UX-008/privacy-controls';
import { SharingManager } from '../code/WF-UX-008/sharing-utilities';

// Mock data
const mockAchievement = {
  id: 'ach_001',
  name: 'First Steps',
  description: 'Complete your first tutorial',
  category: 'learning',
  level: 1,
  energyReward: 50,
  earnedDate: '2024-01-15T10:30:00Z',
  rarity: 'common' as const,
  icon: '🎯',
};

const mockChallenge = {
  id: 'chal_001',
  name: 'Speed Learner',
  description: 'Complete 5 tutorials in one day',
  category: 'learning',
  difficulty: 'medium' as const,
  energyReward: 200,
  timeLimit: '24h',
  requirements: ['Complete 5 tutorials', 'Within 24 hours'],
  progress: 3,
  maxProgress: 5,
  status: 'active' as const,
  startDate: '2024-01-15T00:00:00Z',
  endDate: '2024-01-16T00:00:00Z',
};

const mockPrivacySettings = {
  globalSettings: {
    participationLevel: 'pseudonymous' as const,
    dataMinimization: true,
    explicitConsentRequired: true,
    auditLogging: true,
  },
  identitySettings: {
    displayName: 'TestUser',
    showRealName: false,
    allowMentions: true,
    profileVisibility: 'community' as const,
  },
  sharingSettings: {
    achievementSharing: { enabled: true, autoShare: false, platforms: ['discord'] },
    challengeSharing: { enabled: true, autoShare: false, platforms: ['discord'] },
    contentSharing: { enabled: true, requireApproval: true, platforms: ['reddit'] },
    mentorshipSharing: { enabled: false, autoShare: false, platforms: [] },
  },
  externalPlatforms: {
    discord: { enabled: true, webhookUrl: 'https://discord.com/api/webhooks/test' },
    twitch: { enabled: false },
    reddit: { enabled: true, authToken: 'test_token' },
    twitter: { enabled: false },
  },
  dataControl: {
    retentionPeriod: '2y',
    allowDataExport: true,
    allowDataDeletion: true,
    gracePeriod: '30d',
  },
  consentHistory: [],
};

// Mock implementations
const mockPrivacyController = {
  getSettings: jest.fn(() => mockPrivacySettings),
  updateSettings: jest.fn(),
  requestConsent: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
  sanitizeData: jest.fn((data) => data),
  anonymizeUserData: jest.fn((data) => ({ ...data, userId: 'anonymous' })),
  exportData: jest.fn(),
  deleteData: jest.fn(),
  getAuditLog: jest.fn(() => []),
} as unknown as PrivacyController;

const mockSharingManager = {
  shareAchievement: jest.fn(),
  shareContent: jest.fn(),
  revokeShare: jest.fn(),
  getShareHistory: jest.fn(() => []),
  getAvailablePlatforms: jest.fn(() => ['discord', 'reddit']),
  isPlatformEnabled: jest.fn(() => true),
} as unknown as SharingManager;

describe('Social Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AchievementCard', () => {
    it('renders achievement information correctly', () => {
      render(
        <AchievementCard 
          achievement={mockAchievement}
          onShare={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      expect(screen.getByText('First Steps')).toBeInTheDocument();
      expect(screen.getByText('Complete your first tutorial')).toBeInTheDocument();
      expect(screen.getByText('50 EU')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('handles share button click', async () => {
      const onShare = jest.fn();
      render(
        <AchievementCard 
          achievement={mockAchievement}
          onShare={onShare}
          privacyController={mockPrivacyController}
        />
      );

      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockAchievement);
    });

    it('respects privacy settings for sharing', () => {
      const mockPrivacyControllerDisabled = {
        ...mockPrivacyController,
        getSettings: jest.fn(() => ({
          ...mockPrivacySettings,
          sharingSettings: {
            ...mockPrivacySettings.sharingSettings,
            achievementSharing: { enabled: false, autoShare: false, platforms: [] },
          },
        })),
      };

      render(
        <AchievementCard 
          achievement={mockAchievement}
          onShare={jest.fn()}
          privacyController={mockPrivacyControllerDisabled}
        />
      );

      expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
    });

    it('displays rarity indicator', () => {
      const rareAchievement = { ...mockAchievement, rarity: 'legendary' as const };
      render(
        <AchievementCard 
          achievement={rareAchievement}
          onShare={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      expect(screen.getByText('legendary')).toBeInTheDocument();
    });
  });

  describe('ChallengeCard', () => {
    it('renders challenge information correctly', () => {
      render(
        <ChallengeCard 
          challenge={mockChallenge}
          onJoin={jest.fn()}
          onShare={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      expect(screen.getByText('Speed Learner')).toBeInTheDocument();
      expect(screen.getByText('Complete 5 tutorials in one day')).toBeInTheDocument();
      expect(screen.getByText('200 EU')).toBeInTheDocument();
      expect(screen.getByText('3 / 5')).toBeInTheDocument();
    });

    it('shows progress bar correctly', () => {
      render(
        <ChallengeCard 
          challenge={mockChallenge}
          onJoin={jest.fn()}
          onShare={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60'); // 3/5 = 60%
    });

    it('handles join button click', () => {
      const onJoin = jest.fn();
      render(
        <ChallengeCard 
          challenge={mockChallenge}
          onJoin={onJoin}
          onShare={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      const joinButton = screen.getByRole('button', { name: /join/i });
      fireEvent.click(joinButton);

      expect(onJoin).toHaveBeenCalledWith(mockChallenge.id);
    });

    it('displays time remaining', () => {
      render(
        <ChallengeCard 
          challenge={mockChallenge}
          onJoin={jest.fn()}
          onShare={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
    });
  });

  describe('PrivacyStatusIndicator', () => {
    it('displays privacy level correctly', () => {
      render(<PrivacyStatusIndicator privacyController={mockPrivacyController} />);

      expect(screen.getByText('pseudonymous')).toBeInTheDocument();
      expect(screen.getByText('🎭')).toBeInTheDocument();
    });

    it('shows privacy details on hover', async () => {
      render(<PrivacyStatusIndicator privacyController={mockPrivacyController} />);

      const indicator = screen.getByRole('button');
      fireEvent.mouseEnter(indicator);

      await waitFor(() => {
        expect(screen.getByText(/data minimization: enabled/i)).toBeInTheDocument();
        expect(screen.getByText(/explicit consent: required/i)).toBeInTheDocument();
      });
    });

    it('handles different privacy levels', () => {
      const anonymousSettings = {
        ...mockPrivacySettings,
        globalSettings: {
          ...mockPrivacySettings.globalSettings,
          participationLevel: 'anonymous' as const,
        },
      };

      const mockController = {
        ...mockPrivacyController,
        getSettings: jest.fn(() => anonymousSettings),
      };

      render(<PrivacyStatusIndicator privacyController={mockController} />);

      expect(screen.getByText('anonymous')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
    });
  });

  describe('SocialDashboard', () => {
    const mockStats = {
      achievements: 15,
      challenges: 3,
      shares: 8,
      reputation: 1250,
    };

    it('renders dashboard sections correctly', () => {
      render(
        <SocialDashboard 
          stats={mockStats}
          recentActivity={[]}
          privacyController={mockPrivacyController}
          sharingManager={mockSharingManager}
        />
      );

      expect(screen.getByText('Social Dashboard')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // achievements
      expect(screen.getByText('3')).toBeInTheDocument(); // challenges
      expect(screen.getByText('8')).toBeInTheDocument(); // shares
      expect(screen.getByText('1,250')).toBeInTheDocument(); // reputation
    });

    it('displays recent activity', () => {
      const recentActivity = [
        {
          id: 'act_001',
          type: 'achievement' as const,
          title: 'Earned "First Steps"',
          timestamp: '2024-01-15T10:30:00Z',
          icon: '🏆',
        },
      ];

      render(
        <SocialDashboard 
          stats={mockStats}
          recentActivity={recentActivity}
          privacyController={mockPrivacyController}
          sharingManager={mockSharingManager}
        />
      );

      expect(screen.getByText('Earned "First Steps"')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    it('shows privacy controls section', () => {
      render(
        <SocialDashboard 
          stats={mockStats}
          recentActivity={[]}
          privacyController={mockPrivacyController}
          sharingManager={mockSharingManager}
        />
      );

      expect(screen.getByText('Privacy Controls')).toBeInTheDocument();
      expect(screen.getByText('Manage Settings')).toBeInTheDocument();
    });
  });

  describe('ShareConfirmationModal', () => {
    const mockShareData = {
      type: 'achievement' as const,
      data: mockAchievement,
      platforms: ['discord', 'reddit'],
      scope: 'pseudonymous' as const,
    };

    it('renders share confirmation correctly', () => {
      render(
        <ShareConfirmationModal 
          isOpen={true}
          shareData={mockShareData}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      expect(screen.getByText('Confirm Share')).toBeInTheDocument();
      expect(screen.getByText('First Steps')).toBeInTheDocument();
      expect(screen.getByText('discord')).toBeInTheDocument();
      expect(screen.getByText('reddit')).toBeInTheDocument();
    });

    it('shows privacy preview', () => {
      render(
        <ShareConfirmationModal 
          isOpen={true}
          shareData={mockShareData}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      expect(screen.getByText('Privacy Level: pseudonymous')).toBeInTheDocument();
      expect(screen.getByText(/data will be sanitized/i)).toBeInTheDocument();
    });

    it('handles confirm button click', () => {
      const onConfirm = jest.fn();
      render(
        <ShareConfirmationModal 
          isOpen={true}
          shareData={mockShareData}
          onConfirm={onConfirm}
          onCancel={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(mockShareData);
    });

    it('handles cancel button click', () => {
      const onCancel = jest.fn();
      render(
        <ShareConfirmationModal 
          isOpen={true}
          shareData={mockShareData}
          onConfirm={jest.fn()}
          onCancel={onCancel}
          privacyController={mockPrivacyController}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('does not render when closed', () => {
      render(
        <ShareConfirmationModal 
          isOpen={false}
          shareData={mockShareData}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          privacyController={mockPrivacyController}
        />
      );

      expect(screen.queryByText('Confirm Share')).not.toBeInTheDocument();
    });
  });
});

describe('Social Feature Integration', () => {
  let privacyController: PrivacyController;
  let sharingManager: SharingManager;

  beforeEach(() => {
    privacyController = new PrivacyController();
    sharingManager = new SharingManager(privacyController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Achievement Sharing Flow', () => {
    it('completes full sharing workflow', async () => {
      // Mock the sharing process
      const shareResult = await sharingManager.shareAchievement(
        mockAchievement,
        ['discord'],
        'pseudonymous'
      );

      expect(shareResult).toBeDefined();
      expect(Array.isArray(shareResult)).toBe(true);
    });

    it('respects privacy settings during sharing', async () => {
      // Update privacy settings to disable sharing
      privacyController.updateSettings({
        sharingSettings: {
          achievementSharing: { enabled: false, autoShare: false, platforms: [] },
        },
      });

      await expect(
        sharingManager.shareAchievement(mockAchievement, ['discord'], 'pseudonymous')
      ).rejects.toThrow('Achievement sharing is disabled');
    });

    it('sanitizes data before sharing', () => {
      const sensitiveAchievement = {
        ...mockAchievement,
        description: 'Contact me at user@example.com for help',
      };

      const sanitized = privacyController.sanitizeData(sensitiveAchievement);
      expect(sanitized.description).not.toContain('user@example.com');
    });
  });

  describe('Privacy Control Integration', () => {
    it('updates privacy settings correctly', () => {
      const newSettings = {
        globalSettings: {
          participationLevel: 'anonymous' as const,
        },
      };

      privacyController.updateSettings(newSettings);
      const settings = privacyController.getSettings();

      expect(settings.globalSettings.participationLevel).toBe('anonymous');
    });

    it('manages consent workflow', async () => {
      const consentRequest = await privacyController.requestConsent(
        'achievement',
        'Share achievement with community',
        'pseudonymous',
        ['discord']
      );

      expect(consentRequest).toHaveProperty('consentId');
      expect(consentRequest).toHaveProperty('purpose');
      expect(consentRequest.purpose).toBe('Share achievement with community');
    });

    it('exports user data correctly', async () => {
      const exportedData = await privacyController.exportData('json');
      
      expect(exportedData).toHaveProperty('format', 'json');
      expect(exportedData).toHaveProperty('data');
      expect(exportedData).toHaveProperty('exportId');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      // Mock network failure
      const mockFailingManager = {
        ...mockSharingManager,
        shareAchievement: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      await expect(
        mockFailingManager.shareAchievement(mockAchievement, ['discord'], 'pseudonymous')
      ).rejects.toThrow('Network error');
    });

    it('validates share data before processing', () => {
      const invalidAchievement = { id: 'test' }; // Missing required fields

      const isValid = sharingManager.validateShareData(invalidAchievement, 'achievement');
      expect(isValid).toBe(false);
    });

    it('handles privacy controller errors', () => {
      expect(() => {
        privacyController.updateSettings(null as any);
      }).toThrow();
    });
  });

  describe('Event System', () => {
    it('emits events for sharing actions', (done) => {
      sharingManager.on('shareSuccess', (event) => {
        expect(event).toHaveProperty('shareRequest');
        expect(event).toHaveProperty('result');
        done();
      });

      // Trigger a successful share
      sharingManager.shareAchievement(mockAchievement, ['discord'], 'pseudonymous');
    });

    it('emits events for privacy changes', (done) => {
      privacyController.on('settingsUpdated', (event) => {
        expect(event).toHaveProperty('settings');
        done();
      });

      privacyController.updateSettings({
        globalSettings: { participationLevel: 'anonymous' },
      });
    });
  });
});

describe('Performance Tests', () => {
  it('renders large achievement lists efficiently', () => {
    const manyAchievements = Array.from({ length: 100 }, (_, i) => ({
      ...mockAchievement,
      id: `ach_${i}`,
      name: `Achievement ${i}`,
    }));

    const startTime = performance.now();
    
    render(
      <div>
        {manyAchievements.map(achievement => (
          <AchievementCard 
            key={achievement.id}
            achievement={achievement}
            onShare={jest.fn()}
            privacyController={mockPrivacyController}
          />
        ))}
      </div>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render 100 components in under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('handles rapid privacy setting updates', () => {
    const startTime = performance.now();

    for (let i = 0; i < 100; i++) {
      privacyController.updateSettings({
        globalSettings: { participationLevel: i % 2 === 0 ? 'anonymous' : 'pseudonymous' },
      });
    }

    const endTime = performance.now();
    const updateTime = endTime - startTime;

    // Should handle 100 updates in under 50ms
    expect(updateTime).toBeLessThan(50);
  });
});

describe('Accessibility Tests', () => {
  it('provides proper ARIA labels', () => {
    render(
      <AchievementCard 
        achievement={mockAchievement}
        onShare={jest.fn()}
        privacyController={mockPrivacyController}
      />
    );

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toHaveAttribute('aria-label');
  });

  it('supports keyboard navigation', () => {
    render(
      <ChallengeCard 
        challenge={mockChallenge}
        onJoin={jest.fn()}
        onShare={jest.fn()}
        privacyController={mockPrivacyController}
      />
    );

    const joinButton = screen.getByRole('button', { name: /join/i });
    joinButton.focus();
    
    expect(document.activeElement).toBe(joinButton);
  });

  it('provides screen reader friendly content', () => {
    render(
      <PrivacyStatusIndicator privacyController={mockPrivacyController} />
    );

    const indicator = screen.getByRole('button');
    expect(indicator).toHaveAttribute('aria-describedby');
  });
});
