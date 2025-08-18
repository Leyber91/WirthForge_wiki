/**
 * WF-UX-005 Help System
 * Contextual help, tooltips, and smart assistance for WIRTHFORGE onboarding
 * Supports offline operation with optional online community integration
 */

import { EventEmitter } from 'events';

// Types and interfaces
interface HelpContent {
  contentId: string;
  version: string;
  metadata: {
    title: string;
    description: string;
    language: string;
    lastUpdated: string;
    offlineAvailable: boolean;
  };
  contextualHelp: {
    tooltips: Tooltip[];
    smartHints: SmartHint[];
  };
  faqContent: {
    categories: FAQCategory[];
    questions: FAQQuestion[];
  };
  videoTutorials: {
    tutorials: VideoTutorial[];
  };
  troubleshooting: {
    commonIssues: TroubleshootingIssue[];
  };
}

interface Tooltip {
  id: string;
  trigger: {
    type: 'hover' | 'click' | 'focus' | 'delay' | 'condition' | 'manual';
    target: string;
    condition?: string;
    delay?: number;
  };
  content: {
    title?: string;
    text?: string;
    html?: string;
    icon?: string;
    actionButton?: {
      label: string;
      action: string;
      target: string;
    };
  };
  display: {
    position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    theme: 'light' | 'dark' | 'system' | 'energy';
    persistent?: boolean;
    maxWidth?: number;
  };
  behavior: {
    showOnce?: boolean;
    dismissible?: boolean;
    autoHide?: number;
    priority?: number;
  };
  accessibility: {
    ariaLabel?: string;
    role?: 'tooltip' | 'dialog' | 'alert' | 'status';
    announceOnShow?: boolean;
  };
}

interface SmartHint {
  id: string;
  conditions: Array<{
    type: 'user_idle' | 'feature_unused' | 'error_occurred' | 'time_based' | 'progress_based';
    parameters: Record<string, any>;
  }>;
  content: string;
  action?: {
    type: 'highlight' | 'tutorial' | 'help' | 'demo';
    target: string;
  };
}

interface FAQCategory {
  categoryId: string;
  name: string;
  description: string;
  icon?: string;
  order: number;
}

interface FAQQuestion {
  questionId: string;
  categoryId: string;
  question: string;
  answer: string;
  keywords: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  popularity?: number;
  lastUpdated?: string;
  relatedQuestions?: string[];
}

interface VideoTutorial {
  videoId: string;
  title: string;
  description: string;
  duration: number;
  level: number;
  topics: string[];
  sources: {
    local?: string;
    online?: string;
    generated?: {
      prompt: string;
      service: 'sora' | 'runway' | 'custom';
      parameters?: Record<string, any>;
    };
  };
  captions?: Array<{
    language: string;
    format: 'srt' | 'vtt' | 'ass';
    url: string;
  }>;
  transcript?: string;
}

interface TroubleshootingIssue {
  issueId: string;
  title: string;
  description: string;
  symptoms: string[];
  causes: string[];
  solutions: Array<{
    title: string;
    steps: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    automated?: boolean;
  }>;
  prevention?: string;
  relatedIssues?: string[];
}

interface HelpUsageStats {
  tooltipsShown: Record<string, number>;
  hintsTriggered: Record<string, number>;
  faqsAccessed: Record<string, number>;
  videosWatched: Record<string, number>;
  searchQueries: string[];
  helpRequestsPerSession: number;
}

// Main Help System class
export class HelpSystem extends EventEmitter {
  private content: HelpContent | null = null;
  private activeTooltips: Map<string, HTMLElement> = new Map();
  private shownTooltips: Set<string> = new Set();
  private usageStats: HelpUsageStats = {
    tooltipsShown: {},
    hintsTriggered: {},
    faqsAccessed: {},
    videosWatched: {},
    searchQueries: [],
    helpRequestsPerSession: 0
  };
  private observers: Map<string, MutationObserver> = new Map();
  private hintTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.setupEventListeners();
  }

  // Initialize help system with content
  public async initialize(contentSource: string | HelpContent): Promise<void> {
    try {
      if (typeof contentSource === 'string') {
        // Load from URL or local file
        const response = await fetch(contentSource);
        this.content = await response.json();
      } else {
        this.content = contentSource;
      }

      this.setupTooltips();
      this.setupSmartHints();
      this.emit('initialized', this.content);
    } catch (error) {
      console.error('Failed to initialize help system:', error);
      this.emit('error', error);
    }
  }

  // Tooltip Management
  private setupTooltips(): void {
    if (!this.content?.contextualHelp?.tooltips) return;

    this.content.contextualHelp.tooltips.forEach(tooltip => {
      this.registerTooltip(tooltip);
    });
  }

  private registerTooltip(tooltip: Tooltip): void {
    const targetElement = document.querySelector(tooltip.trigger.target);
    if (!targetElement) return;

    switch (tooltip.trigger.type) {
      case 'hover':
        targetElement.addEventListener('mouseenter', () => this.showTooltip(tooltip));
        targetElement.addEventListener('mouseleave', () => this.hideTooltip(tooltip.id));
        break;
      
      case 'click':
        targetElement.addEventListener('click', () => this.toggleTooltip(tooltip));
        break;
      
      case 'focus':
        targetElement.addEventListener('focus', () => this.showTooltip(tooltip));
        targetElement.addEventListener('blur', () => this.hideTooltip(tooltip.id));
        break;
      
      case 'delay':
        setTimeout(() => this.showTooltip(tooltip), tooltip.trigger.delay || 3000);
        break;
      
      case 'condition':
        if (tooltip.trigger.condition) {
          this.watchCondition(tooltip.trigger.condition, () => this.showTooltip(tooltip));
        }
        break;
    }
  }

  public showTooltip(tooltip: Tooltip): void {
    // Check if should show only once
    if (tooltip.behavior?.showOnce && this.shownTooltips.has(tooltip.id)) {
      return;
    }

    // Check if already shown
    if (this.activeTooltips.has(tooltip.id)) {
      return;
    }

    const tooltipElement = this.createTooltipElement(tooltip);
    document.body.appendChild(tooltipElement);
    this.activeTooltips.set(tooltip.id, tooltipElement);
    this.shownTooltips.add(tooltip.id);

    // Position tooltip
    this.positionTooltip(tooltipElement, tooltip);

    // Track usage
    this.usageStats.tooltipsShown[tooltip.id] = (this.usageStats.tooltipsShown[tooltip.id] || 0) + 1;

    // Auto-hide if specified
    if (tooltip.behavior?.autoHide) {
      setTimeout(() => this.hideTooltip(tooltip.id), tooltip.behavior.autoHide);
    }

    // Accessibility announcement
    if (tooltip.accessibility?.announceOnShow) {
      this.announceToScreenReader(tooltip.content.text || tooltip.content.title || '');
    }

    this.emit('tooltipShown', tooltip.id);
  }

  public hideTooltip(tooltipId: string): void {
    const tooltipElement = this.activeTooltips.get(tooltipId);
    if (tooltipElement) {
      tooltipElement.remove();
      this.activeTooltips.delete(tooltipId);
      this.emit('tooltipHidden', tooltipId);
    }
  }

  public toggleTooltip(tooltip: Tooltip): void {
    if (this.activeTooltips.has(tooltip.id)) {
      this.hideTooltip(tooltip.id);
    } else {
      this.showTooltip(tooltip);
    }
  }

  private createTooltipElement(tooltip: Tooltip): HTMLElement {
    const element = document.createElement('div');
    element.className = `help-tooltip help-tooltip--${tooltip.display.theme}`;
    element.setAttribute('role', tooltip.accessibility?.role || 'tooltip');
    element.setAttribute('id', `tooltip-${tooltip.id}`);
    
    if (tooltip.accessibility?.ariaLabel) {
      element.setAttribute('aria-label', tooltip.accessibility.ariaLabel);
    }

    let content = '';
    
    if (tooltip.content.icon) {
      content += `<span class="tooltip-icon">${tooltip.content.icon}</span>`;
    }
    
    if (tooltip.content.title) {
      content += `<h3 class="tooltip-title">${tooltip.content.title}</h3>`;
    }
    
    if (tooltip.content.html) {
      content += `<div class="tooltip-content">${tooltip.content.html}</div>`;
    } else if (tooltip.content.text) {
      content += `<p class="tooltip-text">${tooltip.content.text}</p>`;
    }
    
    if (tooltip.content.actionButton) {
      content += `
        <button class="tooltip-action" data-action="${tooltip.content.actionButton.action}" data-target="${tooltip.content.actionButton.target}">
          ${tooltip.content.actionButton.label}
        </button>
      `;
    }
    
    if (tooltip.behavior?.dismissible) {
      content += `<button class="tooltip-close" aria-label="Close tooltip">×</button>`;
    }

    element.innerHTML = content;

    // Add event listeners
    const closeButton = element.querySelector('.tooltip-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideTooltip(tooltip.id));
    }

    const actionButton = element.querySelector('.tooltip-action');
    if (actionButton) {
      actionButton.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).getAttribute('data-action');
        const target = (e.target as HTMLElement).getAttribute('data-target');
        this.handleTooltipAction(action!, target!);
      });
    }

    return element;
  }

  private positionTooltip(tooltipElement: HTMLElement, tooltip: Tooltip): void {
    const targetElement = document.querySelector(tooltip.trigger.target);
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    
    let top = 0;
    let left = 0;

    switch (tooltip.display.position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - 10;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      
      case 'bottom':
        top = targetRect.bottom + 10;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - 10;
        break;
      
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + 10;
        break;
      
      case 'auto':
      default:
        // Auto-position based on available space
        const spaceAbove = targetRect.top;
        const spaceBelow = window.innerHeight - targetRect.bottom;
        
        if (spaceBelow > tooltipRect.height + 10) {
          top = targetRect.bottom + 10;
        } else if (spaceAbove > tooltipRect.height + 10) {
          top = targetRect.top - tooltipRect.height - 10;
        } else {
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        }
        
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
    }

    // Ensure tooltip stays within viewport
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));

    tooltipElement.style.position = 'fixed';
    tooltipElement.style.top = `${top}px`;
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.zIndex = '10000';
  }

  // Smart Hints System
  private setupSmartHints(): void {
    if (!this.content?.contextualHelp?.smartHints) return;

    this.content.contextualHelp.smartHints.forEach(hint => {
      this.registerSmartHint(hint);
    });
  }

  private registerSmartHint(hint: SmartHint): void {
    hint.conditions.forEach(condition => {
      switch (condition.type) {
        case 'user_idle':
          this.watchUserIdle(hint, condition.parameters.duration || 30000);
          break;
        
        case 'feature_unused':
          this.watchFeatureUsage(hint, condition.parameters);
          break;
        
        case 'error_occurred':
          this.watchForErrors(hint, condition.parameters);
          break;
        
        case 'time_based':
          this.scheduleTimeBasedHint(hint, condition.parameters);
          break;
        
        case 'progress_based':
          this.watchProgress(hint, condition.parameters);
          break;
      }
    });
  }

  private watchUserIdle(hint: SmartHint, duration: number): void {
    let idleTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => this.triggerSmartHint(hint), duration);
    };

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();
  }

  private watchFeatureUsage(hint: SmartHint, params: any): void {
    const { feature, timeThreshold } = params;
    
    setTimeout(() => {
      // Check if feature has been used
      const featureElement = document.querySelector(`[data-feature="${feature}"]`);
      if (featureElement && !featureElement.hasAttribute('data-used')) {
        this.triggerSmartHint(hint);
      }
    }, timeThreshold);
  }

  private triggerSmartHint(hint: SmartHint): void {
    // Create hint notification
    const hintElement = document.createElement('div');
    hintElement.className = 'smart-hint';
    hintElement.innerHTML = `
      <div class="hint-content">
        <span class="hint-icon">💡</span>
        <p class="hint-text">${hint.content}</p>
        ${hint.action ? `<button class="hint-action" data-action="${hint.action.type}" data-target="${hint.action.target}">Try it</button>` : ''}
        <button class="hint-dismiss" aria-label="Dismiss hint">×</button>
      </div>
    `;

    document.body.appendChild(hintElement);

    // Position hint
    hintElement.style.position = 'fixed';
    hintElement.style.bottom = '20px';
    hintElement.style.right = '20px';
    hintElement.style.zIndex = '10001';

    // Add event listeners
    const dismissButton = hintElement.querySelector('.hint-dismiss');
    dismissButton?.addEventListener('click', () => {
      hintElement.remove();
    });

    const actionButton = hintElement.querySelector('.hint-action');
    actionButton?.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).getAttribute('data-action');
      const target = (e.target as HTMLElement).getAttribute('data-target');
      this.handleHintAction(action!, target!);
      hintElement.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (hintElement.parentNode) {
        hintElement.remove();
      }
    }, 10000);

    // Track usage
    this.usageStats.hintsTriggered[hint.id] = (this.usageStats.hintsTriggered[hint.id] || 0) + 1;
    this.emit('smartHintTriggered', hint.id);
  }

  // FAQ System
  public searchFAQ(query: string): FAQQuestion[] {
    if (!this.content?.faqContent?.questions) return [];

    const normalizedQuery = query.toLowerCase();
    this.usageStats.searchQueries.push(query);

    return this.content.faqContent.questions.filter(question => {
      return (
        question.question.toLowerCase().includes(normalizedQuery) ||
        question.answer.toLowerCase().includes(normalizedQuery) ||
        question.keywords.some(keyword => keyword.toLowerCase().includes(normalizedQuery))
      );
    }).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  public getFAQByCategory(categoryId: string): FAQQuestion[] {
    if (!this.content?.faqContent?.questions) return [];

    return this.content.faqContent.questions
      .filter(q => q.categoryId === categoryId)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  public getFAQCategories(): FAQCategory[] {
    if (!this.content?.faqContent?.categories) return [];

    return this.content.faqContent.categories.sort((a, b) => a.order - b.order);
  }

  public accessFAQ(questionId: string): FAQQuestion | null {
    if (!this.content?.faqContent?.questions) return null;

    const question = this.content.faqContent.questions.find(q => q.questionId === questionId);
    if (question) {
      this.usageStats.faqsAccessed[questionId] = (this.usageStats.faqsAccessed[questionId] || 0) + 1;
      this.emit('faqAccessed', questionId);
    }
    return question || null;
  }

  // Video Tutorial System
  public getVideoTutorials(level?: number): VideoTutorial[] {
    if (!this.content?.videoTutorials?.tutorials) return [];

    let tutorials = this.content.videoTutorials.tutorials;
    
    if (level !== undefined) {
      tutorials = tutorials.filter(t => t.level === level);
    }

    return tutorials.sort((a, b) => a.level - b.level);
  }

  public async playVideo(videoId: string): Promise<void> {
    const video = this.content?.videoTutorials?.tutorials.find(v => v.videoId === videoId);
    if (!video) return;

    // Track usage
    this.usageStats.videosWatched[videoId] = (this.usageStats.videosWatched[videoId] || 0) + 1;

    // Try to play local video first, then online
    let videoUrl = video.sources.local;
    
    if (!videoUrl && navigator.onLine && video.sources.online) {
      videoUrl = video.sources.online;
    }

    if (!videoUrl && video.sources.generated) {
      // Generate video on demand (if online)
      if (navigator.onLine) {
        videoUrl = await this.generateVideo(video.sources.generated);
      } else {
        this.showOfflineVideoMessage(video);
        return;
      }
    }

    if (videoUrl) {
      this.openVideoPlayer(videoUrl, video);
    }

    this.emit('videoPlayed', videoId);
  }

  private async generateVideo(config: any): Promise<string> {
    // Mock video generation - would integrate with actual service
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      return result.videoUrl;
    } catch (error) {
      console.error('Video generation failed:', error);
      throw error;
    }
  }

  private openVideoPlayer(videoUrl: string, video: VideoTutorial): void {
    // Create modal video player
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.innerHTML = `
      <div class="video-modal-content">
        <div class="video-header">
          <h3>${video.title}</h3>
          <button class="video-close" aria-label="Close video">×</button>
        </div>
        <video controls autoplay>
          <source src="${videoUrl}" type="video/mp4">
          ${video.captions?.map(caption => 
            `<track kind="captions" src="${caption.url}" srclang="${caption.language}" label="${caption.language}">`
          ).join('') || ''}
          <p>Your browser doesn't support video playback.</p>
        </video>
        ${video.transcript ? `<details><summary>Transcript</summary><p>${video.transcript}</p></details>` : ''}
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.video-close')?.addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  private showOfflineVideoMessage(video: VideoTutorial): void {
    const message = document.createElement('div');
    message.className = 'offline-video-message';
    message.innerHTML = `
      <div class="message-content">
        <h3>Video Unavailable Offline</h3>
        <p>"${video.title}" requires an internet connection.</p>
        ${video.transcript ? `<details><summary>View Transcript Instead</summary><p>${video.transcript}</p></details>` : ''}
        <button class="message-close">Close</button>
      </div>
    `;

    document.body.appendChild(message);

    message.querySelector('.message-close')?.addEventListener('click', () => {
      message.remove();
    });
  }

  // Troubleshooting System
  public getTroubleshootingIssues(): TroubleshootingIssue[] {
    return this.content?.troubleshooting?.commonIssues || [];
  }

  public findIssueBySymptoms(symptoms: string[]): TroubleshootingIssue[] {
    if (!this.content?.troubleshooting?.commonIssues) return [];

    return this.content.troubleshooting.commonIssues.filter(issue => {
      return symptoms.some(symptom => 
        issue.symptoms.some(issueSymptom => 
          issueSymptom.toLowerCase().includes(symptom.toLowerCase())
        )
      );
    });
  }

  // Action Handlers
  private handleTooltipAction(action: string, target: string): void {
    switch (action) {
      case 'tutorial':
        this.emit('startTutorial', target);
        break;
      case 'help':
        this.emit('showHelp', target);
        break;
      case 'highlight':
        this.highlightElement(target);
        break;
      default:
        this.emit('customAction', action, target);
    }
  }

  private handleHintAction(action: string, target: string): void {
    switch (action) {
      case 'tutorial':
        this.emit('startTutorial', target);
        break;
      case 'highlight':
        this.highlightElement(target);
        break;
      case 'demo':
        this.emit('startDemo', target);
        break;
      default:
        this.emit('customAction', action, target);
    }
  }

  private highlightElement(selector: string): void {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('help-highlight');
      setTimeout(() => {
        element.classList.remove('help-highlight');
      }, 3000);
    }
  }

  // Utility Methods
  private setupEventListeners(): void {
    // Listen for escape key to close tooltips
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.activeTooltips.forEach((_, id) => this.hideTooltip(id));
      }
    });

    // Track help requests
    document.addEventListener('help-request', () => {
      this.usageStats.helpRequestsPerSession++;
    });
  }

  private watchCondition(condition: string, callback: () => void): void {
    // Simple condition watcher - would be more sophisticated in practice
    const checkCondition = () => {
      try {
        if (eval(condition)) {
          callback();
        }
      } catch (error) {
        console.warn('Condition evaluation failed:', condition, error);
      }
    };

    const observer = new MutationObserver(checkCondition);
    observer.observe(document.body, { childList: true, subtree: true });
    this.observers.set(condition, observer);
  }

  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }

  // Public API
  public getUsageStats(): HelpUsageStats {
    return { ...this.usageStats };
  }

  public resetUsageStats(): void {
    this.usageStats = {
      tooltipsShown: {},
      hintsTriggered: {},
      faqsAccessed: {},
      videosWatched: {},
      searchQueries: [],
      helpRequestsPerSession: 0
    };
  }

  public showManualTooltip(tooltipId: string): void {
    const tooltip = this.content?.contextualHelp?.tooltips.find(t => t.id === tooltipId);
    if (tooltip) {
      this.showTooltip(tooltip);
    }
  }

  public hideAllTooltips(): void {
    this.activeTooltips.forEach((_, id) => this.hideTooltip(id));
  }

  public destroy(): void {
    this.hideAllTooltips();
    this.observers.forEach(observer => observer.disconnect());
    this.hintTimers.forEach(timer => clearTimeout(timer));
    this.removeAllListeners();
  }
}

export default HelpSystem;
