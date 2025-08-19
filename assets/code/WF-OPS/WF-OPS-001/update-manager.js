/**
 * WIRTHFORGE Update Manager
 * 
 * Handles automatic and manual updates with backup, verification, rollback,
 * and integrity checking for secure local-first updates.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

class WirthForgeUpdateManager {
    constructor(config = {}) {
        this.config = {
            installPath: config.installPath || this.getDefaultInstallPath(),
            updatePath: config.updatePath || path.join(this.getDefaultInstallPath(), 'updates'),
            backupPath: config.backupPath || path.join(this.getDefaultInstallPath(), 'backups'),
            logPath: config.logPath || path.join(this.getDefaultInstallPath(), 'logs'),
            updateServer: config.updateServer || 'https://updates.wirthforge.org',
            checkInterval: config.checkInterval || 86400000, // 24 hours
            autoUpdate: config.autoUpdate || false,
            maxBackups: config.maxBackups || 5,
            verifySignatures: config.verifySignatures !== false,
            ...config
        };
        
        this.currentVersion = '1.0.0';
        this.updateState = {
            checking: false,
            downloading: false,
            installing: false,
            available: null,
            progress: 0,
            error: null
        };
        
        this.updateTimer = null;
        this.callbacks = new Map();
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
     * Initialize update manager
     */
    async initialize() {
        await this.createDirectories();
        await this.loadCurrentVersion();
        
        if (this.config.autoUpdate) {
            this.startAutoUpdateCheck();
        }
        
        this.log('info', 'Update manager initialized');
    }
    
    /**
     * Create necessary directories
     */
    async createDirectories() {
        const dirs = [
            this.config.updatePath,
            this.config.backupPath,
            this.config.logPath
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }
    
    /**
     * Load current version from installation
     */
    async loadCurrentVersion() {
        try {
            const versionFile = path.join(this.config.installPath, 'version.json');
            const versionData = await fs.readFile(versionFile, 'utf8');
            const version = JSON.parse(versionData);
            this.currentVersion = version.version || '1.0.0';
        } catch (error) {
            this.log('warn', 'Could not load version file, using default');
        }
    }
    
    /**
     * Start automatic update checking
     */
    startAutoUpdateCheck() {
        this.updateTimer = setInterval(() => {
            this.checkForUpdates().catch(error => {
                this.logError('Auto update check failed', error);
            });
        }, this.config.checkInterval);
        
        this.log('info', 'Auto update checking enabled');
    }
    
    /**
     * Stop automatic update checking
     */
    stopAutoUpdateCheck() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    /**
     * Check for available updates
     */
    async checkForUpdates() {
        if (this.updateState.checking) {
            return this.updateState.available;
        }
        
        this.updateState.checking = true;
        this.updateState.error = null;
        
        try {
            this.log('info', 'Checking for updates...');
            
            const updateInfo = await this.fetchUpdateInfo();
            
            if (this.isNewerVersion(updateInfo.version, this.currentVersion)) {
                this.updateState.available = updateInfo;
                this.log('info', `Update available: ${updateInfo.version}`);
                this.emit('updateAvailable', updateInfo);
            } else {
                this.updateState.available = null;
                this.log('info', 'No updates available');
            }
            
            return this.updateState.available;
            
        } catch (error) {
            this.updateState.error = error.message;
            this.logError('Update check failed', error);
            throw error;
        } finally {
            this.updateState.checking = false;
        }
    }
    
    /**
     * Fetch update information from server
     */
    async fetchUpdateInfo() {
        // Simulate update server response
        return {
            version: '1.1.0',
            releaseDate: new Date().toISOString(),
            description: 'Bug fixes and performance improvements',
            downloadUrl: 'https://updates.wirthforge.org/v1.1.0/wirthforge-1.1.0.zip',
            signature: 'sha256:abcd1234...',
            size: 52428800, // 50MB
            critical: false,
            changelog: [
                'Fixed memory leak in AI model loading',
                'Improved startup performance',
                'Enhanced security features'
            ],
            requirements: {
                minVersion: '1.0.0',
                platform: os.platform(),
                architecture: os.arch()
            }
        };
    }
    
    /**
     * Compare version strings
     */
    isNewerVersion(newVersion, currentVersion) {
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
    
    /**
     * Download and install update
     */
    async installUpdate(updateInfo = null) {
        if (!updateInfo) {
            updateInfo = this.updateState.available;
        }
        
        if (!updateInfo) {
            throw new Error('No update available');
        }
        
        if (this.updateState.installing) {
            throw new Error('Update already in progress');
        }
        
        this.updateState.installing = true;
        this.updateState.progress = 0;
        this.updateState.error = null;
        
        try {
            this.log('info', `Starting update to version ${updateInfo.version}`);
            
            // Create backup
            const backupPath = await this.createBackup();
            this.updateState.progress = 20;
            
            // Download update
            const updateFile = await this.downloadUpdate(updateInfo);
            this.updateState.progress = 50;
            
            // Verify update
            await this.verifyUpdate(updateFile, updateInfo);
            this.updateState.progress = 60;
            
            // Extract and apply update
            await this.applyUpdate(updateFile, updateInfo);
            this.updateState.progress = 90;
            
            // Verify installation
            await this.verifyInstallation(updateInfo);
            this.updateState.progress = 100;
            
            // Cleanup
            await this.cleanupUpdate(updateFile);
            
            this.log('info', `Update to version ${updateInfo.version} completed successfully`);
            this.emit('updateCompleted', updateInfo);
            
            return { success: true, version: updateInfo.version, backupPath };
            
        } catch (error) {
            this.updateState.error = error.message;
            this.logError('Update failed', error);
            
            // Attempt rollback
            try {
                await this.rollbackUpdate();
                this.log('info', 'Rollback completed successfully');
            } catch (rollbackError) {
                this.logError('Rollback failed', rollbackError);
            }
            
            throw error;
        } finally {
            this.updateState.installing = false;
            this.updateState.progress = 0;
        }
    }
    
    /**
     * Create backup of current installation
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${this.currentVersion}-${timestamp}`;
        const backupPath = path.join(this.config.backupPath, backupName);
        
        this.log('info', 'Creating backup...');
        
        await fs.mkdir(backupPath, { recursive: true });
        
        // Copy critical files
        const criticalPaths = [
            'bin',
            'lib',
            'config',
            'version.json'
        ];
        
        for (const criticalPath of criticalPaths) {
            const sourcePath = path.join(this.config.installPath, criticalPath);
            const destPath = path.join(backupPath, criticalPath);
            
            try {
                await this.copyRecursive(sourcePath, destPath);
            } catch (error) {
                this.log('warn', `Could not backup ${criticalPath}: ${error.message}`);
            }
        }
        
        // Save backup metadata
        const backupInfo = {
            version: this.currentVersion,
            timestamp: new Date().toISOString(),
            platform: os.platform(),
            architecture: os.arch(),
            paths: criticalPaths
        };
        
        await fs.writeFile(
            path.join(backupPath, 'backup-info.json'),
            JSON.stringify(backupInfo, null, 2)
        );
        
        // Cleanup old backups
        await this.cleanupOldBackups();
        
        this.log('info', `Backup created: ${backupPath}`);
        return backupPath;
    }
    
    /**
     * Download update file
     */
    async downloadUpdate(updateInfo) {
        const updateFile = path.join(this.config.updatePath, `update-${updateInfo.version}.zip`);
        
        this.log('info', 'Downloading update...');
        
        // Simulate download (replace with actual HTTP download)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create dummy update file for demo
        await fs.writeFile(updateFile, 'dummy update content');
        
        this.log('info', `Update downloaded: ${updateFile}`);
        return updateFile;
    }
    
    /**
     * Verify update integrity
     */
    async verifyUpdate(updateFile, updateInfo) {
        if (!this.config.verifySignatures) {
            this.log('warn', 'Signature verification disabled');
            return;
        }
        
        this.log('info', 'Verifying update integrity...');
        
        // Calculate file hash
        const fileData = await fs.readFile(updateFile);
        const hash = crypto.createHash('sha256').update(fileData).digest('hex');
        
        // Extract expected hash from signature
        const expectedHash = updateInfo.signature.split(':')[1];
        
        if (hash !== expectedHash) {
            throw new Error('Update integrity verification failed');
        }
        
        this.log('info', 'Update integrity verified');
    }
    
    /**
     * Apply update to installation
     */
    async applyUpdate(updateFile, updateInfo) {
        this.log('info', 'Applying update...');
        
        // Extract update (simplified)
        const extractPath = path.join(this.config.updatePath, 'extracted');
        await fs.mkdir(extractPath, { recursive: true });
        
        // Simulate extraction and file copying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update version file
        const versionInfo = {
            version: updateInfo.version,
            previousVersion: this.currentVersion,
            updateDate: new Date().toISOString(),
            platform: os.platform(),
            architecture: os.arch()
        };
        
        await fs.writeFile(
            path.join(this.config.installPath, 'version.json'),
            JSON.stringify(versionInfo, null, 2)
        );
        
        this.currentVersion = updateInfo.version;
        
        this.log('info', 'Update applied successfully');
    }
    
    /**
     * Verify installation after update
     */
    async verifyInstallation(updateInfo) {
        this.log('info', 'Verifying installation...');
        
        // Check critical files exist
        const criticalFiles = [
            'bin/wirthforge',
            'version.json'
        ];
        
        for (const file of criticalFiles) {
            const filePath = path.join(this.config.installPath, file);
            try {
                await fs.access(filePath);
            } catch (error) {
                throw new Error(`Critical file missing after update: ${file}`);
            }
        }
        
        // Verify version
        await this.loadCurrentVersion();
        if (this.currentVersion !== updateInfo.version) {
            throw new Error('Version verification failed after update');
        }
        
        this.log('info', 'Installation verification completed');
    }
    
    /**
     * Rollback to previous version
     */
    async rollbackUpdate() {
        this.log('info', 'Starting rollback...');
        
        // Find most recent backup
        const backups = await this.getAvailableBackups();
        if (backups.length === 0) {
            throw new Error('No backups available for rollback');
        }
        
        const latestBackup = backups[0];
        const backupPath = path.join(this.config.backupPath, latestBackup.name);
        
        // Restore from backup
        const criticalPaths = ['bin', 'lib', 'config', 'version.json'];
        
        for (const criticalPath of criticalPaths) {
            const sourcePath = path.join(backupPath, criticalPath);
            const destPath = path.join(this.config.installPath, criticalPath);
            
            try {
                await fs.rm(destPath, { recursive: true, force: true });
                await this.copyRecursive(sourcePath, destPath);
            } catch (error) {
                this.log('warn', `Could not restore ${criticalPath}: ${error.message}`);
            }
        }
        
        await this.loadCurrentVersion();
        
        this.log('info', `Rollback completed to version ${this.currentVersion}`);
    }
    
    /**
     * Get available backups
     */
    async getAvailableBackups() {
        try {
            const backupDirs = await fs.readdir(this.config.backupPath);
            const backups = [];
            
            for (const dir of backupDirs) {
                const backupInfoPath = path.join(this.config.backupPath, dir, 'backup-info.json');
                try {
                    const backupInfo = JSON.parse(await fs.readFile(backupInfoPath, 'utf8'));
                    backups.push({
                        name: dir,
                        ...backupInfo
                    });
                } catch (error) {
                    this.log('warn', `Could not read backup info for ${dir}`);
                }
            }
            
            return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            return [];
        }
    }
    
    /**
     * Cleanup old backups
     */
    async cleanupOldBackups() {
        const backups = await this.getAvailableBackups();
        
        if (backups.length > this.config.maxBackups) {
            const toDelete = backups.slice(this.config.maxBackups);
            
            for (const backup of toDelete) {
                const backupPath = path.join(this.config.backupPath, backup.name);
                try {
                    await fs.rm(backupPath, { recursive: true });
                    this.log('info', `Deleted old backup: ${backup.name}`);
                } catch (error) {
                    this.log('warn', `Could not delete backup ${backup.name}: ${error.message}`);
                }
            }
        }
    }
    
    /**
     * Cleanup update files
     */
    async cleanupUpdate(updateFile) {
        try {
            await fs.unlink(updateFile);
            
            const extractPath = path.join(this.config.updatePath, 'extracted');
            await fs.rm(extractPath, { recursive: true, force: true });
            
            this.log('info', 'Update cleanup completed');
        } catch (error) {
            this.log('warn', `Update cleanup failed: ${error.message}`);
        }
    }
    
    /**
     * Copy files recursively
     */
    async copyRecursive(src, dest) {
        const stat = await fs.stat(src);
        
        if (stat.isDirectory()) {
            await fs.mkdir(dest, { recursive: true });
            const files = await fs.readdir(src);
            
            for (const file of files) {
                await this.copyRecursive(
                    path.join(src, file),
                    path.join(dest, file)
                );
            }
        } else {
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.copyFile(src, dest);
        }
    }
    
    /**
     * Get update status
     */
    getStatus() {
        return {
            currentVersion: this.currentVersion,
            ...this.updateState,
            autoUpdate: this.config.autoUpdate,
            lastCheck: this.lastCheck
        };
    }
    
    /**
     * Event emitter functionality
     */
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }
    
    emit(event, data) {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.logError('Event callback error', error);
                }
            });
        }
    }
    
    /**
     * Shutdown update manager
     */
    async shutdown() {
        this.stopAutoUpdateCheck();
        this.log('info', 'Update manager shutdown');
    }
    
    /**
     * Logging methods
     */
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] UPDATE ${level.toUpperCase()}: ${message}`);
        
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

module.exports = WirthForgeUpdateManager;
