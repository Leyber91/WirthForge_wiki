/**
 * WF-UX-008 Community Moderation
 * Lightweight community moderation system emphasizing user empowerment and trust
 */

import { EventEmitter } from 'eventemitter3';
import { PrivacyController } from './privacy-controls';

// Types
interface User {
  id: string;
  displayName: string;
  reputation: number;
  trustLevel: 'newcomer' | 'member' | 'trusted' | 'moderator' | 'admin';
  joinDate: string;
  lastActive: string;
  flags: UserFlag[];
}

interface UserFlag {
  id: string;
  type: 'warning' | 'timeout' | 'restriction' | 'note';
  reason: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string;
  resolved: boolean;
}

interface Content {
  id: string;
  type: 'question' | 'answer' | 'tutorial' | 'showcase' | 'discussion';
  authorId: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'flagged' | 'hidden' | 'removed';
  flags: ContentFlag[];
  votes: Vote[];
  reports: Report[];
}

interface ContentFlag {
  id: string;
  type: 'spam' | 'inappropriate' | 'offtopic' | 'duplicate' | 'lowquality' | 'harassment';
  reason: string;
  reportedBy: string;
  reportedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  action?: ModerationAction;
}

interface Vote {
  userId: string;
  type: 'up' | 'down' | 'helpful' | 'unhelpful';
  timestamp: string;
}

interface Report {
  id: string;
  reporterId: string;
  contentId: string;
  reason: string;
  category: 'spam' | 'harassment' | 'inappropriate' | 'copyright' | 'other';
  description: string;
  timestamp: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  assignedTo?: string;
}

interface ModerationAction {
  id: string;
  type: 'warn' | 'hide' | 'remove' | 'timeout' | 'restrict' | 'ban';
  targetType: 'user' | 'content';
  targetId: string;
  moderatorId: string;
  reason: string;
  duration?: string; // ISO 8601 duration
  timestamp: string;
  reversible: boolean;
  reversed?: boolean;
  reversedBy?: string;
  reversedAt?: string;
}

interface CommunityRule {
  id: string;
  title: string;
  description: string;
  category: 'behavior' | 'content' | 'participation' | 'technical';
  severity: 'guideline' | 'rule' | 'policy';
  autoEnforce: boolean;
  consequences: string[];
}

interface ModerationQueue {
  id: string;
  type: 'report' | 'autoFlag' | 'appeal';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contentId?: string;
  userId?: string;
  reportId?: string;
  assignedTo?: string;
  status: 'pending' | 'inProgress' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

// Content Analysis
class ContentAnalyzer {
  private privacyController: PrivacyController;
  private spamPatterns: RegExp[];
  private toxicityThreshold: number;

  constructor(privacyController: PrivacyController) {
    this.privacyController = privacyController;
    this.spamPatterns = [
      /\b(?:buy|sell|cheap|discount|offer|deal)\b.*\b(?:now|today|limited)\b/i,
      /\b(?:click|visit|check)\s+(?:here|this|link)\b/i,
      /\b(?:earn|make)\s+\$?\d+.*(?:day|week|month)\b/i,
    ];
    this.toxicityThreshold = 0.7;
  }

  public analyzeContent(content: Content): ContentFlag[] {
    const flags: ContentFlag[] = [];

    // Spam detection
    if (this.detectSpam(content)) {
      flags.push(this.createFlag('spam', 'Potential spam content detected', 'system', 'medium'));
    }

    // Duplicate detection
    if (this.detectDuplicate(content)) {
      flags.push(this.createFlag('duplicate', 'Similar content already exists', 'system', 'low'));
    }

    // Quality assessment
    if (this.assessQuality(content) < 0.3) {
      flags.push(this.createFlag('lowquality', 'Content quality below threshold', 'system', 'low'));
    }

    // Privacy leak detection
    if (this.detectPrivacyLeaks(content)) {
      flags.push(this.createFlag('inappropriate', 'Potential privacy information detected', 'system', 'high'));
    }

    return flags;
  }

  private detectSpam(content: Content): boolean {
    const text = `${content.title} ${content.body}`.toLowerCase();
    return this.spamPatterns.some(pattern => pattern.test(text));
  }

  private detectDuplicate(content: Content): boolean {
    // In a real implementation, this would check against existing content
    // Using similarity algorithms like cosine similarity or Jaccard index
    return false;
  }

  private assessQuality(content: Content): number {
    let score = 1.0;

    // Length factors
    if (content.body.length < 50) score -= 0.3;
    if (content.title.length < 10) score -= 0.2;

    // Structure factors
    if (!content.body.includes('?') && content.type === 'question') score -= 0.2;
    if (content.tags.length === 0) score -= 0.1;

    // Language quality (simplified)
    const typoCount = this.countTypos(content.body);
    score -= Math.min(typoCount * 0.05, 0.3);

    return Math.max(score, 0);
  }

  private detectPrivacyLeaks(content: Content): boolean {
    const text = `${content.title} ${content.body}`;
    const sanitized = this.privacyController.sanitizeData({ text });
    return sanitized.text !== text;
  }

  private countTypos(text: string): number {
    // Simplified typo detection
    const words = text.split(/\s+/);
    let typos = 0;

    for (const word of words) {
      if (word.length > 3 && /[A-Z]{2,}/.test(word)) typos++;
      if (/\d{3,}/.test(word)) typos++;
    }

    return typos;
  }

  private createFlag(
    type: ContentFlag['type'],
    reason: string,
    reportedBy: string,
    severity: ContentFlag['severity']
  ): ContentFlag {
    return {
      id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      reason,
      reportedBy,
      reportedAt: new Date().toISOString(),
      severity,
      status: 'pending',
    };
  }
}

// Reputation System
class ReputationSystem {
  private userReputations: Map<string, number>;
  private reputationHistory: Map<string, ReputationEvent[]>;

  constructor() {
    this.userReputations = new Map();
    this.reputationHistory = new Map();
  }

  public getUserReputation(userId: string): number {
    return this.userReputations.get(userId) || 0;
  }

  public updateReputation(
    userId: string,
    change: number,
    reason: string,
    sourceId?: string
  ): number {
    const currentRep = this.getUserReputation(userId);
    const newRep = Math.max(0, currentRep + change);
    
    this.userReputations.set(userId, newRep);
    
    const event: ReputationEvent = {
      id: `rep_${Date.now()}`,
      userId,
      change,
      reason,
      sourceId,
      timestamp: new Date().toISOString(),
      newTotal: newRep,
    };

    const history = this.reputationHistory.get(userId) || [];
    history.push(event);
    this.reputationHistory.set(userId, history);

    return newRep;
  }

  public getTrustLevel(userId: string): User['trustLevel'] {
    const reputation = this.getUserReputation(userId);
    
    if (reputation >= 10000) return 'admin';
    if (reputation >= 5000) return 'moderator';
    if (reputation >= 1000) return 'trusted';
    if (reputation >= 100) return 'member';
    return 'newcomer';
  }

  public getReputationHistory(userId: string): ReputationEvent[] {
    return this.reputationHistory.get(userId) || [];
  }
}

interface ReputationEvent {
  id: string;
  userId: string;
  change: number;
  reason: string;
  sourceId?: string;
  timestamp: string;
  newTotal: number;
}

// Main Moderation Manager
export class ModerationManager extends EventEmitter {
  private privacyController: PrivacyController;
  private contentAnalyzer: ContentAnalyzer;
  private reputationSystem: ReputationSystem;
  private users: Map<string, User>;
  private content: Map<string, Content>;
  private reports: Map<string, Report>;
  private moderationQueue: ModerationQueue[];
  private communityRules: CommunityRule[];
  private moderationActions: Map<string, ModerationAction>;

  constructor(privacyController: PrivacyController) {
    super();
    this.privacyController = privacyController;
    this.contentAnalyzer = new ContentAnalyzer(privacyController);
    this.reputationSystem = new ReputationSystem();
    this.users = new Map();
    this.content = new Map();
    this.reports = new Map();
    this.moderationQueue = [];
    this.communityRules = [];
    this.moderationActions = new Map();

    this.initializeCommunityRules();
  }

  private initializeCommunityRules(): void {
    this.communityRules = [
      {
        id: 'rule_respect',
        title: 'Treat others with respect',
        description: 'Be kind, constructive, and respectful in all interactions',
        category: 'behavior',
        severity: 'rule',
        autoEnforce: false,
        consequences: ['warning', 'temporary timeout', 'account restriction'],
      },
      {
        id: 'rule_ontopic',
        title: 'Stay on topic',
        description: 'Keep discussions relevant to the WIRTHFORGE ecosystem',
        category: 'content',
        severity: 'guideline',
        autoEnforce: true,
        consequences: ['content hiding', 'category reassignment'],
      },
      {
        id: 'rule_privacy',
        title: 'Protect privacy',
        description: 'Do not share personal information or violate privacy',
        category: 'content',
        severity: 'policy',
        autoEnforce: true,
        consequences: ['immediate content removal', 'account warning'],
      },
      {
        id: 'rule_spam',
        title: 'No spam or self-promotion',
        description: 'Avoid repetitive, promotional, or low-value content',
        category: 'content',
        severity: 'rule',
        autoEnforce: true,
        consequences: ['content removal', 'posting restrictions'],
      },
    ];
  }

  // Content Moderation
  public async moderateContent(content: Content): Promise<ContentFlag[]> {
    // Analyze content for potential issues
    const flags = this.contentAnalyzer.analyzeContent(content);
    
    // Apply flags to content
    content.flags.push(...flags);

    // Auto-moderate based on severity
    for (const flag of flags) {
      if (flag.severity === 'critical') {
        await this.hideContent(content.id, 'system', 'Automatic moderation: critical flag');
      } else if (flag.severity === 'high') {
        this.addToModerationQueue({
          id: `queue_${Date.now()}`,
          type: 'autoFlag',
          priority: 'high',
          contentId: content.id,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    this.emit('contentModerated', { content, flags });
    return flags;
  }

  // Report Content
  public async reportContent(
    contentId: string,
    reporterId: string,
    category: Report['category'],
    reason: string,
    description: string
  ): Promise<Report> {
    const report: Report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reporterId,
      contentId,
      reason,
      category,
      description,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    this.reports.set(report.id, report);

    // Add to moderation queue
    this.addToModerationQueue({
      id: `queue_${Date.now()}`,
      type: 'report',
      priority: this.getReportPriority(category),
      contentId,
      reportId: report.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.emit('contentReported', { report });
    return report;
  }

  // Vote on Content
  public async voteOnContent(
    contentId: string,
    userId: string,
    voteType: Vote['type']
  ): Promise<void> {
    const content = this.content.get(contentId);
    if (!content) throw new Error('Content not found');

    // Remove existing vote from this user
    content.votes = content.votes.filter(vote => vote.userId !== userId);

    // Add new vote
    content.votes.push({
      userId,
      type: voteType,
      timestamp: new Date().toISOString(),
    });

    // Update reputation based on vote
    const reputationChange = this.calculateReputationChange(voteType);
    if (reputationChange !== 0) {
      this.reputationSystem.updateReputation(
        content.authorId,
        reputationChange,
        `Vote: ${voteType}`,
        contentId
      );
    }

    this.emit('contentVoted', { contentId, userId, voteType });
  }

  // Hide Content
  public async hideContent(
    contentId: string,
    moderatorId: string,
    reason: string
  ): Promise<ModerationAction> {
    const content = this.content.get(contentId);
    if (!content) throw new Error('Content not found');

    content.status = 'hidden';

    const action: ModerationAction = {
      id: `action_${Date.now()}`,
      type: 'hide',
      targetType: 'content',
      targetId: contentId,
      moderatorId,
      reason,
      timestamp: new Date().toISOString(),
      reversible: true,
    };

    this.moderationActions.set(action.id, action);
    this.emit('contentHidden', { content, action });

    return action;
  }

  // Remove Content
  public async removeContent(
    contentId: string,
    moderatorId: string,
    reason: string
  ): Promise<ModerationAction> {
    const content = this.content.get(contentId);
    if (!content) throw new Error('Content not found');

    content.status = 'removed';

    const action: ModerationAction = {
      id: `action_${Date.now()}`,
      type: 'remove',
      targetType: 'content',
      targetId: contentId,
      moderatorId,
      reason,
      timestamp: new Date().toISOString(),
      reversible: false,
    };

    this.moderationActions.set(action.id, action);
    this.emit('contentRemoved', { content, action });

    return action;
  }

  // User Moderation
  public async warnUser(
    userId: string,
    moderatorId: string,
    reason: string
  ): Promise<ModerationAction> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const flag: UserFlag = {
      id: `flag_${Date.now()}`,
      type: 'warning',
      reason,
      issuedBy: moderatorId,
      issuedAt: new Date().toISOString(),
      resolved: false,
    };

    user.flags.push(flag);

    const action: ModerationAction = {
      id: `action_${Date.now()}`,
      type: 'warn',
      targetType: 'user',
      targetId: userId,
      moderatorId,
      reason,
      timestamp: new Date().toISOString(),
      reversible: true,
    };

    this.moderationActions.set(action.id, action);
    this.emit('userWarned', { user, action });

    return action;
  }

  // Timeout User
  public async timeoutUser(
    userId: string,
    moderatorId: string,
    reason: string,
    duration: string
  ): Promise<ModerationAction> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + this.parseDuration(duration));

    const flag: UserFlag = {
      id: `flag_${Date.now()}`,
      type: 'timeout',
      reason,
      issuedBy: moderatorId,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      resolved: false,
    };

    user.flags.push(flag);

    const action: ModerationAction = {
      id: `action_${Date.now()}`,
      type: 'timeout',
      targetType: 'user',
      targetId: userId,
      moderatorId,
      reason,
      duration,
      timestamp: new Date().toISOString(),
      reversible: true,
    };

    this.moderationActions.set(action.id, action);
    this.emit('userTimedOut', { user, action });

    return action;
  }

  // Get Moderation Queue
  public getModerationQueue(
    assignedTo?: string,
    status?: ModerationQueue['status']
  ): ModerationQueue[] {
    return this.moderationQueue
      .filter(item => {
        if (assignedTo && item.assignedTo !== assignedTo) return false;
        if (status && item.status !== status) return false;
        return true;
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  // Assign Moderation Task
  public assignModerationTask(queueId: string, moderatorId: string): boolean {
    const item = this.moderationQueue.find(item => item.id === queueId);
    if (!item || item.status !== 'pending') return false;

    item.assignedTo = moderatorId;
    item.status = 'inProgress';
    item.updatedAt = new Date().toISOString();

    this.emit('moderationTaskAssigned', { item, moderatorId });
    return true;
  }

  // Resolve Moderation Task
  public resolveModerationTask(queueId: string, moderatorId: string): boolean {
    const item = this.moderationQueue.find(item => item.id === queueId);
    if (!item || item.assignedTo !== moderatorId) return false;

    item.status = 'resolved';
    item.updatedAt = new Date().toISOString();

    this.emit('moderationTaskResolved', { item, moderatorId });
    return true;
  }

  // Get User Trust Level
  public getUserTrustLevel(userId: string): User['trustLevel'] {
    return this.reputationSystem.getTrustLevel(userId);
  }

  // Check User Permissions
  public canUserModerate(userId: string): boolean {
    const trustLevel = this.getUserTrustLevel(userId);
    return ['trusted', 'moderator', 'admin'].includes(trustLevel);
  }

  // Get Community Rules
  public getCommunityRules(): CommunityRule[] {
    return [...this.communityRules];
  }

  // Get Moderation Statistics
  public getModerationStats(): any {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentActions = Array.from(this.moderationActions.values())
      .filter(action => new Date(action.timestamp) > dayAgo);

    const recentReports = Array.from(this.reports.values())
      .filter(report => new Date(report.timestamp) > dayAgo);

    return {
      totalUsers: this.users.size,
      totalContent: this.content.size,
      totalReports: this.reports.size,
      pendingReports: Array.from(this.reports.values())
        .filter(report => report.status === 'pending').length,
      recentActions: recentActions.length,
      recentReports: recentReports.length,
      queueSize: this.moderationQueue.filter(item => item.status === 'pending').length,
    };
  }

  private addToModerationQueue(item: ModerationQueue): void {
    this.moderationQueue.push(item);
    this.emit('moderationQueueUpdated', { item });
  }

  private getReportPriority(category: Report['category']): ModerationQueue['priority'] {
    switch (category) {
      case 'harassment': return 'urgent';
      case 'inappropriate': return 'high';
      case 'spam': return 'medium';
      default: return 'low';
    }
  }

  private calculateReputationChange(voteType: Vote['type']): number {
    switch (voteType) {
      case 'up': return 10;
      case 'helpful': return 15;
      case 'down': return -2;
      case 'unhelpful': return -5;
      default: return 0;
    }
  }

  private parseDuration(duration: string): number {
    // Simple duration parser (e.g., "1h", "30m", "1d")
    const match = duration.match(/^(\d+)([hmds])$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }
}

export default ModerationManager;
