/**
 * WF-UX-005 Tutorial Components
 * React/TypeScript components for interactive onboarding and tutorial system
 * Supports progressive disclosure, accessibility, and hardware tier adaptation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types and interfaces
interface TutorialStep {
  stepId: string;
  order: number;
  type: 'instruction' | 'interaction' | 'observation' | 'validation' | 'feedback';
  content: {
    title?: string;
    instruction: string;
    hint?: string;
    visualCue?: {
      type: 'highlight' | 'arrow' | 'pulse' | 'outline' | 'none';
      target: string;
      position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    };
  };
  interaction?: {
    required: boolean;
    type: 'click' | 'input' | 'drag' | 'select' | 'wait' | 'observe';
    target: string;
    expectedValue?: string;
    validation?: {
      method: 'exact' | 'contains' | 'regex' | 'custom' | 'event';
      criteria: string;
      errorMessage: string;
    };
  };
  timing?: {
    autoAdvance: boolean;
    delay?: number;
    timeout?: number;
    retryLimit?: number;
  };
}

interface Tutorial {
  tutorialId: string;
  metadata: {
    title: string;
    description: string;
    level: number;
    estimatedDuration: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };
  steps: TutorialStep[];
  completion: {
    criteria: 'all_steps' | 'required_steps' | 'custom';
    rewards: {
      achievements: Array<{
        id: string;
        name: string;
        description: string;
        icon: string;
      }>;
      unlocks: Array<{
        type: 'level' | 'feature' | 'tutorial' | 'content';
        id: string;
        name: string;
      }>;
      experience: number;
    };
  };
}

interface TutorialProps {
  tutorial: Tutorial;
  onStepComplete: (stepId: string) => void;
  onTutorialComplete: (tutorialId: string) => void;
  onTutorialExit: () => void;
  performanceTier: 'low' | 'mid' | 'high';
  accessibilityMode: boolean;
}

// Main Tutorial Component
export const TutorialSystem: React.FC<TutorialProps> = ({
  tutorial,
  onStepComplete,
  onTutorialComplete,
  onTutorialExit,
  performanceTier,
  accessibilityMode
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isStepActive, setIsStepActive] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [tutorialStartTime] = useState(Date.now());

  const currentStep = tutorial.steps[currentStepIndex];
  const isLastStep = currentStepIndex === tutorial.steps.length - 1;

  // Handle step completion
  const handleStepComplete = useCallback((stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    onStepComplete(stepId);

    if (isLastStep) {
      // Tutorial complete
      onTutorialComplete(tutorial.tutorialId);
    } else {
      // Advance to next step
      setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
        setIsStepActive(true);
        setShowHint(false);
        setRetryCount(0);
      }, currentStep.timing?.delay || 1000);
    }
  }, [currentStep, isLastStep, onStepComplete, onTutorialComplete, tutorial.tutorialId]);

  // Handle step retry
  const handleStepRetry = useCallback(() => {
    const maxRetries = currentStep.timing?.retryLimit || 3;
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIsStepActive(true);
    } else {
      setShowHint(true);
    }
  }, [currentStep, retryCount]);

  return (
    <div className="tutorial-system" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <TutorialOverlay
        tutorial={tutorial}
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={tutorial.steps.length}
        onExit={onTutorialExit}
        performanceTier={performanceTier}
        accessibilityMode={accessibilityMode}
      />
      
      <TutorialStep
        step={currentStep}
        isActive={isStepActive}
        showHint={showHint}
        retryCount={retryCount}
        onComplete={handleStepComplete}
        onRetry={handleStepRetry}
        performanceTier={performanceTier}
        accessibilityMode={accessibilityMode}
      />

      <TutorialProgress
        currentStep={currentStepIndex + 1}
        totalSteps={tutorial.steps.length}
        completedSteps={completedSteps}
        estimatedDuration={tutorial.metadata.estimatedDuration}
        startTime={tutorialStartTime}
      />
    </div>
  );
};

// Tutorial Overlay Component
const TutorialOverlay: React.FC<{
  tutorial: Tutorial;
  currentStep: TutorialStep;
  currentStepIndex: number;
  totalSteps: number;
  onExit: () => void;
  performanceTier: 'low' | 'mid' | 'high';
  accessibilityMode: boolean;
}> = ({ tutorial, currentStep, currentStepIndex, totalSteps, onExit, performanceTier, accessibilityMode }) => {
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: performanceTier === 'low' ? 0.3 : 0.5 },
    exit: { opacity: 0 }
  };

  return (
    <motion.div
      className="tutorial-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: performanceTier === 'low' ? 0.2 : 0.3 }}
    >
      <div className="tutorial-header">
        <h1 id="tutorial-title" className="tutorial-title">
          {tutorial.metadata.title}
        </h1>
        <div className="tutorial-meta">
          <span className="step-counter" aria-label={`Step ${currentStepIndex + 1} of ${totalSteps}`}>
            {currentStepIndex + 1} / {totalSteps}
          </span>
          <button
            className="tutorial-exit"
            onClick={onExit}
            aria-label="Exit tutorial"
            title="Exit tutorial (Esc)"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Individual Tutorial Step Component
const TutorialStep: React.FC<{
  step: TutorialStep;
  isActive: boolean;
  showHint: boolean;
  retryCount: number;
  onComplete: (stepId: string) => void;
  onRetry: () => void;
  performanceTier: 'low' | 'mid' | 'high';
  accessibilityMode: boolean;
}> = ({ step, isActive, showHint, retryCount, onComplete, onRetry, performanceTier, accessibilityMode }) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // Auto-focus step for accessibility
  useEffect(() => {
    if (isActive && stepRef.current && accessibilityMode) {
      stepRef.current.focus();
    }
  }, [isActive, accessibilityMode]);

  // Handle interaction validation
  const handleInteraction = useCallback(async (event: any) => {
    if (!step.interaction || !isActive) return;

    setIsValidating(true);
    setValidationError(null);

    try {
      let isValid = false;

      switch (step.interaction.validation?.method) {
        case 'exact':
          isValid = event.target.value === step.interaction.expectedValue;
          break;
        case 'contains':
          isValid = event.target.value?.includes(step.interaction.expectedValue || '');
          break;
        case 'event':
          // Wait for specific event
          isValid = await waitForEvent(step.interaction.validation.criteria);
          break;
        default:
          isValid = true;
      }

      if (isValid) {
        onComplete(step.stepId);
      } else {
        setValidationError(step.interaction.validation?.errorMessage || 'Please try again');
        onRetry();
      }
    } catch (error) {
      setValidationError('An error occurred. Please try again.');
      onRetry();
    } finally {
      setIsValidating(false);
    }
  }, [step, isActive, onComplete, onRetry]);

  // Auto-advance for observation steps
  useEffect(() => {
    if (step.type === 'observation' && step.timing?.autoAdvance && isActive) {
      const timer = setTimeout(() => {
        onComplete(step.stepId);
      }, step.timing.delay || 3000);

      return () => clearTimeout(timer);
    }
  }, [step, isActive, onComplete]);

  const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={stepRef}
          className={`tutorial-step tutorial-step--${step.type}`}
          variants={stepVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: performanceTier === 'low' ? 0.2 : 0.4 }}
          tabIndex={-1}
          role="region"
          aria-labelledby="step-title"
          aria-describedby="step-instruction"
        >
          <div className="step-content">
            {step.content.title && (
              <h2 id="step-title" className="step-title">
                {step.content.title}
              </h2>
            )}
            
            <p id="step-instruction" className="step-instruction">
              {step.content.instruction}
            </p>

            {showHint && step.content.hint && (
              <motion.div
                className="step-hint"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                role="alert"
                aria-live="polite"
              >
                💡 {step.content.hint}
              </motion.div>
            )}

            {validationError && (
              <motion.div
                className="step-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                role="alert"
                aria-live="assertive"
              >
                ❌ {validationError}
              </motion.div>
            )}

            {retryCount > 0 && (
              <div className="step-retry-info" aria-live="polite">
                Attempt {retryCount + 1} of {(step.timing?.retryLimit || 3) + 1}
              </div>
            )}
          </div>

          <StepInteractionHandler
            step={step}
            onInteraction={handleInteraction}
            isValidating={isValidating}
            performanceTier={performanceTier}
          />

          {step.content.visualCue && (
            <VisualCue
              cue={step.content.visualCue}
              performanceTier={performanceTier}
              accessibilityMode={accessibilityMode}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Step Interaction Handler
const StepInteractionHandler: React.FC<{
  step: TutorialStep;
  onInteraction: (event: any) => void;
  isValidating: boolean;
  performanceTier: 'low' | 'mid' | 'high';
}> = ({ step, onInteraction, isValidating, performanceTier }) => {
  if (!step.interaction || step.type === 'observation') {
    return null;
  }

  switch (step.interaction.type) {
    case 'click':
      return (
        <div className="interaction-prompt">
          <motion.button
            className="interaction-button"
            onClick={onInteraction}
            disabled={isValidating}
            whileHover={performanceTier !== 'low' ? { scale: 1.05 } : undefined}
            whileTap={performanceTier !== 'low' ? { scale: 0.95 } : undefined}
          >
            {isValidating ? 'Validating...' : 'Click to Continue'}
          </motion.button>
        </div>
      );

    case 'input':
      return (
        <div className="interaction-prompt">
          <input
            type="text"
            className="interaction-input"
            placeholder={step.interaction.expectedValue || 'Type here...'}
            onChange={onInteraction}
            disabled={isValidating}
            aria-label="Tutorial input field"
          />
        </div>
      );

    default:
      return (
        <div className="interaction-prompt">
          <p>Perform the requested action to continue</p>
        </div>
      );
  }
};

// Visual Cue Component
const VisualCue: React.FC<{
  cue: {
    type: 'highlight' | 'arrow' | 'pulse' | 'outline' | 'none';
    target: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  };
  performanceTier: 'low' | 'mid' | 'high';
  accessibilityMode: boolean;
}> = ({ cue, performanceTier, accessibilityMode }) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.querySelector(cue.target) as HTMLElement;
    setTargetElement(element);

    if (element && cue.type !== 'none') {
      // Add visual highlight
      element.classList.add(`tutorial-highlight--${cue.type}`);
      
      // Add accessibility attributes
      if (accessibilityMode) {
        element.setAttribute('aria-describedby', 'tutorial-cue-description');
        element.setAttribute('data-tutorial-target', 'true');
      }

      return () => {
        element.classList.remove(`tutorial-highlight--${cue.type}`);
        if (accessibilityMode) {
          element.removeAttribute('aria-describedby');
          element.removeAttribute('data-tutorial-target');
        }
      };
    }
  }, [cue, accessibilityMode]);

  if (!targetElement || cue.type === 'none' || performanceTier === 'low') {
    return null;
  }

  return (
    <div
      id="tutorial-cue-description"
      className="sr-only"
      aria-live="polite"
    >
      Tutorial highlighting: {cue.target}
    </div>
  );
};

// Tutorial Progress Component
const TutorialProgress: React.FC<{
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<string>;
  estimatedDuration: number;
  startTime: number;
}> = ({ currentStep, totalSteps, completedSteps, estimatedDuration, startTime }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const progressPercentage = (currentStep / totalSteps) * 100;
  const estimatedRemaining = Math.max(0, estimatedDuration - elapsedTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="tutorial-progress" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      <div className="progress-info">
        <span className="progress-text">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="progress-time">
          {formatTime(elapsedTime)} elapsed
          {estimatedRemaining > 0 && ` • ~${formatTime(estimatedRemaining)} remaining`}
        </span>
      </div>
    </div>
  );
};

// Utility Functions
const waitForEvent = (eventName: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const handler = () => {
      document.removeEventListener(eventName, handler);
      resolve(true);
    };
    document.addEventListener(eventName, handler);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      document.removeEventListener(eventName, handler);
      resolve(false);
    }, 30000);
  });
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Tutorial Completion Modal
export const TutorialCompletionModal: React.FC<{
  tutorial: Tutorial;
  onContinue: (nextTutorialId?: string) => void;
  onMainApp: () => void;
  completionTime: number;
}> = ({ tutorial, onContinue, onMainApp, completionTime }) => {
  return (
    <motion.div
      className="tutorial-completion-modal"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      <div className="completion-content">
        <motion.div
          className="completion-celebration"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          🎉
        </motion.div>
        
        <h2 id="completion-title">Tutorial Complete!</h2>
        <p>You've successfully completed {tutorial.metadata.title}</p>
        
        <div className="completion-stats">
          <div className="stat">
            <span className="stat-label">Time:</span>
            <span className="stat-value">{formatTime(completionTime)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Level:</span>
            <span className="stat-value">{tutorial.metadata.level}</span>
          </div>
        </div>

        <div className="completion-rewards">
          {tutorial.completion.rewards.achievements.map(achievement => (
            <div key={achievement.id} className="achievement">
              <span className="achievement-icon">{achievement.icon}</span>
              <div>
                <h3>{achievement.name}</h3>
                <p>{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="completion-actions">
          {tutorial.completion.rewards.unlocks.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => onContinue(tutorial.completion.rewards.unlocks[0].id)}
            >
              Continue to {tutorial.completion.rewards.unlocks[0].name}
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={onMainApp}
          >
            Explore on Your Own
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TutorialSystem;
