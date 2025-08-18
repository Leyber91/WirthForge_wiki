/**
 * WF-FND-003 Layer Interface Definitions
 * TypeScript interfaces for all five layers in WIRTHFORGE architecture
 */

// ============================================================================
// LAYER 1: INPUT & IDENTITY INTERFACES
// ============================================================================

export interface RawRequest {
  requestId?: string;
  authToken?: string;
  sessionId?: string;
  clientInfo?: Record<string, any>;
  payload: any;
  source?: string;
}

export interface InputEvent {
  requestId: string;
  userId: string;
  sessionId: string;
  source: string;
  inputType: 'prompt' | 'command' | 'setting' | 'control';
  payload: any;
  timestamp: number;
  metadata: UserMetadata;
}

export interface UserMetadata {
  userRole: 'forge' | 'scholar' | 'sage';
  capabilities: string[];
  preferences: Record<string, any>;
}

export interface Layer1Interface {
  processRequest(rawRequest: RawRequest): Promise<{ event?: InputEvent; error?: string }>;
  validateInput(request: RawRequest): string | null;
  resolveIdentity(request: RawRequest): Promise<{ userId: string; sessionId: string }>;
  checkRateLimit(userId: string): boolean;
}

// ============================================================================
// LAYER 2: MODEL COMPUTE INTERFACES
// ============================================================================

export interface ModelRequest {
  requestId: string;
  modelName: string;
  prompt: string;
  parameters: ModelParameters;
  context?: Record<string, any>;
}

export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  stopSequences?: string[];
}

export interface TokenEvent {
  requestId: string;
  modelName: string;
  token: string;
  tokenIndex: number;
  timestamp: number;
  duration: number;
  probability?: number;
  isComplete: boolean;
  streamId: string;
}

export interface CompletionStats {
  requestId: string;
  modelName: string;
  evalCount: number;
  evalDuration: number;
  loadDuration: number;
  promptEvalCount: number;
  promptEvalDuration: number;
}

export interface Layer2Interface {
  generateStream(request: ModelRequest): AsyncIterable<TokenEvent>;
  cancelGeneration(requestId: string): Promise<void>;
  getAvailableModels(): Promise<ModelInfo[]>;
  getModelStatus(modelName: string): Promise<ModelStatus>;
  loadModel(modelName: string): Promise<void>;
  unloadModel(modelName: string): Promise<void>;
}

export interface ModelInfo {
  name: string;
  size: string;
  description: string;
  capabilities: string[];
  parameters: Record<string, any>;
  loaded: boolean;
  memoryRequirement: number;
}

export interface ModelStatus {
  name: string;
  status: 'loaded' | 'loading' | 'unloaded' | 'error';
  memoryUsage: number;
  activeRequests: number;
}

// ============================================================================
// LAYER 3: ORCHESTRATION & ENERGY INTERFACES
// ============================================================================

export interface SystemEvent {
  eventType: 'TOKEN_STREAM' | 'ENERGY_UPDATE' | 'COMPLETION' | 'INTERFERENCE' | 'RESONANCE' | 'ERROR';
  requestId: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface EnergyState {
  totalEnergy: number;
  currentRate: number;
  activeStreams: number;
  sessionMetrics: SessionMetrics;
  levelProgress: LevelProgress;
}

export interface SessionMetrics {
  totalTokens: number;
  averageTPS: number;
  sessionDuration: number;
  energyEfficiency: number;
}

export interface LevelProgress {
  currentLevel: number;
  progressToNext: number;
  unlockedFeatures: string[];
}

export interface InterferenceEvent {
  pattern: 'constructive' | 'destructive' | 'neutral';
  models: string[];
  correlation: number;
  strength: number;
  duration: number;
  tokenAlignment: {
    simultaneousTokens: string[];
    timingOffset: number;
  };
}

export interface ResonanceEvent {
  models: string[];
  resonanceLevel: number;
  phaseLock: number;
  frequency: number;
  celebration: {
    type: 'aurora' | 'mandala' | 'burst';
    intensity: number;
    duration: number;
  };
}

export interface Layer3Interface {
  handleInput(inputEvent: InputEvent): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  getGlobalState(): GlobalState;
  getSessionState(sessionId: string): SessionState | null;
  subscribeToEvents(callback: (event: SystemEvent) => void): void;
  unsubscribeFromEvents(callback: (event: SystemEvent) => void): void;
}

export interface GlobalState {
  sessions: Record<string, SessionState>;
  globalMetrics: {
    totalEnergy: number;
    totalTokens: number;
    uptime: number;
  };
  activeModels: Record<string, ModelStatus>;
  systemHealth: SystemHealth;
}

export interface SessionState {
  userId: string;
  createdAt: number;
  totalEnergy: number;
  totalTokens: number;
  currentLevel: number;
  activeRequests: Record<string, ActiveRequest>;
  energyHistory: EnergyHistoryEntry[];
  interferenceEvents: InterferenceEvent[];
}

export interface ActiveRequest {
  model: string;
  parentRequest?: string;
  startTime: number;
  tokenCount: number;
  streamId: string;
}

export interface EnergyHistoryEntry {
  timestamp: number;
  energy: number;
  cumulative: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'error';
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
}

// ============================================================================
// LAYER 4: CONTRACTS & TRANSPORT INTERFACES
// ============================================================================

export interface WebSocketMessage {
  type: 'INPUT' | 'EVENT' | 'STATE' | 'CONTROL' | 'ERROR' | 'ACK' | 'HEARTBEAT';
  subtype?: string;
  payload: Record<string, any>;
  timestamp: number;
  requestId?: string;
  sessionId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Layer4Interface {
  // WebSocket methods
  handleWebSocketConnection(socket: WebSocket): void;
  sendWebSocketMessage(clientId: string, message: WebSocketMessage): Promise<void>;
  broadcastMessage(message: WebSocketMessage): Promise<void>;
  
  // HTTP API methods
  handleApiRequest(endpoint: string, method: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse>;
  
  // Event emission
  emitEvent(event: SystemEvent): Promise<void>;
  
  // Schema validation
  validateMessage(message: any, schema: string): { valid: boolean; errors?: string[] };
  
  // Authentication
  authenticateRequest(token?: string): Promise<{ valid: boolean; userId?: string }>;
}

export interface ConnectionInfo {
  clientId: string;
  userId: string;
  sessionId: string;
  connectedAt: number;
  lastActivity: number;
  subscriptions: string[];
}

// ============================================================================
// LAYER 5: VISUALIZATION & UX INTERFACES
// ============================================================================

export interface VisualElement {
  id: string;
  type: 'lightning' | 'stream' | 'interference' | 'resonance' | 'node' | 'background';
  properties: VisualProperties;
  animations: Animation[];
  dataBinding: DataBinding;
}

export interface VisualProperties {
  position: { x: number; y: number; z?: number };
  size: { width: number; height: number };
  color: string | string[];
  opacity: number;
  rotation?: number;
  scale?: number;
}

export interface Animation {
  property: string;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  repeat?: boolean;
  keyframes: AnimationKeyframe[];
}

export interface AnimationKeyframe {
  time: number; // 0-1
  value: any;
}

export interface DataBinding {
  eventType: string;
  propertyMap: Record<string, string>; // event field -> visual property
  transform?: (value: any) => any;
}

export interface UserInteraction {
  type: 'click' | 'keypress' | 'input' | 'gesture' | 'scroll' | 'resize';
  target: string;
  data: Record<string, any>;
  timestamp: number;
}

export interface Layer5Interface {
  // Rendering
  render(elements: VisualElement[]): void;
  updateElement(elementId: string, properties: Partial<VisualProperties>): void;
  removeElement(elementId: string): void;
  
  // Event handling
  onUserInteraction(callback: (interaction: UserInteraction) => void): void;
  offUserInteraction(callback: (interaction: UserInteraction) => void): void;
  
  // Level management
  setLevel(level: number): void;
  unlockFeature(feature: string): void;
  
  // Data consumption
  consumeSystemEvent(event: SystemEvent): void;
  
  // Performance
  setFrameRate(fps: number): void;
  enableAuditMode(enabled: boolean): void;
}

export interface LevelConfiguration {
  level: number;
  name: string;
  description: string;
  features: string[];
  unlockCriteria: UnlockCriteria;
  visualElements: string[];
  maxComplexity: number;
}

export interface UnlockCriteria {
  minTokens?: number;
  minEnergy?: number;
  minDuration?: number; // seconds
  requiredFeatures?: string[];
  customCheck?: (sessionState: SessionState) => boolean;
}

// ============================================================================
// CROSS-LAYER INTERFACES
// ============================================================================

export interface LayerCommunication {
  direction: 'up' | 'down';
  fromLayer: number;
  toLayer: number;
  messageType: string;
  payload: any;
  timestamp: number;
}

export interface PerformanceMetrics {
  frameRate: number;
  frameBudget: number; // ms
  averageFrameTime: number;
  droppedFrames: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface BackpressureConfig {
  maxQueueSize: number;
  dropStrategy: 'oldest' | 'newest' | 'random';
  throttleThreshold: number;
  batchSize: number;
}

export interface ErrorContext {
  layer: number;
  operation: string;
  timestamp: number;
  stackTrace?: string;
  additionalInfo?: Record<string, any>;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export interface ValidationSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  required?: string[];
  properties?: Record<string, ValidationSchema>;
  items?: ValidationSchema;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ContractDefinition {
  name: string;
  version: string;
  description: string;
  inputSchema: ValidationSchema;
  outputSchema: ValidationSchema;
  errorCodes: string[];
}

// ============================================================================
// HARDWARE TIER INTERFACES
// ============================================================================

export interface HardwareTier {
  name: 'low' | 'mid' | 'high' | 'hybrid';
  capabilities: HardwareCapabilities;
  limitations: HardwareLimitations;
  optimizations: HardwareOptimizations;
}

export interface HardwareCapabilities {
  maxParallelModels: number;
  supportedLevels: number[];
  gpuAcceleration: boolean;
  maxMemory: number; // GB
  networkCapable: boolean;
}

export interface HardwareLimitations {
  frameRateTarget: number;
  maxAnimations: number;
  simplifiedEffects: boolean;
  reducedParticles: boolean;
}

export interface HardwareOptimizations {
  modelQuantization: boolean;
  backgroundProcessing: boolean;
  adaptiveQuality: boolean;
  memoryManagement: 'aggressive' | 'balanced' | 'conservative';
}

// ============================================================================
// AUDIT & DEBUGGING INTERFACES
// ============================================================================

export interface AuditEvent {
  id: string;
  timestamp: number;
  layer: number;
  eventType: string;
  data: Record<string, any>;
  visualMapping?: {
    elementId: string;
    properties: Record<string, any>;
  };
}

export interface DebugInfo {
  layerStates: Record<number, any>;
  performanceMetrics: PerformanceMetrics;
  recentEvents: AuditEvent[];
  errorLog: ErrorContext[];
  configurationDump: Record<string, any>;
}

export interface AuditInterface {
  enableAudit(): void;
  disableAudit(): void;
  getAuditLog(timeRange?: { start: number; end: number }): AuditEvent[];
  exportAuditData(): string;
  validateVisualMapping(event: SystemEvent, visual: VisualElement): boolean;
}
