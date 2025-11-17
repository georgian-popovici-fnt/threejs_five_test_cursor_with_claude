# Orientation Cube - Usage Examples

## Example 1: Basic Integration

The simplest way to add the orientation cube to any Three.js scene in Angular:

```typescript
import { Component, ElementRef, viewChild, inject, NgZone, afterNextRender } from '@angular/core';
import { OrientationCubeComponent } from './shared/components/orientation-cube.component';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-my-3d-viewer',
  standalone: true,
  imports: [OrientationCubeComponent],
  template: `
    <div class="viewer">
      <canvas #canvas></canvas>
      
      @if (camera) {
        <app-orientation-cube [camera]="camera" />
      }
    </div>
  `,
  styles: [`
    .viewer {
      width: 100%;
      height: 100vh;
      position: relative;
    }
    
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `],
})
export class My3DViewerComponent {
  private readonly ngZone = inject(NgZone);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  
  camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private controls!: OrbitControls;
  
  constructor() {
    afterNextRender(() => {
      this.initScene();
      this.ngZone.runOutsideAngular(() => this.animate());
    });
  }
  
  private initScene(): void {
    const canvas = this.canvasRef().nativeElement;
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x263238);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);
    
    // Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    
    // Add a simple cube to the scene
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
    
    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0x404040));
  }
  
  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  ngOnDestroy(): void {
    this.controls?.dispose();
    this.renderer?.dispose();
  }
}
```

## Example 2: With Camera Switching

Supporting multiple camera types (perspective and orthographic):

```typescript
import { signal } from '@angular/core';

export class ViewerWithCameraSwitchComponent {
  camera!: THREE.Camera; // Union type for both cameras
  private perspectiveCamera!: THREE.PerspectiveCamera;
  private orthographicCamera!: THREE.OrthographicCamera;
  
  readonly cameraType = signal<'perspective' | 'orthographic'>('perspective');
  
  private initCameras(canvas: HTMLCanvasElement): void {
    const aspect = canvas.clientWidth / canvas.clientHeight;
    
    // Perspective camera
    this.perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.perspectiveCamera.position.set(5, 5, 5);
    
    // Orthographic camera
    const frustumSize = 10;
    this.orthographicCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    this.orthographicCamera.position.set(5, 5, 5);
    
    // Set active camera
    this.camera = this.perspectiveCamera;
  }
  
  switchCamera(type: 'perspective' | 'orthographic'): void {
    const oldPosition = this.camera.position.clone();
    
    this.camera = type === 'perspective' 
      ? this.perspectiveCamera 
      : this.orthographicCamera;
      
    this.camera.position.copy(oldPosition);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    
    this.cameraType.set(type);
    
    // Update controls to use new camera
    this.controls.object = this.camera as any;
    this.controls.update();
  }
}
```

Template:

```html
<div class="viewer">
  <canvas #canvas></canvas>
  
  <!-- Orientation cube updates automatically with camera changes -->
  <app-orientation-cube [camera]="camera" />
  
  <!-- Camera switcher -->
  <div class="controls-panel">
    <button (click)="switchCamera('perspective')">Perspective</button>
    <button (click)="switchCamera('orthographic')">Orthographic</button>
  </div>
</div>
```

## Example 3: Custom Styled Orientation Cube

Customizing the position and appearance:

```typescript
@Component({
  selector: 'app-custom-viewer',
  template: `
    <div class="viewer">
      <canvas #canvas></canvas>
      
      <!-- Wrapped for custom styling -->
      <div class="custom-cube-wrapper">
        <app-orientation-cube [camera]="camera" />
      </div>
    </div>
  `,
  styles: [`
    /* Move to bottom-left corner */
    .custom-cube-wrapper app-orientation-cube {
      top: auto !important;
      bottom: 16px;
      left: 16px;
      right: auto !important;
    }
    
    /* Make it larger */
    .custom-cube-wrapper app-orientation-cube {
      width: 120px;
      height: 120px;
    }
    
    /* Add custom border */
    .custom-cube-wrapper app-orientation-cube {
      border: 2px solid #2196f3;
      border-radius: 8px;
    }
  `],
})
export class CustomViewerComponent {
  // ...
}
```

## Example 4: Conditional Display

Show/hide the orientation cube based on user preference:

```typescript
export class ViewerWithToggleComponent {
  readonly showOrientationCube = signal(true);
  
  toggleOrientationCube(): void {
    this.showOrientationCube.update(show => !show);
  }
}
```

Template:

```html
<div class="viewer">
  <canvas #canvas></canvas>
  
  @if (showOrientationCube()) {
    <app-orientation-cube [camera]="camera" />
  }
  
  <button (click)="toggleOrientationCube()">
    {{ showOrientationCube() ? 'Hide' : 'Show' }} Orientation Cube
  </button>
</div>
```

## Example 5: Multiple Viewports

Using orientation cubes with split-screen views:

```typescript
@Component({
  template: `
    <div class="split-view">
      <!-- Left viewport -->
      <div class="viewport">
        <canvas #leftCanvas></canvas>
        <app-orientation-cube [camera]="leftCamera" />
      </div>
      
      <!-- Right viewport -->
      <div class="viewport">
        <canvas #rightCanvas></canvas>
        <app-orientation-cube [camera]="rightCamera" />
      </div>
    </div>
  `,
  styles: [`
    .split-view {
      display: flex;
      width: 100%;
      height: 100vh;
    }
    
    .viewport {
      flex: 1;
      position: relative;
    }
    
    canvas {
      width: 100%;
      height: 100%;
    }
  `],
})
export class SplitViewComponent {
  leftCamera!: THREE.Camera;
  rightCamera!: THREE.Camera;
  
  // Initialize separate cameras for each viewport
}
```

## Example 6: With Animation Effects

Adding smooth transitions when camera orientation changes:

```typescript
export class AnimatedViewerComponent {
  private targetQuaternion = new THREE.Quaternion();
  private animating = false;
  
  snapToView(view: 'front' | 'top' | 'side'): void {
    const positions = {
      front: new THREE.Vector3(0, 0, 10),
      top: new THREE.Vector3(0, 10, 0),
      side: new THREE.Vector3(10, 0, 0),
    };
    
    // Animate camera to new position
    this.animating = true;
    const startPos = this.camera.position.clone();
    const endPos = positions[view];
    
    // The orientation cube will automatically update during animation
    this.animateCamera(startPos, endPos, 1000);
  }
  
  private animateCamera(
    start: THREE.Vector3,
    end: THREE.Vector3,
    duration: number
  ): void {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      this.camera.position.lerpVectors(start, end, eased);
      this.camera.lookAt(0, 0, 0);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.animating = false;
      }
    };
    
    animate();
  }
}
```

## Best Practices

### 1. Camera Initialization

Always ensure the camera is initialized before rendering the orientation cube:

```typescript
// ✅ Good
@if (camera) {
  <app-orientation-cube [camera]="camera" />
}

// ❌ Bad (camera might be undefined)
<app-orientation-cube [camera]="camera" />
```

### 2. Resource Management

The orientation cube handles its own cleanup, but ensure the parent component also cleans up properly:

```typescript
ngOnDestroy(): void {
  // Cancel animation frames
  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
  }
  
  // Dispose controls
  this.controls?.dispose();
  
  // Dispose renderer
  this.renderer?.dispose();
  this.renderer?.forceContextLoss();
  
  // The orientation cube will clean up automatically
}
```

### 3. Performance

The orientation cube runs in its own rendering context, so it has minimal impact on main scene performance. However, for best results:

- Only create one orientation cube per viewport
- Ensure it's destroyed when the viewport is destroyed
- Don't create/destroy it repeatedly (use `*ngIf` wisely)

### 4. Styling

When customizing styles, use `!important` sparingly or increase specificity:

```css
/* ✅ Better - higher specificity */
.my-viewer app-orientation-cube {
  top: 24px;
  right: 24px;
}

/* ⚠️ Use sparingly */
app-orientation-cube {
  top: 24px !important;
}
```

## Common Issues and Solutions

### Issue: Cube not updating when camera changes

**Solution:** Ensure camera reference is reactive:

```typescript
// ✅ Use signals for reactive camera
readonly camera = signal<THREE.Camera>(myCamera);

// Or update with change detection
this.camera = newCamera;
this.cdr.markForCheck(); // If using OnPush
```

### Issue: Cube appears behind other elements

**Solution:** Adjust z-index:

```css
app-orientation-cube {
  z-index: 9999 !important;
}
```

### Issue: Cube too small on HiDPI displays

**Solution:** The component automatically handles devicePixelRatio up to 2x. If you need more:

```typescript
// Modify the component's initialization (not recommended)
// Better to use CSS transform
app-orientation-cube {
  transform: scale(1.5);
  transform-origin: top right;
}
```

## Testing Your Integration

1. **Visual Test**: Rotate the camera and verify the cube mirrors the rotation
2. **Performance Test**: Check frame rate doesn't drop significantly
3. **Responsive Test**: Resize window and verify cube stays positioned correctly
4. **Accessibility Test**: Verify cube doesn't interfere with keyboard navigation

## Advanced Customization

For advanced users who want to fork and customize the component:

### Changing Face Colors

Edit the `faceColors` object in `orientation-cube.component.ts`:

```typescript
private readonly faceColors = {
  front: 0xFF0000,   // Red
  back: 0x00FF00,    // Green
  right: 0x0000FF,   // Blue
  left: 0xFFFF00,    // Yellow
  top: 0xFF00FF,     // Magenta
  bottom: 0x00FFFF,  // Cyan
};
```

### Changing Labels

Modify the `faces` array in `createFaceMaterials()`:

```typescript
const faces = [
  { name: 'East', cardinal: 'E', color: this.faceColors.right },
  { name: 'West', cardinal: 'W', color: this.faceColors.left },
  // ... etc
];
```

### Adding Click Interaction

Remove `pointer-events: none` and add click handlers:

```typescript
styles: [`
  :host {
    /* Remove: pointer-events: none; */
    cursor: pointer;
  }
`],

// Add raycasting in the component
private setupClickHandler(): void {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  this.canvasRef().nativeElement.addEventListener('click', (event) => {
    // Convert mouse position
    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycast
    raycaster.setFromCamera(mouse, this.cubeCamera);
    const intersects = raycaster.intersectObject(this.cube);
    
    if (intersects.length > 0) {
      // Get face index and emit event or snap camera
      const faceIndex = Math.floor(intersects[0].faceIndex! / 2);
      this.handleFaceClick(faceIndex);
    }
  });
}
```

---

These examples should cover most use cases. For more information, see `ORIENTATION_CUBE.md`.

