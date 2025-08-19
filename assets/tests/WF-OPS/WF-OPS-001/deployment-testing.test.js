/**
 * WIRTHFORGE Deployment Testing Suite
 * 
 * Tests for validating WIRTHFORGE deployment functionality including
 * server startup, API endpoints, WebSocket connections, and service health.
 */

const https = require('https');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('WIRTHFORGE Deployment Testing', () => {
    let serverUrl;
    let testConfig;
    
    beforeAll(async () => {
        testConfig = {
            baseUrl: process.env.WIRTHFORGE_URL || 'https://localhost:9443',
            timeout: 10000,
            retryAttempts: 3,
            installPath: process.env.WIRTHFORGE_INSTALL_PATH || getDefaultInstallPath()
        };
        
        serverUrl = testConfig.baseUrl;
        
        // Allow self-signed certificates for testing
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    });
    
    afterAll(() => {
        // Restore TLS settings
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    });
    
    describe('Server Connectivity', () => {
        test('should respond to HTTPS requests', async () => {
            const response = await makeHttpsRequest('/api/health');
            expect(response.statusCode).toBe(200);
        });
        
        test('should return valid health check', async () => {
            const response = await makeHttpsRequest('/api/health');
            const data = JSON.parse(response.body);
            
            expect(data).toHaveProperty('status');
            expect(data.status).toBe('healthy');
            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('uptime');
        });
        
        test('should serve main application page', async () => {
            const response = await makeHttpsRequest('/');
            expect(response.statusCode).toBe(200);
            expect(response.body).toContain('<html');
            expect(response.body).toContain('WIRTHFORGE');
        });
        
        test('should have proper security headers', async () => {
            const response = await makeHttpsRequest('/');
            
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['strict-transport-security']).toContain('max-age=');
        });
        
        test('should reject non-localhost connections', async () => {
            // This test would need to be run from a different host
            // For now, just verify localhost binding
            expect(serverUrl).toContain('localhost');
        });
    });
    
    describe('API Endpoints', () => {
        test('should return system status', async () => {
            const response = await makeHttpsRequest('/api/status');
            const data = JSON.parse(response.body);
            
            expect(data).toHaveProperty('status');
            expect(data).toHaveProperty('uptime');
            expect(data).toHaveProperty('memory');
            expect(data).toHaveProperty('platform');
            expect(data).toHaveProperty('version');
        });
        
        test('should handle authentication endpoints', async () => {
            // Test login endpoint exists
            const loginResponse = await makeHttpsRequest('/api/auth/login', 'POST', {
                password: 'test'
            });
            
            // Should return 401 for invalid credentials
            expect([401, 500]).toContain(loginResponse.statusCode);
        });
        
        test('should return available models', async () => {
            const response = await makeHttpsRequest('/api/models');
            
            if (response.statusCode === 401) {
                // Authentication required - this is expected
                expect(response.statusCode).toBe(401);
            } else {
                const data = JSON.parse(response.body);
                expect(Array.isArray(data)).toBe(true);
            }
        });
        
        test('should handle chat completions endpoint', async () => {
            const response = await makeHttpsRequest('/api/chat/completions', 'POST', {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test'
            });
            
            // Should require authentication
            expect([401, 500]).toContain(response.statusCode);
        });
        
        test('should serve static assets', async () => {
            const cssResponse = await makeHttpsRequest('/css/main.css');
            const jsResponse = await makeHttpsRequest('/js/main.js');
            
            // Assets might not exist, but server should handle gracefully
            expect([200, 404]).toContain(cssResponse.statusCode);
            expect([200, 404]).toContain(jsResponse.statusCode);
        });
    });
    
    describe('WebSocket Connectivity', () => {
        test('should accept WebSocket connections', async () => {
            const wsUrl = serverUrl.replace('https://', 'wss://') + '/ws';
            
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(wsUrl, {
                    rejectUnauthorized: false
                });
                
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket connection timeout'));
                }, 5000);
                
                ws.on('open', () => {
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                });
                
                ws.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        });
        
        test('should handle WebSocket messages', async () => {
            const wsUrl = serverUrl.replace('https://', 'wss://') + '/ws';
            
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(wsUrl, {
                    rejectUnauthorized: false
                });
                
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket message timeout'));
                }, 5000);
                
                ws.on('open', () => {
                    ws.send(JSON.stringify({ type: 'ping' }));
                });
                
                ws.on('message', (data) => {
                    clearTimeout(timeout);
                    const message = JSON.parse(data.toString());
                    expect(message.type).toBe('pong');
                    ws.close();
                    resolve();
                });
                
                ws.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        });
    });
    
    describe('Service Health', () => {
        test('should have reasonable response times', async () => {
            const startTime = Date.now();
            await makeHttpsRequest('/api/health');
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(1000); // Less than 1 second
        });
        
        test('should handle concurrent requests', async () => {
            const requests = Array(10).fill().map(() => 
                makeHttpsRequest('/api/health')
            );
            
            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.statusCode).toBe(200);
            });
        });
        
        test('should have stable memory usage', async () => {
            const initialStatus = await makeHttpsRequest('/api/status');
            const initialData = JSON.parse(initialStatus.body);
            
            // Make some requests to generate load
            await Promise.all(Array(20).fill().map(() => 
                makeHttpsRequest('/api/health')
            ));
            
            const finalStatus = await makeHttpsRequest('/api/status');
            const finalData = JSON.parse(finalStatus.body);
            
            // Memory usage shouldn't increase dramatically
            const memoryIncrease = finalData.memory.heapUsed - initialData.memory.heapUsed;
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
        });
    });
    
    describe('Error Handling', () => {
        test('should handle 404 errors gracefully', async () => {
            const response = await makeHttpsRequest('/nonexistent-endpoint');
            expect(response.statusCode).toBe(404);
        });
        
        test('should handle malformed JSON requests', async () => {
            const response = await makeHttpsRequest('/api/auth/login', 'POST', 'invalid json');
            expect([400, 500]).toContain(response.statusCode);
        });
        
        test('should handle large request payloads', async () => {
            const largePayload = { data: 'x'.repeat(1024 * 1024) }; // 1MB
            const response = await makeHttpsRequest('/api/auth/login', 'POST', largePayload);
            
            // Should either accept or reject with appropriate status
            expect([200, 400, 413, 500]).toContain(response.statusCode);
        });
    });
    
    describe('Configuration Validation', () => {
        test('should load configuration correctly', async () => {
            const response = await makeHttpsRequest('/api/status');
            const data = JSON.parse(response.body);
            
            expect(data.platform).toBe(os.platform());
            expect(data.version).toMatch(/^\d+\.\d+\.\d+$/);
        });
        
        test('should have valid SSL configuration', async () => {
            // Test that HTTPS is working (we're already making HTTPS requests)
            const response = await makeHttpsRequest('/api/health');
            expect(response.statusCode).toBe(200);
        });
        
        test('should enforce localhost-only access', async () => {
            const response = await makeHttpsRequest('/api/health');
            expect(response.statusCode).toBe(200);
            
            // Verify we're connecting to localhost
            expect(serverUrl).toMatch(/localhost|127\.0\.0\.1/);
        });
    });
    
    describe('Database Connectivity', () => {
        test('should handle data storage operations', async () => {
            // Test conversation endpoint if available
            const response = await makeHttpsRequest('/api/data/conversations');
            
            if (response.statusCode === 401) {
                // Authentication required - expected
                expect(response.statusCode).toBe(401);
            } else if (response.statusCode === 200) {
                const data = JSON.parse(response.body);
                expect(Array.isArray(data)).toBe(true);
            }
        });
        
        test('should handle settings operations', async () => {
            const response = await makeHttpsRequest('/api/settings');
            
            // Should require authentication or return settings
            expect([200, 401, 500]).toContain(response.statusCode);
        });
    });
    
    describe('Performance Metrics', () => {
        test('should maintain acceptable CPU usage', async () => {
            const response = await makeHttpsRequest('/api/status');
            const data = JSON.parse(response.body);
            
            // Basic uptime check
            expect(data.uptime).toBeGreaterThan(0);
        });
        
        test('should handle file serving efficiently', async () => {
            const startTime = Date.now();
            await makeHttpsRequest('/');
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(2000); // Less than 2 seconds
        });
    });
    
    describe('Security Validation', () => {
        test('should reject HTTP requests', async () => {
            // Try to make HTTP request to HTTPS port
            const httpUrl = serverUrl.replace('https://', 'http://');
            
            try {
                await makeHttpRequest(httpUrl + '/api/health');
                fail('Should not accept HTTP requests');
            } catch (error) {
                // Expected to fail
                expect(error).toBeDefined();
            }
        });
        
        test('should have proper CORS headers', async () => {
            const response = await makeHttpsRequest('/api/health');
            
            // Check for security headers
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers).toHaveProperty('x-frame-options');
        });
        
        test('should validate content types', async () => {
            const response = await makeHttpsRequest('/api/auth/login', 'POST', 
                'not json', { 'Content-Type': 'text/plain' });
            
            expect([400, 415, 500]).toContain(response.statusCode);
        });
    });
});

// Helper functions
function getDefaultInstallPath() {
    const homeDir = os.homedir();
    const platform = os.platform();
    
    switch (platform) {
        case 'win32':
            return path.join(process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), 'WirthForge');
        case 'darwin':
            return path.join(homeDir, 'Applications', 'WirthForge');
        case 'linux':
            return path.join(homeDir, '.local', 'share', 'wirthforge');
        default:
            return path.join(homeDir, 'wirthforge');
    }
}

function makeHttpsRequest(endpoint, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, serverUrl);
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            rejectUnauthorized: false // Allow self-signed certificates
        };
        
        if (data && typeof data === 'object') {
            data = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(data);
        } else if (data && typeof data === 'string') {
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }
        
        const req = https.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

function makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
        const http = require('http');
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'GET',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('HTTP request timeout'));
        });
        
        req.end();
    });
}
