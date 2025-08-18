/**
 * WF-UX-005 AI Video Integration
 * Integration with AI video generation services (Sora, Runway, etc.)
 * Supports automated tutorial video creation and local caching
 */

import { EventEmitter } from 'events';

// Types and interfaces
interface VideoGenerationRequest {
  prompt: string;
  service: 'sora' | 'runway' | 'custom';
  parameters: VideoParameters;
  metadata: {
    tutorialId?: string;
    level?: number;
    topic?: string;
    duration?: number;
  };
}

interface VideoParameters {
  resolution: '720p' | '1080p' | '4k';
  duration: number;
  style: 'educational' | 'cinematic' | 'minimal' | 'energetic';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  fps: 24 | 30 | 60;
  quality: 'draft' | 'standard' | 'high' | 'premium';
  voiceover?: boolean;
  captions?: boolean;
  music?: boolean;
}

interface VideoGenerationResult {
  videoId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  captionsUrl?: string;
  transcriptUrl?: string;
  error?: string;
  generatedAt: string;
  completedAt?: string;
}

interface CachedVideo {
  videoId: string;
  localPath: string;
  originalUrl: string;
  metadata: VideoGenerationRequest['metadata'];
  cachedAt: string;
  fileSize: number;
  lastAccessed: string;
}

interface VideoCache {
  videos: Record<string, CachedVideo>;
  totalSize: number;
  maxSize: number;
}

// Service interfaces
interface SoraService {
  generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  getVideoStatus(videoId: string): Promise<VideoGenerationResult>;
  cancelGeneration(videoId: string): Promise<boolean>;
}

interface RunwayService {
  generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  getVideoStatus(videoId: string): Promise<VideoGenerationResult>;
  cancelGeneration(videoId: string): Promise<boolean>;
}

// Main AI Video Integration class
export class AIVideoIntegration extends EventEmitter {
  private services: Map<string, any> = new Map();
  private cache: VideoCache = {
    videos: {},
    totalSize: 0,
    maxSize: 1024 * 1024 * 1024 // 1GB default cache size
  };
  private activeGenerations: Map<string, VideoGenerationResult> = new Map();
  private cacheStorageKey = 'wirthforge_video_cache';

  constructor() {
    super();
    this.initializeServices();
    this.loadCache();
  }

  private initializeServices(): void {
    // Initialize Sora service
    this.services.set('sora', new SoraServiceImpl());
    
    // Initialize Runway service
    this.services.set('runway', new RunwayServiceImpl());
    
    // Initialize custom service
    this.services.set('custom', new CustomServiceImpl());
  }

  // Video Generation Methods
  public async generateTutorialVideo(
    tutorialId: string,
    prompt: string,
    options: Partial<VideoParameters> = {}
  ): Promise<VideoGenerationResult> {
    const request: VideoGenerationRequest = {
      prompt: this.enhancePromptForTutorial(prompt, tutorialId),
      service: 'sora', // Default to Sora for tutorials
      parameters: {
        resolution: '1080p',
        duration: 60,
        style: 'educational',
        aspectRatio: '16:9',
        fps: 30,
        quality: 'standard',
        voiceover: true,
        captions: true,
        music: false,
        ...options
      },
      metadata: {
        tutorialId,
        topic: 'tutorial',
        duration: options.duration || 60
      }
    };

    return this.generateVideo(request);
  }

  public async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cachedVideo = this.cache.videos[cacheKey];
    
    if (cachedVideo && await this.isVideoAccessible(cachedVideo.localPath)) {
      this.updateLastAccessed(cacheKey);
      return {
        videoId: cachedVideo.videoId,
        status: 'completed',
        videoUrl: cachedVideo.localPath,
        duration: request.parameters.duration,
        generatedAt: cachedVideo.cachedAt,
        completedAt: cachedVideo.cachedAt
      };
    }

    // Generate new video
    const service = this.services.get(request.service);
    if (!service) {
      throw new Error(`Service ${request.service} not available`);
    }

    try {
      const result = await service.generateVideo(request);
      this.activeGenerations.set(result.videoId, result);
      
      // Start polling for completion
      this.pollVideoStatus(result.videoId, request.service);
      
      this.emit('videoGenerationStarted', result);
      return result;
    } catch (error) {
      this.emit('videoGenerationError', error);
      throw error;
    }
  }

  private async pollVideoStatus(videoId: string, serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await service.getVideoStatus(videoId);
        this.activeGenerations.set(videoId, status);
        
        this.emit('videoGenerationProgress', status);
        
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          this.activeGenerations.delete(videoId);
          
          // Cache the completed video
          if (status.videoUrl) {
            await this.cacheVideo(videoId, status.videoUrl, status);
          }
          
          this.emit('videoGenerationCompleted', status);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          this.activeGenerations.delete(videoId);
          this.emit('videoGenerationFailed', status);
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        clearInterval(pollInterval);
        this.activeGenerations.delete(videoId);
        this.emit('videoGenerationError', error);
      }
    }, 5000); // Poll every 5 seconds

    // Set timeout to avoid infinite polling
    setTimeout(() => {
      if (this.activeGenerations.has(videoId)) {
        clearInterval(pollInterval);
        this.activeGenerations.delete(videoId);
        this.emit('videoGenerationTimeout', videoId);
      }
    }, 300000); // 5 minute timeout
  }

  // Cache Management
  private async cacheVideo(
    videoId: string,
    videoUrl: string,
    result: VideoGenerationResult
  ): Promise<void> {
    try {
      // Download video to local storage
      const response = await fetch(videoUrl);
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'video/mp4' });
      
      // Create local URL
      const localUrl = URL.createObjectURL(blob);
      
      // Store in IndexedDB for persistence
      const localPath = await this.storeVideoInIndexedDB(videoId, arrayBuffer);
      
      const cachedVideo: CachedVideo = {
        videoId,
        localPath,
        originalUrl: videoUrl,
        metadata: result.metadata || {},
        cachedAt: new Date().toISOString(),
        fileSize: arrayBuffer.byteLength,
        lastAccessed: new Date().toISOString()
      };

      // Add to cache
      const cacheKey = videoId;
      this.cache.videos[cacheKey] = cachedVideo;
      this.cache.totalSize += cachedVideo.fileSize;

      // Check cache size and cleanup if needed
      await this.cleanupCache();
      
      // Save cache metadata
      this.saveCache();
      
      this.emit('videoCached', cachedVideo);
    } catch (error) {
      console.error('Failed to cache video:', error);
      this.emit('videoCacheError', error);
    }
  }

  private async storeVideoInIndexedDB(videoId: string, data: ArrayBuffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WirthForgeVideoCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'videoId' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        
        const videoData = {
          videoId,
          data,
          storedAt: new Date().toISOString()
        };
        
        const storeRequest = store.put(videoData);
        
        storeRequest.onsuccess = () => {
          resolve(`idb://${videoId}`);
        };
        
        storeRequest.onerror = () => reject(storeRequest.error);
      };
    });
  }

  private async isVideoAccessible(localPath: string): Promise<boolean> {
    if (localPath.startsWith('idb://')) {
      // Check IndexedDB
      const videoId = localPath.replace('idb://', '');
      return this.checkIndexedDBVideo(videoId);
    } else if (localPath.startsWith('blob:')) {
      // Check blob URL (may have expired)
      try {
        const response = await fetch(localPath, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    }
    return false;
  }

  private async checkIndexedDBVideo(videoId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open('WirthForgeVideoCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const getRequest = store.get(videoId);
        
        getRequest.onsuccess = () => {
          resolve(!!getRequest.result);
        };
        
        getRequest.onerror = () => resolve(false);
      };
      
      request.onerror = () => resolve(false);
    });
  }

  private async cleanupCache(): Promise<void> {
    if (this.cache.totalSize <= this.cache.maxSize) return;

    // Sort videos by last accessed (LRU)
    const sortedVideos = Object.entries(this.cache.videos)
      .sort(([, a], [, b]) => 
        new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
      );

    // Remove oldest videos until under size limit
    for (const [cacheKey, video] of sortedVideos) {
      if (this.cache.totalSize <= this.cache.maxSize * 0.8) break; // Leave 20% buffer

      await this.removeVideoFromCache(cacheKey);
    }
  }

  private async removeVideoFromCache(cacheKey: string): Promise<void> {
    const video = this.cache.videos[cacheKey];
    if (!video) return;

    // Remove from IndexedDB
    if (video.localPath.startsWith('idb://')) {
      const videoId = video.localPath.replace('idb://', '');
      await this.removeFromIndexedDB(videoId);
    }

    // Update cache
    this.cache.totalSize -= video.fileSize;
    delete this.cache.videos[cacheKey];
    
    this.emit('videoRemovedFromCache', cacheKey);
  }

  private async removeFromIndexedDB(videoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WirthForgeVideoCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        const deleteRequest = store.delete(videoId);
        
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Prompt Enhancement
  private enhancePromptForTutorial(prompt: string, tutorialId: string): string {
    const basePrompt = `Create a clear, educational tutorial video for WIRTHFORGE. `;
    const styleGuide = `Use a clean, modern interface with energy-themed visuals. `;
    const accessibility = `Include clear narration, on-screen text, and smooth transitions. `;
    const branding = `Maintain WIRTHFORGE's energy metaphor throughout. `;
    
    return `${basePrompt}${styleGuide}${accessibility}${branding}${prompt}`;
  }

  // Utility Methods
  private generateCacheKey(request: VideoGenerationRequest): string {
    const key = `${request.service}_${request.prompt}_${JSON.stringify(request.parameters)}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  private updateLastAccessed(cacheKey: string): void {
    if (this.cache.videos[cacheKey]) {
      this.cache.videos[cacheKey].lastAccessed = new Date().toISOString();
      this.saveCache();
    }
  }

  private loadCache(): void {
    try {
      const savedCache = localStorage.getItem(this.cacheStorageKey);
      if (savedCache) {
        this.cache = { ...this.cache, ...JSON.parse(savedCache) };
      }
    } catch (error) {
      console.error('Failed to load video cache:', error);
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem(this.cacheStorageKey, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save video cache:', error);
    }
  }

  // Public API
  public getActiveGenerations(): VideoGenerationResult[] {
    return Array.from(this.activeGenerations.values());
  }

  public getCacheInfo(): { totalSize: number; videoCount: number; maxSize: number } {
    return {
      totalSize: this.cache.totalSize,
      videoCount: Object.keys(this.cache.videos).length,
      maxSize: this.cache.maxSize
    };
  }

  public async clearCache(): Promise<void> {
    // Clear IndexedDB
    const request = indexedDB.deleteDatabase('WirthForgeVideoCache');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        this.cache = {
          videos: {},
          totalSize: 0,
          maxSize: this.cache.maxSize
        };
        this.saveCache();
        this.emit('cacheCleared');
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  public setCacheSize(sizeInBytes: number): void {
    this.cache.maxSize = sizeInBytes;
    this.cleanupCache();
    this.saveCache();
  }

  public async cancelGeneration(videoId: string): Promise<boolean> {
    const generation = this.activeGenerations.get(videoId);
    if (!generation) return false;

    const service = this.services.get(generation.service || 'sora');
    if (service && service.cancelGeneration) {
      const cancelled = await service.cancelGeneration(videoId);
      if (cancelled) {
        this.activeGenerations.delete(videoId);
        this.emit('videoGenerationCancelled', videoId);
      }
      return cancelled;
    }

    return false;
  }

  public destroy(): void {
    this.activeGenerations.clear();
    this.removeAllListeners();
  }
}

// Service Implementations
class SoraServiceImpl implements SoraService {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.openai.com/v1/video';

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: request.prompt,
        duration: request.parameters.duration,
        resolution: request.parameters.resolution,
        style: request.parameters.style
      })
    });

    if (!response.ok) {
      throw new Error(`Sora API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      videoId: result.id,
      status: 'processing',
      generatedAt: new Date().toISOString(),
      metadata: request.metadata
    };
  }

  async getVideoStatus(videoId: string): Promise<VideoGenerationResult> {
    const response = await fetch(`${this.baseUrl}/status/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Sora API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      videoId,
      status: result.status,
      videoUrl: result.video_url,
      thumbnailUrl: result.thumbnail_url,
      duration: result.duration,
      fileSize: result.file_size,
      error: result.error,
      generatedAt: result.created_at,
      completedAt: result.completed_at
    };
  }

  async cancelGeneration(videoId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/cancel/${videoId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return response.ok;
  }
}

class RunwayServiceImpl implements RunwayService {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.runwayml.com/v1';

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    // Similar implementation to Sora but for Runway API
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: request.prompt,
        duration: request.parameters.duration,
        resolution: request.parameters.resolution
      })
    });

    const result = await response.json();
    
    return {
      videoId: result.id,
      status: 'processing',
      generatedAt: new Date().toISOString(),
      metadata: request.metadata
    };
  }

  async getVideoStatus(videoId: string): Promise<VideoGenerationResult> {
    const response = await fetch(`${this.baseUrl}/status/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const result = await response.json();
    
    return {
      videoId,
      status: result.status,
      videoUrl: result.video_url,
      duration: result.duration,
      generatedAt: result.created_at,
      completedAt: result.completed_at
    };
  }

  async cancelGeneration(videoId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/cancel/${videoId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return response.ok;
  }
}

class CustomServiceImpl {
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    // Mock implementation for custom/local video generation
    const videoId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate processing time
    setTimeout(() => {
      // Would trigger completion event in real implementation
    }, 10000);

    return {
      videoId,
      status: 'processing',
      generatedAt: new Date().toISOString(),
      metadata: request.metadata
    };
  }

  async getVideoStatus(videoId: string): Promise<VideoGenerationResult> {
    // Mock status check
    return {
      videoId,
      status: 'completed',
      videoUrl: `/mock/videos/${videoId}.mp4`,
      duration: 60,
      generatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
  }

  async cancelGeneration(videoId: string): Promise<boolean> {
    return true;
  }
}

export default AIVideoIntegration;
