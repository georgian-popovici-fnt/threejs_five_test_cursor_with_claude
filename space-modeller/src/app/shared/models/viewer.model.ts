import * as THREE from 'three';

/**
 * Vector 3D interface for configuration
 */
export interface Vector3Config {
  x: number;
  y: number;
  z: number;
}

/**
 * Configuration interface for the IFC viewer
 */
export interface ViewerConfig {
  /** WASM file path (local or CDN) */
  wasmPath: string;
  /** Initial camera position */
  cameraPosition: Vector3Config;
  /** Initial camera target */
  cameraTarget: Vector3Config;
  /** Background color for the scene */
  backgroundColor: string;
  /** Whether to show the grid helper */
  showGrid: boolean;
  /** Grid size */
  gridSize?: number;
  /** Grid divisions */
  gridDivisions?: number;
  /** Whether to show stats panel */
  showStats: boolean;
  /** Whether to show bounding box helper (green wireframe) */
  showBoundingBoxHelper?: boolean;
  /** Whether to show axes helper (RGB axes) */
  showAxesHelper?: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Maximum file size in MB */
  maxFileSizeMB?: number;
}

/**
 * @deprecated Use IFCModelState from ifc.model.ts instead
 * Kept for backward compatibility
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

/**
 * Scene helper configuration
 */
export interface SceneHelperConfig {
  /** Show bounding box */
  boundingBox: boolean;
  /** Bounding box color */
  boundingBoxColor: THREE.Color;
  /** Show axes */
  axes: boolean;
  /** Axes size multiplier */
  axesSize: number;
  /** Show grid */
  grid: boolean;
  /** Grid size */
  gridSize: number;
  /** Grid divisions */
  gridDivisions: number;
}

/**
 * Lighting configuration
 */
export interface LightingConfig {
  /** Ambient light intensity */
  ambientIntensity: number;
  /** Ambient light color */
  ambientColor: THREE.Color;
  /** Directional light intensity */
  directionalIntensity: number;
  /** Directional light color */
  directionalColor: THREE.Color;
  /** Directional light position */
  directionalPosition: Vector3Config;
  /** Enable shadows */
  shadows: boolean;
}

