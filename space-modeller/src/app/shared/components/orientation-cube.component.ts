import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
  inject,
  NgZone,
  afterNextRender,
  input,
  effect,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';

/**
 * Orientation Cube Component
 * 
 * A 3D view gizmo that mirrors the main camera's orientation, providing
 * visual feedback about the current viewing direction. Fixed to the top-right
 * corner of the viewport.
 * 
 * Features:
 * - Lightweight rendering with separate scene/canvas
 * - Cardinal direction labels (N/S/E/W)
 * - HiDPI support with crisp text rendering
 * - Smooth rotation updates via requestAnimationFrame
 * - No interaction (pointer-events: none)
 * 
 * Axis mapping:
 * - +Z = Front (N)
 * - -Z = Back (S)
 * - -X = Left (W)
 * - +X = Right (E)
 * - +Y = Top
 * 
 * @example
 * ```html
 * <app-orientation-cube [camera]="myCamera" />
 * ```
 */
@Component({
  selector: 'app-orientation-cube',
  standalone: true,
  template: `
    <canvas 
      #canvas 
      class="orientation-cube-canvas"
      aria-hidden="true"
    ></canvas>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      top: 16px;
      right: 16px;
      width: 80px;
      height: 80px;
      pointer-events: none;
      z-index: 1000;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      background: rgba(255, 255, 255, 0.95);
    }

    .orientation-cube-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        background: rgba(30, 30, 30, 0.95);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrientationCubeComponent {
  // Inputs
  readonly camera = input.required<THREE.Camera>();

  // Dependencies
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  // Template References
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  // Three.js Objects
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private cubeCamera!: THREE.PerspectiveCamera;
  private cube!: THREE.Mesh;
  private animationFrameId?: number;

  // Face colors (subtle, high contrast)
  private readonly faceColors = {
    front: 0x4a90e2,  // Blue (North)
    back: 0x50c878,   // Green (South)
    right: 0xf5a623,  // Orange (East)
    left: 0xe94b3c,   // Red (West)
    top: 0x9b59b6,    // Purple
    bottom: 0x95a5a6, // Gray (not visible)
  };

  constructor() {
    // Initialize after view is rendered
    afterNextRender(() => {
      this.initializeCube();
      this.ngZone.runOutsideAngular(() => this.animate());
    });

    // React to camera changes
    effect(() => {
      const cam = this.camera();
      if (cam && this.cube) {
        // Update cube rotation to match main camera
        this.updateCubeOrientation(cam);
      }
    });
  }

  /**
   * Initialize the orientation cube scene
   */
  private initializeCube(): void {
    const canvas = this.canvasRef().nativeElement;
    const size = 80;
    const dpr = Math.min(window.devicePixelRatio, 2);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(size, size, false);
    this.renderer.setPixelRatio(dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Setup scene
    this.scene = new THREE.Scene();

    // Setup camera
    this.cubeCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    this.cubeCamera.position.set(0, 0, 3);
    this.cubeCamera.lookAt(0, 0, 0);

    // Create cube with face materials
    const materials = this.createFaceMaterials();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.cube = new THREE.Mesh(geometry, materials);
    this.scene.add(this.cube);

    // Add subtle lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Add edges for better definition
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x000000, 
      linewidth: 1,
      opacity: 0.3,
      transparent: true,
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    this.cube.add(wireframe);

    console.log('✓ Orientation cube initialized');
  }

  /**
   * Create materials for each face with labels
   */
  private createFaceMaterials(): THREE.Material[] {
    const faces = [
      { name: 'Right', cardinal: 'E', color: this.faceColors.right },   // +X
      { name: 'Left', cardinal: 'W', color: this.faceColors.left },     // -X
      { name: 'Top', cardinal: 'Top', color: this.faceColors.top },     // +Y
      { name: 'Bottom', cardinal: '', color: this.faceColors.bottom },  // -Y (not labeled)
      { name: 'Front', cardinal: 'N', color: this.faceColors.front },   // +Z
      { name: 'Back', cardinal: 'S', color: this.faceColors.back },     // -Z
    ];

    return faces.map((face) => {
      if (!face.cardinal) {
        // Bottom face - simple material
        return new THREE.MeshStandardMaterial({
          color: face.color,
          flatShading: true,
        });
      }

      // Create canvas for text
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = `#${face.color.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, size, size);

      // Text settings
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw face name
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.fillText(face.name, size / 2, size / 2 - 20);

      // Draw cardinal direction
      ctx.font = 'bold 72px Arial, sans-serif';
      ctx.fillText(`(${face.cardinal})`, size / 2, size / 2 + 40);

      // Create texture
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      return new THREE.MeshStandardMaterial({
        map: texture,
        flatShading: true,
      });
    });
  }

  /**
   * Update cube orientation to mirror main camera
   */
  private updateCubeOrientation(mainCamera: THREE.Camera): void {
    if (!this.cube) return;

    // Get the inverse of the main camera's rotation
    // This makes the cube rotate in the opposite direction, creating a mirror effect
    const quaternion = mainCamera.quaternion.clone();
    
    // Invert the quaternion to mirror the rotation
    quaternion.invert();
    
    this.cube.quaternion.copy(quaternion);
  }

  /**
   * Animation loop
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Update cube orientation based on current camera
    const mainCamera = this.camera();
    if (mainCamera) {
      this.updateCubeOrientation(mainCamera);
    }

    // Render the scene
    this.renderer.render(this.scene, this.cubeCamera);
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    console.log('🗑️ Cleaning up orientation cube...');

    // Cancel animation frame
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Dispose cube geometry and materials
    if (this.cube) {
      if (Array.isArray(this.cube.material)) {
        this.cube.material.forEach((material) => {
          const mat = material as THREE.MeshStandardMaterial;
          if (mat.map) {
            mat.map.dispose();
          }
          material.dispose();
        });
      }
      this.cube.geometry.dispose();

      // Dispose wireframe
      this.cube.children.forEach((child) => {
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }

    // Dispose scene
    if (this.scene) {
      this.scene.clear();
    }

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }

    console.log('✅ Orientation cube disposed');
  }
}

