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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats.js';
import { FragmentsService } from '../../core/services/fragments.service';
import {
  VIEWER_CONFIG,
  RENDERER_CONFIG,
  CAMERA_CONFIG,
  CONTROLS_CONFIG,
} from '../../shared/constants/viewer.constants';
import { ModelState } from '../../shared/models/viewer.model';

@Component({
  selector: 'app-ifc-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ifc-viewer.component.html',
  styleUrls: ['./ifc-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IfcViewerComponent {
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fragmentsService = inject(FragmentsService);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  // Three.js objects
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private gridHelper?: THREE.GridHelper;
  private stats?: Stats;
  private animationFrameId?: number;

  // State
  readonly currentModel = signal<ModelState | null>(null);
  readonly isLoading = signal<boolean>(false);

  // Resize observer
  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.initViewer();
      this.ngZone.runOutsideAngular(() => this.animate());
    });
  }

  /**
   * Initialize the Three.js viewer and ThatOpen components
   */
  private async initViewer(): Promise<void> {
    try {
      const canvas = this.canvasRef().nativeElement;

      // Initialize Three.js renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: RENDERER_CONFIG.antialias,
        alpha: RENDERER_CONFIG.alpha,
        preserveDrawingBuffer: RENDERER_CONFIG.preserveDrawingBuffer,
        powerPreference: RENDERER_CONFIG.powerPreference,
      });

      // Modern rendering setup
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, RENDERER_CONFIG.maxPixelRatio)
      );

      // Initialize scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(VIEWER_CONFIG.backgroundColor);

      // Initialize camera
      const aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera = new THREE.PerspectiveCamera(
        CAMERA_CONFIG.fov,
        aspect,
        CAMERA_CONFIG.near,
        CAMERA_CONFIG.far
      );
      this.camera.position.set(
        VIEWER_CONFIG.cameraPosition.x,
        VIEWER_CONFIG.cameraPosition.y,
        VIEWER_CONFIG.cameraPosition.z
      );

      // Initialize OrbitControls
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.target.set(
        VIEWER_CONFIG.cameraTarget.x,
        VIEWER_CONFIG.cameraTarget.y,
        VIEWER_CONFIG.cameraTarget.z
      );
      this.controls.enableDamping = CONTROLS_CONFIG.enableDamping;
      this.controls.dampingFactor = CONTROLS_CONFIG.dampingFactor;
      this.controls.minDistance = CONTROLS_CONFIG.minDistance;
      this.controls.maxDistance = CONTROLS_CONFIG.maxDistance;
      this.controls.maxPolarAngle = CONTROLS_CONFIG.maxPolarAngle;
      this.controls.update();

      // Add event listener for camera rest (culling update)
      this.controls.addEventListener('end', () => {
        this.fragmentsService.updateCulling().catch(console.error);
      });

      // Add basic lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      this.scene.add(directionalLight);

      // Add grid helper if enabled
      if (VIEWER_CONFIG.showGrid) {
        this.gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        this.scene.add(this.gridHelper);
      }

      // Initialize stats
      if (VIEWER_CONFIG.showStats) {
        this.initStats();
      }

      // Setup resize observer
      this.setupResizeObserver(canvas);

      // Initialize FragmentsService
      await this.fragmentsService.initialize(this.scene, this.camera);

      // Initial render
      this.updateSize();
      this.renderer.render(this.scene, this.camera);

      console.log('IFC Viewer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize viewer:', error);
    }
  }

  /**
   * Initialize stats.js for memory monitoring
   */
  private initStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(2); // 2 = MB memory panel
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.top = '0px';
    document.body.appendChild(this.stats.dom);
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
   * Animation loop
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Stats begin
    this.stats?.begin();

    // Update controls
    this.controls.update();

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Stats end
    this.stats?.end();
  }

  /**
   * Handle file selection
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !file.name.toLowerCase().endsWith('.ifc')) {
      console.error('Please select a valid .ifc file');
      return;
    }

    await this.loadIfcFile(file);

    // Reset input so the same file can be selected again
    input.value = '';
  }

  /**
   * Load and process IFC file
   */
  private async loadIfcFile(file: File): Promise<void> {
    this.isLoading.set(true);

    const modelState: ModelState = {
      id: crypto.randomUUID(),
      name: file.name.replace('.ifc', ''),
      loading: true,
      progress: 0,
    };

    this.currentModel.set(modelState);

    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      console.log(`Loading IFC file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      // Load IFC without progress tracking (due to ThatOpen Components library limitations)
      // Progress will jump from 0% to 100% when complete
      const uuid = await this.fragmentsService.loadIfc(
        buffer,
        modelState.name
        // Progress callback omitted due to internal library issues with callbacks
      );

      // Update progress to 100% in Angular zone
      this.ngZone.run(() => {
        this.currentModel.update((state) =>
          state ? { ...state, progress: 100 } : state
        );
      });

      // Get the loaded model (FragmentsModel)
      const model = this.fragmentsService.getModel(uuid);
      if (!model) {
        throw new Error('Failed to retrieve loaded model');
      }

      console.log('Retrieved FragmentsModel from service:', model);
      console.log('Model type:', model.constructor.name);
      console.log('Model object:', model.object);

      // DIAGNOSTIC: Detailed model inspection
      this.inspectModelStructure(model.object);

      // Add model to scene
      // In v3.x, FragmentsModel has an 'object' property that is a THREE.Object3D
      this.scene.add(model.object);

      // FIX: Ensure all materials in the model are visible and properly configured
      this.fixModelMaterials(model.object);

      // DIAGNOSTIC: Add visual helpers
      this.addModelHelpers(model.object);

      // Bind camera for culling
      this.fragmentsService.bindCamera(this.camera);

      // Center camera on model
      this.centerCameraOnModel(model.object);

      // Update model state - mark as fully loaded
      this.ngZone.run(() => {
        this.currentModel.update((state) =>
          state
            ? {
                ...state,
                loading: false,
                progress: 100,
                fragmentUuid: uuid,
              }
            : state
        );
      });

      console.log(`IFC file loaded successfully: ${file.name}`);
    } catch (error) {
      console.error('Failed to load IFC file:', error);
      
      // Run in Angular zone to ensure change detection
      this.ngZone.run(() => {
        this.currentModel.update((state) =>
          state
            ? {
                ...state,
                loading: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            : state
        );
      });
    } finally {
      // Ensure loading state is reset in Angular zone
      this.ngZone.run(() => {
        this.isLoading.set(false);
      });
    }
  }

  /**
   * DIAGNOSTIC: Inspect the structure of the loaded model
   */
  private inspectModelStructure(modelObject: THREE.Object3D): void {
    console.group('🔍 Model Structure Inspection');
    
    console.log('Model Object:', modelObject);
    console.log('Type:', modelObject.type);
    console.log('Name:', modelObject.name);
    console.log('Children count:', modelObject.children.length);
    console.log('Visible:', modelObject.visible);
    console.log('Position:', modelObject.position);
    console.log('Rotation:', modelObject.rotation);
    console.log('Scale:', modelObject.scale);

    // Count different types of objects
    let meshCount = 0;
    let lineCount = 0;
    let pointCount = 0;
    let groupCount = 0;
    let totalVertices = 0;
    let totalFaces = 0;

    modelObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++;
        if (child.geometry) {
          const posAttr = child.geometry.getAttribute('position');
          if (posAttr) {
            totalVertices += posAttr.count;
          }
          if (child.geometry.index) {
            totalFaces += child.geometry.index.count / 3;
          }
        }
        
        // Log first few meshes with details
        if (meshCount <= 3) {
          console.log(`Mesh ${meshCount}:`, {
            name: child.name,
            visible: child.visible,
            geometry: child.geometry,
            material: child.material,
            position: child.position,
            hasGeometry: !!child.geometry,
            geometryType: child.geometry?.type,
            vertexCount: child.geometry?.getAttribute('position')?.count || 0,
          });
        }
      } else if (child instanceof THREE.Line) {
        lineCount++;
      } else if (child instanceof THREE.Points) {
        pointCount++;
      } else if (child instanceof THREE.Group) {
        groupCount++;
      }
    });

    console.log('Statistics:', {
      meshes: meshCount,
      lines: lineCount,
      points: pointCount,
      groups: groupCount,
      totalVertices,
      totalFaces: Math.floor(totalFaces),
    });

    // Calculate bounding box
    const bbox = new THREE.Box3().setFromObject(modelObject);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    
    console.log('Bounding Box:', {
      min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
      max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
      size: { x: size.x, y: size.y, z: size.z },
      center: { x: center.x, y: center.y, z: center.z },
    });

    console.groupEnd();
  }

  /**
   * FIX: Fix material visibility issues
   * Ensures all materials are properly configured for rendering
   */
  private fixModelMaterials(modelObject: THREE.Object3D): void {
    console.group('🔧 Fixing Model Materials');
    
    let materialsFixed = 0;

    modelObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((material) => {
          if (material) {
            // Store original state for logging
            const wasVisible = material.visible;
            const originalSide = material.side;
            const hadOpacity = material.opacity;

            // Fix common material issues
            material.visible = true;
            material.side = THREE.DoubleSide; // Render both sides
            material.needsUpdate = true;

            // Ensure opacity is set correctly
            if (material.transparent && material.opacity === 0) {
              material.opacity = 1.0;
              material.transparent = false;
            }

            // For MeshStandardMaterial or MeshPhysicalMaterial, ensure proper lighting response
            if ('metalness' in material) {
              // If metalness and roughness are both 0, object might appear black
              if (material.metalness === 0 && material.roughness === 0) {
                material.roughness = 0.5;
              }
            }

            // Ensure the material has a color (avoid pure black unless intentional)
            if ('color' in material && material.color) {
              const color = material.color as THREE.Color;
              // If color is too dark, lighten it slightly
              if (color.r < 0.1 && color.g < 0.1 && color.b < 0.1) {
                console.log('Dark material detected, lightening:', color);
                color.setRGB(0.7, 0.7, 0.7);
              }
            }

            if (!wasVisible || originalSide !== THREE.DoubleSide || hadOpacity === 0) {
              materialsFixed++;
              console.log('Fixed material:', {
                type: material.type,
                wasVisible,
                originalSide,
                hadOpacity,
                newSide: THREE.DoubleSide,
              });
            }
          }
        });

        // Ensure the mesh itself is visible
        child.visible = true;
        child.frustumCulled = true; // Enable frustum culling for performance
      }
    });

    console.log(`✓ Fixed ${materialsFixed} materials`);
    console.groupEnd();
  }

  /**
   * DIAGNOSTIC: Add visual helpers to understand model bounds and orientation
   */
  private addModelHelpers(modelObject: THREE.Object3D): void {
    console.log('Adding visual helpers for model');

    // Add bounding box helper
    const bbox = new THREE.Box3().setFromObject(modelObject);
    const boxHelper = new THREE.Box3Helper(bbox, new THREE.Color(0x00ff00));
    boxHelper.name = 'BoundingBoxHelper';
    this.scene.add(boxHelper);

    // Add axes helper at model center
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const axesHelper = new THREE.AxesHelper(maxDim * 0.5);
    axesHelper.position.copy(center);
    axesHelper.name = 'AxesHelper';
    this.scene.add(axesHelper);

    console.log('✓ Added bounding box helper (green) and axes helper at model center');
  }

  /**
   * Center camera on loaded model
   */
  private centerCameraOnModel(model: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5; // Add some padding

    this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
    this.controls.target.copy(center);
    this.controls.update();

      // Update culling after camera movement
      this.fragmentsService.updateCulling().catch(console.error);
  }

  /**
   * Download current model as .frag file
   */
  async downloadFragment(): Promise<void> {
    const model = this.currentModel();
    if (!model?.fragmentUuid) {
      console.error('No model loaded');
      return;
    }

    try {
      const buffer = await this.fragmentsService.exportFragment(model.fragmentUuid);
      if (!buffer) {
        throw new Error('Failed to export fragment');
      }

      // Create blob and download
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${model.name}.frag`;
      link.click();

      // Cleanup
      URL.revokeObjectURL(url);

      console.log(`Fragment exported: ${model.name}.frag`);
    } catch (error) {
      console.error('Failed to download fragment:', error);
    }
  }

  /**
   * Open file picker
   */
  openFilePicker(): void {
    this.fileInputRef().nativeElement.click();
  }

  /**
   * Cleanup resources on destroy
   */
  ngOnDestroy(): void {
    try {
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
      this.scene?.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });

      // Dispose renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
      }

      // Dispose fragments service
      this.fragmentsService.dispose().catch(console.error);

      console.log('IFC Viewer disposed successfully');
    } catch (error) {
      console.error('Error during viewer disposal:', error);
    }
  }
}

