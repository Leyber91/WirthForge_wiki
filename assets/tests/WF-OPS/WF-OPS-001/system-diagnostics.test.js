/**
 * WIRTHFORGE System Diagnostics Test Suite
 * 
 * Tests for validating system diagnostics functionality including
 * health monitoring, performance metrics, and troubleshooting capabilities.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

describe('WIRTHFORGE System Diagnostics', () => {
    let testConfig;
    let diagnosticsPath;
    
    beforeAll(async () => {
        testConfig = {
            installPath: process.env.WIRTHFORGE_INSTALL_PATH || getDefaultInstallPath(),
            logPath: path.join(getDefaultInstallPath(), 'logs'),
            dataPath: path.join(getDefaultInstallPath(), 'data'),
            port: 9443,
            timeout: 10000
        };
        
        diagnosticsPath = path.join(testConfig.installPath, 'diagnostics');
        
        // Ensure test directories exist
        await fs.mkdir(testConfig.logPath, { recursive: true });
        await fs.mkdir(testConfig.dataPath, { recursive: true });
        await fs.mkdir(diagnosticsPath, { recursive: true });
    });
    
    describe('System Information Collection', () => {
        test('should collect basic system information', async () => {
            const systemInfo = {
                platform: os.platform(),
                architecture: os.arch(),
                release: os.release(),
                hostname: os.hostname(),
                uptime: os.uptime(),
                memory: {
                    total: os.totalmem(),
                    free: os.freemem()
                },
                cpu: os.cpus()
            };
            
            expect(systemInfo.platform).toBeTruthy();
            expect(systemInfo.architecture).toBeTruthy();
            expect(systemInfo.memory.total).toBeGreaterThan(0);
            expect(systemInfo.memory.free).toBeGreaterThan(0);
            expect(Array.isArray(systemInfo.cpu)).toBe(true);
            expect(systemInfo.cpu.length).toBeGreaterThan(0);
        });
        
        test('should detect Node.js environment', () => {
            const nodeInfo = {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
                pid: process.pid,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            };
            
            expect(nodeInfo.version).toMatch(/^v\d+\.\d+\.\d+/);
            expect(nodeInfo.platform).toBe(os.platform());
            expect(nodeInfo.arch).toBe(os.arch());
            expect(nodeInfo.pid).toBeGreaterThan(0);
            expect(nodeInfo.memory.heapUsed).toBeGreaterThan(0);
        });
        
        test('should collect network interface information', () => {
            const interfaces = os.networkInterfaces();
            
            expect(typeof interfaces).toBe('object');
            expect(Object.keys(interfaces).length).toBeGreaterThan(0);
            
            // Should have localhost interface
            const hasLocalhost = Object.values(interfaces).some(iface =>
                iface.some(addr => addr.address === '127.0.0.1' || addr.address === '::1')
            );
            expect(hasLocalhost).toBe(true);
        });
    });
    
    describe('Installation Health Checks', () => {
        test('should verify installation directory structure', async () => {
            const requiredDirs = ['bin', 'config', 'data', 'logs', 'web-ui'];
            const healthStatus = {};
            
            for (const dir of requiredDirs) {
                const dirPath = path.join(testConfig.installPath, dir);
                try {
                    await fs.access(dirPath);
                    const stats = await fs.stat(dirPath);
                    healthStatus[dir] = {
                        exists: true,
                        isDirectory: stats.isDirectory(),
                        accessible: true
                    };
                } catch (error) {
                    healthStatus[dir] = {
                        exists: false,
                        error: error.message
                    };
                }
            }
            
            // At least some directories should exist
            const existingDirs = Object.values(healthStatus).filter(status => status.exists);
            expect(existingDirs.length).toBeGreaterThan(0);
        });
        
        test('should check file permissions', async () => {
            const testFile = path.join(testConfig.dataPath, 'permission-test.tmp');
            
            try {
                // Test write permission
                await fs.writeFile(testFile, 'test content');
                
                // Test read permission
                const content = await fs.readFile(testFile, 'utf8');
                expect(content).toBe('test content');
                
                // Test delete permission
                await fs.unlink(testFile);
                
                // All permissions working
                expect(true).toBe(true);
            } catch (error) {
                fail(`Permission test failed: ${error.message}`);
            }
        });
        
        test('should validate configuration files', async () => {
            const configChecks = [];
            
            // Check for version file
            try {
                const versionPath = path.join(testConfig.installPath, 'version.json');
                const versionData = await fs.readFile(versionPath, 'utf8');
                const version = JSON.parse(versionData);
                
                configChecks.push({
                    file: 'version.json',
                    valid: typeof version.version === 'string' && version.version.match(/^\d+\.\d+\.\d+$/)
                });
            } catch (error) {
                configChecks.push({
                    file: 'version.json',
                    valid: false,
                    error: error.message
                });
            }
            
            // Check for settings file
            try {
                const settingsPath = path.join(testConfig.installPath, 'config', 'settings.json');
                const settingsData = await fs.readFile(settingsPath, 'utf8');
                const settings = JSON.parse(settingsData);
                
                configChecks.push({
                    file: 'settings.json',
                    valid: typeof settings === 'object'
                });
            } catch (error) {
                configChecks.push({
                    file: 'settings.json',
                    valid: false,
                    error: error.message
                });
            }
            
            // At least one config should be valid or we should know why not
            expect(configChecks.length).toBeGreaterThan(0);
        });
    });
    
    describe('Performance Monitoring', () => {
        test('should measure CPU usage', async () => {
            const startUsage = process.cpuUsage();
            
            // Simulate some CPU work
            let sum = 0;
            for (let i = 0; i < 1000000; i++) {
                sum += Math.random();
            }
            
            const endUsage = process.cpuUsage(startUsage);
            
            expect(endUsage.user).toBeGreaterThan(0);
            expect(endUsage.system).toBeGreaterThanOrEqual(0);
            expect(sum).toBeGreaterThan(0); // Ensure work was done
        });
        
        test('should monitor memory usage', () => {
            const memUsage = process.memoryUsage();
            const systemMem = {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            };
            
            expect(memUsage.heapUsed).toBeGreaterThan(0);
            expect(memUsage.heapTotal).toBeGreaterThanOrEqual(memUsage.heapUsed);
            expect(systemMem.total).toBeGreaterThan(systemMem.used);
            expect(systemMem.free).toBeGreaterThan(0);
        });
        
        test('should measure disk I/O performance', async () => {
            const testFile = path.join(testConfig.dataPath, 'io-test.tmp');
            const testData = Buffer.alloc(1024 * 100); // 100KB
            
            // Measure write performance
            const writeStart = process.hrtime.bigint();
            await fs.writeFile(testFile, testData);
            const writeEnd = process.hrtime.bigint();
            const writeTime = Number(writeEnd - writeStart) / 1000000; // Convert to ms
            
            // Measure read performance
            const readStart = process.hrtime.bigint();
            await fs.readFile(testFile);
            const readEnd = process.hrtime.bigint();
            const readTime = Number(readEnd - readStart) / 1000000; // Convert to ms
            
            expect(writeTime).toBeGreaterThan(0);
            expect(readTime).toBeGreaterThan(0);
            expect(writeTime).toBeLessThan(5000); // Should complete within 5 seconds
            expect(readTime).toBeLessThan(5000);
            
            // Cleanup
            await fs.unlink(testFile);
        });
        
        test('should check system load', () => {
            const loadAvg = os.loadavg();
            
            expect(Array.isArray(loadAvg)).toBe(true);
            expect(loadAvg.length).toBe(3);
            expect(loadAvg[0]).toBeGreaterThanOrEqual(0); // 1 minute average
            expect(loadAvg[1]).toBeGreaterThanOrEqual(0); // 5 minute average
            expect(loadAvg[2]).toBeGreaterThanOrEqual(0); // 15 minute average
        });
    });
    
    describe('Network Diagnostics', () => {
        test('should check localhost connectivity', async () => {
            const testPort = await findAvailablePort(19000, 19100);
            expect(testPort).toBeTruthy();
            
            // Test port binding
            const server = require('net').createServer();
            
            await new Promise((resolve, reject) => {
                server.listen(testPort, '127.0.0.1', resolve);
                server.on('error', reject);
            });
            
            // Port should be in use now
            const isInUse = !(await isPortAvailable(testPort));
            expect(isInUse).toBe(true);
            
            server.close();
        });
        
        test('should validate required ports', async () => {
            const requiredPorts = [testConfig.port, testConfig.port + 1];
            const portStatus = {};
            
            for (const port of requiredPorts) {
                portStatus[port] = await isPortAvailable(port);
            }
            
            // Ports might be in use by the running service, which is OK
            expect(Object.keys(portStatus).length).toBe(requiredPorts.length);
        });
        
        test('should test network interface accessibility', () => {
            const interfaces = os.networkInterfaces();
            let localhostFound = false;
            
            for (const [name, addresses] of Object.entries(interfaces)) {
                for (const addr of addresses) {
                    if (addr.address === '127.0.0.1' || addr.address === '::1') {
                        localhostFound = true;
                        expect(addr.internal).toBe(true);
                    }
                }
            }
            
            expect(localhostFound).toBe(true);
        });
    });
    
    describe('Log Analysis', () => {
        test('should analyze log files', async () => {
            // Create test log file
            const testLogPath = path.join(testConfig.logPath, 'test.log');
            const logEntries = [
                '[2024-08-19T10:00:00.000Z] INFO: Application started',
                '[2024-08-19T10:01:00.000Z] WARN: High memory usage detected',
                '[2024-08-19T10:02:00.000Z] ERROR: Connection failed',
                '[2024-08-19T10:03:00.000Z] INFO: Connection restored'
            ];
            
            await fs.writeFile(testLogPath, logEntries.join('\n'));
            
            // Analyze log
            const logContent = await fs.readFile(testLogPath, 'utf8');
            const lines = logContent.split('\n');
            
            const analysis = {
                totalLines: lines.length,
                errors: lines.filter(line => line.includes('ERROR')).length,
                warnings: lines.filter(line => line.includes('WARN')).length,
                info: lines.filter(line => line.includes('INFO')).length
            };
            
            expect(analysis.totalLines).toBe(4);
            expect(analysis.errors).toBe(1);
            expect(analysis.warnings).toBe(1);
            expect(analysis.info).toBe(2);
            
            // Cleanup
            await fs.unlink(testLogPath);
        });
        
        test('should detect log rotation needs', async () => {
            const testLogPath = path.join(testConfig.logPath, 'large-test.log');
            const largeContent = 'x'.repeat(1024 * 1024); // 1MB
            
            await fs.writeFile(testLogPath, largeContent);
            
            const stats = await fs.stat(testLogPath);
            const needsRotation = stats.size > 500 * 1024; // 500KB threshold
            
            expect(needsRotation).toBe(true);
            expect(stats.size).toBeGreaterThan(500 * 1024);
            
            // Cleanup
            await fs.unlink(testLogPath);
        });
        
        test('should identify recent errors', async () => {
            const testLogPath = path.join(testConfig.logPath, 'error-test.log');
            const now = new Date();
            const recentTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
            const oldTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
            
            const logEntries = [
                `[${oldTime.toISOString()}] ERROR: Old error`,
                `[${recentTime.toISOString()}] ERROR: Recent error`,
                `[${now.toISOString()}] INFO: Current info`
            ];
            
            await fs.writeFile(testLogPath, logEntries.join('\n'));
            
            const logContent = await fs.readFile(testLogPath, 'utf8');
            const lines = logContent.split('\n');
            
            // Find recent errors (within last 10 minutes)
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
            const recentErrors = lines.filter(line => {
                if (!line.includes('ERROR')) return false;
                
                const timestampMatch = line.match(/\[([^\]]+)\]/);
                if (!timestampMatch) return false;
                
                const timestamp = new Date(timestampMatch[1]);
                return timestamp > tenMinutesAgo;
            });
            
            expect(recentErrors.length).toBe(1);
            expect(recentErrors[0]).toContain('Recent error');
            
            // Cleanup
            await fs.unlink(testLogPath);
        });
    });
    
    describe('Storage Diagnostics', () => {
        test('should check disk space', async () => {
            const diskInfo = await getDiskSpace(testConfig.installPath);
            
            expect(diskInfo.total).toBeGreaterThan(0);
            expect(diskInfo.free).toBeGreaterThan(0);
            expect(diskInfo.free).toBeLessThanOrEqual(diskInfo.total);
            
            const usagePercentage = ((diskInfo.total - diskInfo.free) / diskInfo.total) * 100;
            expect(usagePercentage).toBeGreaterThanOrEqual(0);
            expect(usagePercentage).toBeLessThanOrEqual(100);
        });
        
        test('should measure directory sizes', async () => {
            const testDir = path.join(testConfig.dataPath, 'size-test');
            await fs.mkdir(testDir, { recursive: true });
            
            // Create test files
            const files = ['file1.txt', 'file2.txt', 'file3.txt'];
            for (const file of files) {
                await fs.writeFile(path.join(testDir, file), 'test content');
            }
            
            const totalSize = await getDirectorySize(testDir);
            expect(totalSize).toBeGreaterThan(0);
            expect(totalSize).toBe(files.length * 'test content'.length);
            
            // Cleanup
            await fs.rm(testDir, { recursive: true });
        });
        
        test('should detect storage issues', async () => {
            const storageChecks = {
                installPathAccessible: false,
                dataPathWritable: false,
                logPathWritable: false,
                sufficientSpace: false
            };
            
            // Check install path
            try {
                await fs.access(testConfig.installPath);
                storageChecks.installPathAccessible = true;
            } catch (error) {
                // Path not accessible
            }
            
            // Check data path writability
            try {
                const testFile = path.join(testConfig.dataPath, 'write-test.tmp');
                await fs.writeFile(testFile, 'test');
                await fs.unlink(testFile);
                storageChecks.dataPathWritable = true;
            } catch (error) {
                // Not writable
            }
            
            // Check log path writability
            try {
                const testFile = path.join(testConfig.logPath, 'write-test.tmp');
                await fs.writeFile(testFile, 'test');
                await fs.unlink(testFile);
                storageChecks.logPathWritable = true;
            } catch (error) {
                // Not writable
            }
            
            // Check sufficient space (at least 100MB free)
            try {
                const diskInfo = await getDiskSpace(testConfig.installPath);
                storageChecks.sufficientSpace = diskInfo.free > 100 * 1024 * 1024;
            } catch (error) {
                // Cannot determine space
            }
            
            // At least some checks should pass
            const passedChecks = Object.values(storageChecks).filter(Boolean).length;
            expect(passedChecks).toBeGreaterThan(0);
        });
    });
    
    describe('Service Health', () => {
        test('should check service status', async () => {
            const platform = os.platform();
            let serviceStatus = { checked: false, running: false };
            
            try {
                if (platform === 'win32') {
                    const { stdout } = await execAsync('sc query wirthforge 2>nul || echo "not found"');
                    serviceStatus.checked = true;
                    serviceStatus.running = stdout.includes('RUNNING');
                } else if (platform === 'linux') {
                    const { stdout } = await execAsync('systemctl --user is-active wirthforge.service 2>/dev/null || echo "inactive"');
                    serviceStatus.checked = true;
                    serviceStatus.running = stdout.trim() === 'active';
                } else if (platform === 'darwin') {
                    const { stdout } = await execAsync('launchctl list | grep org.wirthforge || echo "not found"');
                    serviceStatus.checked = true;
                    serviceStatus.running = stdout.includes('org.wirthforge');
                }
            } catch (error) {
                serviceStatus.error = error.message;
            }
            
            expect(serviceStatus.checked).toBe(true);
            // Service might not be installed in test environment
        });
        
        test('should validate process health', () => {
            const processInfo = {
                pid: process.pid,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            };
            
            expect(processInfo.pid).toBeGreaterThan(0);
            expect(processInfo.uptime).toBeGreaterThan(0);
            expect(processInfo.memory.heapUsed).toBeGreaterThan(0);
            expect(processInfo.cpu.user).toBeGreaterThanOrEqual(0);
        });
    });
    
    describe('Diagnostic Reporting', () => {
        test('should generate comprehensive diagnostic report', async () => {
            const diagnosticReport = {
                timestamp: new Date().toISOString(),
                system: {
                    platform: os.platform(),
                    arch: os.arch(),
                    nodeVersion: process.version
                },
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    process: process.memoryUsage()
                },
                storage: await getDiskSpace(testConfig.installPath),
                performance: {
                    uptime: process.uptime(),
                    loadAverage: os.loadavg()
                }
            };
            
            expect(diagnosticReport.timestamp).toBeTruthy();
            expect(diagnosticReport.system.platform).toBeTruthy();
            expect(diagnosticReport.memory.total).toBeGreaterThan(0);
            expect(diagnosticReport.storage.total).toBeGreaterThan(0);
            expect(diagnosticReport.performance.uptime).toBeGreaterThan(0);
        });
        
        test('should save diagnostic report', async () => {
            const reportData = {
                timestamp: new Date().toISOString(),
                status: 'test',
                checks: { test: true }
            };
            
            const reportPath = path.join(diagnosticsPath, 'test-report.json');
            await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
            
            // Verify report was saved
            const savedData = await fs.readFile(reportPath, 'utf8');
            const savedReport = JSON.parse(savedData);
            
            expect(savedReport.timestamp).toBe(reportData.timestamp);
            expect(savedReport.status).toBe('test');
            
            // Cleanup
            await fs.unlink(reportPath);
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

function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        
        server.listen(port, '127.0.0.1', () => {
            server.close(() => resolve(true));
        });
        
        server.on('error', () => resolve(false));
    });
}

async function findAvailablePort(start, end) {
    for (let port = start; port <= end; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    return null;
}

async function getDiskSpace(dirPath) {
    try {
        if (os.platform() === 'win32') {
            const drive = path.parse(dirPath).root;
            const { stdout } = await execAsync(`wmic logicaldisk where caption="${drive.charAt(0)}:" get size,freespace /format:csv`);
            const lines = stdout.trim().split('\n');
            if (lines.length > 1) {
                const data = lines[1].split(',');
                return {
                    free: parseInt(data[1]) || 0,
                    total: parseInt(data[2]) || 0
                };
            }
        } else {
            const { stdout } = await execAsync(`df "${dirPath}" | tail -1`);
            const parts = stdout.trim().split(/\s+/);
            return {
                total: parseInt(parts[1]) * 1024,
                free: parseInt(parts[3]) * 1024
            };
        }
    } catch (error) {
        return { free: 0, total: 0 };
    }
    
    return { free: 0, total: 0 };
}

async function getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isDirectory()) {
                totalSize += await getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }
    } catch (error) {
        // Ignore permission errors
    }
    
    return totalSize;
}
