/**
 * WF-UX-005 Learning Validation Tests
 * Tests learning effectiveness, knowledge retention, and skill demonstration
 */

const ProgressTracker = require('../../../assets/code/WF-UX-005/progress-tracker.ts');
const HelpSystem = require('../../../assets/code/WF-UX-005/help-system.ts');

describe('WF-UX-005 Learning Validation Tests', () => {
  let progressTracker;
  let helpSystem;

  beforeEach(() => {
    progressTracker = new ProgressTracker.default('test_user');
    helpSystem = new HelpSystem.default();
  });

  afterEach(() => {
    progressTracker?.destroy();
    helpSystem?.destroy();
  });

  describe('Knowledge Retention Testing', () => {
    test('should track correct answers in knowledge checks', () => {
      progressTracker.startTutorial('level1_intro');
      
      const knowledgeCheck = {
        checkId: 'lightning_understanding',
        question: 'What does lightning represent?',
        userAnswer: 'AI thinking in real-time',
        correctAnswer: 'Real-time AI processing',
        isCorrect: true
      };

      progressTracker.recordKnowledgeCheck('level1_intro', knowledgeCheck);
      
      const metrics = progressTracker.getLearningMetrics();
      expect(metrics.knowledgeRetentionScore).toBe(100);
    });

    test('should calculate retention score across multiple checks', () => {
      progressTracker.startTutorial('level1_intro');
      
      const checks = [
        { checkId: 'check1', question: 'Q1', userAnswer: 'A1', correctAnswer: 'A1', isCorrect: true },
        { checkId: 'check2', question: 'Q2', userAnswer: 'Wrong', correctAnswer: 'Right', isCorrect: false },
        { checkId: 'check3', question: 'Q3', userAnswer: 'A3', correctAnswer: 'A3', isCorrect: true }
      ];

      checks.forEach(check => {
        progressTracker.recordKnowledgeCheck('level1_intro', check);
      });

      const metrics = progressTracker.getLearningMetrics();
      expect(metrics.knowledgeRetentionScore).toBeCloseTo(66.67, 1);
    });
  });

  describe('Skill Demonstration Validation', () => {
    test('should validate feature usage after tutorial completion', () => {
      progressTracker.startTutorial('level1_intro');
      progressTracker.markTutorialComplete('level1_intro', 3);

      // Simulate feature usage
      progressTracker.logEvent('feature_usage', { 
        feature: 'prompt_input',
        successful: true 
      });

      const usage = progressTracker.getFeatureUsage();
      expect(usage.postTutorialUsage).toBeDefined();
    });

    test('should track independent task completion', () => {
      const taskCompletion = {
        taskId: 'independent_prompt',
        completed: true,
        timeToComplete: 30000,
        hintsUsed: 0
      };

      progressTracker.logEvent('independent_task', taskCompletion);

      const events = progressTracker.exportData().analyticsData.customEvents;
      const taskEvent = events.find(e => e.eventName === 'independent_task');
      
      expect(taskEvent).toBeDefined();
      expect(taskEvent.properties.completed).toBe(true);
    });
  });

  describe('Help System Effectiveness', () => {
    test('should track help usage patterns', async () => {
      const helpContent = {
        contentId: 'test_help',
        version: '1.0.0',
        metadata: { title: 'Test Help', language: 'en', offlineAvailable: true },
        faqContent: {
          categories: [{ categoryId: 'basic', name: 'Basic', order: 1 }],
          questions: [{
            questionId: 'q1',
            categoryId: 'basic',
            question: 'What is lightning?',
            answer: 'AI visualization',
            keywords: ['lightning'],
            difficulty: 'basic'
          }]
        }
      };

      await helpSystem.initialize(helpContent);
      
      const faq = helpSystem.accessFAQ('q1');
      expect(faq).toBeDefined();
      
      const stats = helpSystem.getUsageStats();
      expect(stats.faqsAccessed.q1).toBe(1);
    });

    test('should measure search effectiveness', async () => {
      const helpContent = {
        contentId: 'test_help',
        version: '1.0.0',
        metadata: { title: 'Test Help', language: 'en', offlineAvailable: true },
        faqContent: {
          categories: [],
          questions: [{
            questionId: 'q1',
            categoryId: 'basic',
            question: 'Lightning visualization explanation',
            answer: 'Shows AI processing',
            keywords: ['lightning', 'visualization'],
            difficulty: 'basic'
          }]
        }
      };

      await helpSystem.initialize(helpContent);
      
      const results = helpSystem.searchFAQ('lightning');
      expect(results.length).toBe(1);
      expect(results[0].questionId).toBe('q1');
    });
  });

  describe('Learning Progress Validation', () => {
    test('should validate level progression requirements', () => {
      progressTracker.startTutorial('level1_intro');
      progressTracker.markTutorialComplete('level1_intro', 3);
      progressTracker.addExperiencePoints(100);

      const profile = progressTracker.getUserProfile();
      expect(profile.currentLevel).toBe(2);
      expect(profile.experiencePoints).toBe(100);
    });

    test('should track completion rates by difficulty', () => {
      const tutorials = ['basic_tutorial', 'intermediate_tutorial', 'advanced_tutorial'];
      
      tutorials.forEach((tutorialId, index) => {
        progressTracker.startTutorial(tutorialId);
        if (index < 2) { // Complete first two
          progressTracker.markTutorialComplete(tutorialId, 3);
        }
      });

      const metrics = progressTracker.getLearningMetrics();
      expect(metrics.completionRate).toBeCloseTo(0.67, 2);
    });
  });

  describe('Engagement Measurement', () => {
    test('should calculate engagement score from multiple factors', () => {
      progressTracker.startTutorial('level1_intro');
      
      // Simulate high engagement
      progressTracker.logEvent('step_completed', { stepId: 'step1', timeSpent: 30 });
      progressTracker.logEvent('step_completed', { stepId: 'step2', timeSpent: 45 });
      progressTracker.logEvent('help_accessed', { topic: 'lightning' });
      
      progressTracker.markTutorialComplete('level1_intro', 3);

      const metrics = progressTracker.getLearningMetrics();
      expect(metrics.engagementScore).toBeGreaterThan(0);
    });

    test('should detect low engagement patterns', () => {
      progressTracker.startTutorial('level1_intro');
      progressTracker.recordDropOff('level1_intro', 'step1', 'user_exit');

      const metrics = progressTracker.getLearningMetrics();
      expect(metrics.dropOffPoints.length).toBe(1);
      expect(metrics.dropOffPoints[0].reason).toBe('user_exit');
    });
  });
});
