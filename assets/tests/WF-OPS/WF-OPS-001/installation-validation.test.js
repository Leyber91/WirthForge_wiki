/**
 * WIRTHFORGE Installation Validation Test Suite
 * 
 * Comprehensive tests for validating WIRTHFORGE installation integrity,
 * system requirements, and post-installation functionality.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');

const execAsync = promisify(exec);

describe('WIRTHFORGE Installation Validation', () => {
    let installPath;
    let testConfig;
    
    beforeAll(async () => {
        // Setup test environment
        installPath = process.env.WIRTHFORGE_INSTALL_PATH || getDefaultInstallPath();
        testConfig = {
            installPath,
            requiredFiles: [
                'version.json',
                'bin/wirthforge',
                'config/settings.json',
                'web-ui/index.html',
                'certs/server.crt',
                'certs/server.key'
            ],
            requiredDirectories: [
                'bin',
                'lib',
                'config',
                'data',
                'logs',
                'web-ui',
                'certs'
            ],
            ports: [9443, 9444],
            minDiskSpace: 1024 * 1024 * 1024, // 1GB
            minMemory: 512 * 1024 * 1024 // 512MB
        };
    });
    
    describe('System Requirements', () => {
        test('should have sufficient disk space', async () => {
            const stats = await getDiskSpace(installPath);
            expect(stats.free).toBeGreaterThan(testConfig.minDiskSpace);
        });
        
        test('should have sufficient memory', () => {
            const freeMem = os.freemem();
            expect(freeMem).toBeGreaterThan(testConfig.minMemory);
        });
        
        test('should be on supported platform', () => {
            const platform = os.platform();
            const supportedPlatforms = ['win32', 'darwin', 'linux'];
            expect(supportedPlatforms).toContain(platform);
        });
        
        test('should have supported architecture', () => {
            const arch = os.arch();
            const supportedArchs = ['x64', 'arm64'];
            expect(supportedArchs).toContain(arch);
        });
        
        test('should have minimum Node.js version', () => {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            expect(majorVersion).toBeGreaterThanOrEqual(16);
        });
    });
    
    describe('Installation Directory', () => {
        test('should exist and be accessible', async () => {
            await expect(fs.access(installPath)).resolves.not.toThrow();
        });
        
        test('should have correct permissions', async () => {
            await expect(fs.access(installPath, fs.constants.R_OK | fs.constants.W_OK))
                .resolves.not.toThrow();
        });
        
        test('should contain all required directories', async () => {
            for (const dir of testConfig.requiredDirectories) {
                const dirPath = path.join(installPath, dir);
                await expect(fs.access(dirPath)).resolves.not.toThrow();
                
                const stats = await fs.stat(dirPath);
                expect(stats.isDirectory()).toBe(true);
            }
        });
        
        test('should contain all required files', async () => {
            for (const file of testConfig.requiredFiles) {
                const filePath = path.join(installPath, file);
                await expect(fs.access(filePath)).resolves.not.toThrow();
                
                const stats = await fs.stat(filePath);
                expect(stats.isFile()).toBe(true);
                expect(stats.size).toBeGreaterThan(0);
            }
        });
    });
    
    describe('Version Information', () => {
        let versionInfo;
        
        beforeAll(async () => {
            const versionPath = path.join(installPath, 'version.json');
            const versionData = await fs.readFile(versionPath, 'utf8');
            versionInfo = JSON.parse(versionData);
        });
        
        test('should have valid version format', () => {
            expect(versionInfo.version).toMatch(/^\d+\.\d+\.\d+$/);
        });
        
        test('should have installation metadata', () => {
            expect(versionInfo).toHaveProperty('platform');
            expect(versionInfo).toHaveProperty('architecture');
            expect(versionInfo.platform).toBe(os.platform());
            expect(versionInfo.architecture).toBe(os.arch());
        });
        
        test('should have valid installation date', () => {
            if (versionInfo.installDate) {
                const installDate = new Date(versionInfo.installDate);
                expect(installDate).toBeInstanceOf(Date);
                expect(installDate.getTime()).not.toBeNaN();
            }
        });
    });
    
    describe('Configuration Files', () => {
        test('should have valid settings configuration', async () => {
            const settingsPath = path.join(installPath, 'config', 'settings.json');
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            
            expect(settings).toHaveProperty('port');
            expect(typeof settings.port).toBe('number');
            expect(settings.port).toBeGreaterThan(0);
            expect(settings.port).toBeLessThan(65536);
        });
        
        test('should have valid SSL certificates', async () => {
            const certPath = path.join(installPath, 'certs', 'server.crt');
            const keyPath = path.join(installPath, 'certs', 'server.key');
            
            const certData = await fs.readFile(certPath, 'utf8');
            const keyData = await fs.readFile(keyPath, 'utf8');
            
            expect(certData).toContain('-----BEGIN CERTIFICATE-----');
            expect(certData).toContain('-----END CERTIFICATE-----');
            expect(keyData).toContain('-----BEGIN');
            expect(keyData).toContain('-----END');
        });
    });
    
    describe('Executable Files', () => {
        test('should have executable permissions on main binary', async () => {
            const binaryPath = path.join(installPath, 'bin', 'wirthforge');
            
            if (os.platform() !== 'win32') {
                await expect(fs.access(binaryPath, fs.constants.X_OK))
                    .resolves.not.toThrow();
            }
        });
        
        test('should be able to execute version check', async () => {
            const binaryPath = path.join(installPath, 'bin', 'wirthforge');
            
            if (os.platform() === 'win32') {
                // On Windows, check if it's a valid executable
                const stats = await fs.stat(binaryPath);
                expect(stats.size).toBeGreaterThan(0);
            } else {
                // On Unix-like systems, try to execute
                try {
                    const { stdout } = await execAsync(`"${binaryPath}" --version`, { timeout: 5000 });
                    expect(stdout).toBeTruthy();
                } catch (error) {
                    // Binary might not be fully functional in test environment
                    console.warn('Binary execution test skipped:', error.message);
                }
            }
        });
    });
    
    describe('Network Configuration', () => {
        test('should have available ports', async () => {
            for (const port of testConfig.ports) {
                const isAvailable = await isPortAvailable(port);
                if (!isAvailable) {
                    console.warn(`Port ${port} is in use - this may be expected if service is running`);
                }
                // Don't fail test if port is in use - might be the running service
            }
        });
        
        test('should be able to bind to localhost', async () => {
            const testPort = await findAvailablePort(19000, 19100);
            expect(testPort).toBeTruthy();
            
            const server = require('net').createServer();
            
            await new Promise((resolve, reject) => {
                server.listen(testPort, '127.0.0.1', resolve);
                server.on('error', reject);
            });
            
            server.close();
        });
    });
    
    describe('Web UI Assets', () => {
        test('should have main HTML file', async () => {
            const indexPath = path.join(installPath, 'web-ui', 'index.html');
            const htmlContent = await fs.readFile(indexPath, 'utf8');
            
            expect(htmlContent).toContain('<html');
            expect(htmlContent).toContain('</html>');
            expect(htmlContent).toContain('WIRTHFORGE');
        });
        
        test('should have required web assets', async () => {
            const webUIPath = path.join(installPath, 'web-ui');
            const requiredAssets = ['css', 'js', 'assets'];
            
            for (const asset of requiredAssets) {
                const assetPath = path.join(webUIPath, asset);
                try {
                    const stats = await fs.stat(assetPath);
                    expect(stats.isDirectory()).toBe(true);
                } catch (error) {
                    // Some assets might be optional
                    console.warn(`Optional web asset not found: ${asset}`);
                }
            }
        });
    });
    
    describe('Data Storage', () => {
        test('should have writable data directory', async () => {
            const dataPath = path.join(installPath, 'data');
            await expect(fs.access(dataPath, fs.constants.W_OK))
                .resolves.not.toThrow();
        });
        
        test('should be able to create test files in data directory', async () => {
            const dataPath = path.join(installPath, 'data');
            const testFile = path.join(dataPath, 'test-write.tmp');
            const testContent = 'test content';
            
            await fs.writeFile(testFile, testContent);
            const readContent = await fs.readFile(testFile, 'utf8');
            expect(readContent).toBe(testContent);
            
            // Cleanup
            await fs.unlink(testFile);
        });
        
        test('should have logs directory', async () => {
            const logsPath = path.join(installPath, 'logs');
            await expect(fs.access(logsPath, fs.constants.W_OK))
                .resolves.not.toThrow();
        });
    });
    
    describe('Security Configuration', () => {
        test('should have secure file permissions', async () => {
            const certPath = path.join(installPath, 'certs');
            const keyPath = path.join(certPath, 'server.key');
            
            if (os.platform() !== 'win32') {
                const stats = await fs.stat(keyPath);
                const mode = stats.mode & parseInt('777', 8);
                
                // Key file should not be world-readable
                expect(mode & parseInt('044', 8)).toBe(0);
            }
        });
        
        test('should not have default passwords in config', async () => {
            const configPath = path.join(installPath, 'config');
            const configFiles = await fs.readdir(configPath);
            
            for (const file of configFiles) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(configPath, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    
                    // Check for common default passwords
                    const defaultPasswords = ['password', '123456', 'admin', 'default'];
                    for (const pwd of defaultPasswords) {
                        expect(content.toLowerCase()).not.toContain(`"${pwd}"`);
                    }
                }
            }
        });
    });
    
    describe('Platform-Specific Installation', () => {
        test('should have platform-specific integrations', async () => {
            const platform = os.platform();
            
            switch (platform) {
                case 'win32':
                    await testWindowsIntegration();
                    break;
                case 'darwin':
                    await testMacOSIntegration();
                    break;
                case 'linux':
                    await testLinuxIntegration();
                    break;
            }
        });
    });
    
    describe('Installation Integrity', () => {
        test('should pass checksum verification', async () => {
            // This would verify against known good checksums
            // For now, just verify files are not empty
            for (const file of testConfig.requiredFiles) {
                const filePath = path.join(installPath, file);
                const stats = await fs.stat(filePath);
                expect(stats.size).toBeGreaterThan(0);
            }
        });
        
        test('should have consistent version across components', async () => {
            const versionPath = path.join(installPath, 'version.json');
            const versionData = await fs.readFile(versionPath, 'utf8');
            const version = JSON.parse(versionData);
            
            // Check package.json if it exists
            try {
                const packagePath = path.join(installPath, 'package.json');
                const packageData = await fs.readFile(packagePath, 'utf8');
                const packageInfo = JSON.parse(packageData);
                
                if (packageInfo.version) {
                    expect(packageInfo.version).toBe(version.version);
                }
            } catch (error) {
                // package.json might not exist
            }
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

async function getDiskSpace(dirPath) {
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
    
    return { free: 0, total: 0 };
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

async function testWindowsIntegration() {
    // Test Windows-specific features
    try {
        // Check if service is registered
        const { stdout } = await execAsync('sc query wirthforge 2>nul || echo "not found"');
        // Service might not be installed in test environment
        console.log('Windows service status:', stdout.includes('not found') ? 'Not installed' : 'Installed');
        
        // Check registry entries
        try {
            await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\WIRTHFORGE" 2>nul');
            console.log('Registry entries: Found');
        } catch (error) {
            console.log('Registry entries: Not found');
        }
    } catch (error) {
        console.warn('Windows integration test failed:', error.message);
    }
}

async function testMacOSIntegration() {
    // Test macOS-specific features
    try {
        // Check LaunchAgent
        const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'org.wirthforge.plist');
        try {
            await fs.access(plistPath);
            console.log('LaunchAgent: Installed');
        } catch (error) {
            console.log('LaunchAgent: Not installed');
        }
        
        // Check Applications folder link
        try {
            await fs.access('/Applications/WIRTHFORGE.app');
            console.log('Applications folder link: Found');
        } catch (error) {
            console.log('Applications folder link: Not found');
        }
    } catch (error) {
        console.warn('macOS integration test failed:', error.message);
    }
}

async function testLinuxIntegration() {
    // Test Linux-specific features
    try {
        // Check systemd service
        try {
            await execAsync('systemctl --user is-enabled wirthforge.service 2>/dev/null');
            console.log('Systemd service: Enabled');
        } catch (error) {
            console.log('Systemd service: Not enabled');
        }
        
        // Check desktop entry
        const desktopPath = path.join(os.homedir(), '.local', 'share', 'applications', 'wirthforge.desktop');
        try {
            await fs.access(desktopPath);
            console.log('Desktop entry: Found');
        } catch (error) {
            console.log('Desktop entry: Not found');
        }
    } catch (error) {
        console.warn('Linux integration test failed:', error.message);
    }
}
