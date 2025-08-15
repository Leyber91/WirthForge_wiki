/**
 * WF-FND-005 Orchestrator Skeleton
 * Coordinates councils of models and manages scheduling, gating and emergence detection.
 */

const EventEmitter = require('events');

class Orchestrator extends EventEmitter {
  constructor(config, decipher) {
    super();
    this.config = config;
    this.decipher = decipher;
    this.models = [];
    this.level = 1;
    this.path = 'Forge';
    this.schedulerInterval = null;
    this.lastConsensusTime = Date.now();
    this.modelWeights = {};
    this.detectionWindow = [];
    // Listen to decipher events
    this.decipher.on('energy_frame', (msg) => {
      const frame = msg; // msgpack decoding handled upstream
      this.handleEnergyFrame(frame);
    });
    this.decipher.on('experience_event', (msg) => {
      const event = msg;
      this.emit('experience_event', event);
    });
  }

  /**
   * Set user level (2–5) and configure council size and features.
   */
  setLevel(level) {
    this.level = level;
    const levelConfig = this.config.levels[level];
    // Adjust council size and features
    this.councilSize = levelConfig.councilSize;
    // Additional gating logic here...
    this.emit('levelChanged', { level });
  }

  /**
   * Initialise council with model IDs and optional weights.
   */
  startCouncil(models) {
    this.models = models.slice(0, this.councilSize);
    this.models.forEach((m) => {
      this.modelWeights[m.id] = 1 / this.councilSize;
    });
    // Start scheduler loop
    if (!this.schedulerInterval) {
      this.schedulerInterval = setInterval(() => this.scheduleModels(), 5);
    }
  }

  /**
   * Example scheduler loop: rotate through models and request tokens.
   */
  scheduleModels() {
    for (const model of this.models) {
      if (model.isReady()) {
        const tokenEvent = model.generateToken();
        // tokenEvent = { tps, probabilities, deltaMs, timestamp, di }
        this.decipher.ingestToken({ ...tokenEvent, modelId: model.id });
      }
    }
  }

  /**
   * Consensus decision based on DI and energy.
   */
  handleEnergyFrame(frame) {
    const { di, energy } = frame;
    const thresholds = this.config.thresholds;
    // Simple consensus/voting example
    if (di != null && di > thresholds.consensusGap) {
      // High disagreement → track and maybe call user intervention
      this.emit('councilInterference', { di, energy });
    } else {
      // Low disagreement → update model weights or present default model output
      this.emit('councilConsensus', { energy, di });
    }
    // Update detection window for emergent patterns
    this.detectionWindow.push({ di, energy });
    if (this.detectionWindow.length > 10) {
      this.detectionWindow.shift();
    }
    this.detectEmergence();
  }

  /**
   * Detect resonance based on rolling energy averages.
   */
  detectEmergence() {
    if (this.detectionWindow.length < 10) return;
    const avgEnergy = this.detectionWindow.reduce((s, e) => s + e.energy, 0) / this.detectionWindow.length;
    const thresholds = this.config.thresholds;
    if (avgEnergy >= thresholds.energyResonance) {
      this.emit('experience_event', {
        timestamp: new Date().toISOString(),
        eventType: 'resonance',
        strength: avgEnergy
      });
    } else if (avgEnergy >= thresholds.energyField) {
      this.emit('experience_event', {
        timestamp: new Date().toISOString(),
        eventType: 'field',
        strength: avgEnergy
      });
    }
  }

  dispose() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.models = [];
    this.detectionWindow = [];
  }
}

module.exports = Orchestrator;
