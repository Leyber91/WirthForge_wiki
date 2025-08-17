/**
 * WF-TECH-008: WIRTHFORGE Plugin SDK for TypeScript/JavaScript
 * 
 * Provides comprehensive SDK for developing WIRTHFORGE plugins with:
 * - Type-safe API bindings
 * - Permission management
 * - Energy usage tracking
 * - Event system integration
 * - UI component helpers
 * - Storage abstractions
 * - Development utilities
 */

// Core Types and Interfaces
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  main: string;
  permissions: Permission[];
  capabilities: Capability[];
  dependencies: Dependency[];
  resources: ResourceLimits;
  ui?: UIConfiguration;
  metadata: Record<string, any>;
}

export interface Permission {
  domain: 'consciousness' | 'energy' | 'ui' | 'storage' | 'events' | 'network';
  actions: string[];
  resources?: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'time_limit' | 'energy_budget' | 'rate_limit' | 'user_consent';
  value: any;
}

export interface Capability {
  name: string;
  version: string;
  required: boolean;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'plugin' | 'library' | 'service';
}

export interface ResourceLimits {
  memory_mb: number;
  cpu_percent: number;
  disk_mb: number;
  execution_time_ms: number;
  energy_budget: number;
}

export interface UIConfiguration {
  components: UIComponent[];
  themes: string[];
  accessibility: AccessibilityConfig;
}

export interface UIComponent {
  name: string;
  type: 'panel' | 'dialog' | 'widget' | 'overlay';
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  size?: { width: number; height: number };
}

export interface AccessibilityConfig {
  wcag_level: 'A' | 'AA' | 'AAA';
  keyboard_navigation: boolean;
  screen_reader: boolean;
  high_contrast: boolean;
}

// Plugin Context and Runtime
export interface PluginContext {
  manifest: PluginManifest;
  permissions: PermissionManager;
  energy: EnergyTracker;
  storage: StorageManager;
  ui: UIManager;
  events: EventManager;
  logger: Logger;
  sandbox: SandboxInfo;
}

export interface SandboxInfo {
  process_id: number;
  memory_usage: number;
  cpu_usage: number;
  energy_consumed: number;
  uptime_ms: number;
  violations: SecurityViolation[];
}

export interface SecurityViolation {
  type: string;
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Permission Management
export class PermissionManager {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async requestPermission(domain: string, action: string, resource?: string): Promise<boolean> {
    return await this.callAPI('permissions.request', {
      domain,
      action,
      resource
    });
  }

  async checkPermission(domain: string, action: string, resource?: string): Promise<boolean> {
    return await this.callAPI('permissions.check', {
      domain,
      action,
      resource
    });
  }

  async revokePermission(domain: string, action: string): Promise<void> {
    await this.callAPI('permissions.revoke', {
      domain,
      action
    });
  }

  private async callAPI(method: string, params: any): Promise<any> {
    // Implementation handled by plugin bridge
    return (window as any).WIRTHFORGE_PLUGIN_API.call(method, params);
  }
}

// Energy Usage Tracking
export class EnergyTracker {
  private context: PluginContext;
  private startEnergy: number = 0;

  constructor(context: PluginContext) {
    this.context = context;
  }

  startTracking(): void {
    this.startEnergy = this.getCurrentEnergy();
  }

  getEnergyUsed(): number {
    return this.getCurrentEnergy() - this.startEnergy;
  }

  getCurrentEnergy(): number {
    return (window as any).WIRTHFORGE_PLUGIN_API.call('energy.get_current', {});
  }

  async trackOperation<T>(operation: () => Promise<T>, description: string): Promise<T> {
    const startEnergy = this.getCurrentEnergy();
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const endTime = Date.now();
      const endEnergy = this.getCurrentEnergy();
      
      await this.logEnergyUsage({
        description,
        energy_used: endEnergy - startEnergy,
        duration_ms: endTime - startTime,
        success: true
      });
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      const endEnergy = this.getCurrentEnergy();
      
      await this.logEnergyUsage({
        description,
        energy_used: endEnergy - startEnergy,
        duration_ms: endTime - startTime,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  private async logEnergyUsage(usage: any): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('energy.log_usage', usage);
  }
}

// Storage Management
export class StorageManager {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async get(key: string): Promise<any> {
    return await (window as any).WIRTHFORGE_PLUGIN_API.call('storage.get', { key });
  }

  async set(key: string, value: any): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('storage.set', { key, value });
  }

  async delete(key: string): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('storage.delete', { key });
  }

  async list(prefix?: string): Promise<string[]> {
    return await (window as any).WIRTHFORGE_PLUGIN_API.call('storage.list', { prefix });
  }

  async clear(): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('storage.clear', {});
  }

  // Typed storage helpers
  async getTyped<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value as T;
  }

  async setTyped<T>(key: string, value: T): Promise<void> {
    await this.set(key, value);
  }
}

// UI Management
export class UIManager {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async createPanel(config: UIPanelConfig): Promise<UIPanel> {
    const panelId = await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.create_panel', config);
    return new UIPanel(panelId, this);
  }

  async createDialog(config: UIDialogConfig): Promise<UIDialog> {
    const dialogId = await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.create_dialog', config);
    return new UIDialog(dialogId, this);
  }

  async showNotification(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.show_notification', { message, type });
  }

  async updateTheme(theme: string): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.update_theme', { theme });
  }
}

export interface UIPanelConfig {
  title: string;
  position: 'left' | 'right' | 'top' | 'bottom';
  size: { width: number; height: number };
  resizable: boolean;
  closable: boolean;
  content: string | HTMLElement;
}

export interface UIDialogConfig {
  title: string;
  content: string | HTMLElement;
  buttons: UIButton[];
  modal: boolean;
  size: { width: number; height: number };
}

export interface UIButton {
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'danger';
}

export class UIPanel {
  constructor(private id: string, private manager: UIManager) {}

  async update(content: string | HTMLElement): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.update_panel', { id: this.id, content });
  }

  async show(): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.show_panel', { id: this.id });
  }

  async hide(): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.hide_panel', { id: this.id });
  }

  async close(): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.close_panel', { id: this.id });
  }
}

export class UIDialog {
  constructor(private id: string, private manager: UIManager) {}

  async show(): Promise<string> {
    return await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.show_dialog', { id: this.id });
  }

  async close(): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('ui.close_dialog', { id: this.id });
  }
}

// Event Management
export class EventManager {
  private context: PluginContext;
  private listeners: Map<string, Function[]> = new Map();

  constructor(context: PluginContext) {
    this.context = context;
  }

  async publish(event: string, data: any): Promise<void> {
    await (window as any).WIRTHFORGE_PLUGIN_API.call('events.publish', { event, data });
  }

  async subscribe(event: string, callback: (data: any) => void): Promise<void> {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
      await (window as any).WIRTHFORGE_PLUGIN_API.call('events.subscribe', { event });
    }
    this.listeners.get(event)!.push(callback);
  }

  async unsubscribe(event: string, callback?: (data: any) => void): Promise<void> {
    if (callback) {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
      await (window as any).WIRTHFORGE_PLUGIN_API.call('events.unsubscribe', { event });
    }
  }

  // Internal method called by plugin bridge
  _handleEvent(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }
}

// Logging
export class Logger {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  private log(level: string, message: string, data?: any): void {
    (window as any).WIRTHFORGE_PLUGIN_API.call('logger.log', {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      plugin: this.context.manifest.name
    });
  }
}

// Main Plugin Base Class
export abstract class WirthForgePlugin {
  protected context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  // Lifecycle methods to be implemented by plugins
  abstract async initialize(): Promise<void>;
  abstract async activate(): Promise<void>;
  abstract async deactivate(): Promise<void>;
  abstract async cleanup(): Promise<void>;

  // Optional lifecycle methods
  async onConfigChange(config: any): Promise<void> {
    // Override if needed
  }

  async onPermissionChange(permission: Permission): Promise<void> {
    // Override if needed
  }

  async onEnergyLimitReached(): Promise<void> {
    // Override if needed
  }

  // Utility methods
  protected async requestPermissions(permissions: Permission[]): Promise<boolean> {
    for (const permission of permissions) {
      for (const action of permission.actions) {
        const granted = await this.context.permissions.requestPermission(
          permission.domain,
          action,
          permission.resources?.[0]
        );
        if (!granted) {
          return false;
        }
      }
    }
    return true;
  }

  protected async trackEnergyUsage<T>(operation: () => Promise<T>, description: string): Promise<T> {
    return await this.context.energy.trackOperation(operation, description);
  }

  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    this.context.logger[level](message, data);
  }
}

// Plugin Registration and Initialization
export function createPlugin(pluginClass: new (context: PluginContext) => WirthForgePlugin): void {
  if (typeof window !== 'undefined' && (window as any).WIRTHFORGE_PLUGIN_API) {
    const api = (window as any).WIRTHFORGE_PLUGIN_API;
    
    // Get plugin context from the bridge
    const context: PluginContext = {
      manifest: api.getManifest(),
      permissions: new PermissionManager({} as PluginContext),
      energy: new EnergyTracker({} as PluginContext),
      storage: new StorageManager({} as PluginContext),
      ui: new UIManager({} as PluginContext),
      events: new EventManager({} as PluginContext),
      logger: new Logger({} as PluginContext),
      sandbox: api.getSandboxInfo()
    };

    // Set context references
    context.permissions = new PermissionManager(context);
    context.energy = new EnergyTracker(context);
    context.storage = new StorageManager(context);
    context.ui = new UIManager(context);
    context.events = new EventManager(context);
    context.logger = new Logger(context);

    // Create and register plugin instance
    const plugin = new pluginClass(context);
    
    // Register lifecycle callbacks with the bridge
    api.registerPlugin({
      initialize: () => plugin.initialize(),
      activate: () => plugin.activate(),
      deactivate: () => plugin.deactivate(),
      cleanup: () => plugin.cleanup(),
      onConfigChange: (config: any) => plugin.onConfigChange(config),
      onPermissionChange: (permission: Permission) => plugin.onPermissionChange(permission),
      onEnergyLimitReached: () => plugin.onEnergyLimitReached(),
      onEvent: (event: string, data: any) => context.events._handleEvent(event, data)
    });
  } else {
    throw new Error('WIRTHFORGE Plugin API not available. Plugin must run in WIRTHFORGE sandbox.');
  }
}

// Development Utilities
export class PluginDevelopmentUtils {
  static validateManifest(manifest: PluginManifest): string[] {
    const errors: string[] = [];
    
    if (!manifest.name || manifest.name.length < 3) {
      errors.push('Plugin name must be at least 3 characters long');
    }
    
    if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('Plugin version must follow semantic versioning (x.y.z)');
    }
    
    if (!manifest.description || manifest.description.length < 10) {
      errors.push('Plugin description must be at least 10 characters long');
    }
    
    if (!manifest.author) {
      errors.push('Plugin author is required');
    }
    
    if (!manifest.license) {
      errors.push('Plugin license is required');
    }
    
    if (!manifest.main) {
      errors.push('Plugin main entry point is required');
    }
    
    if (!manifest.permissions || manifest.permissions.length === 0) {
      errors.push('Plugin must declare at least one permission');
    }
    
    if (!manifest.resources) {
      errors.push('Plugin resource limits are required');
    } else {
      if (manifest.resources.memory_mb <= 0) {
        errors.push('Memory limit must be positive');
      }
      if (manifest.resources.cpu_percent <= 0 || manifest.resources.cpu_percent > 100) {
        errors.push('CPU limit must be between 1 and 100 percent');
      }
      if (manifest.resources.execution_time_ms <= 0) {
        errors.push('Execution time limit must be positive');
      }
      if (manifest.resources.energy_budget <= 0) {
        errors.push('Energy budget must be positive');
      }
    }
    
    return errors;
  }

  static generateManifestTemplate(name: string): PluginManifest {
    return {
      name: name,
      version: '1.0.0',
      description: `${name} plugin for WIRTHFORGE`,
      author: 'Your Name',
      license: 'MIT',
      main: 'index.js',
      permissions: [
        {
          domain: 'ui',
          actions: ['create_panel', 'show_notification']
        }
      ],
      capabilities: [],
      dependencies: [],
      resources: {
        memory_mb: 64,
        cpu_percent: 10,
        disk_mb: 10,
        execution_time_ms: 30000,
        energy_budget: 1000
      },
      ui: {
        components: [
          {
            name: 'main_panel',
            type: 'panel',
            position: 'right',
            size: { width: 300, height: 400 }
          }
        ],
        themes: ['default'],
        accessibility: {
          wcag_level: 'AA',
          keyboard_navigation: true,
          screen_reader: true,
          high_contrast: true
        }
      },
      metadata: {}
    };
  }
}

// Export all public APIs
export {
  WirthForgePlugin,
  PluginContext,
  PermissionManager,
  EnergyTracker,
  StorageManager,
  UIManager,
  EventManager,
  Logger,
  createPlugin,
  PluginDevelopmentUtils
};
