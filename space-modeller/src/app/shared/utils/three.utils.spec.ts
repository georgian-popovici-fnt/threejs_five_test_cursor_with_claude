import * as THREE from 'three';
import {
  calculateBoundingBox,
  calculateModelStatistics,
  calculateCameraPosition,
  disposeObject,
  disposeMaterial,
  createStyledGrid,
  fixMaterials,
  estimateMemoryUsage,
  formatBytes,
  isObjectEmpty,
} from './three.utils';

describe('Three.js Utils', () => {
  describe('calculateBoundingBox', () => {
    it('should calculate bounding box for a mesh', () => {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const bbox = calculateBoundingBox(mesh);

      expect(bbox).toBeTruthy();
      expect(bbox?.isEmpty()).toBe(false);
      expect(bbox?.min).toBeDefined();
      expect(bbox?.max).toBeDefined();

      geometry.dispose();
      material.dispose();
    });

    it('should calculate bounding box for a group with multiple meshes', () => {
      const group = new THREE.Group();
      
      const mesh1 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      mesh1.position.set(0, 0, 0);

      const mesh2 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      mesh2.position.set(5, 5, 5);

      group.add(mesh1, mesh2);

      const bbox = calculateBoundingBox(group);

      expect(bbox).toBeTruthy();
      expect(bbox?.isEmpty()).toBe(false);
      
      // Cleanup
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    });

    it('should return null for object without geometry', () => {
      const emptyGroup = new THREE.Group();

      const bbox = calculateBoundingBox(emptyGroup);

      expect(bbox).toBeNull();
    });

    it('should handle instanced meshes', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial();
      const instancedMesh = new THREE.InstancedMesh(geometry, material, 5);

      const bbox = calculateBoundingBox(instancedMesh);

      expect(bbox).toBeTruthy();

      geometry.dispose();
      material.dispose();
    });
  });

  describe('calculateModelStatistics', () => {
    it('should calculate statistics for a single mesh', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const stats = calculateModelStatistics(mesh);

      expect(stats.meshCount).toBe(1);
      expect(stats.vertexCount).toBeGreaterThan(0);
      expect(stats.faceCount).toBeGreaterThan(0);
      expect(stats.boundingBox).toBeDefined();

      geometry.dispose();
      material.dispose();
    });

    it('should calculate statistics for multiple meshes', () => {
      const group = new THREE.Group();
      
      for (let i = 0; i < 3; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial()
        );
        group.add(mesh);
      }

      const stats = calculateModelStatistics(group);

      expect(stats.meshCount).toBe(3);
      expect(stats.vertexCount).toBeGreaterThan(0);
      expect(stats.faceCount).toBeGreaterThan(0);

      // Cleanup
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    });

    it('should handle instanced meshes', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial();
      const instancedMesh = new THREE.InstancedMesh(geometry, material, 10);

      const stats = calculateModelStatistics(instancedMesh);

      expect(stats.meshCount).toBe(1);
      expect(stats.fragmentCount).toBe(1);
      expect(stats.vertexCount).toBeGreaterThan(0);

      geometry.dispose();
      material.dispose();
    });

    it('should return zero statistics for empty object', () => {
      const emptyGroup = new THREE.Group();

      const stats = calculateModelStatistics(emptyGroup);

      expect(stats.meshCount).toBe(0);
      expect(stats.vertexCount).toBe(0);
      expect(stats.faceCount).toBe(0);
      expect(stats.fragmentCount).toBe(0);
    });

    it('should calculate bounding box info', () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 3, 4),
        new THREE.MeshStandardMaterial()
      );

      const stats = calculateModelStatistics(mesh);

      expect(stats.boundingBox).toBeDefined();
      expect(stats.boundingBox?.min).toBeDefined();
      expect(stats.boundingBox?.max).toBeDefined();
      expect(stats.boundingBox?.size).toBeDefined();
      expect(stats.boundingBox?.center).toBeDefined();

      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
  });

  describe('calculateCameraPosition', () => {
    let camera: THREE.PerspectiveCamera;

    beforeEach(() => {
      camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    });

    it('should calculate position for a mesh', () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial()
      );

      const result = calculateCameraPosition(mesh, camera);

      expect(result.position).toBeDefined();
      expect(result.target).toBeDefined();
      expect(result.position instanceof THREE.Vector3).toBe(true);
      expect(result.target instanceof THREE.Vector3).toBe(true);

      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    it('should use custom padding factor', () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial()
      );

      const result1 = calculateCameraPosition(mesh, camera, 1.5);
      const result2 = calculateCameraPosition(mesh, camera, 3.0);

      const distance1 = result1.position.length();
      const distance2 = result2.position.length();

      expect(distance2).toBeGreaterThan(distance1);

      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    it('should return default position for empty object', () => {
      const emptyGroup = new THREE.Group();

      const result = calculateCameraPosition(emptyGroup, camera);

      expect(result.position.x).toBe(10);
      expect(result.position.y).toBe(10);
      expect(result.position.z).toBe(10);
      expect(result.target.x).toBe(0);
      expect(result.target.y).toBe(0);
      expect(result.target.z).toBe(0);
    });

    it('should position camera at an angle', () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial()
      );

      const result = calculateCameraPosition(mesh, camera);

      // Camera should not be on a single axis
      expect(result.position.x).not.toBe(0);
      expect(result.position.y).not.toBe(0);
      expect(result.position.z).not.toBe(0);

      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
  });

  describe('disposeObject', () => {
    it('should dispose geometry', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      spyOn(geometry, 'dispose');
      spyOn(material, 'dispose');

      disposeObject(mesh);

      expect(geometry.dispose).toHaveBeenCalled();
      expect(material.dispose).toHaveBeenCalled();
    });

    it('should dispose array of materials', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const materials = [
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial(),
      ];
      const mesh = new THREE.Mesh(geometry, materials);

      materials.forEach((mat) => spyOn(mat, 'dispose'));

      disposeObject(mesh);

      materials.forEach((mat) => {
        expect(mat.dispose).toHaveBeenCalled();
      });

      geometry.dispose();
    });

    it('should dispose nested objects', () => {
      const group = new THREE.Group();
      
      const mesh1 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      const mesh2 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );

      group.add(mesh1);
      group.add(mesh2);

      spyOn(mesh1.geometry, 'dispose');
      spyOn((mesh1.material as THREE.Material), 'dispose');
      spyOn(mesh2.geometry, 'dispose');
      spyOn((mesh2.material as THREE.Material), 'dispose');

      disposeObject(group);

      expect(mesh1.geometry.dispose).toHaveBeenCalled();
      expect((mesh1.material as THREE.Material).dispose).toHaveBeenCalled();
      expect(mesh2.geometry.dispose).toHaveBeenCalled();
      expect((mesh2.material as THREE.Material).dispose).toHaveBeenCalled();
    });

    it('should handle instanced meshes', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial();
      const instancedMesh = new THREE.InstancedMesh(geometry, material, 5);

      spyOn(geometry, 'dispose');
      spyOn(material, 'dispose');

      disposeObject(instancedMesh);

      expect(geometry.dispose).toHaveBeenCalled();
      expect(material.dispose).toHaveBeenCalled();
    });
  });

  describe('disposeMaterial', () => {
    it('should dispose material textures', () => {
      const material = new THREE.MeshStandardMaterial();
      material.map = new THREE.Texture();
      material.normalMap = new THREE.Texture();

      spyOn(material.map, 'dispose');
      spyOn(material.normalMap, 'dispose');
      spyOn(material, 'dispose');

      disposeMaterial(material);

      expect(material.map.dispose).toHaveBeenCalled();
      expect(material.normalMap.dispose).toHaveBeenCalled();
      expect(material.dispose).toHaveBeenCalled();
    });

    it('should handle material without textures', () => {
      const material = new THREE.MeshStandardMaterial();

      spyOn(material, 'dispose');

      expect(() => {
        disposeMaterial(material);
      }).not.toThrow();

      expect(material.dispose).toHaveBeenCalled();
    });
  });

  describe('createStyledGrid', () => {
    it('should create grid with default parameters', () => {
      const grid = createStyledGrid();

      expect(grid).toBeInstanceOf(THREE.GridHelper);
      expect(grid.name).toBe('GridHelper');

      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
    });

    it('should create grid with custom size and divisions', () => {
      const grid = createStyledGrid(100, 100);

      expect(grid).toBeInstanceOf(THREE.GridHelper);

      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
    });

    it('should create grid with custom colors', () => {
      const centerColor = new THREE.Color(0xff0000);
      const gridColor = new THREE.Color(0x00ff00);
      
      const grid = createStyledGrid(50, 50, centerColor, gridColor);

      expect(grid).toBeInstanceOf(THREE.GridHelper);

      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
    });
  });

  describe('fixMaterials', () => {
    it('should fix invisible materials', () => {
      const material = new THREE.MeshStandardMaterial();
      material.visible = false;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        material
      );

      const fixed = fixMaterials(mesh);

      expect(material.visible).toBe(true);
      expect(fixed).toBeGreaterThan(0);

      mesh.geometry.dispose();
      material.dispose();
    });

    it('should fix front-side materials to double-side', () => {
      const material = new THREE.MeshStandardMaterial();
      material.side = THREE.FrontSide;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        material
      );

      const fixed = fixMaterials(mesh);

      expect(material.side).toBe(2); // THREE.DoubleSide === 2
      expect(fixed).toBeGreaterThan(0);

      mesh.geometry.dispose();
      material.dispose();
    });

    it('should fix transparent materials with zero opacity', () => {
      const material = new THREE.MeshStandardMaterial();
      material.transparent = true;
      material.opacity = 0;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        material
      );

      const fixed = fixMaterials(mesh);

      expect(material.opacity).toBe(1.0);
      expect(material.transparent).toBe(false);
      expect(fixed).toBeGreaterThan(0);

      mesh.geometry.dispose();
      material.dispose();
    });

    it('should fix invisible meshes', () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      mesh.visible = false;

      const fixed = fixMaterials(mesh);

      expect(mesh.visible).toBe(true);
      expect(fixed).toBeGreaterThan(0);

      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    it('should return zero for objects with no issues', () => {
      const material = new THREE.MeshStandardMaterial();
      material.visible = true;
      material.side = THREE.DoubleSide;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        material
      );
      mesh.visible = true;

      const fixed = fixMaterials(mesh);

      expect(fixed).toBe(0);

      mesh.geometry.dispose();
      material.dispose();
    });

    it('should handle multiple meshes', () => {
      const group = new THREE.Group();
      
      for (let i = 0; i < 3; i++) {
        const material = new THREE.MeshStandardMaterial();
        material.visible = false;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          material
        );
        group.add(mesh);
      }

      const fixed = fixMaterials(group);

      expect(fixed).toBe(3);

      // Cleanup
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    });
  });

  describe('estimateMemoryUsage', () => {
    it('should estimate memory for a mesh', () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );

      const memory = estimateMemoryUsage(mesh);

      expect(memory).toBeGreaterThan(0);

      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    it('should estimate memory for multiple meshes', () => {
      const group = new THREE.Group();
      
      const mesh1 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      const mesh2 = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial()
      );

      group.add(mesh1, mesh2);

      const memory = estimateMemoryUsage(group);
      const memory1 = estimateMemoryUsage(mesh1);

      expect(memory).toBeGreaterThan(memory1);

      // Cleanup
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    });

    it('should return zero for empty object', () => {
      const emptyGroup = new THREE.Group();

      const memory = estimateMemoryUsage(emptyGroup);

      expect(memory).toBe(0);
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatBytes(512)).toBe('512 Bytes');
    });

    it('should format kilobytes', () => {
      const result = formatBytes(1024);
      expect(result).toContain('KB');
      expect(result).toContain('1');
    });

    it('should format megabytes', () => {
      const result = formatBytes(1024 * 1024);
      expect(result).toContain('MB');
      expect(result).toContain('1');
    });

    it('should format gigabytes', () => {
      const result = formatBytes(1024 * 1024 * 1024);
      expect(result).toContain('GB');
      expect(result).toContain('1');
    });

    it('should format with decimals', () => {
      const result = formatBytes(1536, 2); // 1.5 KB
      expect(result).toContain('1.5');
      expect(result).toContain('KB');
    });

    it('should handle custom decimal places', () => {
      const result = formatBytes(1234567, 3);
      expect(result).toMatch(/\d+\.\d{3}/);
    });

    it('should handle negative decimals', () => {
      expect(() => formatBytes(1024, -1)).not.toThrow();
    });
  });

  describe('isObjectEmpty', () => {
    it('should return true for empty group', () => {
      const emptyGroup = new THREE.Group();

      expect(isObjectEmpty(emptyGroup)).toBe(true);
    });

    it('should return false for group with mesh', () => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      group.add(mesh);

      expect(isObjectEmpty(group)).toBe(false);

      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    it('should return false for single mesh', () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );

      expect(isObjectEmpty(mesh)).toBe(false);

      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    it('should return true for mesh without geometry', () => {
      const mesh = new THREE.Mesh();

      expect(isObjectEmpty(mesh)).toBe(true);
    });

    it('should return false for instanced mesh', () => {
      const instancedMesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial(),
        5
      );

      expect(isObjectEmpty(instancedMesh)).toBe(false);

      instancedMesh.geometry.dispose();
      (instancedMesh.material as THREE.Material).dispose();
    });
  });
});

