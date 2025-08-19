/**
 * WIRTHFORGE Diagnostics System
 * 
 * Comprehensive system diagnostics, health monitoring, and troubleshooting
 * tools for WIRTHFORGE installation and runtime issues.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');

const execAsync = promisify(exec);

class WirthForgeDiagnostics {
    constructor(config = {}) {
        this.config = {
            installPath: config.installPath || this.getDefaultInstallPath(),
            logPath: config.logPath || path.join(this.getDefaultInstallPath(), 'logs'),
            dataPath: config.dataPath || path.join(this.getDefaultInstallPath(), 'data'),
            port: config.port || 9443,
            enableSystemInfo: config.enableSystemInfo !== false,
            enableNetworkTests: config.enableNetworkTests !== false,
            enablePerformanceTests: config.enablePerformanceTests !== false,
            ...config
        };
        
        this.diagnosticResults = new Map();
        this.healthChecks = new Map();
        this.performanceMetrics = new Map();
    }
    
    getDefaultInstallPath() {
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
    
    /**
     * Run comprehensive system diagnostics
     */
    async runFullDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            platform: os.platform(),
            results: {}
        };
        
        const tests = [
            { name: 'systemInfo', test: this.checkSystemInfo.bind(this) },
            { name: 'installation', test: this.checkInstallation.bind(this) },
            { name: 'permissions', test: this.checkPermissions.bind(this) },
            { name: 'network', test: this.checkNetwork.bind(this) },
            { name: 'services', test: this.checkServices.bind(this) },
            { name: 'storage', test: this.checkStorage.bind(this) },
            { name: 'performance', test: this.checkPerformance.bind(this) },
            { name: 'logs', test: this.analyzeLogs.bind(this) }
        ];
        
        for (const { name, test } of tests) {
            try {
                this.log('info', `Running ${name} diagnostics...`);
                diagnostics.results[name] = await test();
                diagnostics.results[name].status = 'completed';
            } catch (error) {
                this.logError(`${name} diagnostics failed`, error);
                diagnostics.results[name] = {
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        }
        
        // Generate overall health score
        diagnostics.healthScore = this.calculateHealthScore(diagnostics.results);
        diagnostics.recommendations = this.generateRecommendations(diagnostics.results);
        
        // Save diagnostics report
        await this.saveDiagnosticsReport(diagnostics);
        
        return diagnostics;
    }
    
    /**
     * Check system information
     */
    async checkSystemInfo() {
        const systemInfo = {
            timestamp: new Date().toISOString(),
            platform: os.platform(),
            architecture: os.arch(),
            release: os.release(),
            hostname: os.hostname(),
            uptime: os.uptime(),
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
            },
            cpu: {
                model: os.cpus()[0]?.model || 'Unknown',
                cores: os.cpus().length,
                speed: os.cpus()[0]?.speed || 0
            },
            loadAverage: os.loadavg(),
            networkInterfaces: os.networkInterfaces()
        };
        
        // Add Node.js and process info
        systemInfo.nodejs = {
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
        
        // Platform-specific information
        if (os.platform() === 'win32') {
            try {
                const { stdout } = await execAsync('wmic os get Caption,Version /format:csv');
                systemInfo.windowsVersion = stdout.trim();
            } catch (error) {
                systemInfo.windowsVersion = 'Could not determine';
            }
        }
        
        return systemInfo;
    }
    
    /**
     * Check installation integrity
     */
    async checkInstallation() {
        const installation = {
            timestamp: new Date().toISOString(),
            installPath: this.config.installPath,
            exists: false,
            version: null,
            files: {},
            integrity: 'unknown'
        };
        
        try {
            // Check if installation directory exists
            await fs.access(this.config.installPath);
            installation.exists = true;
            
            // Check critical files
            const criticalFiles = [
                'version.json',
                'bin/wirthforge',
                'config/settings.json',
                'web-ui/index.html'
            ];
            
            for (const file of criticalFiles) {
                const filePath = path.join(this.config.installPath, file);
                try {
                    const stats = await fs.stat(filePath);
                    installation.files[file] = {
                        exists: true,
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    };
                } catch (error) {
                    installation.files[file] = {
                        exists: false,
                        error: error.message
                    };
                }
            }
            
            // Read version information
            try {
                const versionPath = path.join(this.config.installPath, 'version.json');
                const versionData = await fs.readFile(versionPath, 'utf8');
                installation.version = JSON.parse(versionData);
            } catch (error) {
                installation.version = { error: 'Could not read version' };
            }
            
            // Calculate integrity score
            const existingFiles = Object.values(installation.files).filter(f => f.exists).length;
            const totalFiles = Object.keys(installation.files).length;
            installation.integrity = existingFiles === totalFiles ? 'good' : 'compromised';
            
        } catch (error) {
            installation.error = error.message;
        }
        
        return installation;
    }
    
    /**
     * Check file permissions
     */
    async checkPermissions() {
        const permissions = {
            timestamp: new Date().toISOString(),
            checks: {}
        };
        
        const pathsToCheck = [
            { path: this.config.installPath, required: ['read', 'write'] },
            { path: this.config.logPath, required: ['read', 'write'] },
            { path: this.config.dataPath, required: ['read', 'write'] },
            { path: path.join(this.config.installPath, 'bin'), required: ['read', 'execute'] }
        ];
        
        for (const { path: checkPath, required } of pathsToCheck) {
            try {
                const stats = await fs.stat(checkPath);
                const checks = {
                    exists: true,
                    isDirectory: stats.isDirectory(),
                    permissions: {}
                };
                
                // Check permissions
                for (const perm of required) {
                    try {
                        switch (perm) {
                            case 'read':
                                await fs.access(checkPath, fs.constants.R_OK);
                                checks.permissions.read = true;
                                break;
                            case 'write':
                                await fs.access(checkPath, fs.constants.W_OK);
                                checks.permissions.write = true;
                                break;
                            case 'execute':
                                await fs.access(checkPath, fs.constants.X_OK);
                                checks.permissions.execute = true;
                                break;
                        }
                    } catch (error) {
                        checks.permissions[perm] = false;
                    }
                }
                
                permissions.checks[checkPath] = checks;
            } catch (error) {
                permissions.checks[checkPath] = {
                    exists: false,
                    error: error.message
                };
            }
        }
        
        return permissions;
    }
    
    /**
     * Check network connectivity
     */
    async checkNetwork() {
        const network = {
            timestamp: new Date().toISOString(),
            localhost: {},
            ports: {},
            connectivity: {}
        };
        
        // Check localhost connectivity
        try {
            const { stdout } = await execAsync('ping -c 1 127.0.0.1 2>/dev/null || ping -n 1 127.0.0.1');
            network.localhost.reachable = stdout.includes('1 received') || stdout.includes('Reply from');
        } catch (error) {
            network.localhost.reachable = false;
            network.localhost.error = error.message;
        }
        
        // Check port availability
        const portsToCheck = [this.config.port, this.config.port + 1];
        
        for (const port of portsToCheck) {
            network.ports[port] = await this.checkPort(port);
        }
        
        // Check internet connectivity (optional)
        if (this.config.enableNetworkTests) {
            try {
                const { stdout } = await execAsync('ping -c 1 8.8.8.8 2>/dev/null || ping -n 1 8.8.8.8');
                network.connectivity.internet = stdout.includes('1 received') || stdout.includes('Reply from');
            } catch (error) {
                network.connectivity.internet = false;
            }
        }
        
        return network;
    }
    
    /**
     * Check if port is available
     */
    async checkPort(port) {
        return new Promise((resolve) => {
            const server = require('net').createServer();
            
            server.listen(port, '127.0.0.1', () => {
                server.close(() => {
                    resolve({ available: true, port });
                });
            });
            
            server.on('error', (error) => {
                resolve({ 
                    available: false, 
                    port, 
                    error: error.code === 'EADDRINUSE' ? 'Port in use' : error.message 
                });
            });
        });
    }
    
    /**
     * Check system services
     */
    async checkServices() {
        const services = {
            timestamp: new Date().toISOString(),
            platform: os.platform(),
            services: {}
        };
        
        const platform = os.platform();
        
        try {
            if (platform === 'win32') {
                // Check Windows service
                const { stdout } = await execAsync('sc query wirthforge 2>nul || echo "Service not found"');
                services.services.wirthforge = {
                    exists: !stdout.includes('Service not found'),
                    status: stdout.includes('RUNNING') ? 'running' : 'stopped',
                    details: stdout.trim()
                };
            } else if (platform === 'linux') {
                // Check systemd service
                try {
                    const { stdout } = await execAsync('systemctl --user is-active wirthforge.service 2>/dev/null');
                    services.services.wirthforge = {
                        exists: true,
                        status: stdout.trim() === 'active' ? 'running' : 'stopped'
                    };
                } catch (error) {
                    services.services.wirthforge = {
                        exists: false,
                        error: 'Service not found'
                    };
                }
            } else if (platform === 'darwin') {
                // Check macOS LaunchAgent
                try {
                    const { stdout } = await execAsync('launchctl list | grep org.wirthforge');
                    services.services.wirthforge = {
                        exists: stdout.length > 0,
                        status: stdout.includes('org.wirthforge') ? 'running' : 'stopped'
                    };
                } catch (error) {
                    services.services.wirthforge = {
                        exists: false,
                        error: 'Service not found'
                    };
                }
            }
        } catch (error) {
            services.error = error.message;
        }
        
        return services;
    }
    
    /**
     * Check storage and disk space
     */
    async checkStorage() {
        const storage = {
            timestamp: new Date().toISOString(),
            paths: {},
            overall: {}
        };
        
        const pathsToCheck = [
            this.config.installPath,
            this.config.logPath,
            this.config.dataPath
        ];
        
        for (const checkPath of pathsToCheck) {
            try {
                const stats = await fs.stat(checkPath);
                const size = await this.getDirectorySize(checkPath);
                
                storage.paths[checkPath] = {
                    exists: true,
                    size: size,
                    sizeFormatted: this.formatBytes(size),
                    modified: stats.mtime.toISOString()
                };
            } catch (error) {
                storage.paths[checkPath] = {
                    exists: false,
                    error: error.message
                };
            }
        }
        
        // Get disk space information
        try {
            if (os.platform() === 'win32') {
                const drive = this.config.installPath.charAt(0);
                const { stdout } = await execAsync(`wmic logicaldisk where caption="${drive}:" get size,freespace /format:csv`);
                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                    const data = lines[1].split(',');
                    storage.overall.freeSpace = parseInt(data[1]) || 0;
                    storage.overall.totalSpace = parseInt(data[2]) || 0;
                }
            } else {
                const { stdout } = await execAsync(`df "${this.config.installPath}" | tail -1`);
                const parts = stdout.trim().split(/\s+/);
                storage.overall.totalSpace = parseInt(parts[1]) * 1024;
                storage.overall.freeSpace = parseInt(parts[3]) * 1024;
            }
            
            storage.overall.usedSpace = storage.overall.totalSpace - storage.overall.freeSpace;
            storage.overall.usagePercentage = ((storage.overall.usedSpace / storage.overall.totalSpace) * 100).toFixed(2);
        } catch (error) {
            storage.overall.error = error.message;
        }
        
        return storage;
    }
    
    /**
     * Check system performance
     */
    async checkPerformance() {
        const performance = {
            timestamp: new Date().toISOString(),
            cpu: {},
            memory: {},
            disk: {},
            network: {}
        };
        
        // CPU usage
        const startUsage = process.cpuUsage();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const endUsage = process.cpuUsage(startUsage);
        
        performance.cpu = {
            user: endUsage.user / 1000,
            system: endUsage.system / 1000,
            loadAverage: os.loadavg()
        };
        
        // Memory usage
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        
        performance.memory = {
            process: {
                rss: memUsage.rss,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external
            },
            system: {
                total: totalMem,
                free: freeMem,
                used: totalMem - freeMem,
                percentage: ((totalMem - freeMem) / totalMem * 100).toFixed(2)
            }
        };
        
        // Disk I/O test (simple)
        if (this.config.enablePerformanceTests) {
            const testFile = path.join(this.config.installPath, 'perf-test.tmp');
            const testData = Buffer.alloc(1024 * 1024); // 1MB
            
            try {
                const writeStart = Date.now();
                await fs.writeFile(testFile, testData);
                const writeTime = Date.now() - writeStart;
                
                const readStart = Date.now();
                await fs.readFile(testFile);
                const readTime = Date.now() - readStart;
                
                await fs.unlink(testFile);
                
                performance.disk = {
                    writeTime,
                    readTime,
                    writeSpeed: (1024 / writeTime * 1000).toFixed(2) + ' KB/s',
                    readSpeed: (1024 / readTime * 1000).toFixed(2) + ' KB/s'
                };
            } catch (error) {
                performance.disk = { error: error.message };
            }
        }
        
        return performance;
    }
    
    /**
     * Analyze log files
     */
    async analyzeLogs() {
        const logAnalysis = {
            timestamp: new Date().toISOString(),
            files: {},
            summary: {
                errors: 0,
                warnings: 0,
                totalLines: 0
            }
        };
        
        try {
            const logFiles = await fs.readdir(this.config.logPath);
            
            for (const logFile of logFiles.filter(f => f.endsWith('.log'))) {
                const logPath = path.join(this.config.logPath, logFile);
                
                try {
                    const stats = await fs.stat(logPath);
                    const content = await fs.readFile(logPath, 'utf8');
                    const lines = content.split('\n');
                    
                    const errors = lines.filter(line => line.toLowerCase().includes('error')).length;
                    const warnings = lines.filter(line => line.toLowerCase().includes('warn')).length;
                    
                    logAnalysis.files[logFile] = {
                        size: stats.size,
                        lines: lines.length,
                        errors,
                        warnings,
                        lastModified: stats.mtime.toISOString(),
                        recentErrors: lines
                            .filter(line => line.toLowerCase().includes('error'))
                            .slice(-5)
                    };
                    
                    logAnalysis.summary.errors += errors;
                    logAnalysis.summary.warnings += warnings;
                    logAnalysis.summary.totalLines += lines.length;
                    
                } catch (error) {
                    logAnalysis.files[logFile] = { error: error.message };
                }
            }
        } catch (error) {
            logAnalysis.error = error.message;
        }
        
        return logAnalysis;
    }
    
    /**
     * Calculate overall health score
     */
    calculateHealthScore(results) {
        let score = 100;
        let issues = [];
        
        // Check installation integrity
        if (results.installation?.integrity === 'compromised') {
            score -= 30;
            issues.push('Installation integrity compromised');
        }
        
        // Check permissions
        const permissionIssues = Object.values(results.permissions?.checks || {})
            .filter(check => !check.exists || Object.values(check.permissions || {}).includes(false));
        if (permissionIssues.length > 0) {
            score -= 20;
            issues.push('Permission issues detected');
        }
        
        // Check network
        if (results.network?.localhost?.reachable === false) {
            score -= 25;
            issues.push('Localhost connectivity issues');
        }
        
        // Check services
        if (results.services?.services?.wirthforge?.status !== 'running') {
            score -= 15;
            issues.push('Service not running');
        }
        
        // Check storage
        const usagePercentage = parseFloat(results.storage?.overall?.usagePercentage || 0);
        if (usagePercentage > 90) {
            score -= 10;
            issues.push('Low disk space');
        }
        
        // Check logs for errors
        const errorCount = results.logs?.summary?.errors || 0;
        if (errorCount > 10) {
            score -= 10;
            issues.push('High error count in logs');
        }
        
        return {
            score: Math.max(0, score),
            level: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical',
            issues
        };
    }
    
    /**
     * Generate recommendations based on diagnostics
     */
    generateRecommendations(results) {
        const recommendations = [];
        
        // Installation recommendations
        if (results.installation?.integrity === 'compromised') {
            recommendations.push({
                category: 'installation',
                priority: 'high',
                message: 'Reinstall or repair WIRTHFORGE installation',
                action: 'Run installer in repair mode'
            });
        }
        
        // Permission recommendations
        const permissionIssues = Object.entries(results.permissions?.checks || {})
            .filter(([path, check]) => !check.exists || Object.values(check.permissions || {}).includes(false));
        
        if (permissionIssues.length > 0) {
            recommendations.push({
                category: 'permissions',
                priority: 'high',
                message: 'Fix file permissions',
                action: 'Run permission repair tool or reinstall'
            });
        }
        
        // Storage recommendations
        const usagePercentage = parseFloat(results.storage?.overall?.usagePercentage || 0);
        if (usagePercentage > 90) {
            recommendations.push({
                category: 'storage',
                priority: 'medium',
                message: 'Free up disk space',
                action: 'Clean temporary files or move data to another drive'
            });
        }
        
        // Performance recommendations
        const memoryPercentage = parseFloat(results.performance?.memory?.system?.percentage || 0);
        if (memoryPercentage > 80) {
            recommendations.push({
                category: 'performance',
                priority: 'medium',
                message: 'High memory usage detected',
                action: 'Close unnecessary applications or add more RAM'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Save diagnostics report
     */
    async saveDiagnosticsReport(diagnostics) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(this.config.logPath, `diagnostics-${timestamp}.json`);
        
        await fs.mkdir(this.config.logPath, { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(diagnostics, null, 2));
        
        this.log('info', `Diagnostics report saved: ${reportPath}`);
        return reportPath;
    }
    
    /**
     * Get directory size recursively
     */
    async getDirectorySize(dirPath) {
        let totalSize = 0;
        
        try {
            const files = await fs.readdir(dirPath);
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                
                if (stats.isDirectory()) {
                    totalSize += await this.getDirectorySize(filePath);
                } else {
                    totalSize += stats.size;
                }
            }
        } catch (error) {
            // Ignore permission errors
        }
        
        return totalSize;
    }
    
    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Logging methods
     */
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] DIAG ${level.toUpperCase()}: ${message}`);
        
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
    
    logError(message, error) {
        this.log('error', message, {
            error: error.message,
            stack: error.stack
        });
    }
}

module.exports = WirthForgeDiagnostics;
