/**
 * Configuration interface for the IFC viewer
 */
export interface ViewerConfig {
  /** WASM file path (local or CDN) */
  wasmPath: string;
  /** Initial camera position */
  cameraPosition: { x: number; y: number; z: number };
  /** Initial camera target */
  cameraTarget: { x: number; y: number; z: number };
  /** Background color for the scene */
  backgroundColor: string;
  /** Whether to show the grid helper */
  showGrid: boolean;
  /** Whether to show stats panel */
  showStats: boolean;
}

/**
 * Model state for loaded IFC files
 */
export interface ModelState {
  /** Unique model identifier */
  id: string;
  /** Model name */
  name: string;
  /** Whether the model is currently loading */
  loading: boolean;
  /** Loading progress (0-100) */
  progress: number;
  /** Fragment UUID if loaded */
  fragmentUuid?: string;
  /** Any error that occurred */
  error?: string;
}

