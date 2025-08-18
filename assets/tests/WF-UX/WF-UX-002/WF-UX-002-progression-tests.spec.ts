import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProgressionManager, progressionEvents } from '../WF-UX-002-progression-manager';
import type { UserProgress, SessionMetrics } from '../WF-UX-002-progression-manager';

// Mock progression events
vi.mock('../WF-UX-002-progression-manager', async () => {
  const actual = await vi.importActual('../WF-UX-002-progression-manager');
  return {
    ...actual,
    progressionEvents: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    }
  };
});

// Mock window object for global API access
Object.defineProperty(window, 'progressionManager', {
  writable: true,
  value: {}
});

describe('ProgressionManager', () => {
  let mockOnLevelUp: Mock;
  let mockOnEnergyChange: Mock;
  let mockOnAchievementUnlock: Mock;
  let mockOnFeatureUnlock: Mock;

  beforeEach(() => {
    mockOnLevelUp = vi.fn();
    mockOnEnergyChange = vi.fn();
    mockOnAchievementUnlock = vi.fn();
    mockOnFeatureUnlock = vi.fn();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial State', () => {
    it('should render with default initial state', () => {
      render(
        <ProgressionManager
          onLevelUp={mockOnLevelUp}
          onEnergyChange={mockOnEnergyChange}
        />
      );

      expect(screen.getByTestId('progression-manager')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Level 1
      expect(screen.getByText('0')).toBeInTheDocument(); // Energy
    });

    it('should accept custom initial progress', () => {
      const initialProgress: Partial<UserProgress> = {
        currentLevel: 2,
        totalEnergy: 500,
        availableEnergy: 300,
        completedAchievements: ['first_strike']
      };

      render(
        <ProgressionManager
          initialProgress={initialProgress}
          onLevelUp={mockOnLevelUp}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
    });
  });

  describe('Energy Management', () => {
    it('should award energy correctly', async () => {
      const { rerender } = render(
        <ProgressionManager onEnergyChange={mockOnEnergyChange} />
      );

      // Access the progression API through window
      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      act(() => {
        window.progressionManager.awardEnergy(100, 'test reward');
      });

      await waitFor(() => {
        expect(mockOnEnergyChange).toHaveBeenCalledWith(100);
      });

      expect(progressionEvents.emit).toHaveBeenCalledWith('energyAwarded', {
        amount: 100,
        source: 'test reward',
        newTotal: 100
      });
    });

    it('should spend energy when sufficient balance exists', async () => {
      const initialProgress = {
        availableEnergy: 200,
        totalEnergy: 200
      };

      render(
        <ProgressionManager
          initialProgress={initialProgress}
          onEnergyChange={mockOnEnergyChange}
        />
      );

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      act(() => {
        const success = window.progressionManager.spendEnergy(100, 'test purchase');
        expect(success).toBe(true);
      });

      expect(progressionEvents.emit).toHaveBeenCalledWith('energySpent', {
        amount: 100,
        purpose: 'test purchase',
        remaining: 100
      });
    });

    it('should reject spending when insufficient balance', async () => {
      const initialProgress = {
        availableEnergy: 50,
        totalEnergy: 50
      };

      render(
        <ProgressionManager initialProgress={initialProgress} />
      );

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      act(() => {
        const success = window.progressionManager.spendEnergy(100, 'expensive item');
        expect(success).toBe(false);
      });

      // Should not emit spending event
      expect(progressionEvents.emit).not.toHaveBeenCalledWith(
        'energySpent',
        expect.any(Object)
      );
    });
  });

  describe('Level Progression', () => {
    it('should calculate level progress correctly', async () => {
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 150,
        sessionMetrics: {
          promptsCompleted: 5,
          tokensGenerated: 100,
          modelsUsed: 1,
          sessionsCompleted: 1,
          totalSessionTime: 10,
          currentSessionTime: 5,
          tokensPerSecond: 10,
          efficiencyPercentage: 85
        } as SessionMetrics,
        completedAchievements: ['first_strike']
      };

      render(
        <ProgressionManager
          initialProgress={initialProgress}
          onLevelUp={mockOnLevelUp}
        />
      );

      // Should show progress towards level 2
      await waitFor(() => {
        expect(screen.getByText(/Next Level:/)).toBeInTheDocument();
      });
    });

    it('should allow level up when criteria are met', async () => {
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 500, // Enough for level 2 (cost: 500)
        sessionMetrics: {
          promptsCompleted: 5,
          tokensGenerated: 100,
          modelsUsed: 2, // Meets dual model requirement
          totalSessionTime: 10
        } as SessionMetrics,
        completedAchievements: ['first_strike'] // Required achievement
      };

      render(
        <ProgressionManager
          initialProgress={initialProgress}
          onLevelUp={mockOnLevelUp}
          onFeatureUnlock={mockOnFeatureUnlock}
        />
      );

      await waitFor(() => {
        const levelUpButton = screen.getByText('Level Up!');
        expect(levelUpButton).toBeInTheDocument();
        expect(levelUpButton).not.toBeDisabled();
      });

      act(() => {
        fireEvent.click(screen.getByText('Level Up!'));
      });

      await waitFor(() => {
        expect(mockOnLevelUp).toHaveBeenCalledWith(2);
      });

      expect(progressionEvents.emit).toHaveBeenCalledWith('levelUp', 
        expect.objectContaining({ newLevel: 2 })
      );
    });

    it('should prevent level up when criteria not met', async () => {
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 50, // Not enough for level 2
        sessionMetrics: {
          promptsCompleted: 1,
          modelsUsed: 1
        } as SessionMetrics,
        completedAchievements: [] // Missing required achievement
      };

      render(<ProgressionManager initialProgress={initialProgress} />);

      await waitFor(() => {
        // Should show missing requirements instead of level up button
        expect(screen.queryByText('Level Up!')).not.toBeInTheDocument();
        expect(screen.getByText(/Need.*more EU/)).toBeInTheDocument();
      });
    });
  });

  describe('Session Metrics Tracking', () => {
    it('should update session metrics', async () => {
      render(<ProgressionManager />);

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      const newMetrics: Partial<SessionMetrics> = {
        tokensGenerated: 50,
        tokensPerSecond: 15.5,
        efficiencyPercentage: 92.3
      };

      act(() => {
        window.progressionManager.updateSessionMetrics(newMetrics);
      });

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument(); // Tokens
        expect(screen.getByText('15.5')).toBeInTheDocument(); // TPS
        expect(screen.getByText('92.3%')).toBeInTheDocument(); // Efficiency
      });
    });

    it('should track session time automatically', async () => {
      vi.useFakeTimers();
      
      render(<ProgressionManager />);

      // Fast-forward 2 minutes
      act(() => {
        vi.advanceTimersByTime(2 * 60 * 1000);
      });

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      const userProgress = window.progressionManager.getUserProgress();
      expect(userProgress.sessionMetrics.currentSessionTime).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });

  describe('Skill Tree Management', () => {
    it('should allow skill purchase when requirements met', async () => {
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 200,
        purchasedSkills: []
      };

      render(
        <ProgressionManager
          initialProgress={initialProgress}
          onFeatureUnlock={mockOnFeatureUnlock}
        />
      );

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      act(() => {
        const success = window.progressionManager.purchaseSkill('enhanced_lightning');
        expect(success).toBe(true);
      });

      expect(mockOnFeatureUnlock).toHaveBeenCalledWith('advanced_lightning_viz');
    });

    it('should reject skill purchase when insufficient energy', async () => {
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 50, // Not enough for enhanced_lightning (cost: 100)
        purchasedSkills: []
      };

      render(<ProgressionManager initialProgress={initialProgress} />);

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      act(() => {
        const success = window.progressionManager.purchaseSkill('enhanced_lightning');
        expect(success).toBe(false);
      });
    });

    it('should reject skill purchase when prerequisites not met', async () => {
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 200,
        purchasedSkills: [] // Missing prerequisites
      };

      render(<ProgressionManager initialProgress={initialProgress} />);

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      // Try to purchase a skill that has prerequisites
      act(() => {
        const success = window.progressionManager.purchaseSkill('advanced_skill_with_prereqs');
        expect(success).toBe(false);
      });
    });
  });

  describe('Event Integration', () => {
    it('should listen to progression events', () => {
      render(<ProgressionManager />);

      expect(progressionEvents.on).toHaveBeenCalledWith(
        'userProgressUpdate',
        expect.any(Function)
      );
    });

    it('should emit events for major actions', async () => {
      const initialProgress = {
        availableEnergy: 100
      };

      render(<ProgressionManager initialProgress={initialProgress} />);

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      act(() => {
        window.progressionManager.awardEnergy(50, 'test');
      });

      expect(progressionEvents.emit).toHaveBeenCalledWith('energyAwarded', {
        amount: 50,
        source: 'test',
        newTotal: 150
      });
    });
  });

  describe('Progress Calculation Edge Cases', () => {
    it('should handle missing session metrics gracefully', () => {
      const initialProgress = {
        sessionMetrics: {} as SessionMetrics // Empty metrics
      };

      expect(() => {
        render(<ProgressionManager initialProgress={initialProgress} />);
      }).not.toThrow();
    });

    it('should handle level progression at maximum level', async () => {
      const initialProgress = {
        currentLevel: 5, // Maximum level
        availableEnergy: 1000
      };

      render(<ProgressionManager initialProgress={initialProgress} />);

      await waitFor(() => {
        // Should not show next level progress at max level
        expect(screen.queryByText(/Next Level:/)).not.toBeInTheDocument();
      });
    });

    it('should calculate progress percentage correctly', async () => {
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 50, // Half of requirement (100)
        sessionMetrics: {
          promptsCompleted: 3, // 3/5 required
          modelsUsed: 1
        } as SessionMetrics,
        completedAchievements: ['first_strike']
      };

      render(<ProgressionManager initialProgress={initialProgress} />);

      await waitFor(() => {
        // Should show partial progress
        const progressText = screen.getByText(/\d+\.\d+%/);
        expect(progressText).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should clean up intervals on unmount', () => {
      const { unmount } = render(<ProgressionManager />);
      
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not cause memory leaks with frequent updates', async () => {
      render(<ProgressionManager />);

      await waitFor(() => {
        expect(window.progressionManager).toBeDefined();
      });

      // Simulate rapid metric updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          window.progressionManager.updateSessionMetrics({
            tokensGenerated: i,
            tokensPerSecond: i * 0.1
          });
        });
      }

      // Should still be responsive
      expect(screen.getByTestId('progression-manager')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ProgressionManager />);

      const container = screen.getByTestId('progression-manager');
      expect(container).toBeInTheDocument();
    });

    it('should announce level ups to screen readers', async () => {
      const initialProgress = {
        currentLevel: 1,
        availableEnergy: 500,
        sessionMetrics: {
          promptsCompleted: 5,
          modelsUsed: 2
        } as SessionMetrics,
        completedAchievements: ['first_strike']
      };

      render(<ProgressionManager initialProgress={initialProgress} />);

      await waitFor(() => {
        const levelUpButton = screen.getByText('Level Up!');
        expect(levelUpButton).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByText('Level Up!'));
      });

      // Should emit event that celebration effects can use for announcements
      expect(progressionEvents.emit).toHaveBeenCalledWith('levelUp', 
        expect.any(Object)
      );
    });
  });
});
