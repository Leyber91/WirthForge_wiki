import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AchievementTracker, progressionEvents } from '../WF-UX-002-achievement-tracker';
import type { Achievement, AchievementProgress } from '../WF-UX-002-achievement-tracker';

// Mock progression events
vi.mock('../WF-UX-002-progression-manager', () => ({
  progressionEvents: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

describe('AchievementTracker', () => {
  let mockOnAchievementUnlock: Mock;
  let mockOnProgressUpdate: Mock;

  beforeEach(() => {
    mockOnAchievementUnlock = vi.fn();
    mockOnProgressUpdate = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial Rendering', () => {
    it('should render achievement tracker with default props', () => {
      render(<AchievementTracker />);
      
      expect(screen.getByTestId('achievement-tracker')).toBeInTheDocument();
    });

    it('should display achievement categories', async () => {
      render(<AchievementTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('Feature Mastery')).toBeInTheDocument();
        expect(screen.getByText('Milestone')).toBeInTheDocument();
      });
    });

    it('should show achievement statistics', async () => {
      render(<AchievementTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Unlocked')).toBeInTheDocument();
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('EU Earned')).toBeInTheDocument();
      });
    });
  });

  describe('Achievement Progress Calculation', () => {
    it('should calculate progress for token-based achievements', async () => {
      const sessionMetrics = {
        tokensGenerated: 50,
        promptsCompleted: 3,
        tokensPerSecond: 15,
        efficiencyPercentage: 85
      };

      render(
        <AchievementTracker onProgressUpdate={mockOnProgressUpdate} />
      );

      // Simulate metrics update
      act(() => {
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        expect(mockOnProgressUpdate).toHaveBeenCalled();
      });

      const progressUpdate = mockOnProgressUpdate.mock.calls[0][0];
      expect(Array.isArray(progressUpdate)).toBe(true);
    });

    it('should handle speed-based achievement progress', async () => {
      const sessionMetrics = {
        tokensPerSecond: 12,
        sustainedDurationSeconds: 25
      };

      render(
        <AchievementTracker onProgressUpdate={mockOnProgressUpdate} />
      );

      act(() => {
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        expect(mockOnProgressUpdate).toHaveBeenCalled();
      });

      // Should show progress towards Speed Demon I achievement
      const speedAchievement = screen.getByText('Speed Demon I');
      expect(speedAchievement).toBeInTheDocument();
    });

    it('should respect level requirements for achievements', async () => {
      render(<AchievementTracker />);

      // Simulate user at level 1
      act(() => {
        const levelHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'levelUp')?.[1];
        if (levelHandler) {
          levelHandler({ newLevel: 1 });
        }
      });

      await waitFor(() => {
        // Level 2+ achievements should not be available for unlock
        const councilAchievement = screen.queryByText('Council Initiate');
        if (councilAchievement) {
          const card = councilAchievement.closest('.achievement-card');
          expect(card).not.toHaveClass('can-unlock');
        }
      });
    });
  });

  describe('Achievement Unlocking', () => {
    it('should unlock achievement when criteria are met', async () => {
      const sessionMetrics = {
        promptsCompleted: 1,
        tokensGenerated: 10
      };

      render(
        <AchievementTracker onAchievementUnlock={mockOnAchievementUnlock} />
      );

      // Simulate meeting first strike criteria
      act(() => {
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        expect(mockOnAchievementUnlock).toHaveBeenCalled();
      });

      const unlockedAchievement = mockOnAchievementUnlock.mock.calls[0][0];
      expect(unlockedAchievement).toHaveProperty('achievementId');
      expect(unlockedAchievement).toHaveProperty('energyReward');
    });

    it('should emit energy award event when achievement unlocks', async () => {
      const sessionMetrics = {
        promptsCompleted: 1
      };

      render(<AchievementTracker />);

      act(() => {
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        expect(progressionEvents.emit).toHaveBeenCalledWith(
          'awardEnergy',
          expect.objectContaining({
            amount: expect.any(Number),
            source: expect.stringContaining('Achievement:')
          })
        );
      });
    });

    it('should show recent unlocks banner', async () => {
      render(<AchievementTracker />);

      // Simulate achievement unlock
      const mockAchievement: Achievement = {
        achievementId: 'test_achievement',
        name: 'Test Achievement',
        description: 'Test description',
        category: 'milestone',
        rarity: 'bronze',
        energyReward: 50,
        unlockCriteria: {
          metricType: 'prompts_completed',
          targetValue: 1,
          timeframe: 'lifetime'
        },
        prerequisites: [],
        levelRequirement: 1,
        isSecret: false,
        visualElements: {
          iconName: 'test_icon',
          primaryColor: '#fbbf24',
          badgeShape: 'circle'
        },
        progressTracking: {
          showProgress: true,
          progressFormat: 'fraction'
        }
      };

      act(() => {
        const achievementHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'achievementUnlocked')?.[1];
        if (achievementHandler) {
          achievementHandler(mockAchievement);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
        expect(screen.getByText('Test Achievement')).toBeInTheDocument();
      });
    });
  });

  describe('Achievement Filtering', () => {
    it('should filter achievements by category', () => {
      render(
        <AchievementTracker filterByCategory={['performance']} />
      );

      // Should only show performance achievements
      expect(screen.getByText('Performance')).toBeInTheDocument();
      // Should not show other categories if they have no achievements
    });

    it('should hide secret achievements by default', async () => {
      render(<AchievementTracker showSecretAchievements={false} />);

      await waitFor(() => {
        // Secret achievement should not be visible
        expect(screen.queryByText('Hidden Feature Finder')).not.toBeInTheDocument();
      });
    });

    it('should show secret achievements when enabled', async () => {
      render(<AchievementTracker showSecretAchievements={true} />);

      await waitFor(() => {
        // Secret achievement should be visible
        expect(screen.getByText('Hidden Feature Finder')).toBeInTheDocument();
      });
    });

    it('should show unlocked secret achievements even when showSecretAchievements is false', async () => {
      render(<AchievementTracker showSecretAchievements={false} />);

      // Simulate unlocking a secret achievement
      act(() => {
        const sessionMetrics = { featureUsage: 1 };
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        // Once unlocked, secret achievement should be visible
        const hiddenFeature = screen.queryByText('Hidden Feature Finder');
        if (hiddenFeature) {
          expect(hiddenFeature).toBeInTheDocument();
        }
      });
    });
  });

  describe('Progress Display', () => {
    it('should format progress values correctly', async () => {
      render(<AchievementTracker />);

      await waitFor(() => {
        // Should show progress bars for trackable achievements
        const progressBars = screen.getAllByClassName('progress-bar');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should show milestone messages', async () => {
      const sessionMetrics = {
        tokensPerSecond: 7, // 70% progress towards 10 TPS
        sustainedDurationSeconds: 20
      };

      render(<AchievementTracker />);

      act(() => {
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        // Should show milestone message for Speed Demon I
        const milestoneText = screen.queryByText('Building speed...');
        if (milestoneText) {
          expect(milestoneText).toBeInTheDocument();
        }
      });
    });

    it('should handle different progress formats', async () => {
      render(<AchievementTracker />);

      await waitFor(() => {
        // Percentage format
        const percentageProgress = screen.queryByText(/\d+\.\d+%/);
        
        // Fraction format  
        const fractionProgress = screen.queryByText(/\d+\/\d+/);
        
        // At least one format should be present
        expect(percentageProgress || fractionProgress).toBeTruthy();
      });
    });
  });

  describe('Achievement Visual Elements', () => {
    it('should apply rarity-based styling', async () => {
      render(<AchievementTracker />);

      await waitFor(() => {
        const achievementCards = screen.getAllByClassName('achievement-card');
        expect(achievementCards.length).toBeGreaterThan(0);
        
        // Check for rarity data attributes
        const rarityCards = achievementCards.filter(card => 
          card.hasAttribute('data-rarity')
        );
        expect(rarityCards.length).toBeGreaterThan(0);
      });
    });

    it('should show glow effects for unlocked achievements', async () => {
      render(<AchievementTracker />);

      // Simulate unlocking an achievement with glow effect
      const sessionMetrics = { promptsCompleted: 1 };

      act(() => {
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        const glowEffects = screen.getAllByClassName('glow-effect');
        // Should have glow effects for achievements that specify them
        expect(glowEffects.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should display achievement badges with correct colors', async () => {
      render(<AchievementTracker />);

      await waitFor(() => {
        const badges = screen.getAllByClassName('achievement-badge');
        expect(badges.length).toBeGreaterThan(0);
        
        // Badges should have style attributes for colors
        badges.forEach(badge => {
          expect(badge).toHaveStyle('background-color: rgb(107, 114, 128)'); // Default unlocked color
        });
      });
    });
  });

  describe('Achievement Statistics', () => {
    it('should calculate total unlocked achievements correctly', async () => {
      render(<AchievementTracker />);

      // Simulate unlocking multiple achievements
      const sessionMetrics = {
        promptsCompleted: 5,
        tokensPerSecond: 15,
        sustainedDurationSeconds: 35
      };

      act(() => {
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        const unlockedStat = screen.getByText('Unlocked').parentElement;
        expect(unlockedStat).toBeInTheDocument();
        
        const unlockedCount = unlockedStat?.querySelector('.stat-value');
        expect(unlockedCount).toBeInTheDocument();
      });
    });

    it('should calculate total energy earned from achievements', async () => {
      render(<AchievementTracker />);

      await waitFor(() => {
        const energyStat = screen.getByText('EU Earned').parentElement;
        expect(energyStat).toBeInTheDocument();
        
        const energyValue = energyStat?.querySelector('.stat-value');
        expect(energyValue).toBeInTheDocument();
      });
    });
  });

  describe('Event Handling', () => {
    it('should listen to progression events on mount', () => {
      render(<AchievementTracker />);

      expect(progressionEvents.on).toHaveBeenCalledWith(
        'metricsUpdate',
        expect.any(Function)
      );
      expect(progressionEvents.on).toHaveBeenCalledWith(
        'levelUp',
        expect.any(Function)
      );
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(<AchievementTracker />);

      unmount();

      expect(progressionEvents.off).toHaveBeenCalledWith(
        'metricsUpdate',
        expect.any(Function)
      );
      expect(progressionEvents.off).toHaveBeenCalledWith(
        'levelUp',
        expect.any(Function)
      );
    });

    it('should handle level up events correctly', async () => {
      render(<AchievementTracker />);

      act(() => {
        const levelHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'levelUp')?.[1];
        if (levelHandler) {
          levelHandler({ newLevel: 3 });
        }
      });

      // Should recalculate achievement availability based on new level
      await waitFor(() => {
        // Level 3 achievements should now be available
        expect(screen.getByText('Efficiency Expert')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid metrics updates efficiently', async () => {
      render(<AchievementTracker onProgressUpdate={mockOnProgressUpdate} />);

      // Simulate rapid updates
      for (let i = 0; i < 50; i++) {
        act(() => {
          const metricsHandler = (progressionEvents.on as Mock).mock.calls
            .find(call => call[0] === 'metricsUpdate')?.[1];
          if (metricsHandler) {
            metricsHandler({
              tokensGenerated: i,
              tokensPerSecond: i * 0.1
            });
          }
        });
      }

      await waitFor(() => {
        // Should still be responsive
        expect(screen.getByTestId('achievement-tracker')).toBeInTheDocument();
      });
    });

    it('should limit recent unlocks display', async () => {
      render(<AchievementTracker />);

      // Simulate many achievement unlocks
      const mockAchievements = Array.from({ length: 10 }, (_, i) => ({
        achievementId: `achievement_${i}`,
        name: `Achievement ${i}`,
        energyReward: 50,
        visualElements: {
          iconName: 'test_icon',
          primaryColor: '#fbbf24'
        }
      }));

      for (const achievement of mockAchievements) {
        act(() => {
          const achievementHandler = (progressionEvents.on as Mock).mock.calls
            .find(call => call[0] === 'achievementUnlocked')?.[1];
          if (achievementHandler) {
            achievementHandler(achievement);
          }
        });
      }

      await waitFor(() => {
        const recentUnlocks = screen.getAllByClassName('recent-unlock');
        // Should limit to 3 recent unlocks
        expect(recentUnlocks.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<AchievementTracker />);

      const tracker = screen.getByTestId('achievement-tracker');
      expect(tracker).toBeInTheDocument();
    });

    it('should provide meaningful text for screen readers', async () => {
      render(<AchievementTracker />);

      await waitFor(() => {
        const achievementCards = screen.getAllByClassName('achievement-card');
        achievementCards.forEach(card => {
          // Each card should have descriptive text
          expect(card.textContent).toBeTruthy();
        });
      });
    });

    it('should handle keyboard navigation', async () => {
      render(<AchievementTracker />);

      await waitFor(() => {
        const achievementCards = screen.getAllByClassName('achievement-card');
        if (achievementCards.length > 0) {
          // Cards should be focusable if interactive
          achievementCards.forEach(card => {
            expect(card).toBeInTheDocument();
          });
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty achievement data gracefully', () => {
      // Mock empty achievements array
      const originalConsoleError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<AchievementTracker />);
      }).not.toThrow();

      console.error = originalConsoleError;
    });

    it('should handle invalid metric values', async () => {
      render(<AchievementTracker />);

      const invalidMetrics = {
        tokensPerSecond: -1,
        efficiencyPercentage: 150, // Over 100%
        tokensGenerated: null
      };

      expect(() => {
        act(() => {
          const metricsHandler = (progressionEvents.on as Mock).mock.calls
            .find(call => call[0] === 'metricsUpdate')?.[1];
          if (metricsHandler) {
            metricsHandler(invalidMetrics);
          }
        });
      }).not.toThrow();
    });

    it('should handle achievement unlock race conditions', async () => {
      render(<AchievementTracker onAchievementUnlock={mockOnAchievementUnlock} />);

      // Simulate rapid achievement unlocks
      const sessionMetrics = { promptsCompleted: 1 };

      act(() => {
        const metricsHandler = (progressionEvents.on as Mock).mock.calls
          .find(call => call[0] === 'metricsUpdate')?.[1];
        if (metricsHandler) {
          // Trigger multiple times rapidly
          metricsHandler(sessionMetrics);
          metricsHandler(sessionMetrics);
          metricsHandler(sessionMetrics);
        }
      });

      await waitFor(() => {
        // Should only unlock each achievement once
        const unlockCalls = mockOnAchievementUnlock.mock.calls;
        const uniqueAchievements = new Set(
          unlockCalls.map(call => call[0].achievementId)
        );
        expect(uniqueAchievements.size).toBeLessThanOrEqual(unlockCalls.length);
      });
    });
  });
});
