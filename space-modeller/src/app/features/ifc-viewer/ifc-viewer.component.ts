import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
  inject,
  NgZone,
  afterNextRender,
  signal,
  DestroyRef,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats.js';

// Components
import { IfcClassFilterComponent } from './components/ifc-class-filter.component';

// Services
import { FragmentsService } from '../../core/services/fragments.service';
import { ErrorHandlerService, ErrorSeverity } from '../../core/services/error-handler.service';
import { ConfigService } from '../../core/services/config.service';
import { IfcFilterService } from '../../core/services/ifc-filter.service';

// Constants
import {
  RENDERER_CONFIG,
  CAMERA_CONFIG,
  CONTROLS_CONFIG,
  LIGHTING_CONFIG,
} from '../../shared/constants/viewer.constants';

// Models
import { IFCModelState, ModelLoadingStatus, ModelStatistics } from '../../shared/models/ifc.model';

// Utils
import {
  calculateCameraPosition,
  calculateBoundingBox,
  createStyledGrid,
  fixMaterials,
  disposeObject,
  formatBytes,
} from '../../shared/utils/three.utils';
import { validateIfcFile, sanitizeFileName } from '../../shared/utils/validation.utils';

/**
 * IFC Viewer Component
 * 
 * A professional-grade IFC model viewer built with Angular 18, Three.js, and ThatOpen Components.
 * 
 * Features:
 * - IFC file loading with progress tracking
 * - Orbit controls for navigation
 * - Fragment export capability
 * - Performance monitoring
 * - Error handling and user feedback
 * - Responsive design
 * - Accessibility support
 * 
 * @example
 * ```html
 * <app-ifc-viewer></app-ifc-viewer>
 * ```
 */
@Component({
  selector: 'app-ifc-viewer',
  standalone: true,
  imports: [CommonModule, IfcClassFilterComponent],
  templateUrl: './ifc-viewer.component.html',
  styleUrls: ['./ifc-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IfcViewerComponent {
  // Dependency Injection
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fragmentsService = inject(FragmentsService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly configService = inject(ConfigService);
  private readonly ifcFilterService = inject(IfcFilterService);

  // Template References
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  // Three.js Objects
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private gridHelper?: THREE.GridHelper;
  private stats?: Stats;
  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;

  // State Management (Signals)
  readonly currentModel = signal<IFCModelState | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isSidebarCollapsed = signal<boolean>(false); // Sidebar collapse state

  // Computed Signals
  readonly hasModel = computed(() => this.currentModel() !== null);
  readonly canExport = computed(() => {
    const model = this.currentModel();
    return model?.status === ModelLoadingStatus.LOADED && !!model?.fragmentUuid;
  });

  constructor() {
    // Initialize after view is rendered
    afterNextRender(() => {
      this.initializeViewer().catch((error) => {
        this.errorHandler.handleError(error, ErrorSeverity.CRITICAL, {
          operation: 'initializeViewer',
        });
        this.errorMessage.set('Failed to initialize viewer. Please refresh the page.');
      });
    });

    // Subscribe to configuration changes
    this.configService.config$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((config) => {
        console.log('⚙️ Configuration updated:', config);
        // Update visual elements based on config changes
        this.updateVisualSettings(config);
      });
  }

  /**
   * Initialize the Three.js viewer and ThatOpen components
   */
  private async initializeViewer(): Promise<void> {
    try {
      console.log('🚀 Initializing IFC Viewer...');
      
      const canvas = this.canvasRef().nativeElement;
      const config = this.configService.config;

      // Initialize Three.js renderer
      this.initializeRenderer(canvas);
      
      // Initialize scene
      this.initializeScene();
      
      // Initialize camera
      this.initializeCamera(canvas);
      
      // Initialize controls
      this.initializeControls(canvas);
      
      // Add lighting
      this.initializeLighting();
      
      // Add grid if enabled
      if (config.showGrid) {
        this.addGrid(config.gridSize, config.gridDivisions);
      }

      // Initialize stats if enabled
      if (config.showStats) {
        this.initializeStats();
      }

      // Setup resize observer
      this.setupResizeObserver(canvas);

      // Initialize FragmentsService
      await this.fragmentsService.initialize(this.scene, this.camera);

      // Initial render
      this.updateSize();
      this.renderer.render(this.scene, this.camera);

      // Start animation loop
      this.ngZone.runOutsideAngular(() => this.animate());

      console.log('✅ IFC Viewer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize viewer:', error);
      throw error;
    }
  }

  /**
   * Initialize WebGL renderer
   */
  private initializeRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: RENDERER_CONFIG.antialias,
      alpha: RENDERER_CONFIG.alpha,
      preserveDrawingBuffer: RENDERER_CONFIG.preserveDrawingBuffer,
      powerPreference: RENDERER_CONFIG.powerPreference,
    });

    // Modern rendering settings
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = RENDERER_CONFIG.toneMapping.exposure;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, RENDERER_CONFIG.maxPixelRatio)
    );

    console.log('✓ Renderer initialized');
  }

  /**
   * Initialize Three.js scene
   */
  private initializeScene(): void {
    const config = this.configService.config;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.backgroundColor);

    console.log('✓ Scene initialized');
  }

  /**
   * Initialize camera
   */
  private initializeCamera(canvas: HTMLCanvasElement): void {
    const config = this.configService.config;
    const aspect = canvas.clientWidth / canvas.clientHeight;

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov,
      aspect,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far
    );

    this.camera.position.set(
      config.cameraPosition.x,
      config.cameraPosition.y,
      config.cameraPosition.z
    );

    console.log('✓ Camera initialized');
  }

  /**
   * Initialize orbit controls
   */
  private initializeControls(canvas: HTMLCanvasElement): void {
    const config = this.configService.config;
    
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(
      config.cameraTarget.x,
      config.cameraTarget.y,
      config.cameraTarget.z
    );
    
    // Apply control settings
    this.controls.enableDamping = CONTROLS_CONFIG.enableDamping;
    this.controls.dampingFactor = CONTROLS_CONFIG.dampingFactor;
    this.controls.minDistance = CONTROLS_CONFIG.minDistance;
    this.controls.maxDistance = CONTROLS_CONFIG.maxDistance;
    this.controls.maxPolarAngle = CONTROLS_CONFIG.maxPolarAngle;
    this.controls.enablePan = CONTROLS_CONFIG.enablePan;
    this.controls.enableZoom = CONTROLS_CONFIG.enableZoom;
    this.controls.enableRotate = CONTROLS_CONFIG.enableRotate;
    this.controls.update();

    // Add camera rest event for culling updates
    this.controls.addEventListener('end', () => {
      this.fragmentsService.updateCulling().catch(console.error);
    });

    console.log('✓ Controls initialized');
  }

  /**
   * Initialize lighting
   */
  private initializeLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(
      LIGHTING_CONFIG.ambient.color,
      LIGHTING_CONFIG.ambient.intensity
    );
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(
      LIGHTING_CONFIG.directional.color,
      LIGHTING_CONFIG.directional.intensity
    );
    directionalLight.position.set(
      LIGHTING_CONFIG.directional.position.x,
      LIGHTING_CONFIG.directional.position.y,
      LIGHTING_CONFIG.directional.position.z
    );
    this.scene.add(directionalLight);

    console.log('✓ Lighting initialized');
  }

  /**
   * Add grid helper to scene
   */
  private addGrid(size?: number, divisions?: number): void {
    this.gridHelper = createStyledGrid(size, divisions);
    this.scene.add(this.gridHelper);
    console.log('✓ Grid added');
  }

  /**
   * Initialize stats.js for performance monitoring
   */
  private initializeStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(2); // Memory panel
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.top = '0px';
    this.stats.dom.style.zIndex = '1000';
    document.body.appendChild(this.stats.dom);
    console.log('✓ Stats initialized');
  }

  /**
   * Setup resize observer for responsive canvas
   */
  private setupResizeObserver(canvas: HTMLCanvasElement): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.ngZone.runOutsideAngular(() => {
        this.updateSize();
      });
    });
    this.resizeObserver.observe(canvas);
    console.log('✓ Resize observer setup');
  }

  /**
   * Update canvas and camera size
   */
  private updateSize(): void {
    const canvas = this.canvasRef().nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Update visual settings based on configuration
   */
  private updateVisualSettings(config: any): void {
    if (this.scene) {
      this.scene.background = new THREE.Color(config.backgroundColor);
    }

    // Update grid visibility
    if (this.gridHelper) {
      this.gridHelper.visible = config.showGrid ?? true;
    }

    // Update stats visibility
    if (this.stats) {
      this.stats.dom.style.display = config.showStats ? 'block' : 'none';
    }
  }

  /**
   * Animation loop
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    this.stats?.begin();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.stats?.end();
  }

  /**
   * Handle file selection from input
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validate file
    const validation = validateIfcFile(file);
    if (!validation.valid) {
      this.errorMessage.set(validation.error || 'Invalid file');
      this.errorHandler.handleError(validation.error, ErrorSeverity.WARNING, {
        operation: 'fileValidation',
        fileName: file.name,
      });
      input.value = '';
      return;
    }

    // Clear previous error
    this.errorMessage.set(null);

    // Load the file
    await this.loadIfcFile(file);

    // Reset input
    input.value = '';
  }

  /**
   * Load and process IFC file
   */
  private async loadIfcFile(file: File): Promise<void> {
    // Remove previous model if one exists
    await this.clearPreviousModel();

    this.isLoading.set(true);

    const modelState: IFCModelState = {
      id: crypto.randomUUID(),
      name: sanitizeFileName(file.name.replace('.ifc', '')),
      status: ModelLoadingStatus.LOADING,
      progress: 0,
      fileSize: file.size,
    };

    this.currentModel.set(modelState);

    try {
      console.log(`📂 Loading IFC file: ${file.name} (${formatBytes(file.size)})`);

      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Load IFC with progress tracking
      const uuid = await this.fragmentsService.loadIfc(
        buffer,
        modelState.name,
        (progress) => {
          this.ngZone.run(() => {
            this.currentModel.update((state) =>
              state ? { ...state, progress } : state
            );
          });
        }
      );

      // Update state: mark as processing
      this.ngZone.run(() => {
        this.currentModel.update((state) =>
          state
            ? { ...state, status: ModelLoadingStatus.PROCESSING, progress: 100 }
            : state
        );
      });

      // Get the loaded model
      const model = this.fragmentsService.getModel(uuid);
      if (!model) {
        throw new Error('Failed to retrieve loaded model from service');
      }

      console.log('✅ Model loaded successfully');

      // Fix materials
      const fixed = this.fixSceneMaterials();
      console.log(`✓ Fixed ${fixed} materials`);

      // Center camera on model
      this.centerCameraOnScene();

      // Add visual helpers if enabled
      const config = this.configService.config;
      if (config.showBoundingBoxHelper || config.showAxesHelper) {
        this.addSceneHelpers();
      }

      // Bind camera for culling
      this.fragmentsService.bindCamera(this.camera);

      // Get model statistics
      const stats = this.fragmentsService.getModelStatistics(uuid);

      // Extract IFC classes for filtering
      await this.extractIfcClasses(uuid);

      // Update state: mark as fully loaded
      this.ngZone.run(() => {
        this.currentModel.update((state) => {
          if (!state) return state;
          
          return {
            ...state,
            status: ModelLoadingStatus.LOADED,
            fragmentUuid: uuid,
            loadedAt: new Date(),
            stats: stats || undefined,
          };
        });
      });

      console.log(`✅ Successfully loaded: ${file.name}`);
      if (stats) {
        console.log(`📊 Model stats:`, {
          fragments: stats.fragmentCount,
          meshes: stats.meshCount,
          vertices: stats.vertexCount,
          faces: stats.faceCount,
          memory: stats.memoryUsage ? `${stats.memoryUsage.toFixed(2)} MB` : 'N/A',
        });
      }
    } catch (error) {
      console.error('❌ Failed to load IFC file:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.ngZone.run(() => {
        this.currentModel.update((state) =>
          state
            ? {
                ...state,
                status: ModelLoadingStatus.FAILED,
                error: {
                  message: errorMessage,
                  timestamp: new Date(),
                },
              }
            : state
        );
        this.errorMessage.set(errorMessage);
      });

      this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
        operation: 'loadIfcFile',
        fileName: file.name,
        fileSize: file.size,
      });
    } finally {
      this.ngZone.run(() => {
        this.isLoading.set(false);
      });
    }
  }

  /**
   * Fix material visibility issues in the scene
   */
  private fixSceneMaterials(): number {
    return fixMaterials(this.scene);
  }

  /**
   * Center camera on all meshes in the scene
   */
  private centerCameraOnScene(): void {
    console.log('🎥 Centering camera on scene');

    const bbox = calculateBoundingBox(this.scene);
    
    if (!bbox || bbox.isEmpty()) {
      console.warn('⚠️ No geometry found, using default camera position');
      return;
    }

    const cameraPos = calculateCameraPosition(
      this.scene,
      this.camera,
      CAMERA_CONFIG.fitPadding
    );

    this.camera.position.copy(cameraPos.position);
    this.controls.target.copy(cameraPos.target);
    this.controls.update();

    console.log('✓ Camera centered');
  }

  /**
   * Add visual helpers to the scene
   */
  private addSceneHelpers(): void {
    const config = this.configService.config;
    const bbox = calculateBoundingBox(this.scene);

    if (!bbox || bbox.isEmpty()) {
      return;
    }

    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Add bounding box helper
    if (config.showBoundingBoxHelper) {
      const boxHelper = new THREE.Box3Helper(bbox, new THREE.Color(0x00ff00));
      boxHelper.name = 'BoundingBoxHelper';
      this.scene.add(boxHelper);
      console.log('✓ Added bounding box helper');
    }

    // Add axes helper
    if (config.showAxesHelper) {
      const axesHelper = new THREE.AxesHelper(maxDim * 0.5);
      axesHelper.position.copy(center);
      axesHelper.name = 'AxesHelper';
      this.scene.add(axesHelper);
      console.log('✓ Added axes helper');
    }
  }

  /**
   * Extract IFC classes from the loaded model
   */
  private async extractIfcClasses(modelId: string): Promise<void> {
    try {
      console.log('🔍 Extracting IFC classes...');
      const classes = await this.ifcFilterService.extractClasses(modelId);
      console.log(`✅ Extracted ${classes.length} IFC classes`);
    } catch (error) {
      console.error('❌ Failed to extract IFC classes:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Clear previous model and all helpers from the scene
   */
  private async clearPreviousModel(): Promise<void> {
    const currentModel = this.currentModel();
    
    if (currentModel?.fragmentUuid) {
      console.log('🗑️ Removing previous model from scene...');
      
      // Clear IFC filter state
      this.ifcFilterService.clear();
      
      // Remove the model from the fragments service
      await this.fragmentsService.removeModel(currentModel.fragmentUuid);
      
      // Remove visual helpers (bounding box, axes)
      this.removeSceneHelpers();
      
      console.log('✓ Previous model removed');
    }
  }

  /**
   * Remove visual helpers from the scene
   */
  private removeSceneHelpers(): void {
    // Find and remove bounding box helper
    const boxHelper = this.scene.getObjectByName('BoundingBoxHelper');
    if (boxHelper) {
      this.scene.remove(boxHelper);
      disposeObject(boxHelper);
    }

    // Find and remove axes helper
    const axesHelper = this.scene.getObjectByName('AxesHelper');
    if (axesHelper) {
      this.scene.remove(axesHelper);
      disposeObject(axesHelper);
    }
  }

  /**
   * Download current model as .frag file
   */
  async downloadFragment(): Promise<void> {
    const model = this.currentModel();
    if (!model?.fragmentUuid) {
      console.warn('No model loaded to export');
      return;
    }

    try {
      console.log('📤 Exporting fragment...');

      const result = await this.fragmentsService.exportFragment(model.fragmentUuid);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Export failed');
      }

      // Create blob and download
      const blob = new Blob([result.data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${model.name}.frag`;
      link.click();

      // Cleanup
      URL.revokeObjectURL(url);

      console.log(`✅ Fragment exported: ${model.name}.frag (${formatBytes(result.fileSize || 0)})`);
    } catch (error) {
      console.error('❌ Failed to export fragment:', error);
      this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
        operation: 'downloadFragment',
        modelId: model.fragmentUuid,
      });
      this.errorMessage.set('Failed to export fragment');
    }
  }

  /**
   * Open file picker
   */
  openFilePicker(): void {
    this.fileInputRef().nativeElement.click();
  }

  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed.update((collapsed) => !collapsed);
  }

  /**
   * Cleanup resources on destroy
   */
  ngOnDestroy(): void {
    try {
      console.log('🗑️ Cleaning up IFC Viewer...');

      // Cancel animation frame
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }

      // Remove stats
      if (this.stats?.dom) {
        this.stats.dom.remove();
      }

      // Dispose controls
      if (this.controls) {
        this.controls.dispose();
      }

      // Dispose resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }

      // Dispose scene objects
      if (this.scene) {
        disposeObject(this.scene);
      }

      // Dispose renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
      }

      // Dispose fragments service
      this.fragmentsService.dispose().catch(console.error);

      console.log('✅ IFC Viewer disposed');
    } catch (error) {
      console.error('❌ Error during viewer disposal:', error);
    }
  }
}
