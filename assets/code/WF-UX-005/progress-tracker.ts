/**
 * WF-UX-005 Progress Tracker Module
 * Manages user progress through tutorials, tracks metrics, and handles local storage
 * Supports offline-first operation with optional analytics export
 */

import { EventEmitter } from 'events';

// Types and interfaces
interface UserProfile {
  currentLevel: number;
  experiencePoints: number;
  performanceTier: 'low' | 'mid' | 'high';
  preferences: {
    tutorialPacing: 'slow' | 'normal' | 'fast';
    visualComplexity: 'minimal' | 'standard' | 'enhanced';
    helpFrequency: 'minimal' | 'normal' | 'frequent';
    accessibilityMode: boolean;
    reducedMotion: boolean;
  };
  achievements: Achievement[];
}

interface Achievement {
  achievementId: string;
  name: string;
  earnedAt: string;
  category: 'tutorial' | 'exploration' | 'mastery' | 'community' | 'special';
}

interface TutorialProgress {
  tutorialId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'abandoned';
  startedAt?: string;
  completedAt?: string;
  lastAccessedAt?: string;
  totalTimeSpent: number;
  completionPercentage: number;
  stepsCompleted: string[];
  currentStep?: string;
  stepProgress: Record<string, StepProgress>;
  knowledgeChecks: KnowledgeCheck[];
  feedback?: TutorialFeedback;
}

interface StepProgress {
  stepId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  startedAt?: string;
  completedAt?: string;
  timeSpent: number;
  attempts: number;
  hintsUsed: number;
  errors: StepError[];
}

interface StepError {
  timestamp: string;
  errorType: 'validation_failed' | 'timeout' | 'system_error' | 'user_error';
  errorMessage: string;
}

interface KnowledgeCheck {
  checkId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timestamp: string;
}

interface TutorialFeedback {
  rating: number;
  comments?: string;
  difficulty: 'too_easy' | 'just_right' | 'too_hard';
  pacing: 'too_slow' | 'just_right' | 'too_fast';
  submittedAt: string;
}

interface LearningMetrics {
  totalTutorialsStarted: number;
  totalTutorialsCompleted: number;
  completionRate: number;
  averageCompletionTime: number;
  helpRequestFrequency: number;
  knowledgeRetentionScore: number;
  skillDemonstrationScore: number;
  engagementScore: number;
  dropOffPoints: DropOffPoint[];
}

interface DropOffPoint {
  tutorialId: string;
  stepId: string;
  timestamp: string;
  reason: 'timeout' | 'user_exit' | 'error' | 'skip' | 'unknown';
}

interface ProgressData {
  userId: string;
  profileVersion: string;
  createdAt: string;
  lastUpdated: string;
  userProfile: UserProfile;
  tutorialProgress: Record<string, TutorialProgress>;
  learningMetrics: LearningMetrics;
  featureUsage: Record<string, any>;
  analyticsData: {
    sessionData: SessionData[];
    abTestAssignments: ABTestAssignment[];
    customEvents: CustomEvent[];
  };
}

interface SessionData {
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  tutorialsAccessed: string[];
  eventsLogged: number;
}

interface ABTestAssignment {
  testId: string;
  variant: string;
  assignedAt: string;
  completed: boolean;
}

interface CustomEvent {
  eventName: string;
  timestamp: string;
  properties: Record<string, any>;
}

// Storage interface for different backends
interface StorageBackend {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Local storage implementation
class LocalStorageBackend implements StorageBackend {
  async get(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('LocalStorage set error:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage remove error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('LocalStorage clear error:', error);
    }
  }
}

// IndexedDB implementation for larger data
class IndexedDBBackend implements StorageBackend {
  private dbName = 'WirthForgeProgress';
  private version = 1;
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'key' });
        }
      };
    });
  }

  async get(key: string): Promise<any> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result?.value || null);
      });
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      
      return new Promise((resolve, reject) => {
        const request = store.put({ key, value });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB set error:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB remove error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
    }
  }
}

// Main Progress Tracker class
export class ProgressTracker extends EventEmitter {
  private storage: StorageBackend;
  private data: ProgressData;
  private currentSession: SessionData | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly SAVE_INTERVAL = 5000; // Save every 5 seconds
  private readonly STORAGE_KEY = 'wirthforge_progress';

  constructor(userId: string = 'local_user', useIndexedDB: boolean = true) {
    super();
    this.storage = useIndexedDB ? new IndexedDBBackend() : new LocalStorageBackend();
    this.data = this.createDefaultData(userId);
    this.initialize();
  }

  private createDefaultData(userId: string): ProgressData {
    const now = new Date().toISOString();
    return {
      userId,
      profileVersion: '1.0.0',
      createdAt: now,
      lastUpdated: now,
      userProfile: {
        currentLevel: 1,
        experiencePoints: 0,
        performanceTier: 'mid',
        preferences: {
          tutorialPacing: 'normal',
          visualComplexity: 'standard',
          helpFrequency: 'normal',
          accessibilityMode: false,
          reducedMotion: false
        },
        achievements: []
      },
      tutorialProgress: {},
      learningMetrics: {
        totalTutorialsStarted: 0,
        totalTutorialsCompleted: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        helpRequestFrequency: 0,
        knowledgeRetentionScore: 0,
        skillDemonstrationScore: 0,
        engagementScore: 0,
        dropOffPoints: []
      },
      featureUsage: {},
      analyticsData: {
        sessionData: [],
        abTestAssignments: [],
        customEvents: []
      }
    };
  }

  private async initialize(): Promise<void> {
    try {
      const savedData = await this.storage.get(this.STORAGE_KEY);
      if (savedData) {
        this.data = { ...this.data, ...savedData };
        this.data.lastUpdated = new Date().toISOString();
      }
      
      this.startSession();
      this.startAutoSave();
      this.emit('initialized', this.data);
    } catch (error) {
      console.error('Failed to initialize progress tracker:', error);
      this.emit('error', error);
    }
  }

  private startSession(): void {
    this.currentSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date().toISOString(),
      duration: 0,
      tutorialsAccessed: [],
      eventsLogged: 0
    };
  }

  private startAutoSave(): void {
    this.saveTimer = setInterval(() => {
      this.save();
    }, this.SAVE_INTERVAL);
  }

  private async save(): Promise<void> {
    try {
      this.data.lastUpdated = new Date().toISOString();
      await this.storage.set(this.STORAGE_KEY, this.data);
      this.emit('saved', this.data);
    } catch (error) {
      console.error('Failed to save progress:', error);
      this.emit('error', error);
    }
  }

  // Tutorial Progress Methods
  public startTutorial(tutorialId: string): void {
    const now = new Date().toISOString();
    
    if (!this.data.tutorialProgress[tutorialId]) {
      this.data.tutorialProgress[tutorialId] = {
        tutorialId,
        status: 'in_progress',
        startedAt: now,
        lastAccessedAt: now,
        totalTimeSpent: 0,
        completionPercentage: 0,
        stepsCompleted: [],
        stepProgress: {},
        knowledgeChecks: []
      };
      
      this.data.learningMetrics.totalTutorialsStarted++;
    } else {
      this.data.tutorialProgress[tutorialId].status = 'in_progress';
      this.data.tutorialProgress[tutorialId].lastAccessedAt = now;
    }

    if (this.currentSession && !this.currentSession.tutorialsAccessed.includes(tutorialId)) {
      this.currentSession.tutorialsAccessed.push(tutorialId);
    }

    this.emit('tutorialStarted', tutorialId);
    this.logEvent('tutorial_started', { tutorialId });
  }

  public markStepComplete(tutorialId: string, stepId: string): void {
    const tutorial = this.data.tutorialProgress[tutorialId];
    if (!tutorial) return;

    const now = new Date().toISOString();
    
    // Update step progress
    if (!tutorial.stepProgress[stepId]) {
      tutorial.stepProgress[stepId] = {
        stepId,
        status: 'completed',
        completedAt: now,
        timeSpent: 0,
        attempts: 1,
        hintsUsed: 0,
        errors: []
      };
    } else {
      tutorial.stepProgress[stepId].status = 'completed';
      tutorial.stepProgress[stepId].completedAt = now;
    }

    // Add to completed steps if not already there
    if (!tutorial.stepsCompleted.includes(stepId)) {
      tutorial.stepsCompleted.push(stepId);
    }

    tutorial.lastAccessedAt = now;
    
    this.emit('stepCompleted', tutorialId, stepId);
    this.logEvent('step_completed', { tutorialId, stepId });
  }

  public markTutorialComplete(tutorialId: string, totalSteps: number): void {
    const tutorial = this.data.tutorialProgress[tutorialId];
    if (!tutorial) return;

    const now = new Date().toISOString();
    tutorial.status = 'completed';
    tutorial.completedAt = now;
    tutorial.completionPercentage = 100;

    this.data.learningMetrics.totalTutorialsCompleted++;
    this.updateCompletionRate();

    this.emit('tutorialCompleted', tutorialId);
    this.logEvent('tutorial_completed', { tutorialId });
  }

  public recordDropOff(tutorialId: string, stepId: string, reason: DropOffPoint['reason']): void {
    const dropOff: DropOffPoint = {
      tutorialId,
      stepId,
      timestamp: new Date().toISOString(),
      reason
    };

    this.data.learningMetrics.dropOffPoints.push(dropOff);
    
    const tutorial = this.data.tutorialProgress[tutorialId];
    if (tutorial) {
      tutorial.status = 'abandoned';
    }

    this.emit('dropOff', dropOff);
    this.logEvent('tutorial_abandoned', { tutorialId, stepId, reason });
  }

  public recordKnowledgeCheck(tutorialId: string, check: Omit<KnowledgeCheck, 'timestamp'>): void {
    const tutorial = this.data.tutorialProgress[tutorialId];
    if (!tutorial) return;

    const knowledgeCheck: KnowledgeCheck = {
      ...check,
      timestamp: new Date().toISOString()
    };

    tutorial.knowledgeChecks.push(knowledgeCheck);
    this.updateKnowledgeRetentionScore();

    this.emit('knowledgeCheck', tutorialId, knowledgeCheck);
    this.logEvent('knowledge_check', { tutorialId, checkId: check.checkId, isCorrect: check.isCorrect });
  }

  public recordTutorialFeedback(tutorialId: string, feedback: Omit<TutorialFeedback, 'submittedAt'>): void {
    const tutorial = this.data.tutorialProgress[tutorialId];
    if (!tutorial) return;

    tutorial.feedback = {
      ...feedback,
      submittedAt: new Date().toISOString()
    };

    this.emit('feedbackSubmitted', tutorialId, tutorial.feedback);
    this.logEvent('feedback_submitted', { tutorialId, rating: feedback.rating });
  }

  // Achievement Methods
  public awardAchievement(achievement: Omit<Achievement, 'earnedAt'>): void {
    const existingAchievement = this.data.userProfile.achievements.find(
      a => a.achievementId === achievement.achievementId
    );

    if (!existingAchievement) {
      const newAchievement: Achievement = {
        ...achievement,
        earnedAt: new Date().toISOString()
      };

      this.data.userProfile.achievements.push(newAchievement);
      this.emit('achievementEarned', newAchievement);
      this.logEvent('achievement_earned', { achievementId: achievement.achievementId });
    }
  }

  public addExperiencePoints(points: number): void {
    this.data.userProfile.experiencePoints += points;
    this.checkLevelUp();
    this.emit('experienceGained', points, this.data.userProfile.experiencePoints);
    this.logEvent('experience_gained', { points, total: this.data.userProfile.experiencePoints });
  }

  private checkLevelUp(): void {
    const currentXP = this.data.userProfile.experiencePoints;
    const currentLevel = this.data.userProfile.currentLevel;
    
    // Simple level calculation: 100 XP per level
    const newLevel = Math.floor(currentXP / 100) + 1;
    
    if (newLevel > currentLevel && newLevel <= 5) {
      this.data.userProfile.currentLevel = newLevel;
      this.emit('levelUp', newLevel, currentLevel);
      this.logEvent('level_up', { newLevel, previousLevel: currentLevel });
    }
  }

  // Analytics Methods
  public logEvent(eventName: string, properties: Record<string, any> = {}): void {
    const event: CustomEvent = {
      eventName,
      timestamp: new Date().toISOString(),
      properties
    };

    this.data.analyticsData.customEvents.push(event);
    
    if (this.currentSession) {
      this.currentSession.eventsLogged++;
    }

    this.emit('eventLogged', event);
  }

  public assignABTest(testId: string, variant: string): void {
    const existing = this.data.analyticsData.abTestAssignments.find(a => a.testId === testId);
    
    if (!existing) {
      const assignment: ABTestAssignment = {
        testId,
        variant,
        assignedAt: new Date().toISOString(),
        completed: false
      };

      this.data.analyticsData.abTestAssignments.push(assignment);
      this.emit('abTestAssigned', assignment);
      this.logEvent('ab_test_assigned', { testId, variant });
    }
  }

  // Metrics Calculation
  private updateCompletionRate(): void {
    const { totalTutorialsStarted, totalTutorialsCompleted } = this.data.learningMetrics;
    this.data.learningMetrics.completionRate = totalTutorialsStarted > 0 
      ? totalTutorialsCompleted / totalTutorialsStarted 
      : 0;
  }

  private updateKnowledgeRetentionScore(): void {
    const allChecks = Object.values(this.data.tutorialProgress)
      .flatMap(t => t.knowledgeChecks);
    
    if (allChecks.length > 0) {
      const correctCount = allChecks.filter(c => c.isCorrect).length;
      this.data.learningMetrics.knowledgeRetentionScore = (correctCount / allChecks.length) * 100;
    }
  }

  // Data Access Methods
  public getUserProfile(): UserProfile {
    return { ...this.data.userProfile };
  }

  public getTutorialProgress(tutorialId?: string): TutorialProgress | Record<string, TutorialProgress> {
    if (tutorialId) {
      return this.data.tutorialProgress[tutorialId] || null;
    }
    return { ...this.data.tutorialProgress };
  }

  public getLearningMetrics(): LearningMetrics {
    return { ...this.data.learningMetrics };
  }

  public updateUserPreferences(preferences: Partial<UserProfile['preferences']>): void {
    this.data.userProfile.preferences = {
      ...this.data.userProfile.preferences,
      ...preferences
    };
    
    this.emit('preferencesUpdated', this.data.userProfile.preferences);
    this.logEvent('preferences_updated', preferences);
  }

  // Session Management
  public endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date().toISOString();
      this.currentSession.duration = Date.now() - new Date(this.currentSession.startTime).getTime();
      
      this.data.analyticsData.sessionData.push(this.currentSession);
      this.emit('sessionEnded', this.currentSession);
      
      this.currentSession = null;
    }

    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }

    this.save(); // Final save
  }

  // Export/Import Methods
  public exportData(): ProgressData {
    return JSON.parse(JSON.stringify(this.data));
  }

  public async importData(data: Partial<ProgressData>): Promise<void> {
    this.data = { ...this.data, ...data };
    await this.save();
    this.emit('dataImported', this.data);
  }

  public async clearAllData(): Promise<void> {
    await this.storage.clear();
    this.data = this.createDefaultData(this.data.userId);
    this.emit('dataCleared');
  }

  // Cleanup
  public destroy(): void {
    this.endSession();
    this.removeAllListeners();
  }
}

export default ProgressTracker;
