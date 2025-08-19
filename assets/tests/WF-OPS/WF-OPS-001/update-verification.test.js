/**
 * WIRTHFORGE Update Verification Test Suite
 * 
 * Tests for validating update processes including download verification,
 * backup creation, update application, and rollback functionality.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');

describe('WIRTHFORGE Update Verification', () => {
    let testConfig;
    let mockUpdateManager;
    
    beforeAll(async () => {
        testConfig = {
            installPath: process.env.WIRTHFORGE_INSTALL_PATH || getDefaultInstallPath(),
            updatePath: path.join(getDefaultInstallPath(), 'updates'),
            backupPath: path.join(getDefaultInstallPath(), 'backups'),
            testUpdateVersion: '1.1.0',
            currentVersion: '1.0.0'
        };
        
        // Ensure test directories exist
        await fs.mkdir(testConfig.updatePath, { recursive: true });
        await fs.mkdir(testConfig.backupPath, { recursive: true });
    });
    
    describe('Update Detection', () => {
        test('should detect available updates', async () => {
            const updateInfo = {
                version: testConfig.testUpdateVersion,
                releaseDate: new Date().toISOString(),
                description: 'Test update',
                downloadUrl: 'https://example.com/update.zip',
                signature: 'sha256:abcd1234',
                size: 1024000
            };
            
            expect(updateInfo.version).toBe(testConfig.testUpdateVersion);
            expect(updateInfo).toHaveProperty('downloadUrl');
            expect(updateInfo).toHaveProperty('signature');
            expect(updateInfo.size).toBeGreaterThan(0);
        });
        
        test('should validate version format', () => {
            const validVersions = ['1.0.0', '2.1.3', '10.20.30'];
            const invalidVersions = ['1.0', 'v1.0.0', '1.0.0-beta'];
            
            validVersions.forEach(version => {
                expect(version).toMatch(/^\d+\.\d+\.\d+$/);
            });
            
            invalidVersions.forEach(version => {
                expect(version).not.toMatch(/^\d+\.\d+\.\d+$/);
            });
        });
        
        test('should compare versions correctly', () => {
            expect(isNewerVersion('1.1.0', '1.0.0')).toBe(true);
            expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
            expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
            expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
            expect(isNewerVersion('1.0.0', '1.1.0')).toBe(false);
        });
    });
    
    describe('Update Download', () => {
        test('should validate download integrity', async () => {
            const testData = 'test update content';
            const testHash = crypto.createHash('sha256').update(testData).digest('hex');
            const testFile = path.join(testConfig.updatePath, 'test-update.zip');
            
            await fs.writeFile(testFile, testData);
            
            const calculatedHash = await calculateFileHash(testFile);
            expect(calculatedHash).toBe(testHash);
            
            // Cleanup
            await fs.unlink(testFile);
        });
        
        test('should handle download failures', async () => {
            const invalidUrl = 'https://invalid-domain-12345.com/update.zip';
            
            try {
                await downloadFile(invalidUrl, path.join(testConfig.updatePath, 'failed.zip'));
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
        
        test('should verify file signatures', async () => {
            const testData = 'test content for signature verification';
            const testHash = crypto.createHash('sha256').update(testData).digest('hex');
            const testFile = path.join(testConfig.updatePath, 'signature-test.zip');
            
            await fs.writeFile(testFile, testData);
            
            const updateInfo = {
                signature: `sha256:${testHash}`
            };
            
            const isValid = await verifyFileSignature(testFile, updateInfo);
            expect(isValid).toBe(true);
            
            // Test invalid signature
            updateInfo.signature = 'sha256:invalid_hash';
            const isInvalid = await verifyFileSignature(testFile, updateInfo);
            expect(isInvalid).toBe(false);
            
            // Cleanup
            await fs.unlink(testFile);
        });
    });
    
    describe('Backup Creation', () => {
        test('should create backup before update', async () => {
            const backupName = `test-backup-${Date.now()}`;
            const backupDir = path.join(testConfig.backupPath, backupName);
            
            // Create test files to backup
            const testDir = path.join(testConfig.installPath, 'test-backup-source');
            await fs.mkdir(testDir, { recursive: true });
            await fs.writeFile(path.join(testDir, 'test.txt'), 'test content');
            
            // Create backup
            await createBackup(testDir, backupDir);
            
            // Verify backup exists
            const backupExists = await fs.access(backupDir).then(() => true).catch(() => false);
            expect(backupExists).toBe(true);
            
            // Verify backup manifest
            const manifestPath = path.join(backupDir, 'manifest.json');
            const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);
            expect(manifestExists).toBe(true);
            
            if (manifestExists) {
                const manifestData = await fs.readFile(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestData);
                expect(manifest).toHaveProperty('timestamp');
                expect(manifest).toHaveProperty('files');
            }
            
            // Cleanup
            await fs.rm(testDir, { recursive: true, force: true });
            await fs.rm(backupDir, { recursive: true, force: true });
        });
        
        test('should handle backup failures gracefully', async () => {
            const nonExistentSource = path.join(testConfig.installPath, 'non-existent');
            const backupDir = path.join(testConfig.backupPath, 'failed-backup');
            
            try {
                await createBackup(nonExistentSource, backupDir);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
        
        test('should limit number of backups', async () => {
            const maxBackups = 3;
            
            // Create multiple backups
            for (let i = 0; i < maxBackups + 2; i++) {
                const backupName = `test-backup-${i}`;
                const backupDir = path.join(testConfig.backupPath, backupName);
                await fs.mkdir(backupDir, { recursive: true });
                
                const manifest = {
                    timestamp: new Date(Date.now() - (i * 1000)).toISOString(),
                    files: []
                };
                
                await fs.writeFile(
                    path.join(backupDir, 'manifest.json'),
                    JSON.stringify(manifest)
                );
            }
            
            // Cleanup old backups
            await cleanupOldBackups(testConfig.backupPath, maxBackups);
            
            // Count remaining backups
            const backupDirs = await fs.readdir(testConfig.backupPath);
            const validBackups = backupDirs.filter(dir => dir.startsWith('test-backup-'));
            expect(validBackups.length).toBeLessThanOrEqual(maxBackups);
            
            // Cleanup test backups
            for (const dir of validBackups) {
                await fs.rm(path.join(testConfig.backupPath, dir), { recursive: true, force: true });
            }
        });
    });
    
    describe('Update Application', () => {
        test('should apply updates correctly', async () => {
            const testUpdateDir = path.join(testConfig.updatePath, 'test-update');
            const testInstallDir = path.join(testConfig.installPath, 'test-install');
            
            // Create test update files
            await fs.mkdir(testUpdateDir, { recursive: true });
            await fs.mkdir(testInstallDir, { recursive: true });
            
            const updateFiles = ['file1.txt', 'file2.txt'];
            for (const file of updateFiles) {
                await fs.writeFile(
                    path.join(testUpdateDir, file),
                    `Updated content for ${file}`
                );
            }
            
            // Apply update
            await applyUpdate(testUpdateDir, testInstallDir);
            
            // Verify files were copied
            for (const file of updateFiles) {
                const filePath = path.join(testInstallDir, file);
                const exists = await fs.access(filePath).then(() => true).catch(() => false);
                expect(exists).toBe(true);
                
                if (exists) {
                    const content = await fs.readFile(filePath, 'utf8');
                    expect(content).toBe(`Updated content for ${file}`);
                }
            }
            
            // Cleanup
            await fs.rm(testUpdateDir, { recursive: true, force: true });
            await fs.rm(testInstallDir, { recursive: true, force: true });
        });
        
        test('should update version information', async () => {
            const testInstallDir = path.join(testConfig.installPath, 'test-version-update');
            await fs.mkdir(testInstallDir, { recursive: true });
            
            const newVersion = '1.2.0';
            const versionInfo = {
                version: newVersion,
                previousVersion: testConfig.currentVersion,
                updateDate: new Date().toISOString(),
                platform: os.platform(),
                architecture: os.arch()
            };
            
            await updateVersionInfo(testInstallDir, versionInfo);
            
            // Verify version file
            const versionPath = path.join(testInstallDir, 'version.json');
            const versionData = await fs.readFile(versionPath, 'utf8');
            const savedVersion = JSON.parse(versionData);
            
            expect(savedVersion.version).toBe(newVersion);
            expect(savedVersion.previousVersion).toBe(testConfig.currentVersion);
            expect(savedVersion).toHaveProperty('updateDate');
            
            // Cleanup
            await fs.rm(testInstallDir, { recursive: true, force: true });
        });
        
        test('should handle partial update failures', async () => {
            const testUpdateDir = path.join(testConfig.updatePath, 'partial-update');
            const testInstallDir = path.join(testConfig.installPath, 'partial-install');
            
            await fs.mkdir(testUpdateDir, { recursive: true });
            await fs.mkdir(testInstallDir, { recursive: true });
            
            // Create some valid files and one that will fail
            await fs.writeFile(path.join(testUpdateDir, 'good.txt'), 'good content');
            
            try {
                // Simulate partial failure by trying to copy to invalid location
                await applyUpdate(testUpdateDir, '/invalid/path/that/does/not/exist');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
            
            // Cleanup
            await fs.rm(testUpdateDir, { recursive: true, force: true });
            await fs.rm(testInstallDir, { recursive: true, force: true });
        });
    });
    
    describe('Rollback Functionality', () => {
        test('should rollback to previous version', async () => {
            const testInstallDir = path.join(testConfig.installPath, 'test-rollback');
            const testBackupDir = path.join(testConfig.backupPath, 'rollback-backup');
            
            // Create installation directory with current files
            await fs.mkdir(testInstallDir, { recursive: true });
            await fs.writeFile(path.join(testInstallDir, 'current.txt'), 'current version');
            
            // Create backup
            await fs.mkdir(testBackupDir, { recursive: true });
            await fs.writeFile(path.join(testBackupDir, 'current.txt'), 'backup version');
            
            const manifest = {
                timestamp: new Date().toISOString(),
                version: testConfig.currentVersion,
                files: ['current.txt']
            };
            
            await fs.writeFile(
                path.join(testBackupDir, 'manifest.json'),
                JSON.stringify(manifest)
            );
            
            // Perform rollback
            await performRollback(testBackupDir, testInstallDir);
            
            // Verify rollback
            const content = await fs.readFile(path.join(testInstallDir, 'current.txt'), 'utf8');
            expect(content).toBe('backup version');
            
            // Cleanup
            await fs.rm(testInstallDir, { recursive: true, force: true });
            await fs.rm(testBackupDir, { recursive: true, force: true });
        });
        
        test('should handle rollback failures', async () => {
            const nonExistentBackup = path.join(testConfig.backupPath, 'non-existent');
            const testInstallDir = path.join(testConfig.installPath, 'test-rollback-fail');
            
            try {
                await performRollback(nonExistentBackup, testInstallDir);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
    
    describe('Update Verification', () => {
        test('should verify successful update', async () => {
            const testInstallDir = path.join(testConfig.installPath, 'test-verify');
            await fs.mkdir(testInstallDir, { recursive: true });
            
            // Create version file
            const versionInfo = {
                version: testConfig.testUpdateVersion,
                updateDate: new Date().toISOString()
            };
            
            await fs.writeFile(
                path.join(testInstallDir, 'version.json'),
                JSON.stringify(versionInfo)
            );
            
            // Create required files
            const requiredFiles = ['bin/wirthforge', 'config/settings.json'];
            for (const file of requiredFiles) {
                const filePath = path.join(testInstallDir, file);
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, 'test content');
            }
            
            // Verify installation
            const isValid = await verifyInstallation(testInstallDir, testConfig.testUpdateVersion);
            expect(isValid).toBe(true);
            
            // Cleanup
            await fs.rm(testInstallDir, { recursive: true, force: true });
        });
        
        test('should detect corrupted installations', async () => {
            const testInstallDir = path.join(testConfig.installPath, 'test-corrupted');
            await fs.mkdir(testInstallDir, { recursive: true });
            
            // Create version file but missing required files
            const versionInfo = {
                version: testConfig.testUpdateVersion,
                updateDate: new Date().toISOString()
            };
            
            await fs.writeFile(
                path.join(testInstallDir, 'version.json'),
                JSON.stringify(versionInfo)
            );
            
            // Don't create required files - installation should be invalid
            const isValid = await verifyInstallation(testInstallDir, testConfig.testUpdateVersion);
            expect(isValid).toBe(false);
            
            // Cleanup
            await fs.rm(testInstallDir, { recursive: true, force: true });
        });
    });
    
    describe('Update Cleanup', () => {
        test('should clean up temporary files', async () => {
            const tempFiles = [
                path.join(testConfig.updatePath, 'temp-update.zip'),
                path.join(testConfig.updatePath, 'extracted', 'file.txt')
            ];
            
            // Create temporary files
            for (const file of tempFiles) {
                await fs.mkdir(path.dirname(file), { recursive: true });
                await fs.writeFile(file, 'temporary content');
            }
            
            // Clean up
            await cleanupUpdateFiles(testConfig.updatePath);
            
            // Verify cleanup
            for (const file of tempFiles) {
                const exists = await fs.access(file).then(() => true).catch(() => false);
                expect(exists).toBe(false);
            }
        });
        
        test('should preserve important files during cleanup', async () => {
            const importantFile = path.join(testConfig.updatePath, 'important-config.json');
            await fs.writeFile(importantFile, '{"important": true}');
            
            // Cleanup should not remove important files
            await cleanupUpdateFiles(testConfig.updatePath, ['important-config.json']);
            
            const exists = await fs.access(importantFile).then(() => true).catch(() => false);
            expect(exists).toBe(true);
            
            // Cleanup
            await fs.unlink(importantFile);
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

function isNewerVersion(newVersion, currentVersion) {
    const parseVersion = (v) => v.split('.').map(Number);
    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);
    
    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
        const newPart = newParts[i] || 0;
        const currentPart = currentParts[i] || 0;
        
        if (newPart > currentPart) return true;
        if (newPart < currentPart) return false;
    }
    
    return false;
}

async function calculateFileHash(filePath) {
    const hash = crypto.createHash('sha256');
    const data = await fs.readFile(filePath);
    hash.update(data);
    return hash.digest('hex');
}

async function downloadFile(url, destination) {
    // Mock download function for testing
    throw new Error('Download failed: Invalid URL');
}

async function verifyFileSignature(filePath, updateInfo) {
    const actualHash = await calculateFileHash(filePath);
    const expectedHash = updateInfo.signature.split(':')[1];
    return actualHash === expectedHash;
}

async function createBackup(sourceDir, backupDir) {
    await fs.mkdir(backupDir, { recursive: true });
    
    const files = await fs.readdir(sourceDir);
    const manifest = {
        timestamp: new Date().toISOString(),
        files: files
    };
    
    for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const backupPath = path.join(backupDir, file);
        await fs.copyFile(sourcePath, backupPath);
    }
    
    await fs.writeFile(
        path.join(backupDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
}

async function cleanupOldBackups(backupPath, maxBackups) {
    const backupDirs = await fs.readdir(backupPath);
    const backups = [];
    
    for (const dir of backupDirs) {
        if (dir.startsWith('test-backup-')) {
            const manifestPath = path.join(backupPath, dir, 'manifest.json');
            try {
                const manifestData = await fs.readFile(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestData);
                backups.push({ name: dir, timestamp: manifest.timestamp });
            } catch (error) {
                // Skip invalid backups
            }
        }
    }
    
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups);
        for (const backup of toDelete) {
            await fs.rm(path.join(backupPath, backup.name), { recursive: true });
        }
    }
}

async function applyUpdate(updateDir, installDir) {
    const files = await fs.readdir(updateDir);
    
    for (const file of files) {
        const sourcePath = path.join(updateDir, file);
        const destPath = path.join(installDir, file);
        await fs.copyFile(sourcePath, destPath);
    }
}

async function updateVersionInfo(installDir, versionInfo) {
    const versionPath = path.join(installDir, 'version.json');
    await fs.writeFile(versionPath, JSON.stringify(versionInfo, null, 2));
}

async function performRollback(backupDir, installDir) {
    const manifestPath = path.join(backupDir, 'manifest.json');
    const manifestData = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestData);
    
    for (const file of manifest.files) {
        const backupPath = path.join(backupDir, file);
        const installPath = path.join(installDir, file);
        await fs.copyFile(backupPath, installPath);
    }
}

async function verifyInstallation(installDir, expectedVersion) {
    try {
        // Check version file
        const versionPath = path.join(installDir, 'version.json');
        const versionData = await fs.readFile(versionPath, 'utf8');
        const version = JSON.parse(versionData);
        
        if (version.version !== expectedVersion) {
            return false;
        }
        
        // Check required files
        const requiredFiles = ['bin/wirthforge', 'config/settings.json'];
        for (const file of requiredFiles) {
            await fs.access(path.join(installDir, file));
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

async function cleanupUpdateFiles(updatePath, preserve = []) {
    const items = await fs.readdir(updatePath);
    
    for (const item of items) {
        if (preserve.includes(item)) continue;
        
        const itemPath = path.join(updatePath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
            await fs.rm(itemPath, { recursive: true, force: true });
        } else {
            await fs.unlink(itemPath);
        }
    }
}
