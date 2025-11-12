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
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
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
      
      // Store scene and camera references
      this.scene = scene;
      this.camera = camera;
      console.log('Scene and camera stored in service');
      
      // Initialize Components
      // ThatOpen Components v3 works differently - it manages its own internal state
      // We just need to create the Components instance and then manually add loaded models to our scene
      this.components = new OBC.Components();
      console.log('Components created (manages loading, we handle scene integration)');

      // Get FragmentsManager from components
      this.fragmentsManager = this.components.get(OBC.FragmentsManager);
      console.log('FragmentsManager obtained from components');

      // Initialize FragmentsManager with worker URL
      // This MUST be called before loading any IFC files
      try {
        console.log('Initializing FragmentsManager with worker URL:', FRAGMENTS_WORKER_URL);
        console.log('Worker URL type:', typeof FRAGMENTS_WORKER_URL);
        console.log('Worker URL value:', FRAGMENTS_WORKER_URL);
        
        // Check if worker file is accessible
        try {
          const workerCheck = await fetch(FRAGMENTS_WORKER_URL, { method: 'HEAD' });
          console.log('Worker file accessible:', workerCheck.ok, 'Status:', workerCheck.status);
          if (!workerCheck.ok) {
            throw new Error(`Worker file not accessible at ${FRAGMENTS_WORKER_URL}. Status: ${workerCheck.status}`);
          }
        } catch (fetchError) {
          console.error('Failed to verify worker file:', fetchError);
          throw new Error(`Cannot access worker file at ${FRAGMENTS_WORKER_URL}: ${fetchError}`);
        }
        
        this.fragmentsManager.init(FRAGMENTS_WORKER_URL);
        console.log('init() call completed');
        
        // Verify FragmentsManager is initialized immediately after init()
        console.log('FragmentsManager.initialized:', this.fragmentsManager.initialized);
        
        if (!this.fragmentsManager.initialized) {
          throw new Error('FragmentsManager.init() did not set the initialized flag. Worker may have failed to load.');
        }
        
        console.log('FragmentsManager core:', this.fragmentsManager.core);
        console.log('FragmentsManager core.models:', this.fragmentsManager.core.models);
      } catch (error) {
        console.error('Error during FragmentsManager initialization:', error);
        throw new Error(`Failed to initialize FragmentsManager: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Initialize IFC Loader
      this.ifcLoader = this.components.get(OBC.IfcLoader);
      console.log('IfcLoader obtained from components');
      
      // Configure WASM path for web-ifc
      const wasmPath = VIEWER_CONFIG.wasmPath;
      console.log('Setting up IfcLoader with WASM path:', wasmPath);
      
      await this.ifcLoader.setup({
        autoSetWasm: false, // CRITICAL: Disable auto WASM fetching from CDN
        wasm: {
          path: wasmPath,
          absolute: wasmPath.startsWith('http'),
        },
      });

      this.initialized = true;
      console.log('FragmentsService initialized successfully');
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
      console.log(`Starting IFC load for: ${name}`);
      console.log(`Buffer size: ${buffer.length} bytes`);
      
      // Double-check that FragmentsManager is still initialized
      if (!this.fragmentsManager) {
        throw new Error('FragmentsManager is null');
      }
      console.log('Pre-load FragmentsManager.initialized:', this.fragmentsManager.initialized);
      
      if (!this.fragmentsManager.initialized) {
        throw new Error('FragmentsManager is not initialized before load(). This should not happen.');
      }
      
      // Set up progress tracking if callback provided
      onProgress?.(0);

      // Load the IFC file
      // In ThatOpen Components v3.x, the load method signature is:
      // load(data: Uint8Array, coordinate: boolean, name: string, config?: {...})
      console.log('Calling ifcLoader.load()...');
      
      // Note: Progress callbacks are disabled for now due to internal library issues
      // The library will still load the file, just without progress updates
      const model = await this.ifcLoader.load(
        buffer,
        true, // coordinate
        name // name
        // config is omitted - passing undefined or empty config causes issues
      );

      if (!model) {
        throw new Error('Failed to load IFC model - model is null');
      }

      // Ensure model has a valid ID
      if (!model.modelId) {
        throw new Error('Loaded model has no modelId');
      }

      console.log(`Model "${name}" loaded successfully`);
      console.log('Model type:', model.constructor.name);
      console.log('Model ID:', model.modelId);
      
      // CRITICAL FIX: Add fragments to the scene
      // In ThatOpen Components v3, the geometry is stored as Fragment objects
      if (!this.scene) {
        throw new Error('Scene is null, cannot add model');
      }
      
      console.log('🔍 Adding model to scene...');
      console.log('Model type:', model.constructor.name);
      console.log('Model ID:', model.modelId);
      
      // The FragmentsModel contains Fragment objects that hold the actual geometry
      // Each Fragment has meshes that need to be added to the scene
      let addedMeshCount = 0;
      let fragmentCount = 0;
      
      // Iterate through all fragments in the model
      // model.items is a Map<string, Fragment>
      if (model.items && model.items.size > 0) {
        console.log(`Found ${model.items.size} fragments in model`);
        
        model.items.forEach((fragment, fragmentId) => {
          fragmentCount++;
          console.log(`Processing fragment ${fragmentCount}/${model.items.size}:`, fragmentId);
          
          // Each fragment has a mesh property that is a THREE.InstancedMesh or THREE.Mesh
          if (fragment.mesh) {
            console.log('  Fragment has mesh:', fragment.mesh.constructor.name);
            console.log('  Mesh visible:', fragment.mesh.visible);
            console.log('  Mesh vertex count:', fragment.mesh.geometry?.getAttribute('position')?.count || 0);
            
            // Add the mesh to the scene
            if (!fragment.mesh.parent) {
              this.scene.add(fragment.mesh);
              fragment.mesh.visible = true;
              fragment.mesh.frustumCulled = true;
              addedMeshCount++;
              console.log(`  ✅ Added fragment mesh to scene`);
            } else {
              console.log(`  ⚠️ Fragment mesh already has parent:`, fragment.mesh.parent.name || fragment.mesh.parent.type);
            }
          } else {
            console.warn(`  ⚠️ Fragment ${fragmentId} has no mesh property`);
          }
        });
        
        console.log(`✅ Successfully added ${addedMeshCount}/${fragmentCount} fragment meshes to scene`);
      } else {
        console.warn('⚠️ Model has no fragments (model.items is empty or undefined)');
        console.log('Model.items:', model.items);
        
        // Fallback: try adding model.object if it exists
        if (model.object) {
          console.log('Attempting fallback: adding model.object to scene');
          if (!model.object.parent) {
            this.scene.add(model.object);
            console.log('✅ Added model.object to scene (fallback)');
          }
        }
      }
      
      // Additional check: ensure model is visible in the scene
      if (addedMeshCount === 0) {
        console.error('❌ ERROR: No meshes were added to the scene!');
        console.error('This indicates a problem with the model structure or library version.');
        console.error('Model structure:', {
          hasItems: !!model.items,
          itemsSize: model.items?.size,
          hasObject: !!model.object,
          objectChildren: model.object?.children?.length,
        });
      }
      
      // Report 100% progress (we only get start and end, no intermediate updates)
      onProgress?.(100);
      
      // Return the model ID for retrieval later
      return model.modelId;
    } catch (error) {
      console.error('Failed to load IFC file:', error);
      // Make sure we get detailed error information
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
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
    
    // In v3.x, FragmentsModels are stored in the FragmentsManager list
    const model = this.fragmentsManager.list.get(id);
    
    if (!model) {
      console.warn(`Model with ID ${id} not found`);
      console.log('Available models:', Array.from(this.fragmentsManager.list.keys()));
    }
    
    return model;
  }

  /**
   * Get all loaded fragment models
   */
  getAllModels(): FRAGS.FragmentsModel[] {
    if (!this.fragmentsManager) {
      return [];
    }
    
    // Return all fragment models as an array
    const models: FRAGS.FragmentsModel[] = [];
    this.fragmentsManager.list.forEach((model) => {
      models.push(model);
    });
    return models;
  }

  /**
   * Export a fragments model as binary data
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
      
      // In v3.x, FragmentsModel has a getBuffer method
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
