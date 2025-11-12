import * as THREE from 'three';

/**
 * IFC loading configuration options
 */
export interface IfcLoadConfig {
  /** Enable coordinate system adjustment */
  coordinate?: boolean;
  /** Model name for identification */
  name: string;
  /** Progress callback during load */
  onProgress?: (progress: number) => void;
  /** Custom WASM path override */
  wasmPath?: string;
}

/**
 * Fragment export options
 */
export interface FragmentExportOptions {
  /** Output format (currently only frag supported) */
  format: 'frag';
  /** Include geometry */
  includeGeometry?: boolean;
  /** Include properties */
  includeProperties?: boolean;
  /** Compression level (0-9) */
  compressionLevel?: number;
}

/**
 * Model loading status
 */
export enum ModelLoadingStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  PROCESSING = 'processing',
  LOADED = 'loaded',
  FAILED = 'failed',
}

/**
 * Extended model state with detailed status tracking
 */
export interface IFCModelState {
  /** Unique model identifier */
  id: string;
  /** Model display name */
  name: string;
  /** Current loading status */
  status: ModelLoadingStatus;
  /** Loading progress (0-100) */
  progress: number;
  /** Fragment UUID if loaded */
  fragmentUuid?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Load timestamp */
  loadedAt?: Date;
  /** Error information if failed */
  error?: {
    message: string;
    code?: string;
    timestamp: Date;
  };
  /** Model statistics */
  stats?: ModelStatistics;
}

/**
 * Model statistics
 */
export interface ModelStatistics {
  /** Total number of fragments */
  fragmentCount: number;
  /** Total number of meshes */
  meshCount: number;
  /** Total number of vertices */
  vertexCount: number;
  /** Total number of faces */
  faceCount: number;
  /** Bounding box */
  boundingBox?: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    size: THREE.Vector3;
    center: THREE.Vector3;
  };
  /** Memory usage estimate in MB */
  memoryUsage?: number;
}

/**
 * Camera configuration for viewer
 */
export interface CameraConfiguration {
  /** Field of view in degrees */
  fov: number;
  /** Near clipping plane */
  near: number;
  /** Far clipping plane */
  far: number;
  /** Initial position */
  position: THREE.Vector3;
  /** Initial target */
  target: THREE.Vector3;
}

/**
 * Viewer interaction mode
 */
export enum ViewerInteractionMode {
  /** Orbit camera around model */
  ORBIT = 'orbit',
  /** Fly through model */
  FLY = 'fly',
  /** First-person view */
  FIRST_PERSON = 'first_person',
  /** Measurement mode */
  MEASURE = 'measure',
  /** Selection mode */
  SELECT = 'select',
}

/**
 * Render quality settings
 */
export interface RenderQualitySettings {
  /** Pixel ratio (1 = standard, 2 = retina) */
  pixelRatio: number;
  /** Enable anti-aliasing */
  antialias: boolean;
  /** Enable shadows */
  shadows: boolean;
  /** Enable ambient occlusion */
  ambientOcclusion: boolean;
  /** Tone mapping exposure */
  exposure: number;
}

/**
 * Material override options
 */
export interface MaterialOverrideOptions {
  /** Override all materials */
  enabled: boolean;
  /** Material properties */
  properties?: {
    color?: THREE.Color;
    opacity?: number;
    transparent?: boolean;
    side?: THREE.Side;
    metalness?: number;
    roughness?: number;
  };
}

/**
 * Export result
 */
export interface ExportResult {
  /** Export success status */
  success: boolean;
  /** Exported data */
  data?: Uint8Array;
  /** File size in bytes */
  fileSize?: number;
  /** Export duration in ms */
  duration?: number;
  /** Error if failed */
  error?: string;
}

