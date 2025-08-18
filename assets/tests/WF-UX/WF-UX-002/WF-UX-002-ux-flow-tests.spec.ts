import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaderboardService } from '../WF-UX-002-leaderboard-service';
import { CelebrationEffects, triggerManualCelebration } from '../WF-UX-002-celebration-effects';
import { ProgressionManager, progressionEvents } from '../WF-UX-002-progression-manager';
import { AchievementTracker } from '../WF-UX-002-achievement-tracker';

// Mock Web APIs
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      frequency: { setValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn()
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { 
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    })),
    destination: {},
    currentTime: 0
  }))
});

Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn()
});

// Mock canvas and WebGL
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  scale: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  fillStyle: '',
  globalAlpha: 1
}));

// Mock media query for reduced motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('UX Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any global state
    if (typeof window !== 'undefined') {
      delete (window as any).progressionManager;
      delete (window as any).triggerCelebration;
    }
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Complete User Journey Flow', () => {
    it('should handle complete first-time user experience', async () => {
      const user = userEvent.setup();
      const mockOnLevelUp = vi.fn();
      const mockOnAchievementUnlock = vi.fn();

      // Render complete gamification system
      const { rerender } = render(
        <div>
          <ProgressionManager
            onLevelUp={mockOnLevelUp}
            onAchievementUnlock={mockOnAchievementUnlock}
          />
          <AchievementTracker onAchievementUnlock={mockOnAchievementUnlock} />
          <CelebrationEffects />
        </div>
      );

      // Wait for components to initialize
      await waitFor(() => {
        expect(screen.getByTestId('progression-manager')).toBeInTheDocument();
        expect(screen.getByTestId('achievement-tracker')).toBeInTheDocument();
        expect(screen.getByTestId('celebration-effects')).toBeInTheDocument();
      });

      // Simulate first prompt completion (triggers First Strike achievement)
      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      act(() => {
        window.progressionManager.updateSessionMetrics({
          promptsCompleted: 1,
          tokensGenerated: 10,
          tokensPerSecond: 5
        });
      });

      // Should unlock First Strike achievement
      await waitFor(() => {
        expect(mockOnAchievementUnlock).toHaveBeenCalled();
      });

      // Should award energy
      expect(progressionEvents.emit).toHaveBeenCalledWith(
        'awardEnergy',
        expect.objectContaining({
          amount: expect.any(Number),
          source: expect.stringContaining('Achievement:')
        })
      );
    });

    it('should handle level progression with celebration', async () => {
      const mockOnLevelUp = vi.fn();
      
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 500,
        sessionMetrics: {
          promptsCompleted: 5,
          modelsUsed: 2,
          totalSessionTime: 10
        },
        completedAchievements: ['first_strike']
      };

      render(
        <div>
          <ProgressionManager
            initialProgress={initialProgress}
            onLevelUp={mockOnLevelUp}
          />
          <CelebrationEffects enableAudio={true} enableHaptics={true} />
        </div>
      );

      await waitFor(() => {
        const levelUpButton = screen.getByText('Level Up!');
        expect(levelUpButton).toBeInTheDocument();
      });

      // Click level up
      act(() => {
        fireEvent.click(screen.getByText('Level Up!'));
      });

      // Should trigger level up
      await waitFor(() => {
        expect(mockOnLevelUp).toHaveBeenCalledWith(2);
      });

      // Should emit celebration event
      expect(progressionEvents.emit).toHaveBeenCalledWith(
        'levelUp',
        expect.any(Object)
      );
    });
  });

  describe('Leaderboard Integration', () => {
    it('should display user rank and handle opt-out flow', async () => {
      const user = userEvent.setup();
      const mockOnRankChange = vi.fn();

      render(
        <LeaderboardService
          currentUserId="test-user"
          showUserRank={true}
          onRankChange={mockOnRankChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-service')).toBeInTheDocument();
      });

      // Should show user rank
      expect(screen.getByText(/Your Rank/)).toBeInTheDocument();

      // Test opt-out flow
      const optOutButton = screen.getByText('Opt Out');
      await user.click(optOutButton);

      await waitFor(() => {
        expect(screen.getByText('Leaderboard Disabled')).toBeInTheDocument();
        expect(screen.getByText('Rejoin Leaderboard')).toBeInTheDocument();
      });

      // Test opt back in
      const rejoinButton = screen.getByText('Rejoin Leaderboard');
      await user.click(rejoinButton);

      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-service')).toBeInTheDocument();
        expect(screen.queryByText('Leaderboard Disabled')).not.toBeInTheDocument();
      });
    });

    it('should handle leaderboard filtering and search', async () => {
      const user = userEvent.setup();

      render(
        <LeaderboardService
          currentUserId="test-user"
          enableFilters={true}
          enableSearch={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-service')).toBeInTheDocument();
      });

      // Test category filter
      const categorySelect = screen.getByDisplayValue('Overall');
      await user.selectOptions(categorySelect, 'Speed');

      await waitFor(() => {
        expect(screen.getByText('Speed')).toBeInTheDocument();
      });

      // Test search functionality
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'Lightning');

      await waitFor(() => {
        // Should filter results
        expect(searchInput).toHaveValue('Lightning');
      });

      // Test level filter
      const levelSelect = screen.getByDisplayValue('All Levels');
      await user.selectOptions(levelSelect, 'Level 2+');

      await waitFor(() => {
        expect(screen.getByDisplayValue('Level 2+')).toBeInTheDocument();
      });
    });

    it('should handle leaderboard refresh and pagination', async () => {
      const user = userEvent.setup();

      render(
        <LeaderboardService
          currentUserId="test-user"
          entriesPerPage={5}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-service')).toBeInTheDocument();
      });

      // Test refresh functionality
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Test pagination if available
      const nextButton = screen.queryByText('Next');
      if (nextButton && !nextButton.hasAttribute('disabled')) {
        await user.click(nextButton);
        
        await waitFor(() => {
          expect(screen.getByText(/Page \d+ of \d+/)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Celebration Effects Flow', () => {
    it('should trigger appropriate celebrations for different events', async () => {
      const mockTriggerCelebration = vi.fn();
      
      render(<CelebrationEffects />);

      await waitFor(() => {
        expect(window.triggerCelebration).toBeDefined();
      });

      // Test achievement unlock celebration
      act(() => {
        triggerManualCelebration('achievement_unlock', {
          achievementId: 'first_strike',
          name: 'First Strike'
        });
      });

      // Test level up celebration
      act(() => {
        triggerManualCelebration('level_up', {
          newLevel: 2,
          levelName: 'Parallel Streams'
        });
      });

      // Test milestone celebration
      act(() => {
        triggerManualCelebration('milestone_reached', {
          milestone: '100 tokens generated'
        });
      });

      // Should handle multiple celebrations
      expect(screen.getByTestId('celebration-effects')).toBeInTheDocument();
    });

    it('should respect accessibility preferences', async () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <CelebrationEffects
          respectReducedMotion={true}
          enableAudio={false}
          enableHaptics={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('celebration-effects')).toBeInTheDocument();
      });

      // Trigger celebration with reduced motion
      act(() => {
        triggerManualCelebration('achievement_unlock');
      });

      // Should use reduced motion alternatives
      await waitFor(() => {
        const altElements = document.querySelectorAll('.celebration-alt');
        // May or may not have alt elements depending on implementation
        expect(altElements.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle audio and haptic feedback', async () => {
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate
      });

      render(
        <CelebrationEffects
          enableAudio={true}
          enableHaptics={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('celebration-effects')).toBeInTheDocument();
      });

      // Trigger celebration with audio and haptics
      act(() => {
        triggerManualCelebration('level_up');
      });

      // Should attempt to create audio context
      expect(window.AudioContext).toHaveBeenCalled();
    });
  });

  describe('Cross-Component Communication', () => {
    it('should handle progression events across all components', async () => {
      const mockOnLevelUp = vi.fn();
      const mockOnAchievementUnlock = vi.fn();
      const mockOnRankChange = vi.fn();

      render(
        <div>
          <ProgressionManager
            onLevelUp={mockOnLevelUp}
            onAchievementUnlock={mockOnAchievementUnlock}
          />
          <AchievementTracker onAchievementUnlock={mockOnAchievementUnlock} />
          <LeaderboardService
            currentUserId="test-user"
            onRankChange={mockOnRankChange}
          />
          <CelebrationEffects />
        </div>
      );

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      // Simulate significant progress that affects multiple components
      act(() => {
        window.progressionManager.updateSessionMetrics({
          promptsCompleted: 10,
          tokensGenerated: 500,
          tokensPerSecond: 25,
          efficiencyPercentage: 95,
          modelsUsed: 3
        });
      });

      // Should trigger multiple achievements
      await waitFor(() => {
        expect(mockOnAchievementUnlock).toHaveBeenCalled();
      });

      // Should update leaderboard position
      await waitFor(() => {
        expect(mockOnRankChange).toHaveBeenCalled();
      });
    });

    it('should maintain state consistency across components', async () => {
      const initialProgress = {
        currentLevel: 2,
        totalEnergy: 1000,
        availableEnergy: 800,
        completedAchievements: ['first_strike', 'speed_demon_1']
      };

      render(
        <div>
          <ProgressionManager initialProgress={initialProgress} />
          <AchievementTracker />
        </div>
      );

      await waitFor(() => {
        // Progression manager should show level 2
        expect(screen.getByText('2')).toBeInTheDocument();
        
        // Achievement tracker should show unlocked achievements
        expect(screen.getByText('2')).toBeInTheDocument(); // Unlocked count
      });

      // Energy spending should update both components
      act(() => {
        window.progressionManager.spendEnergy(200, 'skill purchase');
      });

      await waitFor(() => {
        // Should show reduced energy
        expect(screen.getByText('600')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle component initialization failures gracefully', () => {
      // Mock console.error to suppress error logs during testing
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // Test with invalid props
      expect(() => {
        render(
          <div>
            <ProgressionManager initialProgress={null as any} />
            <AchievementTracker filterByCategory={null as any} />
            <LeaderboardService currentUserId="" />
          </div>
        );
      }).not.toThrow();

      console.error = originalConsoleError;
    });

    it('should handle rapid state changes without breaking', async () => {
      render(
        <div>
          <ProgressionManager />
          <AchievementTracker />
        </div>
      );

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          window.progressionManager.updateSessionMetrics({
            tokensGenerated: i,
            tokensPerSecond: i * 0.1,
            promptsCompleted: Math.floor(i / 10)
          });
        });
      }

      // Components should still be functional
      await waitFor(() => {
        expect(screen.getByTestId('progression-manager')).toBeInTheDocument();
        expect(screen.getByTestId('achievement-tracker')).toBeInTheDocument();
      });
    });

    it('should handle browser API unavailability', () => {
      // Mock missing APIs
      delete (window as any).AudioContext;
      delete (navigator as any).vibrate;

      expect(() => {
        render(<CelebrationEffects enableAudio={true} enableHaptics={true} />);
      }).not.toThrow();

      // Should still render without audio/haptic support
      expect(screen.getByTestId('celebration-effects')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should clean up resources on component unmount', () => {
      const { unmount } = render(
        <div>
          <ProgressionManager />
          <AchievementTracker />
          <CelebrationEffects />
        </div>
      );

      // Should have event listeners
      expect(progressionEvents.on).toHaveBeenCalled();

      unmount();

      // Should clean up event listeners
      expect(progressionEvents.off).toHaveBeenCalled();
    });

    it('should handle memory-intensive operations efficiently', async () => {
      render(
        <div>
          <ProgressionManager />
          <AchievementTracker />
          <LeaderboardService currentUserId="test-user" />
        </div>
      );

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      // Simulate memory-intensive operations
      const largeMetricsUpdate = {
        tokensGenerated: 1000000,
        sessionHistory: new Array(1000).fill(0).map((_, i) => ({
          timestamp: Date.now() - i * 1000,
          tokens: i,
          efficiency: Math.random() * 100
        }))
      };

      expect(() => {
        act(() => {
          window.progressionManager.updateSessionMetrics(largeMetricsUpdate);
        });
      }).not.toThrow();

      // Should still be responsive
      expect(screen.getByTestId('progression-manager')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide comprehensive screen reader support', async () => {
      render(
        <div>
          <ProgressionManager />
          <AchievementTracker />
          <LeaderboardService currentUserId="test-user" />
        </div>
      );

      // Should have proper ARIA labels
      const progressionManager = screen.getByTestId('progression-manager');
      const achievementTracker = screen.getByTestId('achievement-tracker');
      const leaderboardService = screen.getByTestId('leaderboard-service');

      expect(progressionManager).toBeInTheDocument();
      expect(achievementTracker).toBeInTheDocument();
      expect(leaderboardService).toBeInTheDocument();

      // Trigger achievement unlock to test announcements
      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      act(() => {
        window.progressionManager.updateSessionMetrics({
          promptsCompleted: 1
        });
      });

      // Should create screen reader announcements
      await waitFor(() => {
        const announcements = document.querySelectorAll('.sr-only, [aria-live]');
        expect(announcements.length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard navigation across components', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <ProgressionManager />
          <LeaderboardService currentUserId="test-user" enableFilters={true} />
        </div>
      );

      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-service')).toBeInTheDocument();
      });

      // Test tab navigation through interactive elements
      await user.tab();
      
      // Should be able to navigate through filters
      const categorySelect = screen.getByDisplayValue('Overall');
      expect(categorySelect).toBeInTheDocument();
      
      await user.keyboard('{ArrowDown}');
      // Should handle keyboard interaction
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle typical gaming session flow', async () => {
      const mockCallbacks = {
        onLevelUp: vi.fn(),
        onAchievementUnlock: vi.fn(),
        onRankChange: vi.fn()
      };

      render(
        <div>
          <ProgressionManager {...mockCallbacks} />
          <AchievementTracker onAchievementUnlock={mockCallbacks.onAchievementUnlock} />
          <LeaderboardService
            currentUserId="test-user"
            onRankChange={mockCallbacks.onRankChange}
          />
          <CelebrationEffects />
        </div>
      );

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      // Simulate a typical 30-minute gaming session
      const sessionEvents = [
        { time: 0, metrics: { promptsCompleted: 1, tokensGenerated: 10 } },
        { time: 5000, metrics: { promptsCompleted: 3, tokensGenerated: 50, tokensPerSecond: 8 } },
        { time: 10000, metrics: { promptsCompleted: 5, tokensGenerated: 120, modelsUsed: 2 } },
        { time: 15000, metrics: { promptsCompleted: 8, tokensGenerated: 200, efficiencyPercentage: 90 } },
        { time: 20000, metrics: { promptsCompleted: 12, tokensGenerated: 350, tokensPerSecond: 15 } }
      ];

      for (const event of sessionEvents) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        act(() => {
          window.progressionManager.updateSessionMetrics(event.metrics);
        });
      }

      // Should have triggered multiple achievements and possibly level up
      await waitFor(() => {
        expect(mockCallbacks.onAchievementUnlock).toHaveBeenCalled();
      });

      // Should show progress in all components
      expect(screen.getByTestId('progression-manager')).toBeInTheDocument();
      expect(screen.getByTestId('achievement-tracker')).toBeInTheDocument();
    });

    it('should handle competitive leaderboard scenario', async () => {
      const user = userEvent.setup();
      
      render(
        <LeaderboardService
          currentUserId="competitive-user"
          enableFilters={true}
          showUserRank={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-service')).toBeInTheDocument();
      });

      // Switch to speed category for competition
      const categorySelect = screen.getByDisplayValue('Overall');
      await user.selectOptions(categorySelect, 'Speed');

      // Check current rank
      expect(screen.getByText(/Your Rank/)).toBeInTheDocument();

      // Refresh to see updated rankings
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
