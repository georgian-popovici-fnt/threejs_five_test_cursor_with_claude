import * as THREE from 'three';
import { ModelStatistics } from '../models/ifc.model';

/**
 * Utility functions for Three.js operations
 */

/**
 * Calculate bounding box for an object and its descendants
 * @param object - The Three.js object to calculate bounds for
 * @returns Bounding box or null if no geometry found
 */
export function calculateBoundingBox(object: THREE.Object3D): THREE.Box3 | null {
  const box = new THREE.Box3();
  let hasGeometry = false;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      if (child.geometry) {
        box.expandByObject(child);
        hasGeometry = true;
      }
    }
  });

  return hasGeometry ? box : null;
}

/**
 * Calculate statistics for a Three.js object
 * @param object - The object to analyze
 * @returns Model statistics
 */
export function calculateModelStatistics(object: THREE.Object3D): ModelStatistics {
  let meshCount = 0;
  let vertexCount = 0;
  let faceCount = 0;
  let fragmentCount = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      meshCount++;
      
      if (child.geometry) {
        const positions = child.geometry.getAttribute('position');
        if (positions) {
          vertexCount += positions.count;
        }

        if (child.geometry.index) {
          faceCount += child.geometry.index.count / 3;
        } else if (positions) {
          faceCount += positions.count / 3;
        }

        // Count as fragment if it's an InstancedMesh
        if (child instanceof THREE.InstancedMesh) {
          fragmentCount++;
        }
      }
    }
  });

  const bbox = calculateBoundingBox(object);
  const boundingBox = bbox ? {
    min: bbox.min.clone(),
    max: bbox.max.clone(),
    size: bbox.getSize(new THREE.Vector3()),
    center: bbox.getCenter(new THREE.Vector3()),
  } : undefined;

  return {
    fragmentCount,
    meshCount,
    vertexCount,
    faceCount: Math.floor(faceCount),
    boundingBox,
  };
}

/**
 * Calculate optimal camera position to view an object
 * @param object - The object to view
 * @param camera - The camera to position
 * @param paddingFactor - Extra space around object (default 1.5)
 * @returns Object containing position and target
 */
export function calculateCameraPosition(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  paddingFactor: number = 1.5
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const bbox = calculateBoundingBox(object);
  
  if (!bbox || bbox.isEmpty()) {
    // Return default position if no geometry
    return {
      position: new THREE.Vector3(10, 10, 10),
      target: new THREE.Vector3(0, 0, 0),
    };
  }

  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Calculate distance based on FOV
  const fov = camera.fov * (Math.PI / 180);
  const distance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * paddingFactor;

  // Position camera at an angle
  const position = new THREE.Vector3(
    center.x + distance * 0.7,
    center.y + distance * 0.7,
    center.z + distance * 0.7
  );

  return {
    position,
    target: center,
  };
}

/**
 * Dispose of a Three.js object and all its descendants
 * Properly cleans up geometry, materials, and textures
 * @param object - The object to dispose
 */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    // Dispose geometry
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }

      // Dispose materials
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          disposeMaterial(material);
        });
      }
    }

    // Dispose lights
    if (child instanceof THREE.Light && 'dispose' in child) {
      (child as any).dispose();
    }
  });
}

/**
 * Dispose of a material and its textures
 * @param material - The material to dispose
 */
export function disposeMaterial(material: THREE.Material): void {
  // Dispose textures
  Object.keys(material).forEach((key) => {
    const value = (material as any)[key];
    if (value && typeof value === 'object' && 'minFilter' in value) {
      // It's a texture
      value.dispose();
    }
  });

  // Dispose material
  material.dispose();
}

/**
 * Create a grid helper with custom styling
 * @param size - Grid size
 * @param divisions - Number of divisions
 * @param centerColor - Color of center lines
 * @param gridColor - Color of grid lines
 * @returns Grid helper
 */
export function createStyledGrid(
  size: number = 50,
  divisions: number = 50,
  centerColor: THREE.Color = new THREE.Color(0x444444),
  gridColor: THREE.Color = new THREE.Color(0x222222)
): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, centerColor, gridColor);
  grid.name = 'GridHelper';
  return grid;
}

/**
 * Fix material rendering issues
 * Ensures materials are visible and properly configured
 * @param object - The object to fix materials for
 * @returns Number of materials fixed
 */
export function fixMaterials(object: THREE.Object3D): number {
  let fixed = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      
      materials.forEach((material) => {
        if (material) {
          const needsFix = 
            !material.visible ||
            material.side === THREE.FrontSide ||
            (material.transparent && material.opacity === 0);

          if (needsFix) {
            material.visible = true;
            material.side = THREE.DoubleSide;
            material.needsUpdate = true;

            if (material.transparent && material.opacity === 0) {
              material.opacity = 1.0;
              material.transparent = false;
            }

            fixed++;
          }
        }
      });

      // Ensure mesh is visible
      if (!child.visible) {
        child.visible = true;
        fixed++;
      }
    }
  });

  return fixed;
}

/**
 * Get memory usage estimate for an object
 * @param object - The object to analyze
 * @returns Memory usage in bytes
 */
export function estimateMemoryUsage(object: THREE.Object3D): number {
  let bytes = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      if (child.geometry) {
        const attributes = child.geometry.attributes;
        Object.keys(attributes).forEach((key) => {
          const attr = attributes[key];
          if (attr && attr.array) {
            bytes += attr.array.byteLength;
          }
        });

        if (child.geometry.index) {
          bytes += child.geometry.index.array.byteLength;
        }
      }
    }
  });

  return bytes;
}

/**
 * Convert bytes to human-readable format
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if an object is empty (has no renderable content)
 * @param object - The object to check
 * @returns True if empty
 */
export function isObjectEmpty(object: THREE.Object3D): boolean {
  let hasMeshes = false;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      if (child.geometry && child.geometry.attributes.position) {
        hasMeshes = true;
      }
    }
  });

  return !hasMeshes;
}

