import { ViewerConfig } from '../models/viewer.model';

/**
 * Default viewer configuration
 * 
 * WASM Configuration:
 * - LOCAL: Serve WASM files from public/wasm/ (recommended for production)
 * - CDN: Use unpkg CDN (quick development, requires internet)
 * 
 * @deprecated Use ConfigService instead for reactive configuration management
 * This constant is kept for backward compatibility
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
  gridSize: 50,
  gridDivisions: 50,
  showStats: true,
  // Diagnostic helpers (disable in production for cleaner UI)
  showBoundingBoxHelper: true, // Green wireframe box around model
  showAxesHelper: true,         // RGB axes at model center
  enablePerformanceMonitoring: true,
  maxFileSizeMB: 500,
};

/**
 * Fragments worker URL
 * Local worker served from public folder to avoid CORS issues
 * Must be an absolute URL for proper loading
 * 
 * @deprecated Use ConfigService.fragmentsWorkerUrl instead
 */
export const FRAGMENTS_WORKER_URL = 
  typeof window !== 'undefined' 
    ? `${window.location.origin}/worker.mjs`
    : '/worker.mjs';

/**
 * Three.js renderer configuration
 * Modern rendering setup with optimal quality/performance balance
 */
export const RENDERER_CONFIG = {
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance' as const,
  maxPixelRatio: 2,
  // Modern Three.js settings
  toneMapping: {
    enabled: true,
    exposure: 1.0,
  },
} as const;

/**
 * Camera configuration
 * Perspective camera with reasonable near/far planes
 */
export const CAMERA_CONFIG = {
  fov: 60,
  near: 0.1,
  far: 1000,
  // Auto-fit enabled by default
  autoFit: true,
  fitPadding: 1.5,
} as const;

/**
 * OrbitControls configuration
 * Enhanced smooth damping with professional navigation feel
 */
export const CONTROLS_CONFIG = {
  enableDamping: true,
  dampingFactor: 0.08, // Slightly increased for smoother feel
  minDistance: 0.5,
  maxDistance: 500,
  maxPolarAngle: Math.PI * 0.95, // Prevent camera going upside down
  minPolarAngle: 0, // Allow looking from top
  enablePan: true,
  enableZoom: true,
  enableRotate: true,
  zoomSpeed: 1.2, // Slightly faster zoom for better responsiveness
  rotateSpeed: 0.8, // Slightly slower rotation for more precision
  panSpeed: 1.0,
  screenSpacePanning: true, // Pan in screen space for more intuitive feel
  mouseButtons: {
    LEFT: 0,   // Rotate
    MIDDLE: 1, // Pan
    RIGHT: 2,  // Pan
  },
  touches: {
    ONE: 0,    // Rotate with one finger
    TWO: 2,    // Pan and zoom with two fingers
  },
} as const;

/**
 * Lighting configuration
 * Balanced lighting for architectural visualization
 */
export const LIGHTING_CONFIG = {
  ambient: {
    color: 0xffffff,
    intensity: 0.6,
  },
  directional: {
    color: 0xffffff,
    intensity: 0.8,
    position: { x: 10, y: 10, z: 5 },
    castShadow: false,
  },
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE_CONFIG = {
  /** Max vertices before showing performance warning */
  maxVertices: 5000000,
  /** Max file size in MB before warning */
  maxFileSizeMB: 500,
  /** Target FPS */
  targetFPS: 60,
  /** Min FPS before showing warning */
  minFPS: 30,
} as const;

/**
 * File validation constants
 */
export const FILE_VALIDATION = {
  /** Allowed file extensions */
  allowedExtensions: ['.ifc'],
  /** Max file size in bytes */
  maxFileSize: 500 * 1024 * 1024, // 500 MB
  /** Min file size in bytes */
  minFileSize: 1024, // 1 KB
} as const;

