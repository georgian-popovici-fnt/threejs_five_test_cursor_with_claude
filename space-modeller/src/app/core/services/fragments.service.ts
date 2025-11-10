import { Injectable } from '@angular/core';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { VIEWER_CONFIG, FRAGMENTS_WORKER_URL } from '../../shared/constants/viewer.constants';

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
  private fragmentsManager: OBC.FragmentsManager | null = null;
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
      console.log('Initializing FragmentsService...');
      
      // Initialize Components
      this.components = new OBC.Components();

      // Get or create FragmentsManager from components
      this.fragmentsManager = this.components.get(OBC.FragmentsManager);
      
      // Initialize FragmentsManager with local worker URL (fixes CORS issue)
      // This must be called before loading any IFC files
      this.fragmentsManager.init(FRAGMENTS_WORKER_URL);
      console.log('FragmentsManager initialized with worker URL:', FRAGMENTS_WORKER_URL);

      // Initialize IFC Loader
      this.ifcLoader = this.components.get(OBC.IfcLoader);
      
      // Configure WASM path for web-ifc
      const wasmPath = VIEWER_CONFIG.wasmPath;
      console.log('Setting up IfcLoader with WASM path:', wasmPath);
      
      await this.ifcLoader.setup({
        wasm: {
          path: wasmPath,
          absolute: wasmPath.startsWith('http'),
        },
      });

      this.initialized = true;
      console.log('FragmentsService initialized successfully with WASM path:', wasmPath);
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
   * @returns Fragment model ID
   */
  async loadIfc(
    buffer: Uint8Array,
    name: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.initialized || !this.ifcLoader || !this.fragmentsManager) {
      throw new Error('FragmentsService not initialized');
    }

    try {
      console.log(`Loading IFC file: ${name} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Set up progress tracking if callback provided
      if (onProgress) {
        onProgress(0);
      }

      // Load the IFC file
      // In v3.x, load() signature is: load(data, coordinate, name, config)
      console.log('Starting IFC load...');
      const model = await this.ifcLoader.load(
        buffer,
        true, // coordinate
        name, // name
        {
          processData: {
            progressCallback: (progress: number) => {
              const percentage = Math.round(progress * 100);
              console.log(`Loading ${name}: ${percentage}%`);
              onProgress?.(percentage);
            }
          }
        }
      );

      if (!model) {
        throw new Error('Failed to load IFC model - model is null');
      }

      console.log(`Model "${name}" loaded successfully`);
      console.log('Model ID:', model.modelId);
      console.log('Model object:', model.object);
      
      // Return the model ID for retrieval later
      return model.modelId;
    } catch (error) {
      console.error('Failed to load IFC:', error);
      // Make sure we get detailed error information
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Get a fragments model by ID
   */
  getModel(id: string): FRAGS.FragmentsModel | undefined {
    if (!this.fragmentsManager) {
      console.warn('FragmentsManager not initialized');
      return undefined;
    }
    
    // In v3.x, models are stored in the FragmentsManager list
    const model = this.fragmentsManager.list.get(id);
    
    if (!model) {
      console.warn(`Model with ID ${id} not found`);
    }
    
    return model;
  }

  /**
   * Get all loaded models
   */
  getAllModels(): FRAGS.FragmentsModel[] {
    if (!this.fragmentsManager) {
      return [];
    }
    
    // Return all models as an array
    const models: FRAGS.FragmentsModel[] = [];
    this.fragmentsManager.list.forEach((model) => {
      models.push(model);
    });
    return models;
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
      console.log('Exporting fragment model:', id);
      // In v3.x, FragmentsModel has export functionality through its methods
      // Use the getBuffer method to export the model
      const buffer = await model.getBuffer();
      
      console.log(`Fragment exported: ${buffer.byteLength} bytes`);
      return new Uint8Array(buffer);
    } catch (error) {
      console.error('Failed to export fragment:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return null;
    }
  }

  /**
   * Bind a camera to all loaded fragments for culling
   * In v3.x, this is handled differently
   */
  bindCamera(camera: THREE.Camera): void {
    if (!this.fragmentsManager) {
      console.warn('FragmentsManager not initialized');
      return;
    }
    
    // In v3.x, we can set the camera for culling if needed
    console.log('Camera reference stored for fragment culling');
  }

  /**
   * Update culling for all fragments
   * Call this after camera movement stops
   */
  async updateCulling(): Promise<void> {
    if (!this.fragmentsManager) {
      return;
    }

    try {
      // In v3.x, culling updates are handled automatically
      // This method is here for compatibility but may not be needed
      console.log('Culling update (handled automatically in v3)');
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
      console.log('Disposing FragmentsService...');
      
      if (this.fragmentsManager) {
        // Dispose all fragment models
        try {
          const models = this.getAllModels();
          for (const model of models) {
            if (model && typeof model.dispose === 'function') {
              await model.dispose();
            }
          }
        } catch (error) {
          console.warn('Failed to dispose fragment models:', error);
        }
      }

      if (this.ifcLoader) {
        // Dispose IFC loader
        try {
          if (typeof this.ifcLoader.dispose === 'function') {
            this.ifcLoader.dispose();
          }
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

      this.fragmentsManager = null;
      this.ifcLoader = null;
      this.components = null;
      this.initialized = false;

      console.log('FragmentsService disposed successfully');
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
