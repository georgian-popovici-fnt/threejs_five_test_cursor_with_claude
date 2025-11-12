# Developer Guide - Space Modeller IFC Viewer

## Table of Contents
1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Code Conventions](#code-conventions)
4. [Services](#services)
5. [Components](#components)
6. [State Management](#state-management)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Performance Optimization](#performance-optimization)
10. [Deployment](#deployment)

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Angular CLI 18+
- VS Code (recommended) with Angular Language Service extension

### Setup
```bash
npm install
npm run setup:wasm
npm start
```

### Project Commands
```bash
npm start          # Start development server
npm test           # Run unit tests
npm run build      # Production build
npm run watch      # Watch mode for development
npm run setup:wasm # Copy WASM files to public folder
```

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────┐
│          Components Layer           │
│     (Presentation & UI Logic)       │
├─────────────────────────────────────┤
│           Services Layer            │
│    (Business Logic & State)         │
├─────────────────────────────────────┤
│            Utils Layer              │
│     (Helper Functions)              │
├─────────────────────────────────────┤
│           Models Layer              │
│    (TypeScript Interfaces)          │
└─────────────────────────────────────┘
```

### Module Structure

#### Core Module (`src/app/core`)
- **Services**: Singleton services used throughout the app
  - `ConfigService`: Configuration management
  - `ErrorHandlerService`: Error handling and logging
  - `FragmentsService`: IFC/Fragment operations

#### Features Module (`src/app/features`)
- **Components**: Feature-specific components
  - `IFCViewerComponent`: Main viewer component

#### Shared Module (`src/app/shared`)
- **Constants**: Application constants and configuration
- **Models**: TypeScript interfaces and types
- **Utils**: Utility functions and helpers

## Code Conventions

### TypeScript Style Guide

#### Naming Conventions
```typescript
// Classes & Interfaces: PascalCase
class FragmentsService { }
interface ViewerConfig { }

// Variables & Functions: camelCase
const modelState = signal<IFCModelState | null>(null);
function loadIfcFile(file: File): Promise<void> { }

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Private members: prefix with 'private'
private readonly errorHandler = inject(ErrorHandlerService);
```

#### File Naming
- Components: `*.component.ts`
- Services: `*.service.ts`
- Models: `*.model.ts`
- Utils: `*.utils.ts`
- Tests: `*.spec.ts`

### Angular Conventions

#### Components
```typescript
@Component({
  selector: 'app-feature-name',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-name.component.html',
  styleUrls: ['./feature-name.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Always use OnPush
})
export class FeatureNameComponent {
  // Use inject() for dependency injection
  private readonly service = inject(SomeService);
  
  // Use signals for reactive state
  readonly state = signal<StateType>(initialValue);
  
  // Use computed for derived state
  readonly derivedState = computed(() => /* calculation */);
  
  // Use viewChild for template references
  private readonly elementRef = viewChild.required<ElementRef>('elementName');
}
```

#### Services
```typescript
@Injectable({
  providedIn: 'root', // Singleton services
})
export class FeatureService {
  // Use inject() for dependencies
  private readonly http = inject(HttpClient);
  
  // Use BehaviorSubject for reactive streams
  private readonly data$ = new BehaviorSubject<DataType | null>(null);
  
  // Expose as Observable
  get data(): Observable<DataType | null> {
    return this.data$.asObservable();
  }
  
  // Methods should be strongly typed
  async loadData(id: string): Promise<DataType> {
    // Implementation
  }
}
```

### RxJS Best Practices

#### Avoid Memory Leaks
```typescript
// Use takeUntilDestroyed for automatic cleanup
constructor() {
  this.service.data$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(data => {
      // Handle data
    });
}
```

#### Avoid Nested Subscriptions
```typescript
// Bad
this.service1.getData().subscribe(data1 => {
  this.service2.getData().subscribe(data2 => {
    // Use both
  });
});

// Good
this.service1.getData().pipe(
  switchMap(data1 => this.service2.getData().pipe(
    map(data2 => ({ data1, data2 }))
  ))
).subscribe(({ data1, data2 }) => {
  // Use both
});
```

## Services

### ConfigService

Manages application configuration with reactive updates.

```typescript
@Injectable({ providedIn: 'root' })
export class ConfigService {
  // Observable configuration stream
  get config$(): Observable<ViewerConfig>;
  
  // Current configuration snapshot
  get config(): ViewerConfig;
  
  // Update configuration
  updateConfig(updates: Partial<ViewerConfig>): void;
  
  // Reset to defaults
  resetConfig(): void;
  
  // Persistence
  loadFromStorage(key?: string): void;
  saveToStorage(key?: string): void;
}
```

**Usage Example:**
```typescript
constructor(private configService: ConfigService) {
  // React to config changes
  this.configService.config$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(config => {
      this.updateVisualization(config);
    });
}

// Update configuration
this.configService.updateConfig({
  showGrid: false,
  backgroundColor: '#ffffff',
});
```

### FragmentsService

Handles IFC loading, fragment management, and model operations.

```typescript
@Injectable({ providedIn: 'root' })
export class FragmentsService {
  // Initialize with Three.js scene and camera
  async initialize(scene: THREE.Scene, camera: THREE.Camera): Promise<void>;
  
  // Load IFC file
  async loadIfc(
    buffer: Uint8Array,
    name: string,
    onProgress?: (progress: number) => void
  ): Promise<string>;
  
  // Get loaded model
  getModel(modelId: string): FRAGS.FragmentsModel | undefined;
  
  // Get model statistics
  getModelStatistics(modelId: string): ModelStatistics | null;
  
  // Export fragment
  async exportFragment(modelId: string): Promise<ExportResult>;
  
  // Remove model
  async removeModel(modelId: string): Promise<boolean>;
  
  // Cleanup
  async dispose(): Promise<void>;
}
```

**Usage Example:**
```typescript
async loadModel(file: File) {
  // Initialize service
  await this.fragmentsService.initialize(this.scene, this.camera);
  
  // Read file
  const buffer = new Uint8Array(await file.arrayBuffer());
  
  // Load with progress tracking
  const uuid = await this.fragmentsService.loadIfc(
    buffer,
    file.name,
    (progress) => {
      console.log(`Loading: ${progress}%`);
    }
  );
  
  // Get model statistics
  const stats = this.fragmentsService.getModelStatistics(uuid);
  console.log('Model stats:', stats);
}
```

### ErrorHandlerService

Centralized error handling with severity levels and context.

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  // Observable error stream
  get errors(): Observable<AppError[]>;
  
  // Handle error
  handleError(
    error: unknown,
    severity?: ErrorSeverity,
    context?: Record<string, unknown>
  ): void;
  
  // Clear errors
  clearErrors(): void;
  clearError(errorId: string): void;
  
  // Query errors
  getErrorsBySeverity(severity: ErrorSeverity): AppError[];
  hasCriticalErrors(): boolean;
}
```

**Usage Example:**
```typescript
try {
  await this.loadModel(file);
} catch (error) {
  this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
    operation: 'loadModel',
    fileName: file.name,
    fileSize: file.size,
  });
}
```

## State Management

### Using Signals

Signals provide reactive state management with automatic change detection.

```typescript
export class MyComponent {
  // Writable signal
  readonly count = signal<number>(0);
  
  // Computed signal (automatically updates)
  readonly doubled = computed(() => this.count() * 2);
  
  // Update signal
  increment() {
    this.count.update(value => value + 1);
  }
  
  // Set signal
  reset() {
    this.count.set(0);
  }
}
```

**Template Usage:**
```html
<div>
  Count: {{ count() }}
  Doubled: {{ doubled() }}
  <button (click)="increment()">Increment</button>
</div>
```

### Complex State

```typescript
interface AppState {
  models: IFCModelState[];
  selectedModelId: string | null;
  loading: boolean;
}

export class StateService {
  private readonly state = signal<AppState>({
    models: [],
    selectedModelId: null,
    loading: false,
  });
  
  // Computed selectors
  readonly models = computed(() => this.state().models);
  readonly selectedModel = computed(() => {
    const state = this.state();
    return state.models.find(m => m.id === state.selectedModelId);
  });
  
  // Actions
  addModel(model: IFCModelState): void {
    this.state.update(state => ({
      ...state,
      models: [...state.models, model],
    }));
  }
  
  selectModel(id: string): void {
    this.state.update(state => ({
      ...state,
      selectedModelId: id,
    }));
  }
}
```

## Error Handling

### Service-Level Error Handling

```typescript
async loadIfc(buffer: Uint8Array, name: string): Promise<string> {
  try {
    // Validation
    if (!buffer || buffer.length === 0) {
      throw new Error('Invalid buffer: empty or null');
    }
    
    // Operation
    const model = await this.ifcLoader.load(buffer, true, name);
    
    if (!model) {
      throw new Error('Failed to load model');
    }
    
    return model.modelId;
  } catch (error) {
    // Log error with context
    this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
      operation: 'loadIfc',
      modelName: name,
      bufferSize: buffer.length,
    });
    
    // Re-throw for caller to handle
    throw new Error(`Failed to load IFC file "${name}": ${error}`);
  }
}
```

### Component-Level Error Handling

```typescript
async loadModel(file: File): Promise<void> {
  try {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    const buffer = new Uint8Array(await file.arrayBuffer());
    const uuid = await this.fragmentsService.loadIfc(buffer, file.name);
    
    this.currentModel.set({
      id: uuid,
      name: file.name,
      status: ModelLoadingStatus.LOADED,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.errorMessage.set(message);
    
    this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
      operation: 'loadModel',
      fileName: file.name,
    });
  } finally {
    this.isLoading.set(false);
  }
}
```

## Testing

### Unit Test Structure

```typescript
describe('FragmentsService', () => {
  let service: FragmentsService;
  let mockScene: THREE.Scene;
  let mockCamera: THREE.Camera;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FragmentsService],
    });
    
    service = TestBed.inject(FragmentsService);
    mockScene = new THREE.Scene();
    mockCamera = new THREE.PerspectiveCamera();
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await service.initialize(mockScene, mockCamera);
      expect(service.isInitialized).toBe(true);
    });
    
    it('should throw error if scene is null', async () => {
      await expectAsync(
        service.initialize(null as any, mockCamera)
      ).toBeRejectedWithError();
    });
  });
});
```

### Testing Components

```typescript
describe('IfcViewerComponent', () => {
  let component: IfcViewerComponent;
  let fixture: ComponentFixture<IfcViewerComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IfcViewerComponent],
    }).compileComponents();
    
    fixture = TestBed.createComponent(IfcViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should initialize viewer on render', () => {
    expect(component['renderer']).toBeDefined();
    expect(component['scene']).toBeDefined();
    expect(component['camera']).toBeDefined();
  });
});
```

## Performance Optimization

### Three.js Performance

```typescript
// Use InstancedMesh for repeated geometry
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial();
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

// Enable frustum culling
mesh.frustumCulled = true;

// Dispose resources when done
geometry.dispose();
material.dispose();
```

### Angular Performance

```typescript
// Use OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})

// Run Three.js animations outside Angular zone
this.ngZone.runOutsideAngular(() => {
  this.animate();
});

// Use trackBy for *ngFor
<div *ngFor="let item of items; trackBy: trackByFn">

trackByFn(index: number, item: any): any {
  return item.id;
}
```

### Memory Management

```typescript
ngOnDestroy(): void {
  // Cancel animation frames
  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
  }
  
  // Dispose Three.js objects
  disposeObject(this.scene);
  
  // Dispose renderer
  this.renderer.dispose();
  this.renderer.forceContextLoss();
  
  // Cleanup services
  this.fragmentsService.dispose();
}
```

## Deployment

### Production Build

```bash
npm run build
```

Output: `dist/space-modeller/browser/`

### Deployment Checklist

- [ ] Run tests: `npm test`
- [ ] Build production: `npm run build`
- [ ] Verify WASM files are included
- [ ] Check bundle size
- [ ] Test in production mode locally
- [ ] Verify all assets load correctly
- [ ] Check console for errors
- [ ] Test on multiple browsers
- [ ] Verify mobile responsiveness

### Server Configuration

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist/space-modeller/browser;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/wasm;
    
    # WASM MIME type
    types {
        application/wasm wasm;
    }
    
    # Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|wasm)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Environment Variables

Configure in `src/environments/`:

```typescript
// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.your-domain.com',
  logLevel: 'error',
};

// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  logLevel: 'debug',
};
```

## Common Patterns

### Loading Pattern
```typescript
async loadData(): Promise<void> {
  this.isLoading.set(true);
  this.error.set(null);
  
  try {
    const data = await this.service.getData();
    this.data.set(data);
  } catch (error) {
    this.error.set(error.message);
    this.errorHandler.handleError(error);
  } finally {
    this.isLoading.set(false);
  }
}
```

### Progress Tracking Pattern
```typescript
async loadWithProgress(file: File): Promise<void> {
  const progress = signal(0);
  
  await this.service.load(file, (p) => {
    progress.set(p);
  });
}
```

### Resource Cleanup Pattern
```typescript
private resources: Disposable[] = [];

addResource(resource: Disposable): void {
  this.resources.push(resource);
}

ngOnDestroy(): void {
  this.resources.forEach(r => r.dispose());
  this.resources = [];
}
```

## Debugging Tips

### Enable Verbose Logging
```typescript
// In environment.ts
export const environment = {
  production: false,
  logLevel: 'debug',
};

// In service
if (!environment.production) {
  console.log('Debug info:', data);
}
```

### Three.js Debugging
```typescript
// Add helpers
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const boxHelper = new THREE.Box3Helper(bbox, 0x00ff00);
scene.add(boxHelper);

// Log scene graph
console.log(scene.children);
scene.traverse(obj => console.log(obj));
```

### Performance Profiling
```typescript
// Use Stats.js
this.stats = new Stats();
document.body.appendChild(this.stats.dom);

// In animation loop
this.stats.begin();
// ... rendering code
this.stats.end();
```

---

For questions or clarifications, refer to the inline documentation or contact the development team.

