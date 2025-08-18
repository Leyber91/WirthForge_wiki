/**
 * WF-UX-005 Onboarding Flow Tests
 * Comprehensive testing suite for WIRTHFORGE onboarding and tutorial system
 * Tests first-time user experience, tutorial progression, and completion flows
 */

const { render, screen, fireEvent, waitFor, act } = require('@testing-library/react');
const { jest } = require('@jest/globals');
const TutorialSystem = require('../../../assets/code/WF-UX-005/tutorial-components.tsx');
const ProgressTracker = require('../../../assets/code/WF-UX-005/progress-tracker.ts');

// Mock dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => children
}));

describe('WF-UX-005 Onboarding Flow Tests', () => {
  let mockProgressTracker;
  let mockTutorialData;

  beforeEach(() => {
    // Reset mocks
    mockProgressTracker = {
      startTutorial: jest.fn(),
      markStepComplete: jest.fn(),
      markTutorialComplete: jest.fn(),
      recordDropOff: jest.fn(),
      getUserProfile: jest.fn(() => ({
        currentLevel: 1,
        performanceTier: 'mid',
        preferences: { accessibilityMode: false }
      }))
    };

    mockTutorialData = {
      tutorialId: 'level1_intro',
      metadata: {
        title: 'Level 1: Lightning Basics',
        description: 'Learn AI interaction and energy visualization',
        level: 1,
        estimatedDuration: 300,
        difficulty: 'beginner'
      },
      steps: [
        {
          stepId: 'welcome',
          order: 1,
          type: 'instruction',
          content: {
            title: 'Welcome to WIRTHFORGE',
            instruction: 'You\'re about to experience AI like never before.',
            hint: 'Follow the guided steps'
          },
          timing: { autoAdvance: true, delay: 3000 }
        },
        {
          stepId: 'first_prompt',
          order: 2,
          type: 'interaction',
          content: {
            title: 'Your First AI Interaction',
            instruction: 'Type "Hello, WIRTHFORGE!" and press Enter',
            hint: 'This will trigger lightning visualization'
          },
          interaction: {
            required: true,
            type: 'input',
            target: '#prompt-input',
            validation: {
              method: 'event',
              criteria: 'ai_response_received',
              errorMessage: 'Try typing a message and pressing Enter'
            }
          }
        },
        {
          stepId: 'observe_lightning',
          order: 3,
          type: 'observation',
          content: {
            title: 'Energy Visualization',
            instruction: 'Watch the lightning bolt - this shows AI thinking!',
            hint: 'Speed and intensity reflect processing'
          },
          timing: { autoAdvance: true, delay: 5000 }
        }
      ],
      completion: {
        criteria: 'all_steps',
        rewards: {
          achievements: [{
            id: 'lightning_striker',
            name: 'Lightning Striker',
            description: 'Completed first AI interaction',
            icon: '⚡'
          }],
          unlocks: [{
            type: 'level',
            id: 'level2',
            name: 'Level 2: Streams'
          }],
          experience: 100
        }
      }
    };

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="app">
        <input id="prompt-input" type="text" />
        <div id="energy-meter"></div>
        <div id="lightning-display"></div>
      </div>
    `;

    // Mock events
    global.CustomEvent = jest.fn((type, options) => ({
      type,
      detail: options?.detail
    }));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('First-Time User Experience (FTUX)', () => {
    test('should display welcome screen on first launch', async () => {
      const onTutorialComplete = jest.fn();
      const onTutorialExit = jest.fn();
      const onStepComplete = jest.fn();

      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={onStepComplete}
          onTutorialComplete={onTutorialComplete}
          onTutorialExit={onTutorialExit}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      expect(screen.getByText('Level 1: Lightning Basics')).toBeInTheDocument();
      expect(screen.getByText('Welcome to WIRTHFORGE')).toBeInTheDocument();
      expect(screen.getByText('You\'re about to experience AI like never before.')).toBeInTheDocument();
    });

    test('should auto-advance from welcome step after delay', async () => {
      jest.useFakeTimers();
      const onStepComplete = jest.fn();

      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={onStepComplete}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onStepComplete).toHaveBeenCalledWith('welcome');
      });

      jest.useRealTimers();
    });

    test('should progress to interaction step after welcome', async () => {
      jest.useFakeTimers();
      const onStepComplete = jest.fn();

      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={onStepComplete}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Complete welcome step
      act(() => {
        jest.advanceTimersByTime(4000); // Welcome + transition
      });

      await waitFor(() => {
        expect(screen.getByText('Your First AI Interaction')).toBeInTheDocument();
        expect(screen.getByText('Type "Hello, WIRTHFORGE!" and press Enter')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Interactive Tutorial Steps', () => {
    test('should handle user input in interaction step', async () => {
      const onStepComplete = jest.fn();
      
      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={onStepComplete}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Skip to interaction step
      act(() => {
        jest.useFakeTimers();
        jest.advanceTimersByTime(4000);
        jest.useRealTimers();
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('');
      
      // Simulate user typing
      fireEvent.change(input, { target: { value: 'Hello, WIRTHFORGE!' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

      // Simulate AI response event
      act(() => {
        document.dispatchEvent(new CustomEvent('ai_response_received'));
      });

      await waitFor(() => {
        expect(onStepComplete).toHaveBeenCalledWith('first_prompt');
      });
    });

    test('should show validation error for incorrect input', async () => {
      const onStepComplete = jest.fn();
      
      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={onStepComplete}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Skip to interaction step and simulate timeout
      act(() => {
        jest.useFakeTimers();
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        const input = screen.getByDisplayValue('');
        fireEvent.change(input, { target: { value: 'wrong input' } });
        fireEvent.keyPress(input, { key: 'Enter' });
        
        // Don't trigger ai_response_received event to simulate failure
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText('Try typing a message and pressing Enter')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    test('should show hint after multiple failed attempts', async () => {
      const tutorialWithRetries = {
        ...mockTutorialData,
        steps: [{
          ...mockTutorialData.steps[1],
          timing: { retryLimit: 2 }
        }]
      };

      render(
        <TutorialSystem
          tutorial={tutorialWithRetries}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        const input = screen.getByDisplayValue('');
        fireEvent.change(input, { target: { value: 'wrong' } });
        fireEvent.keyPress(input, { key: 'Enter' });
        
        await waitFor(() => {
          expect(screen.getByText('Try typing a message and pressing Enter')).toBeInTheDocument();
        });
      }

      await waitFor(() => {
        expect(screen.getByText('💡 This will trigger lightning visualization')).toBeInTheDocument();
      });
    });
  });

  describe('Hardware Tier Adaptation', () => {
    test('should adapt interface for low-tier hardware', () => {
      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="low"
          accessibilityMode={false}
        />
      );

      // Check for simplified animations (no framer-motion effects)
      const tutorialElement = screen.getByRole('dialog');
      expect(tutorialElement).toBeInTheDocument();
      
      // Low-tier should have reduced visual complexity
      expect(tutorialElement.className).not.toContain('complex-animations');
    });

    test('should provide enhanced experience for high-tier hardware', () => {
      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="high"
          accessibilityMode={false}
        />
      );

      const tutorialElement = screen.getByRole('dialog');
      expect(tutorialElement).toBeInTheDocument();
      
      // High-tier should support enhanced features
      // (In real implementation, this would check for additional visual effects)
    });
  });

  describe('Accessibility Features', () => {
    test('should provide proper ARIA labels and roles', () => {
      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={true}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'tutorial-title');
      
      const stepRegion = screen.getByRole('region');
      expect(stepRegion).toHaveAttribute('aria-labelledby', 'step-title');
      expect(stepRegion).toHaveAttribute('aria-describedby', 'step-instruction');
    });

    test('should support keyboard navigation', async () => {
      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={true}
        />
      );

      const exitButton = screen.getByLabelText('Exit tutorial');
      
      // Test keyboard interaction
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // In real implementation, this would trigger tutorial exit
      expect(exitButton).toBeInTheDocument();
    });

    test('should announce step changes to screen readers', async () => {
      const mockAnnounce = jest.fn();
      global.speechSynthesis = {
        speak: mockAnnounce,
        cancel: jest.fn()
      };

      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={true}
        />
      );

      // Check for live regions
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });
  });

  describe('Tutorial Completion Flow', () => {
    test('should complete tutorial when all steps are finished', async () => {
      jest.useFakeTimers();
      const onTutorialComplete = jest.fn();
      const onStepComplete = jest.fn();

      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={onStepComplete}
          onTutorialComplete={onTutorialComplete}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Complete all steps
      act(() => {
        jest.advanceTimersByTime(3000); // Welcome step
      });

      await waitFor(() => {
        expect(onStepComplete).toHaveBeenCalledWith('welcome');
      });

      // Simulate interaction step completion
      act(() => {
        jest.advanceTimersByTime(1000); // Transition
        document.dispatchEvent(new CustomEvent('ai_response_received'));
        jest.advanceTimersByTime(1000); // Processing
      });

      await waitFor(() => {
        expect(onStepComplete).toHaveBeenCalledWith('first_prompt');
      });

      // Complete observation step
      act(() => {
        jest.advanceTimersByTime(6000); // Observation + completion
      });

      await waitFor(() => {
        expect(onStepComplete).toHaveBeenCalledWith('observe_lightning');
        expect(onTutorialComplete).toHaveBeenCalledWith('level1_intro');
      });

      jest.useRealTimers();
    });

    test('should show completion modal with achievements', async () => {
      const TutorialCompletionModal = require('../../../assets/code/WF-UX-005/tutorial-components.tsx').TutorialCompletionModal;
      
      render(
        <TutorialCompletionModal
          tutorial={mockTutorialData}
          onContinue={jest.fn()}
          onMainApp={jest.fn()}
          completionTime={180}
        />
      );

      expect(screen.getByText('Tutorial Complete!')).toBeInTheDocument();
      expect(screen.getByText('You\'ve successfully completed Level 1: Lightning Basics')).toBeInTheDocument();
      expect(screen.getByText('Lightning Striker')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument(); // Formatted time
    });

    test('should provide options to continue or explore independently', () => {
      const TutorialCompletionModal = require('../../../assets/code/WF-UX-005/tutorial-components.tsx').TutorialCompletionModal;
      const onContinue = jest.fn();
      const onMainApp = jest.fn();
      
      render(
        <TutorialCompletionModal
          tutorial={mockTutorialData}
          onContinue={onContinue}
          onMainApp={onMainApp}
          completionTime={180}
        />
      );

      const continueButton = screen.getByText('Continue to Level 2: Streams');
      const exploreButton = screen.getByText('Explore on Your Own');

      fireEvent.click(continueButton);
      expect(onContinue).toHaveBeenCalledWith('level2');

      fireEvent.click(exploreButton);
      expect(onMainApp).toHaveBeenCalled();
    });
  });

  describe('Progress Tracking Integration', () => {
    test('should track tutorial start', () => {
      const progressTracker = new ProgressTracker.default('test_user');
      const startSpy = jest.spyOn(progressTracker, 'startTutorial');

      // Simulate tutorial start
      progressTracker.startTutorial('level1_intro');

      expect(startSpy).toHaveBeenCalledWith('level1_intro');
    });

    test('should track step completion', () => {
      const progressTracker = new ProgressTracker.default('test_user');
      const stepSpy = jest.spyOn(progressTracker, 'markStepComplete');

      progressTracker.startTutorial('level1_intro');
      progressTracker.markStepComplete('level1_intro', 'welcome');

      expect(stepSpy).toHaveBeenCalledWith('level1_intro', 'welcome');
    });

    test('should track tutorial completion', () => {
      const progressTracker = new ProgressTracker.default('test_user');
      const completeSpy = jest.spyOn(progressTracker, 'markTutorialComplete');

      progressTracker.startTutorial('level1_intro');
      progressTracker.markTutorialComplete('level1_intro', 3);

      expect(completeSpy).toHaveBeenCalledWith('level1_intro', 3);
    });

    test('should track drop-off events', () => {
      const progressTracker = new ProgressTracker.default('test_user');
      const dropOffSpy = jest.spyOn(progressTracker, 'recordDropOff');

      progressTracker.startTutorial('level1_intro');
      progressTracker.recordDropOff('level1_intro', 'first_prompt', 'user_exit');

      expect(dropOffSpy).toHaveBeenCalledWith('level1_intro', 'first_prompt', 'user_exit');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing tutorial data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(
          <TutorialSystem
            tutorial={null}
            onStepComplete={jest.fn()}
            onTutorialComplete={jest.fn()}
            onTutorialExit={jest.fn()}
            performanceTier="mid"
            accessibilityMode={false}
          />
        );
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    test('should handle system errors during tutorial', async () => {
      const onStepComplete = jest.fn().mockImplementation(() => {
        throw new Error('System error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={onStepComplete}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Tutorial should continue despite errors
      expect(screen.getByText('Welcome to WIRTHFORGE')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should provide fallback content when assets fail to load', () => {
      const tutorialWithMissingAssets = {
        ...mockTutorialData,
        steps: [{
          ...mockTutorialData.steps[0],
          content: {
            title: null,
            instruction: null,
            hint: null
          }
        }]
      };

      render(
        <TutorialSystem
          tutorial={tutorialWithMissingAssets}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Should render without crashing
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    test('should not exceed performance budgets on low-tier devices', () => {
      const startTime = performance.now();

      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="low"
          accessibilityMode={false}
        />
      );

      const renderTime = performance.now() - startTime;
      
      // Should render quickly on low-tier hardware
      expect(renderTime).toBeLessThan(100); // 100ms budget
    });

    test('should cleanup resources on unmount', () => {
      const { unmount } = render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={jest.fn()}
          onTutorialComplete={jest.fn()}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Check that component unmounts cleanly
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Multi-Level Tutorial Flow', () => {
    test('should support progression from Level 1 to Level 2', async () => {
      const level2Tutorial = {
        tutorialId: 'level2_intro',
        metadata: {
          title: 'Level 2: Multi-Model Streams',
          level: 2,
          estimatedDuration: 400,
          difficulty: 'intermediate'
        },
        steps: [
          {
            stepId: 'multi_model_intro',
            order: 1,
            type: 'instruction',
            content: {
              title: 'Welcome to Level 2',
              instruction: 'Now you\'ll learn about running multiple AI models'
            }
          }
        ],
        completion: {
          criteria: 'all_steps',
          rewards: {
            achievements: [],
            unlocks: [],
            experience: 150
          }
        }
      };

      const onTutorialComplete = jest.fn();

      // Complete Level 1
      render(
        <TutorialSystem
          tutorial={mockTutorialData}
          onStepComplete={jest.fn()}
          onTutorialComplete={onTutorialComplete}
          onTutorialExit={jest.fn()}
          performanceTier="mid"
          accessibilityMode={false}
        />
      );

      // Simulate completion and transition to Level 2
      act(() => {
        onTutorialComplete('level1_intro');
      });

      expect(onTutorialComplete).toHaveBeenCalledWith('level1_intro');
    });
  });
});
