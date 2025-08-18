/**
 * WF-UX-007 Network Watchdog
 * 
 * Module focused on monitoring connectivity between the UI and local backend.
 * Detects heartbeat misses or failures in WebSocket/API calls and initiates
 * reconnection attempts with proper escalation to the Recovery Manager.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

interface ConnectionConfig {
  url: string;
  heartbeatInterval: number;
  connectionTimeout: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  backoffMultiplier: number;
  maxBackoffInterval: number;
}

interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'failed';
  lastHeartbeat: number;
  reconnectAttempts: number;
  lastReconnectAttempt: number;
  connectionStartTime: number;
  totalDowntime: number;
}

interface HealthCheckResult {
  timestamp: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

class NetworkWatchdog extends EventEmitter {
  private config: ConnectionConfig;
  private state: ConnectionState;
  private websocket: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private isShuttingDown: boolean = false;
  private healthHistory: HealthCheckResult[] = [];

  constructor(config?: Partial<ConnectionConfig>) {
    super();
    
    this.config = {
      url: 'ws://localhost:8080/ws',
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 10000, // 10 seconds
      maxReconnectAttempts: 5,
      reconnectInterval: 2000, // 2 seconds
      backoffMultiplier: 2.0,
      maxBackoffInterval: 30000, // 30 seconds
      ...config
    };

    this.state = {
      status: 'disconnected',
      lastHeartbeat: 0,
      reconnectAttempts: 0,
      lastReconnectAttempt: 0,
      connectionStartTime: 0,
      totalDowntime: 0
    };
  }

  /**
   * Initialize the network watchdog
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Start initial connection
      await this.connect();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('Network Watchdog initialized');
    } catch (error) {
      console.error('Failed to initialize Network Watchdog:', error);
      throw error;
    }
  }

  /**
   * Establish WebSocket connection
   */
  private async connect(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.state.status = 'connecting';
    this.state.connectionStartTime = Date.now();
    this.emit('connecting');

    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        this.cleanup();
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      try {
        this.websocket = new WebSocket(this.config.url);

        this.websocket.on('open', () => {
          clearTimeout(connectionTimeout);
          this.handleConnectionOpen();
          resolve();
        });

        this.websocket.on('close', (code, reason) => {
          clearTimeout(connectionTimeout);
          this.handleConnectionClose(code, reason.toString());
        });

        this.websocket.on('error', (error) => {
          clearTimeout(connectionTimeout);
          this.handleConnectionError(error);
          reject(error);
        });

        this.websocket.on('message', (data) => {
          this.handleMessage(data);
        });

        this.websocket.on('ping', () => {
          this.handlePing();
        });

        this.websocket.on('pong', () => {
          this.handlePong();
        });

      } catch (error) {
        clearTimeout(connectionTimeout);
        reject(error);
      }
    });
  }

  /**
   * Handle successful connection
   */
  private handleConnectionOpen(): void {
    this.state.status = 'connected';
    this.state.lastHeartbeat = Date.now();
    this.state.reconnectAttempts = 0;
    
    // Start heartbeat monitoring
    this.startHeartbeat();
    
    this.emit('connected', {
      timestamp: new Date().toISOString(),
      connectionTime: Date.now() - this.state.connectionStartTime
    });
    
    console.log('WebSocket connected successfully');
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(code: number, reason: string): void {
    this.cleanup();
    
    const wasConnected = this.state.status === 'connected';
    this.state.status = 'disconnected';
    
    const event = {
      code,
      reason,
      timestamp: new Date().toISOString(),
      wasExpected: this.isShuttingDown
    };
    
    this.emit('disconnected', event);
    
    if (wasConnected) {
      this.emit('connectionLost', event);
    }
    
    // Attempt reconnection if not shutting down
    if (!this.isShuttingDown) {
      this.scheduleReconnect();
    }
    
    console.log(`WebSocket disconnected: ${code} - ${reason}`);
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.emit('connectionError', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    console.error('WebSocket error:', error);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      // Update heartbeat timestamp for any message
      this.state.lastHeartbeat = Date.now();
      
      // Handle different message types
      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeatMessage(message);
          break;
        
        case 'error':
          this.handleErrorMessage(message);
          break;
        
        default:
          this.emit('message', message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeatMessage(message: any): void {
    // Respond to server heartbeat
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'heartbeat_response',
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Handle error message from server
   */
  private handleErrorMessage(message: any): void {
    this.emit('serverError', {
      error: message.error,
      code: message.code,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle ping frame
   */
  private handlePing(): void {
    this.state.lastHeartbeat = Date.now();
    
    // WebSocket automatically responds with pong
    this.emit('ping', { timestamp: new Date().toISOString() });
  }

  /**
   * Handle pong frame
   */
  private handlePong(): void {
    this.state.lastHeartbeat = Date.now();
    this.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Check heartbeat and send ping if needed
   */
  private checkHeartbeat(): void {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - this.state.lastHeartbeat;
    
    if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2) {
      // Heartbeat timeout - connection may be dead
      this.emit('heartbeatTimeout', {
        lastHeartbeat: this.state.lastHeartbeat,
        timeout: timeSinceLastHeartbeat,
        timestamp: new Date().toISOString()
      });
      
      // Force reconnection
      this.forceReconnect();
    } else if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Send ping to keep connection alive
      this.websocket.ping();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.state.status = 'failed';
      this.emit('reconnectFailed', {
        attempts: this.state.reconnectAttempts,
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.state.status = 'reconnecting';
    this.state.reconnectAttempts++;
    this.state.lastReconnectAttempt = Date.now();
    
    // Calculate backoff delay
    const baseDelay = this.config.reconnectInterval;
    const backoffDelay = Math.min(
      baseDelay * Math.pow(this.config.backoffMultiplier, this.state.reconnectAttempts - 1),
      this.config.maxBackoffInterval
    );
    
    this.emit('reconnectScheduled', {
      attempt: this.state.reconnectAttempts,
      delay: backoffDelay,
      timestamp: new Date().toISOString()
    });
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error(`Reconnection attempt ${this.state.reconnectAttempts} failed:`, error);
        this.scheduleReconnect();
      }
    }, backoffDelay);
  }

  /**
   * Force immediate reconnection
   */
  private forceReconnect(): void {
    this.cleanup();
    this.scheduleReconnect();
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Simple health check - send ping and measure response time
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const pingPromise = new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 5000); // 5 second timeout
          
          this.websocket!.once('pong', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          this.websocket!.ping();
        });
        
        await pingPromise;
        
        const responseTime = Date.now() - startTime;
        const result: HealthCheckResult = {
          timestamp: startTime,
          responseTime,
          success: true
        };
        
        this.addHealthResult(result);
        this.emit('healthCheck', result);
      } else {
        const result: HealthCheckResult = {
          timestamp: startTime,
          responseTime: 0,
          success: false,
          error: 'WebSocket not connected'
        };
        
        this.addHealthResult(result);
        this.emit('healthCheck', result);
      }
    } catch (error) {
      const result: HealthCheckResult = {
        timestamp: startTime,
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      };
      
      this.addHealthResult(result);
      this.emit('healthCheck', result);
    }
  }

  /**
   * Add health check result to history
   */
  private addHealthResult(result: HealthCheckResult): void {
    this.healthHistory.push(result);
    
    // Keep only last 100 results
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): any {
    const now = Date.now();
    const recentHealth = this.healthHistory.slice(-10);
    const successfulChecks = recentHealth.filter(h => h.success).length;
    const avgResponseTime = recentHealth.length > 0 
      ? recentHealth.reduce((sum, h) => sum + h.responseTime, 0) / recentHealth.length 
      : 0;

    return {
      status: this.state.status,
      uptime: this.state.status === 'connected' ? now - this.state.connectionStartTime : 0,
      reconnectAttempts: this.state.reconnectAttempts,
      lastHeartbeat: this.state.lastHeartbeat,
      healthScore: recentHealth.length > 0 ? (successfulChecks / recentHealth.length) * 100 : 0,
      averageResponseTime: avgResponseTime,
      totalDowntime: this.state.totalDowntime
    };
  }

  /**
   * Send message through WebSocket
   */
  public sendMessage(message: any): boolean {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      try {
        this.websocket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Manual reconnection trigger
   */
  public async reconnect(): Promise<void> {
    this.state.reconnectAttempts = 0; // Reset counter for manual reconnect
    this.cleanup();
    await this.connect();
  }

  /**
   * Check if connection is healthy
   */
  public isHealthy(): boolean {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - this.state.lastHeartbeat;
    
    return this.state.status === 'connected' && 
           timeSinceLastHeartbeat < this.config.heartbeatInterval * 2;
  }

  /**
   * Cleanup connections and timers
   */
  private cleanup(): void {
    if (this.websocket) {
      this.websocket.removeAllListeners();
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.close();
      }
      this.websocket = null;
    }
    
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Shutdown the network watchdog
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    // Clear all timers
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    // Close WebSocket connection
    this.cleanup();
    
    this.emit('shutdown');
    console.log('Network Watchdog shutdown complete');
  }
}

export { NetworkWatchdog, ConnectionConfig, ConnectionState, HealthCheckResult };
