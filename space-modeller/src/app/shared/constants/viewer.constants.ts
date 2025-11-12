import { ViewerConfig } from '../models/viewer.model';

/**
 * Default viewer configuration
 * 
 * WASM Configuration:
 * - LOCAL: Serve WASM files from public/wasm/ (recommended for production)
 * - CDN: Use unpkg CDN (quick development, requires internet)
 */
export const VIEWER_CONFIG: ViewerConfig = {
  // Local WASM path (default, recommended for production)
  wasmPath: '/wasm/',
  
  // Alternative CDN path (uncomment to use):
  // wasmPath: 'https://unpkg.com/web-ifc@0.0.66/',
  
  cameraPosition: { x: 10, y: 10, z: 10 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  backgroundColor: '#0e1013',
  showGrid: true,
  showStats: true,
  // Diagnostic helpers (disable once IFC rendering is confirmed working)
  showBoundingBoxHelper: true, // Green wireframe box around model
  showAxesHelper: true,         // RGB axes at model center
};

/**
 * Fragments worker URL
 * Local worker served from public folder to avoid CORS issues
 * Must be an absolute URL for proper loading
 */
export const FRAGMENTS_WORKER_URL = `${window.location.origin}/worker.mjs`;

/**
 * Three.js renderer configuration
 */
export const RENDERER_CONFIG = {
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance' as const,
  maxPixelRatio: 2,
};

/**
 * Camera configuration
 */
export const CAMERA_CONFIG = {
  fov: 60,
  near: 0.1,
  far: 1000,
};

/**
 * OrbitControls configuration
 */
export const CONTROLS_CONFIG = {
  enableDamping: true,
  dampingFactor: 0.05,
  minDistance: 1,
  maxDistance: 500,
  maxPolarAngle: Math.PI * 0.95,
};

