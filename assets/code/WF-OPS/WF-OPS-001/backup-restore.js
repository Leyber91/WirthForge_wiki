/**
 * WIRTHFORGE Backup & Restore System
 * 
 * Automated backup creation, restoration, and data integrity management
 * for WIRTHFORGE installations with encryption and compression support.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const os = require('os');
const { pipeline } = require('stream');

const pipelineAsync = promisify(pipeline);

class WirthForgeBackupRestore {
    constructor(config = {}) {
        this.config = {
            installPath: config.installPath || this.getDefaultInstallPath(),
            backupPath: config.backupPath || path.join(this.getDefaultInstallPath(), 'backups'),
            dataPath: config.dataPath || path.join(this.getDefaultInstallPath(), 'data'),
            maxBackups: config.maxBackups || 10,
            compressionLevel: config.compressionLevel || 6,
            encryptBackups: config.encryptBackups !== false,
            backupSchedule: config.backupSchedule || 'daily',
            excludePatterns: config.excludePatterns || ['*.tmp', '*.log', 'node_modules'],
            ...config
        };
        
        this.backupTimer = null;
        this.isBackupRunning = false;
        this.isRestoreRunning = false;
        this.encryptionKey = null;
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
     * Initialize backup system
     */
    async initialize() {
        await fs.mkdir(this.config.backupPath, { recursive: true });
        
        if (this.config.encryptBackups) {
            await this.initializeEncryption();
        }
        
        if (this.config.backupSchedule !== 'manual') {
            this.startScheduledBackups();
        }
        
        this.log('info', 'Backup system initialized');
    }
    
    /**
     * Initialize encryption for backups
     */
    async initializeEncryption() {
        const keyPath = path.join(this.config.backupPath, '.backup-key');
        
        try {
            // Try to load existing key
            const keyData = await fs.readFile(keyPath);
            this.encryptionKey = keyData;
        } catch (error) {
            // Generate new encryption key
            this.encryptionKey = crypto.randomBytes(32);
            await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
            this.log('info', 'Generated new backup encryption key');
        }
    }
    
    /**
     * Start scheduled backups
     */
    startScheduledBackups() {
        const intervals = {
            hourly: 60 * 60 * 1000,
            daily: 24 * 60 * 60 * 1000,
            weekly: 7 * 24 * 60 * 60 * 1000
        };
        
        const interval = intervals[this.config.backupSchedule];
        if (!interval) {
            this.log('warn', `Invalid backup schedule: ${this.config.backupSchedule}`);
            return;
        }
        
        this.backupTimer = setInterval(() => {
            this.createBackup().catch(error => {
                this.logError('Scheduled backup failed', error);
            });
        }, interval);
        
        this.log('info', `Scheduled backups enabled: ${this.config.backupSchedule}`);
    }
    
    /**
     * Stop scheduled backups
     */
    stopScheduledBackups() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
            this.log('info', 'Scheduled backups stopped');
        }
    }
    
    /**
     * Create a complete backup
     */
    async createBackup(options = {}) {
        if (this.isBackupRunning) {
            throw new Error('Backup already in progress');
        }
        
        this.isBackupRunning = true;
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = options.name || `backup-${timestamp}`;
            const backupDir = path.join(this.config.backupPath, backupName);
            
            this.log('info', `Creating backup: ${backupName}`);
            
            await fs.mkdir(backupDir, { recursive: true });
            
            // Create backup manifest
            const manifest = {
                name: backupName,
                timestamp: new Date().toISOString(),
                version: await this.getCurrentVersion(),
                platform: os.platform(),
                architecture: os.arch(),
                type: options.type || 'full',
                encrypted: this.config.encryptBackups,
                compressed: true,
                files: []
            };
            
            // Backup critical directories
            const backupPaths = [
                { source: 'config', priority: 'high' },
                { source: 'data', priority: 'high' },
                { source: 'bin', priority: 'medium' },
                { source: 'web-ui', priority: 'medium' },
                { source: 'version.json', priority: 'high', isFile: true }
            ];
            
            for (const { source, priority, isFile } of backupPaths) {
                const sourcePath = path.join(this.config.installPath, source);
                const backupFile = `${source.replace(/[/\\]/g, '_')}.backup`;
                const backupFilePath = path.join(backupDir, backupFile);
                
                try {
                    await fs.access(sourcePath);
                    
                    if (isFile) {
                        await this.backupFile(sourcePath, backupFilePath);
                    } else {
                        await this.backupDirectory(sourcePath, backupFilePath);
                    }
                    
                    const stats = await fs.stat(backupFilePath);
                    manifest.files.push({
                        source,
                        backupFile,
                        size: stats.size,
                        priority,
                        checksum: await this.calculateChecksum(backupFilePath)
                    });
                    
                    this.log('debug', `Backed up: ${source}`);
                } catch (error) {
                    this.log('warn', `Could not backup ${source}: ${error.message}`);
                    manifest.files.push({
                        source,
                        error: error.message,
                        priority
                    });
                }
            }
            
            // Save manifest
            const manifestPath = path.join(backupDir, 'manifest.json');
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
            
            // Calculate total backup size
            manifest.totalSize = await this.getDirectorySize(backupDir);
            manifest.completed = true;
            
            // Update manifest with final info
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
            
            // Cleanup old backups
            await this.cleanupOldBackups();
            
            this.log('info', `Backup completed: ${backupName} (${this.formatBytes(manifest.totalSize)})`);
            
            return {
                name: backupName,
                path: backupDir,
                manifest
            };
            
        } catch (error) {
            this.logError('Backup creation failed', error);
            throw error;
        } finally {
            this.isBackupRunning = false;
        }
    }
    
    /**
     * Backup a single file
     */
    async backupFile(sourcePath, backupPath) {
        const readStream = require('fs').createReadStream(sourcePath);
        const writeStream = require('fs').createWriteStream(backupPath);
        
        let stream = readStream;
        
        // Add compression
        const gzipStream = zlib.createGzip({ level: this.config.compressionLevel });
        stream = stream.pipe(gzipStream);
        
        // Add encryption if enabled
        if (this.config.encryptBackups && this.encryptionKey) {
            const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
            stream = stream.pipe(cipher);
        }
        
        await pipelineAsync(stream, writeStream);
    }
    
    /**
     * Backup a directory
     */
    async backupDirectory(sourcePath, backupPath) {
        const files = await this.getDirectoryFiles(sourcePath);
        const archive = require('fs').createWriteStream(backupPath);
        
        let stream = archive;
        
        // Add compression
        const gzipStream = zlib.createGzip({ level: this.config.compressionLevel });
        stream = gzipStream.pipe(stream);
        
        // Add encryption if enabled
        if (this.config.encryptBackups && this.encryptionKey) {
            const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
            stream = cipher.pipe(stream);
        }
        
        // Create simple tar-like format
        for (const file of files) {
            const relativePath = path.relative(sourcePath, file);
            const stats = await fs.stat(file);
            const content = await fs.readFile(file);
            
            // Write file header
            const header = JSON.stringify({
                path: relativePath,
                size: stats.size,
                mode: stats.mode,
                mtime: stats.mtime.toISOString()
            }) + '\n';
            
            gzipStream.write(Buffer.from(header));
            gzipStream.write(content);
            gzipStream.write(Buffer.from('\n---FILE-END---\n'));
        }
        
        gzipStream.end();
        
        return new Promise((resolve, reject) => {
            archive.on('finish', resolve);
            archive.on('error', reject);
        });
    }
    
    /**
     * Restore from backup
     */
    async restoreBackup(backupName, options = {}) {
        if (this.isRestoreRunning) {
            throw new Error('Restore already in progress');
        }
        
        this.isRestoreRunning = true;
        
        try {
            const backupDir = path.join(this.config.backupPath, backupName);
            const manifestPath = path.join(backupDir, 'manifest.json');
            
            this.log('info', `Starting restore from backup: ${backupName}`);
            
            // Load backup manifest
            const manifestData = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);
            
            // Verify backup integrity
            if (!options.skipVerification) {
                await this.verifyBackupIntegrity(backupDir, manifest);
            }
            
            // Create restore point before restoring
            if (!options.skipRestorePoint) {
                await this.createRestorePoint();
            }
            
            // Restore files
            const restoredFiles = [];
            const failedFiles = [];
            
            for (const fileInfo of manifest.files) {
                if (fileInfo.error) {
                    this.log('warn', `Skipping file with backup error: ${fileInfo.source}`);
                    continue;
                }
                
                try {
                    const backupFilePath = path.join(backupDir, fileInfo.backupFile);
                    const restorePath = path.join(this.config.installPath, fileInfo.source);
                    
                    if (fileInfo.source.includes('.')) {
                        // Single file
                        await this.restoreFile(backupFilePath, restorePath);
                    } else {
                        // Directory
                        await this.restoreDirectory(backupFilePath, restorePath);
                    }
                    
                    restoredFiles.push(fileInfo.source);
                    this.log('debug', `Restored: ${fileInfo.source}`);
                    
                } catch (error) {
                    this.log('error', `Failed to restore ${fileInfo.source}: ${error.message}`);
                    failedFiles.push({ source: fileInfo.source, error: error.message });
                }
            }
            
            this.log('info', `Restore completed: ${restoredFiles.length} files restored, ${failedFiles.length} failed`);
            
            return {
                success: true,
                backupName,
                restoredFiles,
                failedFiles,
                manifest
            };
            
        } catch (error) {
            this.logError('Restore failed', error);
            throw error;
        } finally {
            this.isRestoreRunning = false;
        }
    }
    
    /**
     * Restore a single file
     */
    async restoreFile(backupPath, restorePath) {
        const readStream = require('fs').createReadStream(backupPath);
        
        let stream = readStream;
        
        // Add decryption if needed
        if (this.config.encryptBackups && this.encryptionKey) {
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            stream = stream.pipe(decipher);
        }
        
        // Add decompression
        const gunzipStream = zlib.createGunzip();
        stream = stream.pipe(gunzipStream);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(restorePath), { recursive: true });
        
        const writeStream = require('fs').createWriteStream(restorePath);
        await pipelineAsync(stream, writeStream);
    }
    
    /**
     * Restore a directory
     */
    async restoreDirectory(backupPath, restorePath) {
        const readStream = require('fs').createReadStream(backupPath);
        
        let stream = readStream;
        
        // Add decryption if needed
        if (this.config.encryptBackups && this.encryptionKey) {
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            stream = stream.pipe(decipher);
        }
        
        // Add decompression
        const gunzipStream = zlib.createGunzip();
        stream = stream.pipe(gunzipStream);
        
        // Ensure directory exists
        await fs.mkdir(restorePath, { recursive: true });
        
        // Parse archive format
        let buffer = Buffer.alloc(0);
        
        return new Promise((resolve, reject) => {
            stream.on('data', async (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
                
                // Process complete files
                let endMarker;
                while ((endMarker = buffer.indexOf('\n---FILE-END---\n')) !== -1) {
                    const fileData = buffer.slice(0, endMarker);
                    buffer = buffer.slice(endMarker + 16); // Skip marker
                    
                    try {
                        const headerEnd = fileData.indexOf('\n');
                        const header = JSON.parse(fileData.slice(0, headerEnd).toString());
                        const content = fileData.slice(headerEnd + 1);
                        
                        const filePath = path.join(restorePath, header.path);
                        await fs.mkdir(path.dirname(filePath), { recursive: true });
                        await fs.writeFile(filePath, content, { mode: header.mode });
                        
                        // Restore modification time
                        const mtime = new Date(header.mtime);
                        await fs.utimes(filePath, mtime, mtime);
                        
                    } catch (error) {
                        this.log('warn', `Failed to restore file from archive: ${error.message}`);
                    }
                }
            });
            
            stream.on('end', resolve);
            stream.on('error', reject);
        });
    }
    
    /**
     * Verify backup integrity
     */
    async verifyBackupIntegrity(backupDir, manifest) {
        this.log('info', 'Verifying backup integrity...');
        
        for (const fileInfo of manifest.files) {
            if (fileInfo.error || !fileInfo.checksum) continue;
            
            const backupFilePath = path.join(backupDir, fileInfo.backupFile);
            
            try {
                const actualChecksum = await this.calculateChecksum(backupFilePath);
                
                if (actualChecksum !== fileInfo.checksum) {
                    throw new Error(`Checksum mismatch for ${fileInfo.source}`);
                }
            } catch (error) {
                throw new Error(`Integrity verification failed for ${fileInfo.source}: ${error.message}`);
            }
        }
        
        this.log('info', 'Backup integrity verified');
    }
    
    /**
     * Create restore point before major operations
     */
    async createRestorePoint() {
        const restorePointName = `restore-point-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        
        this.log('info', 'Creating restore point...');
        
        return this.createBackup({
            name: restorePointName,
            type: 'restore-point'
        });
    }
    
    /**
     * List available backups
     */
    async listBackups() {
        try {
            const backupDirs = await fs.readdir(this.config.backupPath);
            const backups = [];
            
            for (const dir of backupDirs) {
                if (dir.startsWith('.')) continue;
                
                const manifestPath = path.join(this.config.backupPath, dir, 'manifest.json');
                
                try {
                    const manifestData = await fs.readFile(manifestPath, 'utf8');
                    const manifest = JSON.parse(manifestData);
                    
                    backups.push({
                        name: dir,
                        ...manifest,
                        path: path.join(this.config.backupPath, dir)
                    });
                } catch (error) {
                    this.log('warn', `Could not read manifest for backup ${dir}`);
                }
            }
            
            return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            this.logError('Failed to list backups', error);
            return [];
        }
    }
    
    /**
     * Delete a backup
     */
    async deleteBackup(backupName) {
        const backupDir = path.join(this.config.backupPath, backupName);
        
        try {
            await fs.rm(backupDir, { recursive: true });
            this.log('info', `Deleted backup: ${backupName}`);
        } catch (error) {
            this.logError(`Failed to delete backup ${backupName}`, error);
            throw error;
        }
    }
    
    /**
     * Cleanup old backups based on retention policy
     */
    async cleanupOldBackups() {
        const backups = await this.listBackups();
        
        if (backups.length > this.config.maxBackups) {
            const toDelete = backups.slice(this.config.maxBackups);
            
            for (const backup of toDelete) {
                try {
                    await this.deleteBackup(backup.name);
                } catch (error) {
                    this.log('warn', `Could not delete old backup ${backup.name}: ${error.message}`);
                }
            }
        }
    }
    
    /**
     * Get current version
     */
    async getCurrentVersion() {
        try {
            const versionPath = path.join(this.config.installPath, 'version.json');
            const versionData = await fs.readFile(versionPath, 'utf8');
            const version = JSON.parse(versionData);
            return version.version || '1.0.0';
        } catch (error) {
            return '1.0.0';
        }
    }
    
    /**
     * Get all files in directory recursively
     */
    async getDirectoryFiles(dirPath) {
        const files = [];
        
        async function scan(currentPath) {
            const entries = await fs.readdir(currentPath);
            
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry);
                const stats = await fs.stat(fullPath);
                
                if (stats.isDirectory()) {
                    await scan(fullPath);
                } else {
                    files.push(fullPath);
                }
            }
        }
        
        await scan(dirPath);
        return files;
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
     * Calculate file checksum
     */
    async calculateChecksum(filePath) {
        const hash = crypto.createHash('sha256');
        const stream = require('fs').createReadStream(filePath);
        
        return new Promise((resolve, reject) => {
            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
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
     * Shutdown backup system
     */
    async shutdown() {
        this.stopScheduledBackups();
        this.log('info', 'Backup system shutdown');
    }
    
    /**
     * Logging methods
     */
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] BACKUP ${level.toUpperCase()}: ${message}`);
        
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

module.exports = WirthForgeBackupRestore;
