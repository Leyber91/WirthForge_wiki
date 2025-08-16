/**
 * WF-FND-004 Decipher Skeleton
 * Processes token streams into energy_frame and experience_event messages.
 */

const EnergyCalculator = require('../WF-FND-002/energy.js');
const EventEmitter = require('events');
const MsgPack = require('@msgpack/msgpack');

class Decipher extends EventEmitter {
  constructor(config) {
    super();
    this.energyCalculator = new EnergyCalculator(config);
    this.frameWindow = 16.67; // ms
    this.tokenQueue = [];
    this.currentFrame = [];
    this.lastFrameTime = Date.now();
    this.modelId = config.modelId || 'model_1';
    this.detectionThresholds = config.thresholds || {
      interference: 0.5,
      field: 0.8,
      resonance: 0.95
    };
    this.loop = setInterval(() => this.processFrame(), this.frameWindow);
  }

  /**
   * Ingest a token event (from L2).
   * tokenEvent: { tps, probabilities, deltaMs, timestamp, modelId }
   */
  ingestToken(tokenEvent) {
    this.tokenQueue.push(tokenEvent);
  }

  /**
   * Process accumulated tokens within the frame window.
   */
  processFrame() {
    const now = Date.now();
    while (this.tokenQueue.length > 0 && (this.tokenQueue[0].timestamp - this.lastFrameTime) <= this.frameWindow) {
      const t = this.tokenQueue.shift();
      const energy = this.energyCalculator.computeEnergy({
        tps: t.tps,
        probabilities: t.probabilities,
        deltaMs: t.deltaMs
      });
      this.currentFrame.push({ energy, di: t.di || null });
    }

    if (this.currentFrame.length > 0) {
      const aggregatedEnergy = this.currentFrame.reduce((sum, e) => sum + e.energy, 0) / this.currentFrame.length;
      const aggregatedDI = this.currentFrame.reduce((sum, e) => sum + (e.di ?? 0), 0) / this.currentFrame.length;
      const frameNumber = this.frameCount || 0;
      const energyFrame = {
        timestamp: new Date(now).toISOString(),
        energy: aggregatedEnergy,
        di: aggregatedDI,
        modelId: this.modelId,
        frameNumber
      };
      this.emit('energy_frame', MsgPack.encode(energyFrame));
      this.detectPhenomena(aggregatedEnergy, aggregatedDI);
      this.currentFrame = [];
      this.lastFrameTime = now;
      this.frameCount = frameNumber + 1;
    }
  }

  /**
   * Detect interference, fields and resonance.
   */
  detectPhenomena(energy, di) {
    const { interference, field, resonance } = this.detectionThresholds;
    if (di != null && di > interference) {
      this.emit('experience_event', MsgPack.encode({
        timestamp: new Date().toISOString(),
        eventType: 'interference',
        strength: di
      }));
    }
    if (energy >= field && energy < resonance) {
      this.emit('experience_event', MsgPack.encode({
        timestamp: new Date().toISOString(),
        eventType: 'field',
        strength: energy
      }));
    }
    if (energy >= resonance) {
      this.emit('experience_event', MsgPack.encode({
        timestamp: new Date().toISOString(),
        eventType: 'resonance',
        strength: energy
      }));
    }
  }

  /**
   * Clean up resources.
   */
  dispose() {
    clearInterval(this.loop);
    this.tokenQueue = [];
    this.currentFrame = [];
  }
}

module.exports = Decipher;
