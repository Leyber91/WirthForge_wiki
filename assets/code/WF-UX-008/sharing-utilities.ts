/**
 * WF-UX-008 Sharing Utilities
 * Utilities for sharing achievements, content, and data across platforms while maintaining privacy
 */

import { EventEmitter } from 'eventemitter3';
import { PrivacyController } from './privacy-controls';

// Types
interface ShareableAchievement {
  id: string;
  name: string;
  description: string;
  category: string;
  level: number;
  energyReward: number;
  earnedDate: string;
}

interface ShareableContent {
  id: string;
  type: 'question' | 'answer' | 'tutorial' | 'showcase' | 'discussion';
  title: string;
  body: string;
  category: string;
  tags: string[];
}

interface ShareRequest {
  id: string;
  type: 'achievement' | 'content' | 'challenge_result' | 'profile';
  data: any;
  platforms: string[];
  scope: 'anonymous' | 'pseudonymous' | 'identified';
  timestamp: string;
  userId: string;
}

interface ShareResult {
  success: boolean;
  shareId: string;
  platform: string;
  url?: string;
  error?: string;
  anonymized: boolean;
}

interface PlatformConfig {
  name: string;
  enabled: boolean;
  apiEndpoint?: string;
  authToken?: string;
  webhookUrl?: string;
  maxContentLength: number;
  supportedTypes: string[];
  requiresAuth: boolean;
}

// Platform Integrations
abstract class PlatformIntegration {
  protected config: PlatformConfig;
  protected privacyController: PrivacyController;

  constructor(config: PlatformConfig, privacyController: PrivacyController) {
    this.config = config;
    this.privacyController = privacyController;
  }

  abstract share(data: any, scope: string): Promise<ShareResult>;
  abstract revoke(shareId: string): Promise<boolean>;
  abstract validateContent(content: string): boolean;
}

// Discord Integration
class DiscordIntegration extends PlatformIntegration {
  async share(data: any, scope: string): Promise<ShareResult> {
    try {
      if (!this.config.enabled || !this.config.webhookUrl) {
        throw new Error('Discord integration not configured');
      }

      const sanitizedData = this.privacyController.sanitizeData(data);
      const anonymizedData = scope !== 'identified' 
        ? this.privacyController.anonymizeUserData(sanitizedData)
        : sanitizedData;

      const message = this.formatDiscordMessage(anonymizedData, data.type);
      
      if (!this.validateContent(message)) {
        throw new Error('Content validation failed');
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          embeds: this.createDiscordEmbed(anonymizedData, data.type),
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }

      return {
        success: true,
        shareId: `discord_${Date.now()}`,
        platform: 'discord',
        anonymized: scope !== 'identified',
      };
    } catch (error) {
      return {
        success: false,
        shareId: '',
        platform: 'discord',
        error: error instanceof Error ? error.message : 'Unknown error',
        anonymized: false,
      };
    }
  }

  async revoke(shareId: string): Promise<boolean> {
    // Discord doesn't support message deletion via webhooks
    // This would require bot permissions and message ID tracking
    return false;
  }

  validateContent(content: string): boolean {
    return content.length <= this.config.maxContentLength;
  }

  private formatDiscordMessage(data: any, type: string): string {
    switch (type) {
      case 'achievement':
        return `🏆 **Achievement Unlocked!**\n${data.name}\n+${data.energyReward} EU`;
      case 'challenge_result':
        return `⚔️ **Challenge Completed!**\n${data.challengeName}\nResult: ${data.result}`;
      default:
        return `📢 New ${type} shared from WIRTHFORGE`;
    }
  }

  private createDiscordEmbed(data: any, type: string): any[] {
    const embed = {
      title: data.name || data.title,
      description: data.description || data.body?.substring(0, 200),
      color: this.getEmbedColor(type),
      timestamp: new Date().toISOString(),
      footer: {
        text: 'WIRTHFORGE Community',
      },
    };

    if (type === 'achievement') {
      embed.color = 0xffd700; // Gold color for achievements
      return [{
        ...embed,
        fields: [
          {
            name: 'Energy Reward',
            value: `${data.energyReward} EU`,
            inline: true,
          },
          {
            name: 'Level',
            value: data.level.toString(),
            inline: true,
          },
          {
            name: 'Category',
            value: data.category,
            inline: true,
          },
        ],
      }];
    }

    return [embed];
  }

  private getEmbedColor(type: string): number {
    switch (type) {
      case 'achievement': return 0xffd700; // Gold
      case 'challenge_result': return 0xff6b6b; // Red
      case 'content': return 0x4ecdc4; // Teal
      default: return 0x95a5a6; // Gray
    }
  }
}

// Twitch Integration
class TwitchIntegration extends PlatformIntegration {
  async share(data: any, scope: string): Promise<ShareResult> {
    try {
      if (!this.config.enabled || !this.config.authToken) {
        throw new Error('Twitch integration not configured');
      }

      // Twitch integration would typically involve:
      // 1. Updating stream title/game
      // 2. Sending chat messages (if bot is configured)
      // 3. Updating stream overlays
      
      const sanitizedData = this.privacyController.sanitizeData(data);
      const anonymizedData = scope !== 'identified' 
        ? this.privacyController.anonymizeUserData(sanitizedData)
        : sanitizedData;

      // This is a simplified implementation
      // Real implementation would use Twitch API
      
      return {
        success: true,
        shareId: `twitch_${Date.now()}`,
        platform: 'twitch',
        anonymized: scope !== 'identified',
      };
    } catch (error) {
      return {
        success: false,
        shareId: '',
        platform: 'twitch',
        error: error instanceof Error ? error.message : 'Unknown error',
        anonymized: false,
      };
    }
  }

  async revoke(shareId: string): Promise<boolean> {
    // Twitch stream overlays can be updated to remove shared content
    return true;
  }

  validateContent(content: string): boolean {
    return content.length <= this.config.maxContentLength;
  }
}

// Reddit Integration
class RedditIntegration extends PlatformIntegration {
  async share(data: any, scope: string): Promise<ShareResult> {
    try {
      if (!this.config.enabled || !this.config.authToken) {
        throw new Error('Reddit integration not configured');
      }

      const sanitizedData = this.privacyController.sanitizeData(data);
      const anonymizedData = scope !== 'identified' 
        ? this.privacyController.anonymizeUserData(sanitizedData)
        : sanitizedData;

      // Reddit API integration would go here
      // This is a placeholder implementation
      
      return {
        success: true,
        shareId: `reddit_${Date.now()}`,
        platform: 'reddit',
        url: `https://reddit.com/r/wirthforge/posts/${Date.now()}`,
        anonymized: scope !== 'identified',
      };
    } catch (error) {
      return {
        success: false,
        shareId: '',
        platform: 'reddit',
        error: error instanceof Error ? error.message : 'Unknown error',
        anonymized: false,
      };
    }
  }

  async revoke(shareId: string): Promise<boolean> {
    // Reddit API allows post deletion
    return true;
  }

  validateContent(content: string): boolean {
    return content.length <= this.config.maxContentLength;
  }
}

// Twitter Integration
class TwitterIntegration extends PlatformIntegration {
  async share(data: any, scope: string): Promise<ShareResult> {
    try {
      if (!this.config.enabled || !this.config.authToken) {
        throw new Error('Twitter integration not configured');
      }

      const sanitizedData = this.privacyController.sanitizeData(data);
      const anonymizedData = scope !== 'identified' 
        ? this.privacyController.anonymizeUserData(sanitizedData)
        : sanitizedData;

      const tweetText = this.formatTweet(anonymizedData, data.type);
      
      if (!this.validateContent(tweetText)) {
        throw new Error('Tweet too long');
      }

      // Twitter API v2 integration would go here
      // This is a placeholder implementation
      
      return {
        success: true,
        shareId: `twitter_${Date.now()}`,
        platform: 'twitter',
        url: `https://twitter.com/user/status/${Date.now()}`,
        anonymized: scope !== 'identified',
      };
    } catch (error) {
      return {
        success: false,
        shareId: '',
        platform: 'twitter',
        error: error instanceof Error ? error.message : 'Unknown error',
        anonymized: false,
      };
    }
  }

  async revoke(shareId: string): Promise<boolean> {
    // Twitter API allows tweet deletion
    return true;
  }

  validateContent(content: string): boolean {
    return content.length <= 280; // Twitter character limit
  }

  private formatTweet(data: any, type: string): string {
    const hashtags = '#WIRTHFORGE #LocalAI';
    
    switch (type) {
      case 'achievement':
        return `🏆 Achievement Unlocked: ${data.name}! +${data.energyReward} EU earned. ${hashtags}`;
      case 'challenge_result':
        return `⚔️ Challenge completed! ${data.challengeName} - Result: ${data.result} ${hashtags}`;
      default:
        return `📢 Sharing from WIRTHFORGE ${hashtags}`;
    }
  }
}

// Main Sharing Manager
export class SharingManager extends EventEmitter {
  private privacyController: PrivacyController;
  private platforms: Map<string, PlatformIntegration>;
  private shareHistory: Map<string, ShareRequest>;
  private pendingShares: Map<string, ShareRequest>;

  constructor(privacyController: PrivacyController) {
    super();
    this.privacyController = privacyController;
    this.platforms = new Map();
    this.shareHistory = new Map();
    this.pendingShares = new Map();

    this.initializePlatforms();
  }

  private initializePlatforms(): void {
    const settings = this.privacyController.getSettings();
    
    // Initialize platform integrations
    if (settings.externalPlatforms.discord?.enabled) {
      this.platforms.set('discord', new DiscordIntegration(
        {
          name: 'Discord',
          enabled: true,
          webhookUrl: settings.externalPlatforms.discord.webhookUrl,
          maxContentLength: 2000,
          supportedTypes: ['achievement', 'challenge_result', 'content'],
          requiresAuth: false,
        },
        this.privacyController
      ));
    }

    if (settings.externalPlatforms.twitch?.enabled) {
      this.platforms.set('twitch', new TwitchIntegration(
        {
          name: 'Twitch',
          enabled: true,
          authToken: settings.externalPlatforms.twitch.authToken,
          maxContentLength: 500,
          supportedTypes: ['achievement', 'challenge_result'],
          requiresAuth: true,
        },
        this.privacyController
      ));
    }

    if (settings.externalPlatforms.reddit?.enabled) {
      this.platforms.set('reddit', new RedditIntegration(
        {
          name: 'Reddit',
          enabled: true,
          authToken: settings.externalPlatforms.reddit.authToken,
          maxContentLength: 10000,
          supportedTypes: ['achievement', 'content', 'showcase'],
          requiresAuth: true,
        },
        this.privacyController
      ));
    }

    if (settings.externalPlatforms.twitter?.enabled) {
      this.platforms.set('twitter', new TwitterIntegration(
        {
          name: 'Twitter',
          enabled: true,
          authToken: settings.externalPlatforms.twitter.authToken,
          maxContentLength: 280,
          supportedTypes: ['achievement', 'challenge_result'],
          requiresAuth: true,
        },
        this.privacyController
      ));
    }
  }

  // Share Achievement
  public async shareAchievement(
    achievement: ShareableAchievement,
    platforms: string[],
    scope: 'anonymous' | 'pseudonymous' | 'identified' = 'anonymous'
  ): Promise<ShareResult[]> {
    const settings = this.privacyController.getSettings();
    
    // Check if sharing is enabled
    if (!settings.sharingSettings.achievementSharing.enabled) {
      throw new Error('Achievement sharing is disabled');
    }

    // Request consent if required
    if (settings.globalSettings.explicitConsentRequired) {
      const consent = await this.privacyController.requestConsent(
        'achievement',
        'Share achievement with community',
        scope,
        platforms
      );
      
      // In a real implementation, this would wait for user confirmation
      await this.privacyController.grantConsent(consent.consentId);
    }

    const shareRequest: ShareRequest = {
      id: this.generateShareId(),
      type: 'achievement',
      data: achievement,
      platforms,
      scope,
      timestamp: new Date().toISOString(),
      userId: 'local_user',
    };

    this.pendingShares.set(shareRequest.id, shareRequest);

    const results: ShareResult[] = [];

    for (const platformName of platforms) {
      const platform = this.platforms.get(platformName);
      if (!platform) {
        results.push({
          success: false,
          shareId: '',
          platform: platformName,
          error: 'Platform not configured',
          anonymized: false,
        });
        continue;
      }

      try {
        const result = await platform.share(shareRequest.data, scope);
        results.push(result);

        if (result.success) {
          this.emit('shareSuccess', {
            shareRequest,
            result,
          });
        } else {
          this.emit('shareError', {
            shareRequest,
            result,
          });
        }
      } catch (error) {
        const errorResult: ShareResult = {
          success: false,
          shareId: '',
          platform: platformName,
          error: error instanceof Error ? error.message : 'Unknown error',
          anonymized: false,
        };
        results.push(errorResult);
        
        this.emit('shareError', {
          shareRequest,
          result: errorResult,
        });
      }
    }

    // Move from pending to history
    this.pendingShares.delete(shareRequest.id);
    this.shareHistory.set(shareRequest.id, shareRequest);

    return results;
  }

  // Share Content
  public async shareContent(
    content: ShareableContent,
    platforms: string[],
    scope: 'anonymous' | 'pseudonymous' | 'identified' = 'pseudonymous'
  ): Promise<ShareResult[]> {
    const settings = this.privacyController.getSettings();
    
    if (!settings.sharingSettings.contentSharing.enabled) {
      throw new Error('Content sharing is disabled');
    }

    // Content sharing typically requires pseudonymous or identified scope
    if (scope === 'anonymous' && content.type !== 'question') {
      throw new Error('Anonymous content sharing only allowed for questions');
    }

    const shareRequest: ShareRequest = {
      id: this.generateShareId(),
      type: 'content',
      data: content,
      platforms,
      scope,
      timestamp: new Date().toISOString(),
      userId: 'local_user',
    };

    return this.executeShare(shareRequest);
  }

  // Revoke Share
  public async revokeShare(shareId: string): Promise<boolean> {
    const shareRequest = this.shareHistory.get(shareId);
    if (!shareRequest) {
      throw new Error('Share not found');
    }

    const results: boolean[] = [];

    for (const platformName of shareRequest.platforms) {
      const platform = this.platforms.get(platformName);
      if (platform) {
        try {
          const success = await platform.revoke(shareId);
          results.push(success);
        } catch (error) {
          results.push(false);
        }
      }
    }

    const allRevoked = results.every(result => result);
    
    if (allRevoked) {
      this.shareHistory.delete(shareId);
      this.emit('shareRevoked', { shareId, shareRequest });
    }

    return allRevoked;
  }

  // Get Share History
  public getShareHistory(): ShareRequest[] {
    return Array.from(this.shareHistory.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Get Pending Shares
  public getPendingShares(): ShareRequest[] {
    return Array.from(this.pendingShares.values());
  }

  // Validate Share Data
  public validateShareData(data: any, type: string): boolean {
    switch (type) {
      case 'achievement':
        return this.validateAchievement(data);
      case 'content':
        return this.validateContent(data);
      default:
        return false;
    }
  }

  private validateAchievement(achievement: any): boolean {
    return !!(
      achievement.id &&
      achievement.name &&
      achievement.description &&
      typeof achievement.energyReward === 'number' &&
      achievement.earnedDate
    );
  }

  private validateContent(content: any): boolean {
    return !!(
      content.id &&
      content.type &&
      content.title &&
      content.body &&
      content.category
    );
  }

  private async executeShare(shareRequest: ShareRequest): Promise<ShareResult[]> {
    this.pendingShares.set(shareRequest.id, shareRequest);

    const results: ShareResult[] = [];

    for (const platformName of shareRequest.platforms) {
      const platform = this.platforms.get(platformName);
      if (!platform) {
        results.push({
          success: false,
          shareId: '',
          platform: platformName,
          error: 'Platform not configured',
          anonymized: false,
        });
        continue;
      }

      const result = await platform.share(shareRequest.data, shareRequest.scope);
      results.push(result);
    }

    this.pendingShares.delete(shareRequest.id);
    this.shareHistory.set(shareRequest.id, shareRequest);

    return results;
  }

  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update Platform Configuration
  public updatePlatformConfig(platformName: string, config: Partial<PlatformConfig>): void {
    const platform = this.platforms.get(platformName);
    if (platform) {
      // Update platform configuration
      Object.assign((platform as any).config, config);
    }
  }

  // Get Available Platforms
  public getAvailablePlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }

  // Check Platform Status
  public isPlatformEnabled(platformName: string): boolean {
    const platform = this.platforms.get(platformName);
    return platform ? (platform as any).config.enabled : false;
  }
}

export default SharingManager;
