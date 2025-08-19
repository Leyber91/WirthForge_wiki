/**
 * WF-UX-008 Community Moderation Tests
 * Comprehensive test suite for community moderation and reputation systems
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ModerationManager } from '../code/WF-UX-008/community-moderation';
import { PrivacyController } from '../code/WF-UX-008/privacy-controls';

// Mock data
const mockUser = {
  id: 'user_001',
  displayName: 'TestUser',
  reputation: 500,
  trustLevel: 'member' as const,
  joinDate: '2024-01-01T00:00:00Z',
  lastActive: '2024-01-15T10:30:00Z',
  flags: [],
};

const mockContent = {
  id: 'content_001',
  type: 'question' as const,
  authorId: 'user_001',
  title: 'How to use WIRTHFORGE?',
  body: 'I need help getting started with local AI development',
  category: 'help',
  tags: ['beginner', 'setup'],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  status: 'active' as const,
  flags: [],
  votes: [],
  reports: [],
};

const mockSpamContent = {
  id: 'content_spam',
  type: 'discussion' as const,
  authorId: 'user_spam',
  title: 'Buy cheap products now!',
  body: 'Click here to buy amazing products at discount prices! Limited time offer!',
  category: 'general',
  tags: ['spam'],
  createdAt: '2024-01-15T11:00:00Z',
  updatedAt: '2024-01-15T11:00:00Z',
  status: 'active' as const,
  flags: [],
  votes: [],
  reports: [],
};

const mockPrivacyLeakContent = {
  id: 'content_privacy',
  type: 'answer' as const,
  authorId: 'user_002',
  title: 'Solution to your problem',
  body: 'Contact me at john.doe@example.com or call me at 555-123-4567',
  category: 'help',
  tags: ['solution'],
  createdAt: '2024-01-15T12:00:00Z',
  updatedAt: '2024-01-15T12:00:00Z',
  status: 'active' as const,
  flags: [],
  votes: [],
  reports: [],
};

describe('ModerationManager', () => {
  let moderationManager: ModerationManager;
  let privacyController: PrivacyController;

  beforeEach(() => {
    privacyController = new PrivacyController();
    moderationManager = new ModerationManager(privacyController);
    
    // Add test data
    (moderationManager as any).users.set(mockUser.id, { ...mockUser });
    (moderationManager as any).content.set(mockContent.id, { ...mockContent });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Analysis', () => {
    it('detects spam content', async () => {
      const flags = await moderationManager.moderateContent({ ...mockSpamContent });
      
      const spamFlag = flags.find(flag => flag.type === 'spam');
      expect(spamFlag).toBeDefined();
      expect(spamFlag?.severity).toBe('medium');
      expect(spamFlag?.reason).toContain('spam content detected');
    });

    it('detects privacy leaks', async () => {
      const flags = await moderationManager.moderateContent({ ...mockPrivacyLeakContent });
      
      const privacyFlag = flags.find(flag => flag.type === 'inappropriate');
      expect(privacyFlag).toBeDefined();
      expect(privacyFlag?.severity).toBe('high');
      expect(privacyFlag?.reason).toContain('privacy information detected');
    });

    it('detects low quality content', async () => {
      const lowQualityContent = {
        ...mockContent,
        id: 'content_low_quality',
        title: 'help',
        body: 'pls help me',
        tags: [],
      };

      const flags = await moderationManager.moderateContent(lowQualityContent);
      
      const qualityFlag = flags.find(flag => flag.type === 'lowquality');
      expect(qualityFlag).toBeDefined();
      expect(qualityFlag?.severity).toBe('low');
    });

    it('allows clean content without flags', async () => {
      const flags = await moderationManager.moderateContent({ ...mockContent });
      
      expect(flags.length).toBe(0);
    });

    it('auto-hides critical content', async () => {
      const criticalContent = {
        ...mockContent,
        id: 'content_critical',
        body: 'This contains severe harassment and threats',
      };

      // Mock critical flag detection
      const originalAnalyzer = (moderationManager as any).contentAnalyzer;
      (moderationManager as any).contentAnalyzer = {
        analyzeContent: jest.fn(() => [{
          id: 'flag_critical',
          type: 'inappropriate',
          reason: 'Critical content violation',
          reportedBy: 'system',
          reportedAt: new Date().toISOString(),
          severity: 'critical',
          status: 'pending',
        }]),
      };

      await moderationManager.moderateContent(criticalContent);
      
      const content = (moderationManager as any).content.get('content_critical');
      expect(content?.status).toBe('hidden');

      (moderationManager as any).contentAnalyzer = originalAnalyzer;
    });
  });

  describe('Content Reporting', () => {
    it('creates report correctly', async () => {
      const report = await moderationManager.reportContent(
        mockContent.id,
        'reporter_001',
        'spam',
        'This looks like spam',
        'Contains promotional content'
      );

      expect(report.id).toMatch(/^report_/);
      expect(report.contentId).toBe(mockContent.id);
      expect(report.reporterId).toBe('reporter_001');
      expect(report.category).toBe('spam');
      expect(report.status).toBe('pending');
    });

    it('adds report to moderation queue', async () => {
      const initialQueueSize = moderationManager.getModerationQueue().length;
      
      await moderationManager.reportContent(
        mockContent.id,
        'reporter_001',
        'harassment',
        'Harassment report',
        'User is being harassed'
      );

      const queue = moderationManager.getModerationQueue();
      expect(queue.length).toBe(initialQueueSize + 1);
      
      const queueItem = queue.find(item => item.contentId === mockContent.id);
      expect(queueItem?.type).toBe('report');
      expect(queueItem?.priority).toBe('urgent'); // harassment = urgent
    });

    it('sets correct priority based on category', async () => {
      const harassmentReport = await moderationManager.reportContent(
        mockContent.id,
        'reporter_001',
        'harassment',
        'Harassment',
        'Description'
      );

      const spamReport = await moderationManager.reportContent(
        mockContent.id,
        'reporter_002',
        'spam',
        'Spam',
        'Description'
      );

      const queue = moderationManager.getModerationQueue();
      const harassmentItem = queue.find(item => item.reportId === harassmentReport.id);
      const spamItem = queue.find(item => item.reportId === spamReport.id);

      expect(harassmentItem?.priority).toBe('urgent');
      expect(spamItem?.priority).toBe('medium');
    });
  });

  describe('Content Voting', () => {
    it('records votes correctly', async () => {
      await moderationManager.voteOnContent(mockContent.id, 'voter_001', 'up');
      
      const content = (moderationManager as any).content.get(mockContent.id);
      expect(content.votes).toHaveLength(1);
      expect(content.votes[0].userId).toBe('voter_001');
      expect(content.votes[0].type).toBe('up');
    });

    it('replaces existing vote from same user', async () => {
      await moderationManager.voteOnContent(mockContent.id, 'voter_001', 'up');
      await moderationManager.voteOnContent(mockContent.id, 'voter_001', 'down');
      
      const content = (moderationManager as any).content.get(mockContent.id);
      expect(content.votes).toHaveLength(1);
      expect(content.votes[0].type).toBe('down');
    });

    it('updates author reputation based on votes', async () => {
      const initialReputation = (moderationManager as any).reputationSystem.getUserReputation(mockUser.id);
      
      await moderationManager.voteOnContent(mockContent.id, 'voter_001', 'up');
      
      const newReputation = (moderationManager as any).reputationSystem.getUserReputation(mockUser.id);
      expect(newReputation).toBe(initialReputation + 10); // up vote = +10
    });

    it('handles different vote types with correct reputation changes', async () => {
      const userId = mockUser.id;
      const contentId = mockContent.id;
      const initialRep = (moderationManager as any).reputationSystem.getUserReputation(userId);

      await moderationManager.voteOnContent(contentId, 'voter_001', 'helpful');
      expect((moderationManager as any).reputationSystem.getUserReputation(userId)).toBe(initialRep + 15);

      await moderationManager.voteOnContent(contentId, 'voter_002', 'down');
      expect((moderationManager as any).reputationSystem.getUserReputation(userId)).toBe(initialRep + 15 - 2);

      await moderationManager.voteOnContent(contentId, 'voter_003', 'unhelpful');
      expect((moderationManager as any).reputationSystem.getUserReputation(userId)).toBe(initialRep + 15 - 2 - 5);
    });
  });

  describe('Content Moderation Actions', () => {
    it('hides content correctly', async () => {
      const action = await moderationManager.hideContent(
        mockContent.id,
        'moderator_001',
        'Violates community guidelines'
      );

      expect(action.type).toBe('hide');
      expect(action.targetId).toBe(mockContent.id);
      expect(action.moderatorId).toBe('moderator_001');
      expect(action.reversible).toBe(true);

      const content = (moderationManager as any).content.get(mockContent.id);
      expect(content.status).toBe('hidden');
    });

    it('removes content correctly', async () => {
      const action = await moderationManager.removeContent(
        mockContent.id,
        'moderator_001',
        'Severe policy violation'
      );

      expect(action.type).toBe('remove');
      expect(action.reversible).toBe(false);

      const content = (moderationManager as any).content.get(mockContent.id);
      expect(content.status).toBe('removed');
    });

    it('emits events for moderation actions', (done) => {
      moderationManager.on('contentHidden', (event) => {
        expect(event.content.id).toBe(mockContent.id);
        expect(event.action.type).toBe('hide');
        done();
      });

      moderationManager.hideContent(mockContent.id, 'moderator_001', 'Test reason');
    });
  });

  describe('User Moderation', () => {
    it('warns user correctly', async () => {
      const action = await moderationManager.warnUser(
        mockUser.id,
        'moderator_001',
        'Inappropriate behavior'
      );

      expect(action.type).toBe('warn');
      expect(action.targetId).toBe(mockUser.id);
      expect(action.reversible).toBe(true);

      const user = (moderationManager as any).users.get(mockUser.id);
      expect(user.flags).toHaveLength(1);
      expect(user.flags[0].type).toBe('warning');
    });

    it('times out user correctly', async () => {
      const action = await moderationManager.timeoutUser(
        mockUser.id,
        'moderator_001',
        'Repeated violations',
        '24h'
      );

      expect(action.type).toBe('timeout');
      expect(action.duration).toBe('24h');

      const user = (moderationManager as any).users.get(mockUser.id);
      const timeoutFlag = user.flags.find((flag: any) => flag.type === 'timeout');
      expect(timeoutFlag).toBeDefined();
      expect(timeoutFlag.expiresAt).toBeDefined();
    });

    it('calculates timeout expiration correctly', async () => {
      await moderationManager.timeoutUser(mockUser.id, 'moderator_001', 'Test', '2h');
      
      const user = (moderationManager as any).users.get(mockUser.id);
      const timeoutFlag = user.flags.find((flag: any) => flag.type === 'timeout');
      
      const expiresAt = new Date(timeoutFlag.expiresAt);
      const issuedAt = new Date(timeoutFlag.issuedAt);
      const duration = expiresAt.getTime() - issuedAt.getTime();
      
      expect(duration).toBe(2 * 60 * 60 * 1000); // 2 hours in milliseconds
    });
  });

  describe('Reputation System', () => {
    it('calculates trust levels correctly', () => {
      const reputationSystem = (moderationManager as any).reputationSystem;
      
      expect(reputationSystem.getTrustLevel('new_user')).toBe('newcomer'); // 0 rep
      
      reputationSystem.updateReputation('member_user', 500, 'Initial');
      expect(reputationSystem.getTrustLevel('member_user')).toBe('member'); // 500 rep
      
      reputationSystem.updateReputation('trusted_user', 2000, 'Initial');
      expect(reputationSystem.getTrustLevel('trusted_user')).toBe('trusted'); // 2000 rep
      
      reputationSystem.updateReputation('mod_user', 7000, 'Initial');
      expect(reputationSystem.getTrustLevel('mod_user')).toBe('moderator'); // 7000 rep
      
      reputationSystem.updateReputation('admin_user', 15000, 'Initial');
      expect(reputationSystem.getTrustLevel('admin_user')).toBe('admin'); // 15000 rep
    });

    it('tracks reputation history', () => {
      const reputationSystem = (moderationManager as any).reputationSystem;
      const userId = 'test_user';
      
      reputationSystem.updateReputation(userId, 100, 'First contribution', 'content_001');
      reputationSystem.updateReputation(userId, 50, 'Helpful answer', 'content_002');
      reputationSystem.updateReputation(userId, -10, 'Downvoted post', 'content_003');
      
      const history = reputationSystem.getReputationHistory(userId);
      expect(history).toHaveLength(3);
      expect(history[0].change).toBe(100);
      expect(history[1].change).toBe(50);
      expect(history[2].change).toBe(-10);
      expect(history[2].newTotal).toBe(140); // 100 + 50 - 10
    });

    it('prevents negative reputation', () => {
      const reputationSystem = (moderationManager as any).reputationSystem;
      const userId = 'test_user';
      
      reputationSystem.updateReputation(userId, -100, 'Penalty');
      
      expect(reputationSystem.getUserReputation(userId)).toBe(0);
    });
  });

  describe('Moderation Queue', () => {
    it('manages queue items correctly', () => {
      const queueItem = {
        id: 'queue_001',
        type: 'report' as const,
        priority: 'high' as const,
        contentId: mockContent.id,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (moderationManager as any).moderationQueue.push(queueItem);
      
      const queue = moderationManager.getModerationQueue();
      expect(queue).toContain(queueItem);
    });

    it('assigns moderation tasks', () => {
      const queueItem = {
        id: 'queue_001',
        type: 'report' as const,
        priority: 'high' as const,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (moderationManager as any).moderationQueue.push(queueItem);
      
      const assigned = moderationManager.assignModerationTask('queue_001', 'moderator_001');
      expect(assigned).toBe(true);
      
      const queue = moderationManager.getModerationQueue();
      const item = queue.find(item => item.id === 'queue_001');
      expect(item?.assignedTo).toBe('moderator_001');
      expect(item?.status).toBe('inProgress');
    });

    it('resolves moderation tasks', () => {
      const queueItem = {
        id: 'queue_001',
        type: 'report' as const,
        priority: 'high' as const,
        status: 'inProgress' as const,
        assignedTo: 'moderator_001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (moderationManager as any).moderationQueue.push(queueItem);
      
      const resolved = moderationManager.resolveModerationTask('queue_001', 'moderator_001');
      expect(resolved).toBe(true);
      
      const queue = moderationManager.getModerationQueue();
      const item = queue.find(item => item.id === 'queue_001');
      expect(item?.status).toBe('resolved');
    });

    it('sorts queue by priority', () => {
      const items = [
        { id: 'low', priority: 'low' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 'urgent', priority: 'urgent' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 'medium', priority: 'medium' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 'high', priority: 'high' as const, createdAt: '2024-01-01T00:00:00Z' },
      ].map(item => ({
        ...item,
        type: 'report' as const,
        status: 'pending' as const,
        updatedAt: item.createdAt,
      }));

      (moderationManager as any).moderationQueue.push(...items);
      
      const queue = moderationManager.getModerationQueue();
      const priorities = queue.map(item => item.priority);
      
      expect(priorities.indexOf('urgent')).toBeLessThan(priorities.indexOf('high'));
      expect(priorities.indexOf('high')).toBeLessThan(priorities.indexOf('medium'));
      expect(priorities.indexOf('medium')).toBeLessThan(priorities.indexOf('low'));
    });

    it('filters queue by assignee', () => {
      const items = [
        { id: 'item1', assignedTo: 'mod1' },
        { id: 'item2', assignedTo: 'mod2' },
        { id: 'item3', assignedTo: 'mod1' },
      ].map(item => ({
        ...item,
        type: 'report' as const,
        priority: 'medium' as const,
        status: 'inProgress' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      (moderationManager as any).moderationQueue.push(...items);
      
      const mod1Queue = moderationManager.getModerationQueue('mod1');
      expect(mod1Queue).toHaveLength(2);
      expect(mod1Queue.every(item => item.assignedTo === 'mod1')).toBe(true);
    });
  });

  describe('User Permissions', () => {
    it('checks moderation permissions correctly', () => {
      // Mock reputation system to return different trust levels
      const reputationSystem = (moderationManager as any).reputationSystem;
      
      reputationSystem.getTrustLevel = jest.fn()
        .mockReturnValueOnce('newcomer')
        .mockReturnValueOnce('member')
        .mockReturnValueOnce('trusted')
        .mockReturnValueOnce('moderator');

      expect(moderationManager.canUserModerate('newcomer_user')).toBe(false);
      expect(moderationManager.canUserModerate('member_user')).toBe(false);
      expect(moderationManager.canUserModerate('trusted_user')).toBe(true);
      expect(moderationManager.canUserModerate('moderator_user')).toBe(true);
    });

    it('gets user trust level correctly', () => {
      const reputationSystem = (moderationManager as any).reputationSystem;
      reputationSystem.updateReputation('test_user', 1500, 'Test');
      
      const trustLevel = moderationManager.getUserTrustLevel('test_user');
      expect(trustLevel).toBe('trusted');
    });
  });

  describe('Community Rules', () => {
    it('provides community rules', () => {
      const rules = moderationManager.getCommunityRules();
      
      expect(rules).toHaveLength(4);
      expect(rules.find(rule => rule.id === 'rule_respect')).toBeDefined();
      expect(rules.find(rule => rule.id === 'rule_ontopic')).toBeDefined();
      expect(rules.find(rule => rule.id === 'rule_privacy')).toBeDefined();
      expect(rules.find(rule => rule.id === 'rule_spam')).toBeDefined();
    });

    it('categorizes rules correctly', () => {
      const rules = moderationManager.getCommunityRules();
      
      const behaviorRules = rules.filter(rule => rule.category === 'behavior');
      const contentRules = rules.filter(rule => rule.category === 'content');
      
      expect(behaviorRules).toHaveLength(1);
      expect(contentRules).toHaveLength(3);
    });

    it('identifies auto-enforceable rules', () => {
      const rules = moderationManager.getCommunityRules();
      
      const autoRules = rules.filter(rule => rule.autoEnforce);
      const manualRules = rules.filter(rule => !rule.autoEnforce);
      
      expect(autoRules).toHaveLength(3); // ontopic, privacy, spam
      expect(manualRules).toHaveLength(1); // respect
    });
  });

  describe('Moderation Statistics', () => {
    it('provides accurate statistics', () => {
      // Add some test data
      (moderationManager as any).users.set('user_002', { ...mockUser, id: 'user_002' });
      (moderationManager as any).content.set('content_002', { ...mockContent, id: 'content_002' });
      
      const report = {
        id: 'report_001',
        status: 'pending',
        timestamp: new Date().toISOString(),
      };
      (moderationManager as any).reports.set('report_001', report);

      const stats = moderationManager.getModerationStats();
      
      expect(stats.totalUsers).toBe(2);
      expect(stats.totalContent).toBe(2);
      expect(stats.totalReports).toBe(1);
      expect(stats.pendingReports).toBe(1);
    });

    it('tracks recent activity correctly', () => {
      // Add recent moderation action
      const action = {
        id: 'action_recent',
        timestamp: new Date().toISOString(),
      };
      (moderationManager as any).moderationActions.set('action_recent', action);

      const stats = moderationManager.getModerationStats();
      expect(stats.recentActions).toBe(1);
    });
  });

  describe('Event System', () => {
    it('emits content moderation events', (done) => {
      moderationManager.on('contentModerated', (event) => {
        expect(event.content).toBeDefined();
        expect(event.flags).toBeDefined();
        done();
      });

      moderationManager.moderateContent({ ...mockContent });
    });

    it('emits report events', (done) => {
      moderationManager.on('contentReported', (event) => {
        expect(event.report).toBeDefined();
        expect(event.report.contentId).toBe(mockContent.id);
        done();
      });

      moderationManager.reportContent(
        mockContent.id,
        'reporter_001',
        'spam',
        'Test report',
        'Test description'
      );
    });

    it('emits queue events', (done) => {
      moderationManager.on('moderationQueueUpdated', (event) => {
        expect(event.item).toBeDefined();
        done();
      });

      moderationManager.reportContent(
        mockContent.id,
        'reporter_001',
        'spam',
        'Test report',
        'Test description'
      );
    });

    it('emits task assignment events', (done) => {
      const queueItem = {
        id: 'queue_test',
        type: 'report' as const,
        priority: 'medium' as const,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (moderationManager as any).moderationQueue.push(queueItem);

      moderationManager.on('moderationTaskAssigned', (event) => {
        expect(event.item.id).toBe('queue_test');
        expect(event.moderatorId).toBe('moderator_001');
        done();
      });

      moderationManager.assignModerationTask('queue_test', 'moderator_001');
    });
  });

  describe('Error Handling', () => {
    it('handles invalid content gracefully', async () => {
      const invalidContent = null as any;
      
      await expect(
        moderationManager.moderateContent(invalidContent)
      ).rejects.toThrow();
    });

    it('handles non-existent content in actions', async () => {
      await expect(
        moderationManager.hideContent('non_existent', 'mod_001', 'reason')
      ).rejects.toThrow('Content not found');
    });

    it('handles non-existent user in actions', async () => {
      await expect(
        moderationManager.warnUser('non_existent', 'mod_001', 'reason')
      ).rejects.toThrow('User not found');
    });

    it('prevents unauthorized task assignment', () => {
      const queueItem = {
        id: 'queue_test',
        type: 'report' as const,
        priority: 'medium' as const,
        status: 'inProgress' as const,
        assignedTo: 'mod_001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (moderationManager as any).moderationQueue.push(queueItem);
      
      const assigned = moderationManager.assignModerationTask('queue_test', 'mod_002');
      expect(assigned).toBe(false);
    });

    it('prevents unauthorized task resolution', () => {
      const queueItem = {
        id: 'queue_test',
        type: 'report' as const,
        priority: 'medium' as const,
        status: 'inProgress' as const,
        assignedTo: 'mod_001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (moderationManager as any).moderationQueue.push(queueItem);
      
      const resolved = moderationManager.resolveModerationTask('queue_test', 'mod_002');
      expect(resolved).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('handles large content analysis efficiently', async () => {
      const largeContent = {
        ...mockContent,
        body: 'A'.repeat(10000), // 10KB content
      };

      const startTime = performance.now();
      await moderationManager.moderateContent(largeContent);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('processes multiple reports efficiently', async () => {
      const startTime = performance.now();

      const promises = Array.from({ length: 50 }, (_, i) => 
        moderationManager.reportContent(
          mockContent.id,
          `reporter_${i}`,
          'spam',
          `Report ${i}`,
          `Description ${i}`
        )
      );

      await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete in under 500ms
    });
  });
});
