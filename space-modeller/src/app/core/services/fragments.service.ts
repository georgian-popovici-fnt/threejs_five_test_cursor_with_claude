import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { ErrorHandlerService, ErrorSeverity } from './error-handler.service';
import { ConfigService } from './config.service';
import { IfcLoadConfig, ExportResult, ModelStatistics } from '../../shared/models/ifc.model';
import {
  calculateModelStatistics,
  disposeObject,
  estimateMemoryUsage,
} from '../../shared/utils/three.utils';

/**
 * Service for managing ThatOpen Components and Fragments
 * Handles initialization, IFC loading, and lifecycle management
 * 
 * Features:
 * - Proper error handling and reporting
 * - Resource management and cleanup
 * - Progress tracking
 * - Model statistics
 * - Fragment export
 * 
 * @example
 * ```typescript
 * constructor(private fragmentsService: FragmentsService) {}
 * 
 * async loadModel() {
 *   await this.fragmentsService.initialize(scene, camera);
 *   const uuid = await this.fragmentsService.loadIfc(buffer, 'model-name', progress => {
 *     console.log('Progress:', progress);
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class FragmentsService {
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly configService = inject(ConfigService);

  // ThatOpen Components
  private components: OBC.Components | null = null;
  private ifcLoader: OBC.IfcLoader | null = null;
  private fragmentsManager: OBC.FragmentsManager | null = null;

  // Three.js references
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  // State
  private initialized = false;
  private readonly loadedModels = new Map<string, FRAGS.FragmentsModel>();

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get count of loaded models
   */
  get modelCount(): number {
    return this.loadedModels.size;
  }

  /**
   * Initialize the ThatOpen Components system
   * Must be called before using any fragment functionality
   * 
   * @param scene - Three.js scene to render into
   * @param camera - Three.js camera for viewing
   * @throws Error if initialization fails
   */
  async initialize(scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
    if (this.initialized) {
      console.warn('FragmentsService already initialized');
      return;
    }

    try {
      console.log('🔧 Initializing FragmentsService...');
      
      // Validate inputs
      if (!scene || !camera) {
        throw new Error('Scene and camera are required for initialization');
      }

      // Store references
      this.scene = scene;
      this.camera = camera;

      // Initialize Components
      this.components = new OBC.Components();
      console.log('✓ Components created');

      // Get FragmentsManager
      this.fragmentsManager = this.components.get(OBC.FragmentsManager);
      console.log('✓ FragmentsManager obtained');

      // Initialize FragmentsManager with worker
      await this.initializeFragmentsManager();

      // Initialize IFC Loader
      await this.initializeIfcLoader();

      this.initialized = true;
      console.log('✅ FragmentsService initialized successfully');
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.CRITICAL, {
        operation: 'initialize',
        component: 'FragmentsService',
      });
      throw new Error(`Failed to initialize FragmentsService: ${error}`);
    }
  }

  /**
   * Initialize FragmentsManager with worker URL
   */
  private async initializeFragmentsManager(): Promise<void> {
    if (!this.fragmentsManager) {
      throw new Error('FragmentsManager is null');
    }

    const workerUrl = this.configService.fragmentsWorkerUrl;
    console.log('🔧 Initializing FragmentsManager with worker:', workerUrl);

    // Verify worker file is accessible
    try {
      const workerCheck = await fetch(workerUrl, { method: 'HEAD' });
      if (!workerCheck.ok) {
        throw new Error(
          `Worker file not accessible at ${workerUrl}. Status: ${workerCheck.status}. ` +
          `Make sure worker.mjs is in the public folder.`
        );
      }
      console.log('✓ Worker file verified');
    } catch (fetchError) {
      throw new Error(
        `Cannot access worker file at ${workerUrl}: ${fetchError}. ` +
        `Ensure the worker.mjs file exists in the public folder.`
      );
    }

    // Initialize the manager
    this.fragmentsManager.init(workerUrl);

    // Verify initialization
    if (!this.fragmentsManager.initialized) {
      throw new Error(
        'FragmentsManager.init() did not set initialized flag. ' +
        'Worker may have failed to load.'
      );
    }

    console.log('✓ FragmentsManager initialized');
  }

  /**
   * Initialize IFC Loader
   */
  private async initializeIfcLoader(): Promise<void> {
    if (!this.components) {
      throw new Error('Components not initialized');
    }

    this.ifcLoader = this.components.get(OBC.IfcLoader);
    console.log('🔧 Initializing IfcLoader...');

    const config = this.configService.config;
    const wasmPath = config.wasmPath;

    console.log('WASM path:', wasmPath);

    await this.ifcLoader.setup({
      autoSetWasm: false,
      wasm: {
        path: wasmPath,
        absolute: wasmPath.startsWith('http'),
      },
    });

    console.log('✓ IfcLoader initialized');
  }

  /**
   * Load an IFC file and convert to fragments
   * 
   * @param buffer - IFC file data as Uint8Array
   * @param name - Model name for identification
   * @param onProgress - Optional progress callback (0-100)
   * @returns Fragment model UUID
   * @throws Error if loading fails
   */
  async loadIfc(
    buffer: Uint8Array,
    name: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    this.ensureInitialized();

    if (!buffer || buffer.length === 0) {
      throw new Error('Invalid buffer: empty or null');
    }

    if (!name || typeof name !== 'string') {
      throw new Error('Invalid model name');
    }

    try {
      console.log(`📦 Loading IFC: ${name} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      onProgress?.(0);

      // Load the IFC file
      const model = await this.ifcLoader!.load(buffer, true, name);

      if (!model || !model.modelId) {
        throw new Error('Failed to load IFC model: model is null or has no ID');
      }

      console.log(`✓ Model loaded: ${name} (ID: ${model.modelId})`);

      // Add fragments to scene
      const addedCount = this.addFragmentsToScene(model);
      console.log(`✓ Added ${addedCount} fragment meshes to scene`);

      if (addedCount === 0) {
        console.warn('⚠️ No fragments were added to scene - model may not be visible');
      }

      // Store model reference
      this.loadedModels.set(model.modelId, model);

      onProgress?.(100);

      return model.modelId;
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
        operation: 'loadIfc',
        modelName: name,
        bufferSize: buffer.length,
      });
      throw new Error(`Failed to load IFC file "${name}": ${error}`);
    }
  }

  /**
   * Add fragment meshes to the Three.js scene
   * @param model - FragmentsModel to add
   * @returns Number of meshes added
   */
  private addFragmentsToScene(model: FRAGS.FragmentsModel): number {
    if (!this.scene) {
      throw new Error('Scene is null');
    }

    let addedCount = 0;

    // Iterate through all fragments in the model
    if (model.items && model.items.size > 0) {
      console.log(`📦 Processing ${model.items.size} fragments...`);

      model.items.forEach((fragment, fragmentId) => {
        if (fragment.mesh) {
          // Add mesh if not already in scene
          if (!fragment.mesh.parent) {
            this.scene!.add(fragment.mesh);
            fragment.mesh.visible = true;
            fragment.mesh.frustumCulled = true;
            addedCount++;
          }
        } else {
          console.warn(`⚠️ Fragment ${fragmentId} has no mesh`);
        }
      });
    } else {
      // Fallback: try adding model.object
      if (model.object && !model.object.parent) {
        this.scene.add(model.object);
        console.log('✓ Added model.object to scene (fallback)');
        addedCount = 1;
      }
    }

    return addedCount;
  }

  /**
   * Get a fragments model by ID
   * @param modelId - Model UUID
   * @returns FragmentsModel or undefined if not found
   */
  getModel(modelId: string): FRAGS.FragmentsModel | undefined {
    // First check local cache
    let model = this.loadedModels.get(modelId);
    
    // If not in cache, try to get from FragmentsManager
    if (!model && this.fragmentsManager) {
      model = this.fragmentsManager.list.get(modelId);
      if (model) {
        this.loadedModels.set(modelId, model);
      }
    }

    if (!model) {
      console.warn(`Model with ID ${modelId} not found`);
      console.log('Available models:', Array.from(this.loadedModels.keys()));
    }

    return model;
  }

  /**
   * Get all loaded fragment models
   * @returns Array of all loaded models
   */
  getAllModels(): FRAGS.FragmentsModel[] {
    return Array.from(this.loadedModels.values());
  }

  /**
   * Get model statistics
   * @param modelId - Model UUID
   * @returns Model statistics or null if model not found
   */
  getModelStatistics(modelId: string): ModelStatistics | null {
    const model = this.getModel(modelId);
    if (!model || !model.object) {
      return null;
    }

    const stats = calculateModelStatistics(model.object);
    const memoryBytes = estimateMemoryUsage(model.object);
    
    return {
      ...stats,
      memoryUsage: Math.round(memoryBytes / 1024 / 1024 * 100) / 100, // MB
    };
  }

  /**
   * Export a fragments model as binary data
   * @param modelId - Model UUID
   * @returns Export result with data or error
   */
  async exportFragment(modelId: string): Promise<ExportResult> {
    const startTime = performance.now();

    try {
      const model = this.getModel(modelId);
      if (!model) {
        return {
          success: false,
          error: `Model with ID ${modelId} not found`,
        };
      }

      console.log(`📤 Exporting fragment: ${modelId}`);

      const buffer = await model.getBuffer();
      const data = new Uint8Array(buffer);
      const duration = Math.round(performance.now() - startTime);

      console.log(`✓ Fragment exported: ${data.byteLength} bytes in ${duration}ms`);

      return {
        success: true,
        data,
        fileSize: data.byteLength,
        duration,
      };
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
        operation: 'exportFragment',
        modelId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Math.round(performance.now() - startTime),
      };
    }
  }

  /**
   * Remove a model from the scene and memory
   * @param modelId - Model UUID
   * @returns True if successfully removed
   */
  async removeModel(modelId: string): Promise<boolean> {
    try {
      const model = this.getModel(modelId);
      if (!model) {
        return false;
      }

      console.log(`🗑️ Removing model: ${modelId}`);

      // Remove from scene
      if (model.object && model.object.parent) {
        model.object.parent.remove(model.object);
      }

      // Remove fragment meshes from scene
      if (model.items) {
        model.items.forEach((fragment) => {
          if (fragment.mesh && fragment.mesh.parent) {
            fragment.mesh.parent.remove(fragment.mesh);
          }
        });
      }

      // Dispose model
      if (typeof model.dispose === 'function') {
        await model.dispose();
      }

      // Remove from cache
      this.loadedModels.delete(modelId);

      console.log(`✓ Model removed: ${modelId}`);
      return true;
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.WARNING, {
        operation: 'removeModel',
        modelId,
      });
      return false;
    }
  }

  /**
   * Bind camera for culling (if supported by library)
   * @param camera - Three.js camera
   */
  bindCamera(camera: THREE.Camera): void {
    this.camera = camera;
    console.log('✓ Camera bound for fragment culling');
  }

  /**
   * Update culling for all fragments
   * Call this after camera movement stops for performance optimization
   */
  async updateCulling(): Promise<void> {
    // ThatOpen Components v3 handles culling automatically
    // This method is here for API compatibility
  }

  /**
   * Dispose all resources
   * Call this when the viewer is destroyed
   */
  async dispose(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      console.log('🗑️ Disposing FragmentsService...');

      // Dispose all models
      const disposePromises = Array.from(this.loadedModels.keys()).map((id) =>
        this.removeModel(id)
      );
      await Promise.all(disposePromises);

      // Dispose IFC loader
      if (this.ifcLoader && typeof this.ifcLoader.dispose === 'function') {
        this.ifcLoader.dispose();
      }

      // Dispose components
      if (this.components) {
        this.components.dispose();
      }

      // Clear references
      this.loadedModels.clear();
      this.fragmentsManager = null;
      this.ifcLoader = null;
      this.components = null;
      this.scene = null;
      this.camera = null;
      this.initialized = false;

      console.log('✅ FragmentsService disposed');
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.WARNING, {
        operation: 'dispose',
        component: 'FragmentsService',
      });
    }
  }

  /**
   * Ensure service is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.ifcLoader || !this.fragmentsManager) {
      throw new Error(
        'FragmentsService not initialized. Call initialize() first.'
      );
    }
  }
}
