/**
 * WIRTHFORGE WebSocket Server
 * 
 * Real-time streaming server for dashboard metrics, alerts, and control messages.
 * Supports 60Hz updates with frame budget enforcement and backpressure handling.
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class WirthForgeWSServer extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            port: options.port || 8080,
            host: options.host || '127.0.0.1',
            maxConnections: options.maxConnections || 100,
            frameBudgetMs: options.frameBudgetMs || 16.67, // 60Hz
            maxMessageSize: options.maxMessageSize || 1024 * 1024, // 1MB
            heartbeatIntervalMs: options.heartbeatIntervalMs || 30000,
            compressionThreshold: options.compressionThreshold || 1024,
            ...options
        };
        
        this.server = null;
        this.clients = new Map(); // Client ID -> Client info
        this.channels = new Map(); // Channel name -> Set of client IDs
        this.messageQueue = [];
        this.isRunning = false;
        this.frameStartTime = 0;
        this.statistics = {
            connectionsTotal: 0,
            connectionsActive: 0,
            messagesProcessed: 0,
            bytesTransferred: 0,
            frameOverruns: 0,
            avgFrameTime: 0
        };
        
        // Initialize components
        this.messageProcessor = new MessageProcessor(this.config);
        this.clientManager = new ClientManager(this.config);
        this.channelManager = new ChannelManager();
        this.rateLimiter = new RateLimiter(this.config);
        
        // Bind methods
        this.processFrame = this.processFrame.bind(this);
        this.handleConnection = this.handleConnection.bind(this);
    }
    
    /**
     * Start the WebSocket server
     */
    async start() {
        if (this.isRunning) {
            throw new Error('WebSocket server is already running');
        }
        
        try {
            // Create WebSocket server
            this.server = new WebSocket.Server({
                host: this.config.host,
                port: this.config.port,
                maxPayload: this.config.maxMessageSize,
                perMessageDeflate: {
                    threshold: this.config.compressionThreshold,
                    concurrencyLimit: 10,
                    memLevel: 7
                }
            });
            
            // Set up event handlers
            this.server.on('connection', this.handleConnection);
            this.server.on('error', (error) => this.emit('error', error));
            
            // Start frame processing loop
            this.isRunning = true;
            this.startFrameLoop();
            
            // Start heartbeat
            this.startHeartbeat();
            
            this.emit('started', { 
                host: this.config.host, 
                port: this.config.port 
            });
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Stop the WebSocket server
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        
        // Close all client connections
        for (const [clientId, client] of this.clients) {
            try {
                client.ws.close(1001, 'Server shutting down');
            } catch (error) {
                console.warn(`Error closing client ${clientId}:`, error);
            }
        }
        
        // Close server
        if (this.server) {
            await new Promise((resolve) => {
                this.server.close(() => resolve());
            });
        }
        
        // Clear data structures
        this.clients.clear();
        this.channels.clear();
        this.messageQueue = [];
        
        this.emit('stopped');
    }
    
    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, request) {
        const clientId = this.generateClientId();
        const clientInfo = this.clientManager.createClient(clientId, ws, request);
        
        // Check connection limits
        if (this.clients.size >= this.config.maxConnections) {
            ws.close(1013, 'Server at capacity');
            return;
        }
        
        // Store client
        this.clients.set(clientId, clientInfo);
        this.statistics.connectionsTotal++;
        this.statistics.connectionsActive++;
        
        // Set up client event handlers
        ws.on('message', (data) => this.handleMessage(clientId, data));
        ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
        ws.on('error', (error) => this.handleClientError(clientId, error));
        ws.on('pong', () => this.handlePong(clientId));
        
        // Send welcome message
        this.sendToClient(clientId, {
            type: 'welcome',
            clientId,
            serverInfo: {
                version: '1.0.0',
                capabilities: ['metrics', 'alerts', 'controls', 'channels'],
                frameBudget: this.config.frameBudgetMs
            }
        });
        
        this.emit('clientConnected', { clientId, clientInfo });
    }
    
    /**
     * Handle client disconnection
     */
    handleDisconnection(clientId, code, reason) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // Remove from all channels
        for (const [channelName, clientIds] of this.channels) {
            if (clientIds.has(clientId)) {
                clientIds.delete(clientId);
                if (clientIds.size === 0) {
                    this.channels.delete(channelName);
                }
            }
        }
        
        // Remove client
        this.clients.delete(clientId);
        this.statistics.connectionsActive--;
        
        this.emit('clientDisconnected', { 
            clientId, 
            code, 
            reason: reason?.toString(),
            client 
        });
    }
    
    /**
     * Handle client error
     */
    handleClientError(clientId, error) {
        this.emit('clientError', { clientId, error });
        
        // Close problematic connection
        const client = this.clients.get(clientId);
        if (client) {
            try {
                client.ws.close(1011, 'Client error');
            } catch (closeError) {
                console.warn(`Error closing client ${clientId}:`, closeError);
            }
        }
    }
    
    /**
     * Handle incoming message from client
     */
    async handleMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        try {
            // Check rate limiting
            if (!this.rateLimiter.allowMessage(clientId)) {
                this.sendToClient(clientId, {
                    type: 'error',
                    code: 'RATE_LIMITED',
                    message: 'Too many messages'
                });
                return;
            }
            
            // Parse message
            const message = JSON.parse(data.toString());
            
            // Validate message structure
            if (!message.type) {
                throw new Error('Message must have a type');
            }
            
            // Update client activity
            client.lastActivity = Date.now();
            client.messagesReceived++;
            
            // Process message
            await this.processClientMessage(clientId, message);
            
        } catch (error) {
            this.sendToClient(clientId, {
                type: 'error',
                code: 'INVALID_MESSAGE',
                message: error.message
            });
        }
    }
    
    /**
     * Process client message by type
     */
    async processClientMessage(clientId, message) {
        switch (message.type) {
            case 'subscribe':
                await this.handleSubscribe(clientId, message);
                break;
                
            case 'unsubscribe':
                await this.handleUnsubscribe(clientId, message);
                break;
                
            case 'control':
                await this.handleControl(clientId, message);
                break;
                
            case 'ping':
                this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
                break;
                
            case 'get_channels':
                this.sendToClient(clientId, {
                    type: 'channels',
                    channels: Array.from(this.channels.keys())
                });
                break;
                
            case 'get_stats':
                this.sendToClient(clientId, {
                    type: 'stats',
                    statistics: this.getStatistics()
                });
                break;
                
            default:
                this.sendToClient(clientId, {
                    type: 'error',
                    code: 'UNKNOWN_MESSAGE_TYPE',
                    message: `Unknown message type: ${message.type}`
                });
        }
    }
    
    /**
     * Handle channel subscription
     */
    async handleSubscribe(clientId, message) {
        const { channel, filters } = message;
        
        if (!channel) {
            this.sendToClient(clientId, {
                type: 'error',
                code: 'MISSING_CHANNEL',
                message: 'Channel name is required'
            });
            return;
        }
        
        // Add client to channel
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
        }
        
        this.channels.get(channel).add(clientId);
        
        // Update client info
        const client = this.clients.get(clientId);
        if (client) {
            if (!client.subscriptions) {
                client.subscriptions = new Map();
            }
            client.subscriptions.set(channel, { filters, subscribedAt: Date.now() });
        }
        
        this.sendToClient(clientId, {
            type: 'subscribed',
            channel,
            filters
        });
        
        this.emit('clientSubscribed', { clientId, channel, filters });
    }
    
    /**
     * Handle channel unsubscription
     */
    async handleUnsubscribe(clientId, message) {
        const { channel } = message;
        
        if (!channel) {
            this.sendToClient(clientId, {
                type: 'error',
                code: 'MISSING_CHANNEL',
                message: 'Channel name is required'
            });
            return;
        }
        
        // Remove client from channel
        const channelClients = this.channels.get(channel);
        if (channelClients) {
            channelClients.delete(clientId);
            if (channelClients.size === 0) {
                this.channels.delete(channel);
            }
        }
        
        // Update client info
        const client = this.clients.get(clientId);
        if (client && client.subscriptions) {
            client.subscriptions.delete(channel);
        }
        
        this.sendToClient(clientId, {
            type: 'unsubscribed',
            channel
        });
        
        this.emit('clientUnsubscribed', { clientId, channel });
    }
    
    /**
     * Handle control message
     */
    async handleControl(clientId, message) {
        const { action, target, parameters } = message;
        
        // Validate control message
        if (!action || !target) {
            this.sendToClient(clientId, {
                type: 'error',
                code: 'INVALID_CONTROL',
                message: 'Control message must have action and target'
            });
            return;
        }
        
        // Emit control event for external handling
        this.emit('controlMessage', {
            clientId,
            action,
            target,
            parameters,
            timestamp: Date.now()
        });
        
        // Send acknowledgment
        this.sendToClient(clientId, {
            type: 'control_ack',
            action,
            target,
            status: 'received'
        });
    }
    
    /**
     * Handle pong response
     */
    handlePong(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastPong = Date.now();
            client.isAlive = true;
        }
    }
    
    /**
     * Send message to specific client
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        try {
            const data = JSON.stringify(message);
            client.ws.send(data);
            
            // Update statistics
            client.messagesSent++;
            this.statistics.bytesTransferred += data.length;
            
            return true;
        } catch (error) {
            this.emit('sendError', { clientId, error });
            return false;
        }
    }
    
    /**
     * Broadcast message to channel
     */
    broadcastToChannel(channel, message, filters = null) {
        const clientIds = this.channels.get(channel);
        if (!clientIds) return 0;
        
        let sentCount = 0;
        
        for (const clientId of clientIds) {
            const client = this.clients.get(clientId);
            if (!client) continue;
            
            // Apply filters if specified
            if (filters && client.subscriptions) {
                const subscription = client.subscriptions.get(channel);
                if (subscription && !this.messageMatchesFilters(message, subscription.filters)) {
                    continue;
                }
            }
            
            if (this.sendToClient(clientId, message)) {
                sentCount++;
            }
        }
        
        return sentCount;
    }
    
    /**
     * Broadcast message to all clients
     */
    broadcast(message) {
        let sentCount = 0;
        
        for (const clientId of this.clients.keys()) {
            if (this.sendToClient(clientId, message)) {
                sentCount++;
            }
        }
        
        return sentCount;
    }
    
    /**
     * Queue message for next frame
     */
    queueMessage(channel, message, priority = 'normal') {
        this.messageQueue.push({
            channel,
            message,
            priority,
            timestamp: Date.now()
        });
        
        // Sort by priority (high -> normal -> low)
        this.messageQueue.sort((a, b) => {
            const priorities = { high: 3, normal: 2, low: 1 };
            return priorities[b.priority] - priorities[a.priority];
        });
    }
    
    /**
     * Start frame processing loop
     */
    startFrameLoop() {
        const frameInterval = this.config.frameBudgetMs;
        
        const processNextFrame = () => {
            if (!this.isRunning) return;
            
            this.frameStartTime = performance.now();
            this.processFrame();
            
            const frameTime = performance.now() - this.frameStartTime;
            const remainingTime = Math.max(0, frameInterval - frameTime);
            
            // Update statistics
            this.updateFrameStatistics(frameTime);
            
            // Schedule next frame
            setTimeout(processNextFrame, remainingTime);
        };
        
        processNextFrame();
    }
    
    /**
     * Process queued messages within frame budget
     */
    processFrame() {
        const maxFrameTime = this.config.frameBudgetMs;
        let processedCount = 0;
        
        while (this.messageQueue.length > 0) {
            const frameTime = performance.now() - this.frameStartTime;
            
            // Check frame budget
            if (frameTime >= maxFrameTime * 0.8) { // Leave 20% buffer
                break;
            }
            
            const queuedMessage = this.messageQueue.shift();
            
            try {
                const sentCount = this.broadcastToChannel(
                    queuedMessage.channel,
                    queuedMessage.message
                );
                
                processedCount++;
                this.statistics.messagesProcessed++;
                
                this.emit('messageSent', {
                    channel: queuedMessage.channel,
                    sentCount,
                    queueTime: Date.now() - queuedMessage.timestamp
                });
                
            } catch (error) {
                this.emit('messageError', { 
                    queuedMessage, 
                    error 
                });
            }
        }
        
        // Check for frame overrun
        const totalFrameTime = performance.now() - this.frameStartTime;
        if (totalFrameTime > maxFrameTime) {
            this.statistics.frameOverruns++;
            this.emit('frameOverrun', { 
                frameTime: totalFrameTime, 
                budget: maxFrameTime,
                queueLength: this.messageQueue.length
            });
        }
    }
    
    /**
     * Start heartbeat to detect dead connections
     */
    startHeartbeat() {
        const heartbeatInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(heartbeatInterval);
                return;
            }
            
            const now = Date.now();
            const timeout = this.config.heartbeatIntervalMs * 2;
            
            for (const [clientId, client] of this.clients) {
                // Check if client is alive
                if (client.lastPong && (now - client.lastPong) > timeout) {
                    console.warn(`Client ${clientId} appears dead, closing connection`);
                    client.ws.close(1001, 'Heartbeat timeout');
                    continue;
                }
                
                // Send ping
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.isAlive = false;
                    client.ws.ping();
                }
            }
        }, this.config.heartbeatIntervalMs);
    }
    
    /**
     * Check if message matches subscription filters
     */
    messageMatchesFilters(message, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return true;
        }
        
        for (const [key, value] of Object.entries(filters)) {
            const messageValue = this.getNestedValue(message, key);
            
            if (Array.isArray(value)) {
                if (!value.includes(messageValue)) {
                    return false;
                }
            } else if (messageValue !== value) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        
        return current;
    }
    
    /**
     * Generate unique client ID
     */
    generateClientId() {
        return `client_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
    
    /**
     * Update frame timing statistics
     */
    updateFrameStatistics(frameTime) {
        const alpha = 0.1; // Exponential moving average factor
        this.statistics.avgFrameTime = 
            (1 - alpha) * this.statistics.avgFrameTime + alpha * frameTime;
    }
    
    /**
     * Get server statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            isRunning: this.isRunning,
            activeConnections: this.clients.size,
            activeChannels: this.channels.size,
            queueLength: this.messageQueue.length,
            uptime: this.isRunning ? Date.now() - this.startTime : 0
        };
    }
    
    /**
     * Get connected clients info
     */
    getClients() {
        const clients = [];
        
        for (const [clientId, client] of this.clients) {
            clients.push({
                id: clientId,
                connectedAt: client.connectedAt,
                lastActivity: client.lastActivity,
                messagesReceived: client.messagesReceived,
                messagesSent: client.messagesSent,
                subscriptions: client.subscriptions ? Array.from(client.subscriptions.keys()) : [],
                isAlive: client.isAlive
            });
        }
        
        return clients;
    }
    
    /**
     * Get channel information
     */
    getChannels() {
        const channels = [];
        
        for (const [channelName, clientIds] of this.channels) {
            channels.push({
                name: channelName,
                subscribers: clientIds.size,
                clients: Array.from(clientIds)
            });
        }
        
        return channels;
    }
}

/**
 * Message processor for validation and transformation
 */
class MessageProcessor {
    constructor(config) {
        this.config = config;
    }
    
    validate(message) {
        // Basic validation
        if (!message || typeof message !== 'object') {
            throw new Error('Message must be an object');
        }
        
        if (!message.type) {
            throw new Error('Message must have a type');
        }
        
        return true;
    }
    
    transform(message, clientId) {
        // Add metadata
        return {
            ...message,
            _metadata: {
                clientId,
                timestamp: Date.now(),
                server: 'wirthforge-ws'
            }
        };
    }
}

/**
 * Client manager for connection handling
 */
class ClientManager {
    constructor(config) {
        this.config = config;
    }
    
    createClient(clientId, ws, request) {
        return {
            id: clientId,
            ws,
            request,
            connectedAt: Date.now(),
            lastActivity: Date.now(),
            lastPong: Date.now(),
            messagesReceived: 0,
            messagesSent: 0,
            isAlive: true,
            subscriptions: new Map(),
            userAgent: request.headers['user-agent'],
            remoteAddress: request.socket.remoteAddress
        };
    }
}

/**
 * Channel manager for subscription handling
 */
class ChannelManager {
    constructor() {
        this.channelMetadata = new Map();
    }
    
    createChannel(name, metadata = {}) {
        this.channelMetadata.set(name, {
            name,
            createdAt: Date.now(),
            ...metadata
        });
    }
    
    getChannelMetadata(name) {
        return this.channelMetadata.get(name);
    }
}

/**
 * Rate limiter for client messages
 */
class RateLimiter {
    constructor(config) {
        this.config = config;
        this.clientLimits = new Map(); // Client ID -> rate limit data
        this.maxMessagesPerSecond = config.maxMessagesPerSecond || 100;
    }
    
    allowMessage(clientId) {
        const now = Date.now();
        const windowMs = 1000; // 1 second window
        
        if (!this.clientLimits.has(clientId)) {
            this.clientLimits.set(clientId, {
                messages: [],
                lastCleanup: now
            });
        }
        
        const clientData = this.clientLimits.get(clientId);
        
        // Clean up old messages
        if (now - clientData.lastCleanup > windowMs) {
            clientData.messages = clientData.messages.filter(
                timestamp => now - timestamp < windowMs
            );
            clientData.lastCleanup = now;
        }
        
        // Check rate limit
        if (clientData.messages.length >= this.maxMessagesPerSecond) {
            return false;
        }
        
        // Record this message
        clientData.messages.push(now);
        return true;
    }
}

module.exports = { 
    WirthForgeWSServer, 
    MessageProcessor, 
    ClientManager, 
    ChannelManager, 
    RateLimiter 
};
