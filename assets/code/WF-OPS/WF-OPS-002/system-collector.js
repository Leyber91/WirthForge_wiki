/**
 * WIRTHFORGE System Metrics Collector
 * 
 * Collects system-level metrics (CPU, memory, GPU, disk, network) at 10Hz
 * for the WIRTHFORGE monitoring system. Operates locally with no external dependencies.
 */

const os = require('os');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const EventEmitter = require('events');

const execAsync = promisify(exec);

class SystemCollector extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            sampleRate: options.sampleRate || 10, // Hz
            enableGPU: options.enableGPU !== false,
            enableNetwork: options.enableNetwork !== false,
            enableDisk: options.enableDisk !== false,
            frameBudgetMs: options.frameBudgetMs || 16.67,
            ...options
        };
        
        this.isRunning = false;
        this.intervalId = null;
        this.lastNetworkStats = null;
        this.lastDiskStats = null;
        this.performanceStartTime = null;
        
        // Platform-specific initialization
        this.platform = os.platform();
        this.initializePlatformSpecific();
    }
    
    /**
     * Initialize platform-specific monitoring capabilities
     */
    initializePlatformSpecific() {
        this.platformHandlers = {
            win32: {
                getGPUStats: this.getWindowsGPUStats.bind(this),
                getDiskStats: this.getWindowsDiskStats.bind(this),
                getNetworkStats: this.getWindowsNetworkStats.bind(this)
            },
            linux: {
                getGPUStats: this.getLinuxGPUStats.bind(this),
                getDiskStats: this.getLinuxDiskStats.bind(this),
                getNetworkStats: this.getLinuxNetworkStats.bind(this)
            },
            darwin: {
                getGPUStats: this.getMacOSGPUStats.bind(this),
                getDiskStats: this.getMacOSDiskStats.bind(this),
                getNetworkStats: this.getMacOSNetworkStats.bind(this)
            }
        };
    }
    
    /**
     * Start collecting system metrics
     */
    async start() {
        if (this.isRunning) {
            throw new Error('SystemCollector is already running');
        }
        
        this.isRunning = true;
        this.performanceStartTime = process.hrtime.bigint();
        
        // Initialize baseline measurements
        await this.initializeBaselines();
        
        // Start collection interval
        const intervalMs = 1000 / this.config.sampleRate;
        this.intervalId = setInterval(async () => {
            try {
                await this.collectMetrics();
            } catch (error) {
                this.emit('error', error);
            }
        }, intervalMs);
        
        this.emit('started');
    }
    
    /**
     * Stop collecting system metrics
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.emit('stopped');
    }
    
    /**
     * Initialize baseline measurements for delta calculations
     */
    async initializeBaselines() {
        try {
            if (this.config.enableNetwork) {
                this.lastNetworkStats = await this.getNetworkStats();
            }
            
            if (this.config.enableDisk) {
                this.lastDiskStats = await this.getDiskStats();
            }
        } catch (error) {
            // Non-critical initialization errors
            console.warn('SystemCollector baseline initialization warning:', error.message);
        }
    }
    
    /**
     * Collect all system metrics and emit event
     */
    async collectMetrics() {
        const startTime = process.hrtime.bigint();
        
        try {
            const metrics = await this.gatherAllMetrics();
            
            // Calculate frame budget usage
            const endTime = process.hrtime.bigint();
            const processingTimeMs = Number(endTime - startTime) / 1000000;
            
            const event = {
                timestamp: Date.now(),
                source: 'system',
                type: 'resource',
                data: metrics,
                version: '1.0',
                window: '10s',
                frame_budget_used_ms: processingTimeMs,
                privacy_level: 'internal',
                retention_policy: 'medium_frequency'
            };
            
            // Ensure we don't exceed frame budget
            if (processingTimeMs > this.config.frameBudgetMs * 0.1) {
                console.warn(`SystemCollector exceeded 10% of frame budget: ${processingTimeMs.toFixed(2)}ms`);
            }
            
            this.emit('metrics', event);
            
        } catch (error) {
            this.emit('error', error);
        }
    }
    
    /**
     * Gather all system metrics
     */
    async gatherAllMetrics() {
        const metrics = {};
        
        // Basic system metrics (always available)
        metrics.cpu_percent = this.getCPUUsage();
        metrics.memory_percent = this.getMemoryUsage();
        metrics.load_average = os.loadavg();
        metrics.uptime_seconds = os.uptime();
        
        // Platform-specific metrics
        const handlers = this.platformHandlers[this.platform];
        if (!handlers) {
            return metrics; // Return basic metrics for unsupported platforms
        }
        
        // GPU metrics (if enabled and available)
        if (this.config.enableGPU) {
            try {
                const gpuStats = await handlers.getGPUStats();
                Object.assign(metrics, gpuStats);
            } catch (error) {
                // GPU monitoring not available
                metrics.gpu_available = false;
            }
        }
        
        // Network metrics (if enabled)
        if (this.config.enableNetwork) {
            try {
                const networkStats = await handlers.getNetworkStats();
                if (this.lastNetworkStats) {
                    metrics.network_bytes_in = networkStats.bytesReceived - this.lastNetworkStats.bytesReceived;
                    metrics.network_bytes_out = networkStats.bytesSent - this.lastNetworkStats.bytesSent;
                    metrics.network_packets_in = networkStats.packetsReceived - this.lastNetworkStats.packetsReceived;
                    metrics.network_packets_out = networkStats.packetsSent - this.lastNetworkStats.packetsSent;
                }
                this.lastNetworkStats = networkStats;
            } catch (error) {
                // Network monitoring not available
                metrics.network_available = false;
            }
        }
        
        // Disk metrics (if enabled)
        if (this.config.enableDisk) {
            try {
                const diskStats = await handlers.getDiskStats();
                if (this.lastDiskStats) {
                    metrics.disk_io_read_mb = (diskStats.readBytes - this.lastDiskStats.readBytes) / (1024 * 1024);
                    metrics.disk_io_write_mb = (diskStats.writeBytes - this.lastDiskStats.writeBytes) / (1024 * 1024);
                    metrics.disk_io_read_ops = diskStats.readOps - this.lastDiskStats.readOps;
                    metrics.disk_io_write_ops = diskStats.writeOps - this.lastDiskStats.writeOps;
                }
                this.lastDiskStats = diskStats;
            } catch (error) {
                // Disk monitoring not available
                metrics.disk_available = false;
            }
        }
        
        return metrics;
    }
    
    /**
     * Get CPU usage percentage
     */
    getCPUUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }
        
        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        
        return Math.max(0, Math.min(100, 100 - (100 * idle / total)));
    }
    
    /**
     * Get memory usage percentage
     */
    getMemoryUsage() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        return Math.max(0, Math.min(100, (usedMem / totalMem) * 100));
    }
    
    // Platform-specific implementations
    
    /**
     * Windows GPU statistics
     */
    async getWindowsGPUStats() {
        try {
            const { stdout } = await execAsync('wmic path win32_VideoController get AdapterRAM,Name,VideoProcessor /format:csv');
            const lines = stdout.trim().split('\n').slice(1);
            
            if (lines.length > 0) {
                const data = lines[0].split(',');
                return {
                    gpu_available: true,
                    gpu_name: data[2] || 'Unknown',
                    gpu_memory_total_mb: parseInt(data[1]) / (1024 * 1024) || 0,
                    gpu_utilization: await this.getWindowsGPUUtilization(),
                    gpu_memory_used_mb: 0 // Requires additional WMI queries
                };
            }
        } catch (error) {
            // Fallback to basic detection
            return {
                gpu_available: false,
                gpu_error: error.message
            };
        }
        
        return { gpu_available: false };
    }
    
    /**
     * Windows GPU utilization (requires performance counters)
     */
    async getWindowsGPUUtilization() {
        try {
            const { stdout } = await execAsync('typeperf "\\GPU Engine(*)\\Utilization Percentage" -sc 1');
            // Parse performance counter output
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.includes('Utilization Percentage')) {
                    const match = line.match(/(\d+\.\d+)/);
                    if (match) {
                        return parseFloat(match[1]);
                    }
                }
            }
        } catch (error) {
            // Performance counters not available
        }
        
        return 0;
    }
    
    /**
     * Windows disk statistics
     */
    async getWindowsDiskStats() {
        try {
            const { stdout } = await execAsync('typeperf "\\PhysicalDisk(_Total)\\Disk Read Bytes/sec" "\\PhysicalDisk(_Total)\\Disk Write Bytes/sec" -sc 1');
            // Parse performance counter output for disk I/O
            return {
                readBytes: 0, // Parse from performance counters
                writeBytes: 0,
                readOps: 0,
                writeOps: 0
            };
        } catch (error) {
            return {
                readBytes: 0,
                writeBytes: 0,
                readOps: 0,
                writeOps: 0
            };
        }
    }
    
    /**
     * Windows network statistics
     */
    async getWindowsNetworkStats() {
        try {
            const { stdout } = await execAsync('wmic path Win32_PerfRawData_Tcpip_NetworkInterface get BytesReceivedPerSec,BytesSentPerSec,Name /format:csv');
            const lines = stdout.trim().split('\n').slice(1);
            
            let totalReceived = 0;
            let totalSent = 0;
            
            for (const line of lines) {
                const data = line.split(',');
                if (data[3] && !data[3].includes('Loopback')) {
                    totalReceived += parseInt(data[1]) || 0;
                    totalSent += parseInt(data[2]) || 0;
                }
            }
            
            return {
                bytesReceived: totalReceived,
                bytesSent: totalSent,
                packetsReceived: 0,
                packetsSent: 0
            };
        } catch (error) {
            return {
                bytesReceived: 0,
                bytesSent: 0,
                packetsReceived: 0,
                packetsSent: 0
            };
        }
    }
    
    /**
     * Linux GPU statistics (NVIDIA via nvidia-ml-py or nvidia-smi)
     */
    async getLinuxGPUStats() {
        try {
            const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu --format=csv,noheader,nounits');
            const lines = stdout.trim().split('\n');
            
            if (lines.length > 0) {
                const [name, memTotal, memUsed, utilization] = lines[0].split(', ');
                return {
                    gpu_available: true,
                    gpu_name: name,
                    gpu_memory_total_mb: parseInt(memTotal),
                    gpu_memory_used_mb: parseInt(memUsed),
                    gpu_utilization: parseInt(utilization)
                };
            }
        } catch (error) {
            // Try alternative methods (AMD, Intel)
            return await this.getLinuxGPUStatsAlternative();
        }
        
        return { gpu_available: false };
    }
    
    /**
     * Linux GPU statistics alternative methods
     */
    async getLinuxGPUStatsAlternative() {
        try {
            // Try reading from /sys/class/drm for basic GPU info
            const drmPath = '/sys/class/drm';
            const entries = await fs.readdir(drmPath);
            
            for (const entry of entries) {
                if (entry.startsWith('card')) {
                    const devicePath = `${drmPath}/${entry}/device`;
                    try {
                        const vendor = await fs.readFile(`${devicePath}/vendor`, 'utf8');
                        const device = await fs.readFile(`${devicePath}/device`, 'utf8');
                        
                        return {
                            gpu_available: true,
                            gpu_vendor: vendor.trim(),
                            gpu_device: device.trim(),
                            gpu_utilization: 0 // Not available without vendor-specific tools
                        };
                    } catch (error) {
                        continue;
                    }
                }
            }
        } catch (error) {
            // No GPU information available
        }
        
        return { gpu_available: false };
    }
    
    /**
     * Linux disk statistics from /proc/diskstats
     */
    async getLinuxDiskStats() {
        try {
            const diskstats = await fs.readFile('/proc/diskstats', 'utf8');
            const lines = diskstats.trim().split('\n');
            
            let totalReadBytes = 0;
            let totalWriteBytes = 0;
            let totalReadOps = 0;
            let totalWriteOps = 0;
            
            for (const line of lines) {
                const fields = line.trim().split(/\s+/);
                if (fields.length >= 14) {
                    const deviceName = fields[2];
                    
                    // Skip loop and ram devices
                    if (deviceName.startsWith('loop') || deviceName.startsWith('ram')) {
                        continue;
                    }
                    
                    totalReadOps += parseInt(fields[3]) || 0;
                    totalReadBytes += (parseInt(fields[5]) || 0) * 512; // sectors to bytes
                    totalWriteOps += parseInt(fields[7]) || 0;
                    totalWriteBytes += (parseInt(fields[9]) || 0) * 512; // sectors to bytes
                }
            }
            
            return {
                readBytes: totalReadBytes,
                writeBytes: totalWriteBytes,
                readOps: totalReadOps,
                writeOps: totalWriteOps
            };
        } catch (error) {
            return {
                readBytes: 0,
                writeBytes: 0,
                readOps: 0,
                writeOps: 0
            };
        }
    }
    
    /**
     * Linux network statistics from /proc/net/dev
     */
    async getLinuxNetworkStats() {
        try {
            const netdev = await fs.readFile('/proc/net/dev', 'utf8');
            const lines = netdev.trim().split('\n').slice(2); // Skip headers
            
            let totalReceived = 0;
            let totalSent = 0;
            let totalPacketsReceived = 0;
            let totalPacketsSent = 0;
            
            for (const line of lines) {
                const fields = line.trim().split(/\s+/);
                const interface = fields[0].replace(':', '');
                
                // Skip loopback
                if (interface === 'lo') {
                    continue;
                }
                
                totalReceived += parseInt(fields[1]) || 0;
                totalPacketsReceived += parseInt(fields[2]) || 0;
                totalSent += parseInt(fields[9]) || 0;
                totalPacketsSent += parseInt(fields[10]) || 0;
            }
            
            return {
                bytesReceived: totalReceived,
                bytesSent: totalSent,
                packetsReceived: totalPacketsReceived,
                packetsSent: totalPacketsSent
            };
        } catch (error) {
            return {
                bytesReceived: 0,
                bytesSent: 0,
                packetsReceived: 0,
                packetsSent: 0
            };
        }
    }
    
    /**
     * macOS GPU statistics
     */
    async getMacOSGPUStats() {
        try {
            const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
            const data = JSON.parse(stdout);
            
            if (data.SPDisplaysDataType && data.SPDisplaysDataType.length > 0) {
                const gpu = data.SPDisplaysDataType[0];
                return {
                    gpu_available: true,
                    gpu_name: gpu._name || 'Unknown',
                    gpu_memory_total_mb: this.parseMemoryString(gpu.spdisplays_vram) || 0,
                    gpu_utilization: 0 // Not easily available on macOS
                };
            }
        } catch (error) {
            // Fallback to basic detection
        }
        
        return { gpu_available: false };
    }
    
    /**
     * macOS disk statistics
     */
    async getMacOSDiskStats() {
        try {
            const { stdout } = await execAsync('iostat -d 1 2 | tail -n +3');
            const lines = stdout.trim().split('\n');
            
            if (lines.length > 0) {
                const lastLine = lines[lines.length - 1];
                const fields = lastLine.trim().split(/\s+/);
                
                return {
                    readBytes: (parseFloat(fields[2]) || 0) * 1024, // KB to bytes
                    writeBytes: (parseFloat(fields[3]) || 0) * 1024,
                    readOps: 0,
                    writeOps: 0
                };
            }
        } catch (error) {
            // iostat not available
        }
        
        return {
            readBytes: 0,
            writeBytes: 0,
            readOps: 0,
            writeOps: 0
        };
    }
    
    /**
     * macOS network statistics
     */
    async getMacOSNetworkStats() {
        try {
            const { stdout } = await execAsync('netstat -ib | grep -v lo0');
            const lines = stdout.trim().split('\n');
            
            let totalReceived = 0;
            let totalSent = 0;
            
            for (const line of lines) {
                const fields = line.trim().split(/\s+/);
                if (fields.length >= 10) {
                    totalReceived += parseInt(fields[6]) || 0;
                    totalSent += parseInt(fields[9]) || 0;
                }
            }
            
            return {
                bytesReceived: totalReceived,
                bytesSent: totalSent,
                packetsReceived: 0,
                packetsSent: 0
            };
        } catch (error) {
            return {
                bytesReceived: 0,
                bytesSent: 0,
                packetsReceived: 0,
                packetsSent: 0
            };
        }
    }
    
    /**
     * Parse memory string (e.g., "8 GB" -> 8192)
     */
    parseMemoryString(memStr) {
        if (!memStr) return 0;
        
        const match = memStr.match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB)?/i);
        if (!match) return 0;
        
        const value = parseFloat(match[1]);
        const unit = (match[2] || 'MB').toUpperCase();
        
        switch (unit) {
            case 'GB':
                return value * 1024;
            case 'MB':
                return value;
            case 'KB':
                return value / 1024;
            default:
                return value;
        }
    }
    
    /**
     * Get current system health status
     */
    getHealthStatus() {
        return {
            isRunning: this.isRunning,
            platform: this.platform,
            sampleRate: this.config.sampleRate,
            enabledFeatures: {
                gpu: this.config.enableGPU,
                network: this.config.enableNetwork,
                disk: this.config.enableDisk
            },
            uptime: this.performanceStartTime ? 
                Number(process.hrtime.bigint() - this.performanceStartTime) / 1000000000 : 0
        };
    }
}

module.exports = { SystemCollector };
