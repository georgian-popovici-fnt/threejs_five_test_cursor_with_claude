import { Injectable } from '@angular/core';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { VIEWER_CONFIG } from '../../shared/constants/viewer.constants';

/**
 * Service for managing ThatOpen Components and Fragments
 * Handles initialization and lifecycle of IFC processing components
 */
@Injectable({
  providedIn: 'root',
})
export class FragmentsService {
  private components: OBC.Components | null = null;
  private ifcLoader: OBC.IfcLoader | null = null;
  private fragmentsModels: FRAGS.FragmentsModels | null = null;
  private initialized = false;

  /**
   * Initialize the ThatOpen Components system
   * Must be called before using any fragment functionality
   */
  async initialize(scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
    if (this.initialized) {
      console.warn('FragmentsService already initialized');
      return;
    }

    try {
      // Initialize Components
      this.components = new OBC.Components();

      // Initialize FragmentsModels with worker URL
      // Note: In v3, we don't need to explicitly set the worker URL if using CDN
      // For local worker, you'd need to host it yourself
      const workerURL = 'https://thatopen.github.io/engine_fragment/resources/worker.mjs';
      this.fragmentsModels = new FRAGS.FragmentsModels(workerURL);

      // Initialize IFC Loader
      this.ifcLoader = new OBC.IfcLoader(this.components);
      
      // Configure WASM path for web-ifc
      const wasmPath = VIEWER_CONFIG.wasmPath;
      await this.ifcLoader.setup({
        wasm: {
          path: wasmPath,
          absolute: wasmPath.startsWith('http'),
        },
      });

      this.initialized = true;
      console.log('FragmentsService initialized with WASM path:', wasmPath);
    } catch (error) {
      console.error('Failed to initialize FragmentsService:', error);
      throw error;
    }
  }

  /**
   * Load an IFC file and convert to fragments
   * @param buffer IFC file data as Uint8Array
   * @param name Model name
   * @param onProgress Progress callback (0-100)
   * @returns Fragment model UUID
   */
  async loadIfc(
    buffer: Uint8Array,
    name: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.initialized || !this.ifcLoader || !this.fragmentsModels) {
      throw new Error('FragmentsService not initialized');
    }

    try {
      console.log(`Loading IFC file: ${name}`);
      
      // Set up progress tracking if callback provided
      if (onProgress) {
        onProgress(0);
      }

      // Load the IFC file
      // The load method signature in v3 is: load(data: Uint8Array, coordinate: boolean, name: string, config?)
      const model = await this.ifcLoader.load(buffer, true, name, {
        processData: {
          progressCallback: (progress: number) => {
            console.log(`Loading ${name}: ${progress.toFixed(1)}%`);
            onProgress?.(progress);
          },
        },
      });

      if (!model) {
        throw new Error('Failed to load IFC model');
      }

      console.log(`Model "${name}" loaded successfully with ID: ${model.modelId}`);
      return model.modelId;
    } catch (error) {
      console.error('Failed to load IFC:', error);
      throw error;
    }
  }

  /**
   * Get a fragment model by ID
   */
  getModel(id: string): FRAGS.FragmentsModel | undefined {
    if (!this.fragmentsModels) {
      return undefined;
    }
    return this.fragmentsModels.models.list.get(id);
  }

  /**
   * Get all loaded models
   */
  getAllModels(): Map<string, FRAGS.FragmentsModel> {
    if (!this.fragmentsModels) {
      return new Map();
    }
    // Convert DataMap to Map
    const modelsMap = new Map<string, FRAGS.FragmentsModel>();
    this.fragmentsModels.models.list.forEach((model, id) => {
      modelsMap.set(id, model);
    });
    return modelsMap;
  }

  /**
   * Export a model as .frag file
   * @param id Model ID
   * @returns Buffer containing fragment data
   */
  async exportFragment(id: string): Promise<Uint8Array | null> {
    const model = this.getModel(id);
    if (!model) {
      console.error('Model not found:', id);
      return null;
    }

    try {
      // Export the fragment model as buffer
      const buffer = await model.getBuffer(false);
      return new Uint8Array(buffer);
    } catch (error) {
      console.error('Failed to export fragment:', error);
      return null;
    }
  }

  /**
   * Bind a camera to all loaded fragments for culling
   * Note: In v3, camera is set automatically during load
   */
  bindCamera(camera: THREE.Camera): void {
    // In v3, the camera is managed internally by FragmentsModel
    // We don't need to manually bind it
    console.log('Camera binding is handled internally by FragmentsModel in v3');
  }

  /**
   * Update culling for all fragments
   * Call this after camera movement stops
   */
  async updateCulling(): Promise<void> {
    if (!this.fragmentsModels) {
      return;
    }

    try {
      // Update all models
      await this.fragmentsModels.update();
    } catch (error) {
      console.warn('Failed to update culling:', error);
    }
  }

  /**
   * Dispose all resources
   * Call this when the viewer is destroyed
   */
  async dispose(): Promise<void> {
    try {
      if (this.fragmentsModels) {
        // Dispose all fragment models
        await this.fragmentsModels.dispose();
      }

      if (this.ifcLoader) {
        // Dispose IFC loader
        try {
          this.ifcLoader.dispose();
        } catch (error) {
          console.warn('Failed to dispose IFC loader:', error);
        }
      }

      if (this.components) {
        try {
          this.components.dispose();
        } catch (error) {
          console.warn('Failed to dispose components:', error);
        }
      }

      this.fragmentsModels = null;
      this.ifcLoader = null;
      this.components = null;
      this.initialized = false;

      console.log('FragmentsService disposed');
    } catch (error) {
      console.error('Error during FragmentsService disposal:', error);
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
