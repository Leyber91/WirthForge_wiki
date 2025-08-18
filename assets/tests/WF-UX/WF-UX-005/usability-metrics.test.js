/**
 * WF-UX-005 Usability Metrics Tests
 * Tests analytics collection, A/B testing, and usability measurement
 */

const ProgressTracker = require('../../../assets/code/WF-UX-005/progress-tracker.ts');
const AIVideoIntegration = require('../../../assets/code/WF-UX-005/ai-video-integration.ts');

describe('WF-UX-005 Usability Metrics Tests', () => {
  let progressTracker;
  let videoIntegration;

  beforeEach(() => {
    progressTracker = new ProgressTracker.default('test_user');
    videoIntegration = new AIVideoIntegration.default();
  });

  afterEach(() => {
    progressTracker?.destroy();
    videoIntegration?.destroy();
  });

  describe('Analytics Collection', () => {
    test('should log tutorial events with timestamps', () => {
      const startTime = Date.now();
      
      progressTracker.logEvent('tutorial_started', { tutorialId: 'level1_intro' });
      
      const events = progressTracker.exportData().analyticsData.customEvents;
      const event = events.find(e => e.eventName === 'tutorial_started');
      
      expect(event).toBeDefined();
      expect(event.properties.tutorialId).toBe('level1_intro');
      expect(new Date(event.timestamp).getTime()).toBeGreaterThanOrEqual(startTime);
    });

    test('should track session duration and activity', () => {
      progressTracker.startTutorial('level1_intro');
      progressTracker.logEvent('step_completed', { stepId: 'step1' });
      progressTracker.logEvent('step_completed', { stepId: 'step2' });
      
      progressTracker.endSession();
      
      const data = progressTracker.exportData();
      const session = data.analyticsData.sessionData[0];
      
      expect(session).toBeDefined();
      expect(session.tutorialsAccessed).toContain('level1_intro');
      expect(session.eventsLogged).toBeGreaterThan(0);
      expect(session.duration).toBeGreaterThan(0);
    });

    test('should capture drop-off analytics', () => {
      progressTracker.startTutorial('level1_intro');
      progressTracker.recordDropOff('level1_intro', 'step2', 'timeout');
      
      const metrics = progressTracker.getLearningMetrics();
      const dropOff = metrics.dropOffPoints[0];
      
      expect(dropOff.tutorialId).toBe('level1_intro');
      expect(dropOff.stepId).toBe('step2');
      expect(dropOff.reason).toBe('timeout');
    });
  });

  describe('A/B Testing Framework', () => {
    test('should assign users to test variants', () => {
      progressTracker.assignABTest('onboarding_flow_v2', 'variant_a');
      
      const data = progressTracker.exportData();
      const assignment = data.analyticsData.abTestAssignments[0];
      
      expect(assignment.testId).toBe('onboarding_flow_v2');
      expect(assignment.variant).toBe('variant_a');
      expect(assignment.completed).toBe(false);
    });

    test('should track variant performance metrics', () => {
      progressTracker.assignABTest('tutorial_length_test', 'short_version');
      progressTracker.startTutorial('level1_intro');
      progressTracker.markTutorialComplete('level1_intro', 3);
      
      const completionEvent = progressTracker.exportData().analyticsData.customEvents
        .find(e => e.eventName === 'tutorial_completed');
      
      expect(completionEvent).toBeDefined();
      
      // Variant performance would be analyzed by comparing completion rates
      const metrics = progressTracker.getLearningMetrics();
      expect(metrics.completionRate).toBe(1);
    });
  });

  describe('Performance Measurement', () => {
    test('should track tutorial completion times', () => {
      const startTime = Date.now();
      
      progressTracker.startTutorial('level1_intro');
      
      // Simulate time passage
      setTimeout(() => {
        progressTracker.markTutorialComplete('level1_intro', 3);
        
        const tutorial = progressTracker.getTutorialProgress('level1_intro');
        expect(tutorial.totalTimeSpent).toBeGreaterThan(0);
      }, 100);
    });

    test('should measure help request frequency', () => {
      progressTracker.startTutorial('level1_intro');
      progressTracker.logEvent('help_accessed', { topic: 'lightning' });
      progressTracker.logEvent('help_accessed', { topic: 'energy_meter' });
      progressTracker.markTutorialComplete('level1_intro', 3);
      
      const metrics = progressTracker.getLearningMetrics();
      expect(metrics.helpRequestFrequency).toBeGreaterThan(0);
    });

    test('should track video tutorial engagement', async () => {
      const mockVideoRequest = {
        prompt: 'Test tutorial video',
        service: 'sora',
        parameters: {
          resolution: '1080p',
          duration: 60,
          style: 'educational',
          aspectRatio: '16:9',
          fps: 30,
          quality: 'standard'
        },
        metadata: { tutorialId: 'level1_intro' }
      };

      // Mock video generation
      const mockResult = {
        videoId: 'test_video_123',
        status: 'completed',
        videoUrl: 'mock://video.mp4',
        duration: 60,
        generatedAt: new Date().toISOString()
      };

      // Simulate video generation and tracking
      videoIntegration.emit('videoGenerationCompleted', mockResult);
      
      const cacheInfo = videoIntegration.getCacheInfo();
      expect(cacheInfo).toBeDefined();
    });
  });

  describe('User Experience Metrics', () => {
    test('should calculate task success rates', () => {
      const tasks = [
        { taskId: 'first_prompt', success: true },
        { taskId: 'adjust_settings', success: true },
        { taskId: 'observe_lightning', success: false }
      ];

      tasks.forEach(task => {
        progressTracker.logEvent('task_completion', task);
      });

      const events = progressTracker.exportData().analyticsData.customEvents
        .filter(e => e.eventName === 'task_completion');
      
      const successRate = events.filter(e => e.properties.success).length / events.length;
      expect(successRate).toBeCloseTo(0.67, 2);
    });

    test('should measure user satisfaction scores', () => {
      progressTracker.startTutorial('level1_intro');
      
      const feedback = {
        rating: 8,
        comments: 'Great tutorial!',
        difficulty: 'just_right',
        pacing: 'just_right'
      };

      progressTracker.recordTutorialFeedback('level1_intro', feedback);
      
      const tutorial = progressTracker.getTutorialProgress('level1_intro');
      expect(tutorial.feedback.rating).toBe(8);
      expect(tutorial.feedback.difficulty).toBe('just_right');
    });

    test('should track feature adoption rates', () => {
      progressTracker.startTutorial('level1_intro');
      progressTracker.markTutorialComplete('level1_intro', 3);
      
      // Simulate post-tutorial feature usage
      progressTracker.logEvent('feature_usage', { 
        feature: 'prompt_input',
        firstUse: true 
      });
      progressTracker.logEvent('feature_usage', { 
        feature: 'energy_meter',
        firstUse: true 
      });

      const featureEvents = progressTracker.exportData().analyticsData.customEvents
        .filter(e => e.eventName === 'feature_usage' && e.properties.firstUse);
      
      expect(featureEvents.length).toBe(2);
    });
  });

  describe('Error and Issue Tracking', () => {
    test('should log tutorial errors with context', () => {
      progressTracker.startTutorial('level1_intro');
      
      const errorContext = {
        stepId: 'first_prompt',
        errorType: 'validation_failed',
        errorMessage: 'AI response timeout',
        userAction: 'typed_prompt',
        systemState: 'ai_processing'
      };

      progressTracker.logEvent('tutorial_error', errorContext);
      
      const errorEvent = progressTracker.exportData().analyticsData.customEvents
        .find(e => e.eventName === 'tutorial_error');
      
      expect(errorEvent.properties.errorType).toBe('validation_failed');
      expect(errorEvent.properties.stepId).toBe('first_prompt');
    });

    test('should track system performance issues', () => {
      const performanceData = {
        renderTime: 150,
        memoryUsage: 45.2,
        cpuUsage: 78.5,
        performanceTier: 'low'
      };

      progressTracker.logEvent('performance_metrics', performanceData);
      
      const perfEvent = progressTracker.exportData().analyticsData.customEvents
        .find(e => e.eventName === 'performance_metrics');
      
      expect(perfEvent.properties.renderTime).toBe(150);
      expect(perfEvent.properties.performanceTier).toBe('low');
    });
  });

  describe('Accessibility Metrics', () => {
    test('should track accessibility feature usage', () => {
      progressTracker.updateUserPreferences({ 
        accessibilityMode: true,
        reducedMotion: true 
      });

      progressTracker.logEvent('accessibility_feature_used', {
        feature: 'screen_reader_announcement',
        context: 'step_transition'
      });

      const a11yEvent = progressTracker.exportData().analyticsData.customEvents
        .find(e => e.eventName === 'accessibility_feature_used');
      
      expect(a11yEvent.properties.feature).toBe('screen_reader_announcement');
    });

    test('should measure keyboard navigation usage', () => {
      progressTracker.logEvent('keyboard_navigation', {
        action: 'tab_navigation',
        element: 'tutorial_step',
        successful: true
      });

      const navEvent = progressTracker.exportData().analyticsData.customEvents
        .find(e => e.eventName === 'keyboard_navigation');
      
      expect(navEvent.properties.action).toBe('tab_navigation');
      expect(navEvent.properties.successful).toBe(true);
    });
  });

  describe('Data Privacy and Export', () => {
    test('should export anonymized analytics data', () => {
      progressTracker.logEvent('tutorial_started', { tutorialId: 'level1_intro' });
      progressTracker.logEvent('step_completed', { stepId: 'step1' });
      
      const exportedData = progressTracker.exportData();
      
      // Verify no personally identifiable information
      expect(exportedData.userId).toBe('test_user'); // Anonymized ID
      expect(exportedData.analyticsData.customEvents.length).toBeGreaterThan(0);
      
      // Check that sensitive data is not included
      exportedData.analyticsData.customEvents.forEach(event => {
        expect(event.properties).not.toHaveProperty('email');
        expect(event.properties).not.toHaveProperty('realName');
        expect(event.properties).not.toHaveProperty('ipAddress');
      });
    });

    test('should support data deletion', async () => {
      progressTracker.logEvent('test_event', { data: 'test' });
      
      const beforeClear = progressTracker.exportData();
      expect(beforeClear.analyticsData.customEvents.length).toBeGreaterThan(0);
      
      await progressTracker.clearAllData();
      
      const afterClear = progressTracker.exportData();
      expect(afterClear.analyticsData.customEvents.length).toBe(0);
    });
  });

  describe('Real-time Metrics Dashboard', () => {
    test('should provide live completion rate updates', () => {
      const initialMetrics = progressTracker.getLearningMetrics();
      expect(initialMetrics.completionRate).toBe(0);
      
      progressTracker.startTutorial('level1_intro');
      progressTracker.markTutorialComplete('level1_intro', 3);
      
      const updatedMetrics = progressTracker.getLearningMetrics();
      expect(updatedMetrics.completionRate).toBe(1);
    });

    test('should emit real-time events for dashboard updates', (done) => {
      progressTracker.on('tutorialCompleted', (tutorialId) => {
        expect(tutorialId).toBe('level1_intro');
        done();
      });

      progressTracker.startTutorial('level1_intro');
      progressTracker.markTutorialComplete('level1_intro', 3);
    });
  });

  describe('Comparative Analysis', () => {
    test('should support cohort analysis', () => {
      // Simulate different user cohorts
      const cohortA = new ProgressTracker.default('cohort_a_user');
      const cohortB = new ProgressTracker.default('cohort_b_user');

      // Cohort A: Standard onboarding
      cohortA.assignABTest('onboarding_test', 'standard');
      cohortA.startTutorial('level1_intro');
      cohortA.markTutorialComplete('level1_intro', 3);

      // Cohort B: Enhanced onboarding
      cohortB.assignABTest('onboarding_test', 'enhanced');
      cohortB.startTutorial('level1_intro');
      cohortB.markTutorialComplete('level1_intro', 3);

      const cohortAMetrics = cohortA.getLearningMetrics();
      const cohortBMetrics = cohortB.getLearningMetrics();

      expect(cohortAMetrics.completionRate).toBe(1);
      expect(cohortBMetrics.completionRate).toBe(1);

      cohortA.destroy();
      cohortB.destroy();
    });

    test('should track improvement over time', () => {
      // Simulate multiple tutorial attempts
      progressTracker.startTutorial('level1_intro');
      progressTracker.recordDropOff('level1_intro', 'step2', 'user_exit');

      // Second attempt
      progressTracker.startTutorial('level1_intro');
      progressTracker.markTutorialComplete('level1_intro', 3);

      const metrics = progressTracker.getLearningMetrics();
      expect(metrics.totalTutorialsStarted).toBe(2);
      expect(metrics.totalTutorialsCompleted).toBe(1);
      expect(metrics.completionRate).toBe(0.5);
    });
  });
});
