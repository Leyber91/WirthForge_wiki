/**
 * WF-UX-009 Local API Extension
 * 
 * Secure local HTTP server for external tool integration
 * Features: REST endpoints, WebSocket support, authentication, rate limiting
 * 
 * Performance: Non-blocking I/O, connection pooling, request throttling
 * Dependencies: WF-TECH-005 (API Design), WF-TECH-002 (Security)
 */

import { EventEmitter } from 'events';

export class LocalAPIExtension extends EventEmitter {
    constructor(config = {}) {
        super();
        
        // Server configuration
        this.config = {
            port: config.port || 8080,
            host: config.host || 'localhost',
            maxConnections: config.maxConnections || 100,
            requestTimeout: config.requestTimeout || 30000,
            enableCORS: config.enableCORS || false,
            enableHTTPS: config.enableHTTPS || false,
            ...config
        };
        
        // Server state
        this.server = null;
        this.wsServer = null;
        this.isRunning = false;
        this.connections = new Map();
        this.activeRequests = new Map();
        
        // Authentication and security
        this.authTokens = new Map();
        this.rateLimiter = new Map();
        this.securityPolicies = {
            maxRequestSize: 10 * 1024 * 1024, // 10MB
            allowedOrigins: ['http://localhost', 'https://localhost'],
            requiredHeaders: ['x-api-key'],
            rateLimitWindow: 60000, // 1 minute
            rateLimitMax: 100 // requests per window
        };
        
        // API endpoints
        this.routes = new Map();
        this.middleware = [];
        this.wsHandlers = new Map();
        
        // Performance monitoring
        this.metrics = {
            requestCount: 0,
            errorCount: 0,
            averageResponseTime: 0,
            activeConnections: 0,
            bytesTransferred: 0
        };
        
        // Initialize default routes
        this.initializeDefaultRoutes();
        this.initializeMiddleware();
    }

    /**
     * Start the local API server
     */
    async start() {
        if (this.isRunning) {
            throw new Error('Server is already running');
        }

        try {
            // Create HTTP server
            await this.createHTTPServer();
            
            // Create WebSocket server
            await this.createWebSocketServer();
            
            // Start listening
            await this.startListening();
            
            this.isRunning = true;
            this.emit('started', { port: this.config.port, host: this.config.host });
            
            console.log(`Local API server started on ${this.config.host}:${this.config.port}`);
            
        } catch (error) {
            console.error('Failed to start API server:', error);
            throw error;
        }
    }

    /**
     * Stop the API server
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        try {
            // Close all connections
            this.connections.forEach(conn => conn.destroy());
            this.connections.clear();
            
            // Close WebSocket server
            if (this.wsServer) {
                this.wsServer.close();
            }
            
            // Close HTTP server
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
            }
            
            this.isRunning = false;
            this.emit('stopped');
            
            console.log('Local API server stopped');
            
        } catch (error) {
            console.error('Error stopping API server:', error);
            throw error;
        }
    }

    /**
     * Create HTTP server with security middleware
     */
    async createHTTPServer() {
        const http = await import('http');
        const https = await import('https');
        
        const serverModule = this.config.enableHTTPS ? https : http;
        
        this.server = serverModule.createServer(async (req, res) => {
            const requestId = this.generateRequestId();
            const startTime = Date.now();
            
            try {
                // Track active request
                this.activeRequests.set(requestId, { req, res, startTime });
                this.metrics.requestCount++;
                
                // Apply middleware
                await this.applyMiddleware(req, res);
                
                // Route request
                await this.routeRequest(req, res);
                
            } catch (error) {
                this.handleRequestError(req, res, error);
            } finally {
                // Cleanup and metrics
                this.activeRequests.delete(requestId);
                const responseTime = Date.now() - startTime;
                this.updateResponseTimeMetrics(responseTime);
            }
        });

        // Handle server errors
        this.server.on('error', (error) => {
            console.error('Server error:', error);
            this.emit('error', error);
        });

        // Track connections
        this.server.on('connection', (socket) => {
            const connId = this.generateConnectionId();
            this.connections.set(connId, socket);
            this.metrics.activeConnections++;
            
            socket.on('close', () => {
                this.connections.delete(connId);
                this.metrics.activeConnections--;
            });
        });
    }

    /**
     * Create WebSocket server for real-time communication
     */
    async createWebSocketServer() {
        const WebSocket = await import('ws');
        
        this.wsServer = new WebSocket.Server({
            server: this.server,
            path: '/ws',
            verifyClient: (info) => this.verifyWebSocketClient(info)
        });

        this.wsServer.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            
            ws.clientId = clientId;
            ws.isAlive = true;
            
            // Handle authentication
            this.authenticateWebSocketClient(ws, req);
            
            // Setup message handling
            ws.on('message', (data) => {
                this.handleWebSocketMessage(ws, data);
            });
            
            // Setup ping/pong for connection health
            ws.on('pong', () => {
                ws.isAlive = true;
            });
            
            ws.on('close', () => {
                this.handleWebSocketClose(ws);
            });
            
            ws.on('error', (error) => {
                console.error(`WebSocket error [${clientId}]:`, error);
            });
            
            // Send welcome message
            this.sendWebSocketMessage(ws, {
                type: 'welcome',
                clientId: clientId,
                timestamp: Date.now()
            });
        });

        // Heartbeat interval
        setInterval(() => {
            this.wsServer.clients.forEach((ws) => {
                if (!ws.isAlive) {
                    ws.terminate();
                    return;
                }
                
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    /**
     * Start server listening
     */
    async startListening() {
        return new Promise((resolve, reject) => {
            this.server.listen(this.config.port, this.config.host, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Initialize default API routes
     */
    initializeDefaultRoutes() {
        // System status endpoint
        this.addRoute('GET', '/api/status', async (req, res) => {
            const status = {
                status: 'running',
                timestamp: Date.now(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                metrics: this.metrics,
                activeConnections: this.connections.size,
                activeRequests: this.activeRequests.size
            };
            
            this.sendJSONResponse(res, status);
        });

        // Health check endpoint
        this.addRoute('GET', '/api/health', async (req, res) => {
            this.sendJSONResponse(res, { status: 'healthy', timestamp: Date.now() });
        });

        // Workflow endpoints
        this.addRoute('GET', '/api/workflows', async (req, res) => {
            const workflows = await this.getWorkflows();
            this.sendJSONResponse(res, workflows);
        });

        this.addRoute('POST', '/api/workflows', async (req, res) => {
            const workflow = await this.createWorkflow(req.body);
            this.sendJSONResponse(res, workflow, 201);
        });

        this.addRoute('GET', '/api/workflows/:id', async (req, res) => {
            const workflow = await this.getWorkflow(req.params.id);
            this.sendJSONResponse(res, workflow);
        });

        this.addRoute('PUT', '/api/workflows/:id', async (req, res) => {
            const workflow = await this.updateWorkflow(req.params.id, req.body);
            this.sendJSONResponse(res, workflow);
        });

        this.addRoute('DELETE', '/api/workflows/:id', async (req, res) => {
            await this.deleteWorkflow(req.params.id);
            this.sendJSONResponse(res, { success: true });
        });

        this.addRoute('POST', '/api/workflows/:id/execute', async (req, res) => {
            const result = await this.executeWorkflow(req.params.id, req.body);
            this.sendJSONResponse(res, result);
        });

        // Energy metrics endpoints
        this.addRoute('GET', '/api/energy/metrics', async (req, res) => {
            const metrics = await this.getEnergyMetrics();
            this.sendJSONResponse(res, metrics);
        });

        this.addRoute('GET', '/api/energy/patterns', async (req, res) => {
            const patterns = await this.getEnergyPatterns();
            this.sendJSONResponse(res, patterns);
        });

        // Plugin management endpoints
        this.addRoute('GET', '/api/plugins', async (req, res) => {
            const plugins = await this.getPlugins();
            this.sendJSONResponse(res, plugins);
        });

        this.addRoute('POST', '/api/plugins/:id/enable', async (req, res) => {
            await this.enablePlugin(req.params.id);
            this.sendJSONResponse(res, { success: true });
        });

        this.addRoute('POST', '/api/plugins/:id/disable', async (req, res) => {
            await this.disablePlugin(req.params.id);
            this.sendJSONResponse(res, { success: true });
        });
    }

    /**
     * Initialize security middleware
     */
    initializeMiddleware() {
        // CORS middleware
        this.addMiddleware(async (req, res, next) => {
            if (this.config.enableCORS) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
                
                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }
            }
            next();
        });

        // Authentication middleware
        this.addMiddleware(async (req, res, next) => {
            if (req.url.startsWith('/api/')) {
                const apiKey = req.headers['x-api-key'];
                if (!this.validateAPIKey(apiKey)) {
                    this.sendErrorResponse(res, 401, 'Invalid API key');
                    return;
                }
            }
            next();
        });

        // Rate limiting middleware
        this.addMiddleware(async (req, res, next) => {
            const clientIP = req.connection.remoteAddress;
            if (!this.checkRateLimit(clientIP)) {
                this.sendErrorResponse(res, 429, 'Rate limit exceeded');
                return;
            }
            next();
        });

        // Request size limiting
        this.addMiddleware(async (req, res, next) => {
            const contentLength = parseInt(req.headers['content-length'] || '0');
            if (contentLength > this.securityPolicies.maxRequestSize) {
                this.sendErrorResponse(res, 413, 'Request too large');
                return;
            }
            next();
        });

        // Request timeout
        this.addMiddleware(async (req, res, next) => {
            const timeout = setTimeout(() => {
                if (!res.headersSent) {
                    this.sendErrorResponse(res, 408, 'Request timeout');
                }
            }, this.config.requestTimeout);
            
            res.on('finish', () => clearTimeout(timeout));
            next();
        });
    }

    /**
     * Add API route
     */
    addRoute(method, path, handler) {
        const routeKey = `${method}:${path}`;
        this.routes.set(routeKey, {
            method,
            path,
            handler,
            params: this.extractPathParams(path)
        });
    }

    /**
     * Add middleware function
     */
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * Apply middleware chain
     */
    async applyMiddleware(req, res) {
        for (const middleware of this.middleware) {
            await new Promise((resolve, reject) => {
                middleware(req, res, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            
            if (res.headersSent) {
                break;
            }
        }
    }

    /**
     * Route incoming request
     */
    async routeRequest(req, res) {
        const method = req.method;
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        
        // Parse request body for POST/PUT
        if (method === 'POST' || method === 'PUT') {
            req.body = await this.parseRequestBody(req);
        }
        
        // Find matching route
        const route = this.findMatchingRoute(method, pathname);
        
        if (route) {
            // Extract path parameters
            req.params = this.extractRouteParams(route, pathname);
            req.query = Object.fromEntries(url.searchParams);
            
            // Execute route handler
            await route.handler(req, res);
        } else {
            this.sendErrorResponse(res, 404, 'Not found');
        }
    }

    /**
     * Find matching route for request
     */
    findMatchingRoute(method, pathname) {
        for (const [routeKey, route] of this.routes) {
            if (route.method === method && this.matchPath(route.path, pathname)) {
                return route;
            }
        }
        return null;
    }

    /**
     * Match path pattern with actual path
     */
    matchPath(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');
        
        if (patternParts.length !== pathParts.length) {
            return false;
        }
        
        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];
            
            if (patternPart.startsWith(':')) {
                // Parameter - matches any value
                continue;
            } else if (patternPart !== pathPart) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Extract route parameters
     */
    extractRouteParams(route, pathname) {
        const params = {};
        const patternParts = route.path.split('/');
        const pathParts = pathname.split('/');
        
        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            if (patternPart.startsWith(':')) {
                const paramName = patternPart.substring(1);
                params[paramName] = pathParts[i];
            }
        }
        
        return params;
    }

    /**
     * Parse request body
     */
    async parseRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const contentType = req.headers['content-type'] || '';
                    
                    if (contentType.includes('application/json')) {
                        resolve(JSON.parse(body));
                    } else {
                        resolve(body);
                    }
                } catch (error) {
                    reject(error);
                }
            });
            
            req.on('error', reject);
        });
    }

    /**
     * Send JSON response
     */
    sendJSONResponse(res, data, statusCode = 200) {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'X-Response-Time': Date.now()
        });
        res.end(JSON.stringify(data, null, 2));
        
        this.metrics.bytesTransferred += JSON.stringify(data).length;
    }

    /**
     * Send error response
     */
    sendErrorResponse(res, statusCode, message) {
        this.metrics.errorCount++;
        
        const error = {
            error: true,
            statusCode,
            message,
            timestamp: Date.now()
        };
        
        this.sendJSONResponse(res, error, statusCode);
    }

    /**
     * Handle WebSocket message
     */
    handleWebSocketMessage(ws, data) {
        try {
            const message = JSON.parse(data.toString());
            const handler = this.wsHandlers.get(message.type);
            
            if (handler) {
                handler(ws, message);
            } else {
                this.sendWebSocketMessage(ws, {
                    type: 'error',
                    message: `Unknown message type: ${message.type}`
                });
            }
        } catch (error) {
            this.sendWebSocketMessage(ws, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }

    /**
     * Send WebSocket message
     */
    sendWebSocketMessage(ws, message) {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Validate API key
     */
    validateAPIKey(apiKey) {
        // In production, would validate against secure key store
        return apiKey === 'wirthforge-local-api-key';
    }

    /**
     * Check rate limit for client
     */
    checkRateLimit(clientIP) {
        const now = Date.now();
        const windowStart = now - this.securityPolicies.rateLimitWindow;
        
        if (!this.rateLimiter.has(clientIP)) {
            this.rateLimiter.set(clientIP, []);
        }
        
        const requests = this.rateLimiter.get(clientIP);
        
        // Remove old requests outside window
        const validRequests = requests.filter(time => time > windowStart);
        
        if (validRequests.length >= this.securityPolicies.rateLimitMax) {
            return false;
        }
        
        // Add current request
        validRequests.push(now);
        this.rateLimiter.set(clientIP, validRequests);
        
        return true;
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique connection ID
     */
    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique client ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update response time metrics
     */
    updateResponseTimeMetrics(responseTime) {
        const alpha = 0.1; // Exponential moving average factor
        this.metrics.averageResponseTime = 
            (1 - alpha) * this.metrics.averageResponseTime + alpha * responseTime;
    }

    /**
     * Get API metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            activeConnections: this.connections.size,
            activeRequests: this.activeRequests.size,
            rateLimitEntries: this.rateLimiter.size
        };
    }

    // Placeholder methods for workflow/energy/plugin operations
    async getWorkflows() { return []; }
    async createWorkflow(data) { return { id: 'new-workflow', ...data }; }
    async getWorkflow(id) { return { id, name: 'Sample Workflow' }; }
    async updateWorkflow(id, data) { return { id, ...data }; }
    async deleteWorkflow(id) { return true; }
    async executeWorkflow(id, params) { return { id, status: 'executed', params }; }
    async getEnergyMetrics() { return { totalEnergy: 100, efficiency: 95 }; }
    async getEnergyPatterns() { return []; }
    async getPlugins() { return []; }
    async enablePlugin(id) { return true; }
    async disablePlugin(id) { return true; }
}

export default LocalAPIExtension;
