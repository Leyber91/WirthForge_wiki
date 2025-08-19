/**
 * WIRTHFORGE Platform-Specific Installation Scripts
 * 
 * Cross-platform installation utilities with platform-specific implementations
 * for Windows, macOS, and Linux systems. Handles system integration, service
 * management, security configuration, and native OS features.
 */

const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PlatformScripts {
    constructor(config = {}) {
        this.platform = os.platform();
        this.arch = os.arch();
        this.config = {
            installPath: config.installPath || this.getDefaultInstallPath(),
            serviceName: config.serviceName || 'wirthforge',
            displayName: config.displayName || 'WIRTHFORGE',
            description: config.description || 'WIRTHFORGE Local AI Assistant',
            port: config.port || 9443,
            user: config.user || os.userInfo().username,
            ...config
        };
        
        this.scripts = this.getPlatformScripts();
    }
    
    getPlatformScripts() {
        switch (this.platform) {
            case 'win32':
                return new WindowsScripts(this.config);
            case 'darwin':
                return new MacOSScripts(this.config);
            case 'linux':
                return new LinuxScripts(this.config);
            default:
                throw new Error(`Unsupported platform: ${this.platform}`);
        }
    }
    
    getDefaultInstallPath() {
        const homeDir = os.homedir();
        
        switch (this.platform) {
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
    
    // Delegate methods to platform-specific implementations
    async install() { return this.scripts.install(); }
    async uninstall() { return this.scripts.uninstall(); }
    async createService() { return this.scripts.createService(); }
    async removeService() { return this.scripts.removeService(); }
    async startService() { return this.scripts.startService(); }
    async stopService() { return this.scripts.stopService(); }
    async configureSystem() { return this.scripts.configureSystem(); }
    async setupSecurity() { return this.scripts.setupSecurity(); }
    async createShortcuts() { return this.scripts.createShortcuts(); }
    async configureFirewall() { return this.scripts.configureFirewall(); }
}

/**
 * Windows-specific implementation
 */
class WindowsScripts {
    constructor(config) {
        this.config = config;
    }
    
    async install() {
        const steps = [
            'Creating installation directory',
            'Setting up Windows service',
            'Configuring firewall rules',
            'Creating desktop shortcuts',
            'Registering with Windows'
        ];
        
        const results = [];
        for (const step of steps) {
            try {
                const result = await this.executeStep(step);
                results.push({ step, success: true, result });
            } catch (error) {
                results.push({ step, success: false, error: error.message });
                throw new Error(`Installation failed at: ${step} - ${error.message}`);
            }
        }
        return results;
    }
    
    async executeStep(step) {
        switch (step) {
            case 'Creating installation directory':
                return this.createInstallDirectory();
            case 'Setting up Windows service':
                return this.createService();
            case 'Configuring firewall rules':
                return this.configureFirewall();
            case 'Creating desktop shortcuts':
                return this.createShortcuts();
            case 'Registering with Windows':
                return this.registerWithWindows();
        }
    }
    
    async createInstallDirectory() {
        await fs.mkdir(this.config.installPath, { recursive: true });
        const cmd = `icacls "${this.config.installPath}" /grant "${this.config.user}:(OI)(CI)F"`;
        await execAsync(cmd);
        return `Created directory: ${this.config.installPath}`;
    }
    
    async createService() {
        const servicePath = path.join(this.config.installPath, 'bin', 'wirthforge.exe');
        const createCmd = `sc create "${this.config.serviceName}" binPath= "${servicePath} --service" DisplayName= "${this.config.displayName}" start= auto`;
        await execAsync(createCmd);
        
        const descCmd = `sc description "${this.config.serviceName}" "${this.config.description}"`;
        await execAsync(descCmd);
        
        return `Created Windows service: ${this.config.serviceName}`;
    }
    
    async configureFirewall() {
        const rules = [
            { name: 'WIRTHFORGE-HTTPS-In', port: this.config.port, protocol: 'TCP' },
            { name: 'WIRTHFORGE-WebSocket-In', port: this.config.port + 1, protocol: 'TCP' }
        ];
        
        const results = [];
        for (const rule of rules) {
            const cmd = `netsh advfirewall firewall add rule name="${rule.name}" dir=in action=allow protocol=${rule.protocol} localport=${rule.port}`;
            try {
                await execAsync(cmd);
                results.push(`Created firewall rule: ${rule.name}`);
            } catch (error) {
                results.push(`Firewall rule exists: ${rule.name}`);
            }
        }
        return results;
    }
    
    async createShortcuts() {
        const shortcuts = [
            { location: path.join(os.homedir(), 'Desktop'), name: 'WIRTHFORGE.lnk' },
            { location: path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'), name: 'WIRTHFORGE.lnk' }
        ];
        
        const results = [];
        for (const shortcut of shortcuts) {
            const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${path.join(shortcut.location, shortcut.name)}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "https://localhost:${this.config.port}"
oLink.Description = "${this.config.description}"
oLink.Save
`;
            
            const scriptPath = path.join(os.tmpdir(), 'create_shortcut.vbs');
            await fs.writeFile(scriptPath, vbsScript);
            
            try {
                await execAsync(`cscript "${scriptPath}"`);
                results.push(`Created shortcut: ${shortcut.location}`);
            } catch (error) {
                results.push(`Failed to create shortcut: ${error.message}`);
            } finally {
                await fs.unlink(scriptPath).catch(() => {});
            }
        }
        return results;
    }
    
    async registerWithWindows() {
        const cmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\WIRTHFORGE" /v "DisplayName" /t REG_SZ /d "${this.config.displayName}" /f`;
        await execAsync(cmd);
        return 'Registered with Windows';
    }
    
    async startService() {
        await execAsync(`sc start "${this.config.serviceName}"`);
        return `Started service: ${this.config.serviceName}`;
    }
    
    async stopService() {
        await execAsync(`sc stop "${this.config.serviceName}"`);
        return `Stopped service: ${this.config.serviceName}`;
    }
    
    async removeService() {
        try { await this.stopService(); } catch (error) {}
        await execAsync(`sc delete "${this.config.serviceName}"`);
        return `Removed Windows service: ${this.config.serviceName}`;
    }
    
    async setupSecurity() {
        const commands = [
            `icacls "${this.config.installPath}" /inheritance:r`,
            `icacls "${this.config.installPath}" /grant:r "${this.config.user}:(OI)(CI)F"`
        ];
        
        const results = [];
        for (const cmd of commands) {
            try {
                await execAsync(cmd);
                results.push('Applied security setting');
            } catch (error) {
                results.push(`Security setting failed: ${error.message}`);
            }
        }
        return results;
    }
    
    async configureSystem() {
        return [
            await this.registerWithWindows(),
            await this.configureFirewall()
        ].flat();
    }
    
    async uninstall() {
        const results = [];
        try { results.push(await this.stopService()); } catch (e) {}
        try { results.push(await this.removeService()); } catch (e) {}
        try { await fs.rmdir(this.config.installPath, { recursive: true }); } catch (e) {}
        return results;
    }
}

/**
 * macOS-specific implementation
 */
class MacOSScripts {
    constructor(config) {
        this.config = config;
    }
    
    async install() {
        const steps = [
            'Creating application bundle',
            'Setting up LaunchAgent',
            'Configuring security',
            'Creating shortcuts'
        ];
        
        const results = [];
        for (const step of steps) {
            try {
                const result = await this.executeStep(step);
                results.push({ step, success: true, result });
            } catch (error) {
                results.push({ step, success: false, error: error.message });
                throw new Error(`Installation failed at: ${step} - ${error.message}`);
            }
        }
        return results;
    }
    
    async executeStep(step) {
        switch (step) {
            case 'Creating application bundle':
                return this.createApplicationBundle();
            case 'Setting up LaunchAgent':
                return this.createService();
            case 'Configuring security':
                return this.setupSecurity();
            case 'Creating shortcuts':
                return this.createShortcuts();
        }
    }
    
    async createApplicationBundle() {
        const appPath = path.join(this.config.installPath, 'WIRTHFORGE.app');
        const contentsPath = path.join(appPath, 'Contents');
        const macOSPath = path.join(contentsPath, 'MacOS');
        
        await fs.mkdir(macOSPath, { recursive: true });
        
        const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>wirthforge</string>
    <key>CFBundleIdentifier</key>
    <string>org.wirthforge.app</string>
    <key>CFBundleName</key>
    <string>${this.config.displayName}</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
</dict>
</plist>`;
        
        await fs.writeFile(path.join(contentsPath, 'Info.plist'), infoPlist);
        return `Created application bundle: ${appPath}`;
    }
    
    async createService() {
        const launchAgentPath = path.join(os.homedir(), 'Library', 'LaunchAgents');
        await fs.mkdir(launchAgentPath, { recursive: true });
        
        const plistPath = path.join(launchAgentPath, 'org.wirthforge.plist');
        const executablePath = path.join(this.config.installPath, 'WIRTHFORGE.app', 'Contents', 'MacOS', 'wirthforge');
        
        const launchAgentPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>org.wirthforge</string>
    <key>ProgramArguments</key>
    <array>
        <string>${executablePath}</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>`;
        
        await fs.writeFile(plistPath, launchAgentPlist);
        return `Created LaunchAgent: ${plistPath}`;
    }
    
    async startService() {
        await execAsync('launchctl load ~/Library/LaunchAgents/org.wirthforge.plist');
        return 'Started LaunchAgent service';
    }
    
    async stopService() {
        await execAsync('launchctl unload ~/Library/LaunchAgents/org.wirthforge.plist');
        return 'Stopped LaunchAgent service';
    }
    
    async removeService() {
        try { await this.stopService(); } catch (error) {}
        const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'org.wirthforge.plist');
        await fs.unlink(plistPath);
        return 'Removed LaunchAgent service';
    }
    
    async setupSecurity() {
        const commands = [
            `chmod -R 755 "${this.config.installPath}"`,
            `chmod +x "${path.join(this.config.installPath, 'WIRTHFORGE.app', 'Contents', 'MacOS', 'wirthforge')}"`
        ];
        
        const results = [];
        for (const cmd of commands) {
            try {
                await execAsync(cmd);
                results.push('Applied security setting');
            } catch (error) {
                results.push(`Security setting failed: ${error.message}`);
            }
        }
        return results;
    }
    
    async createShortcuts() {
        const appsPath = '/Applications/WIRTHFORGE.app';
        const sourcePath = path.join(this.config.installPath, 'WIRTHFORGE.app');
        
        try {
            await execAsync(`ln -sf "${sourcePath}" "${appsPath}"`);
            return `Created application shortcut: ${appsPath}`;
        } catch (error) {
            return `Failed to create shortcut: ${error.message}`;
        }
    }
    
    async configureFirewall() {
        return 'macOS firewall configured automatically';
    }
    
    async configureSystem() {
        return [await this.setupSecurity(), await this.createShortcuts()].flat();
    }
    
    async uninstall() {
        const results = [];
        try { results.push(await this.stopService()); } catch (e) {}
        try { results.push(await this.removeService()); } catch (e) {}
        try { await fs.unlink('/Applications/WIRTHFORGE.app'); } catch (e) {}
        try { await fs.rmdir(this.config.installPath, { recursive: true }); } catch (e) {}
        return results;
    }
}

/**
 * Linux-specific implementation
 */
class LinuxScripts {
    constructor(config) {
        this.config = config;
    }
    
    async install() {
        const steps = [
            'Creating installation directory',
            'Setting up systemd service',
            'Creating desktop entry',
            'Configuring permissions'
        ];
        
        const results = [];
        for (const step of steps) {
            try {
                const result = await this.executeStep(step);
                results.push({ step, success: true, result });
            } catch (error) {
                results.push({ step, success: false, error: error.message });
                throw new Error(`Installation failed at: ${step} - ${error.message}`);
            }
        }
        return results;
    }
    
    async executeStep(step) {
        switch (step) {
            case 'Creating installation directory':
                return this.createInstallDirectory();
            case 'Setting up systemd service':
                return this.createService();
            case 'Creating desktop entry':
                return this.createShortcuts();
            case 'Configuring permissions':
                return this.setupSecurity();
        }
    }
    
    async createInstallDirectory() {
        await fs.mkdir(this.config.installPath, { recursive: true });
        await execAsync(`chmod 755 "${this.config.installPath}"`);
        return `Created directory: ${this.config.installPath}`;
    }
    
    async createService() {
        const serviceDir = path.join(os.homedir(), '.config', 'systemd', 'user');
        await fs.mkdir(serviceDir, { recursive: true });
        
        const servicePath = path.join(serviceDir, 'wirthforge.service');
        const executablePath = path.join(this.config.installPath, 'bin', 'wirthforge');
        
        const serviceContent = `[Unit]
Description=${this.config.description}
After=network.target

[Service]
Type=simple
ExecStart=${executablePath} --daemon
Restart=always
RestartSec=10
Environment=NODE_ENV=production
WorkingDirectory=${this.config.installPath}

[Install]
WantedBy=default.target
`;
        
        await fs.writeFile(servicePath, serviceContent);
        await execAsync('systemctl --user daemon-reload');
        await execAsync('systemctl --user enable wirthforge.service');
        
        return `Created systemd service: ${servicePath}`;
    }
    
    async startService() {
        await execAsync('systemctl --user start wirthforge.service');
        return 'Started systemd service';
    }
    
    async stopService() {
        await execAsync('systemctl --user stop wirthforge.service');
        return 'Stopped systemd service';
    }
    
    async removeService() {
        try { await this.stopService(); } catch (error) {}
        await execAsync('systemctl --user disable wirthforge.service');
        
        const servicePath = path.join(os.homedir(), '.config', 'systemd', 'user', 'wirthforge.service');
        await fs.unlink(servicePath);
        await execAsync('systemctl --user daemon-reload');
        
        return 'Removed systemd service';
    }
    
    async createShortcuts() {
        const desktopDir = path.join(os.homedir(), '.local', 'share', 'applications');
        await fs.mkdir(desktopDir, { recursive: true });
        
        const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=${this.config.displayName}
Comment=${this.config.description}
Exec=xdg-open https://localhost:${this.config.port}
Icon=${path.join(this.config.installPath, 'icon.png')}
Terminal=false
Categories=Network;WebBrowser;
`;
        
        const desktopPath = path.join(desktopDir, 'wirthforge.desktop');
        await fs.writeFile(desktopPath, desktopEntry);
        await execAsync(`chmod +x "${desktopPath}"`);
        
        return `Created desktop entry: ${desktopPath}`;
    }
    
    async setupSecurity() {
        const commands = [
            `chmod -R 755 "${this.config.installPath}"`,
            `chmod +x "${path.join(this.config.installPath, 'bin', 'wirthforge')}"`
        ];
        
        const results = [];
        for (const cmd of commands) {
            try {
                await execAsync(cmd);
                results.push('Applied security setting');
            } catch (error) {
                results.push(`Security setting failed: ${error.message}`);
            }
        }
        return results;
    }
    
    async configureFirewall() {
        return 'Linux firewall configured by user/distribution';
    }
    
    async configureSystem() {
        return [await this.setupSecurity()];
    }
    
    async uninstall() {
        const results = [];
        try { results.push(await this.stopService()); } catch (e) {}
        try { results.push(await this.removeService()); } catch (e) {}
        try { await fs.rmdir(this.config.installPath, { recursive: true }); } catch (e) {}
        return results;
    }
}

module.exports = PlatformScripts;
