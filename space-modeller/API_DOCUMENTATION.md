# API Documentation - Space Modeller IFC Viewer

## Table of Contents
1. [Services](#services)
2. [Components](#components)
3. [Models & Interfaces](#models--interfaces)
4. [Utilities](#utilities)
5. [Constants](#constants)

---

## Services

### ConfigService

**Location:** `src/app/core/services/config.service.ts`

Manages application configuration with reactive updates and persistence.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `config$` | `Observable<ViewerConfig>` | Reactive stream of configuration updates |
| `config` | `ViewerConfig` | Current configuration snapshot |
| `fragmentsWorkerUrl` | `string` | URL to the fragments worker |
| `isProduction` | `boolean` | Production mode flag |
| `debugMode` | `boolean` | Debug mode flag |

#### Methods

##### `updateConfig(updates: Partial<ViewerConfig>): void`
Updates the configuration with partial updates.

**Parameters:**
- `updates`: Partial configuration object with values to update

**Example:**
```typescript
this.configService.updateConfig({
  showGrid: false,
  backgroundColor: '#ffffff'
});
```

##### `resetConfig(): void`
Resets configuration to default values.

##### `loadFromStorage(key?: string): void`
Loads configuration from localStorage.

**Parameters:**
- `key` (optional): Storage key, defaults to 'viewer-config'

##### `saveToStorage(key?: string): void`
Saves current configuration to localStorage.

**Parameters:**
- `key` (optional): Storage key, defaults to 'viewer-config'

---

### FragmentsService

**Location:** `src/app/core/services/fragments.service.ts`

Handles IFC loading, fragment management, and model operations.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isInitialized` | `boolean` | Whether service is initialized |
| `modelCount` | `number` | Number of loaded models |

#### Methods

##### `async initialize(scene: THREE.Scene, camera: THREE.Camera): Promise<void>`
Initializes the service with Three.js scene and camera.

**Parameters:**
- `scene`: Three.js scene to render into
- `camera`: Three.js camera for viewing

**Throws:** Error if initialization fails

**Example:**
```typescript
await this.fragmentsService.initialize(this.scene, this.camera);
```

##### `async loadIfc(buffer: Uint8Array, name: string, onProgress?: (progress: number) => void): Promise<string>`
Loads an IFC file and converts to fragments.

**Parameters:**
- `buffer`: IFC file data as Uint8Array
- `name`: Model name for identification
- `onProgress` (optional): Progress callback (0-100)

**Returns:** Fragment model UUID

**Throws:** Error if loading fails

**Example:**
```typescript
const buffer = new Uint8Array(await file.arrayBuffer());
const uuid = await this.fragmentsService.loadIfc(
  buffer,
  'building-model',
  (progress) => console.log(`${progress}%`)
);
```

##### `getModel(modelId: string): FRAGS.FragmentsModel | undefined`
Retrieves a loaded model by ID.

**Parameters:**
- `modelId`: Model UUID

**Returns:** FragmentsModel or undefined if not found

##### `getAllModels(): FRAGS.FragmentsModel[]`
Gets all loaded fragment models.

**Returns:** Array of all loaded models

##### `getModelStatistics(modelId: string): ModelStatistics | null`
Calculates statistics for a model.

**Parameters:**
- `modelId`: Model UUID

**Returns:** Model statistics or null if model not found

**Example:**
```typescript
const stats = this.fragmentsService.getModelStatistics(uuid);
console.log(`Meshes: ${stats.meshCount}, Vertices: ${stats.vertexCount}`);
```

##### `async exportFragment(modelId: string): Promise<ExportResult>`
Exports a model as binary fragment data.

**Parameters:**
- `modelId`: Model UUID

**Returns:** Export result with data or error

**Example:**
```typescript
const result = await this.fragmentsService.exportFragment(uuid);
if (result.success && result.data) {
  // Download or process result.data
}
```

##### `async removeModel(modelId: string): Promise<boolean>`
Removes a model from scene and memory.

**Parameters:**
- `modelId`: Model UUID

**Returns:** True if successfully removed

##### `bindCamera(camera: THREE.Camera): void`
Binds camera for culling operations.

**Parameters:**
- `camera`: Three.js camera

##### `async updateCulling(): Promise<void>`
Updates culling for all fragments (called automatically).

##### `async dispose(): Promise<void>`
Disposes all resources. Call when viewer is destroyed.

---

### ErrorHandlerService

**Location:** `src/app/core/services/error-handler.service.ts`

Centralized error handling with severity levels and context tracking.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `errors` | `Observable<AppError[]>` | Stream of all errors |
| `latestError` | `AppError \| null` | Most recent error or null |

#### Methods

##### `handleError(error: unknown, severity?: ErrorSeverity, context?: Record<string, unknown>): void`
Handles an error with optional context.

**Parameters:**
- `error`: Error to handle (Error, string, or unknown)
- `severity` (optional): Error severity (defaults to ERROR)
- `context` (optional): Additional context information

**Example:**
```typescript
try {
  await this.loadModel(file);
} catch (error) {
  this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
    operation: 'loadModel',
    fileName: file.name
  });
}
```

##### `clearErrors(): void`
Clears all stored errors.

##### `clearError(errorId: string): void`
Clears a specific error by ID.

##### `getErrorsBySeverity(severity: ErrorSeverity): AppError[]`
Gets all errors of a specific severity.

##### `hasCriticalErrors(): boolean`
Checks if any critical errors exist.

#### Enums

##### `ErrorSeverity`
```typescript
enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}
```

---

## Components

### IfcViewerComponent

**Location:** `src/app/features/ifc-viewer/ifc-viewer.component.ts`

Main IFC model viewer component.

#### Signals

| Signal | Type | Description |
|--------|------|-------------|
| `currentModel` | `Signal<IFCModelState \| null>` | Currently loaded model state |
| `isLoading` | `Signal<boolean>` | Loading state |
| `errorMessage` | `Signal<string \| null>` | Current error message |
| `hasModel` | `Signal<boolean>` | Computed: whether a model is loaded |
| `canExport` | `Signal<boolean>` | Computed: whether export is available |

#### Methods

##### `openFilePicker(): void`
Opens the file selection dialog.

##### `async onFileSelected(event: Event): Promise<void>`
Handles file selection from input.

##### `async downloadFragment(): Promise<void>`
Downloads the current model as .frag file.

---

## Models & Interfaces

### ViewerConfig

**Location:** `src/app/shared/models/viewer.model.ts`

```typescript
interface ViewerConfig {
  wasmPath: string;
  cameraPosition: Vector3Config;
  cameraTarget: Vector3Config;
  backgroundColor: string;
  showGrid: boolean;
  gridSize?: number;
  gridDivisions?: number;
  showStats: boolean;
  showBoundingBoxHelper?: boolean;
  showAxesHelper?: boolean;
  enablePerformanceMonitoring?: boolean;
  maxFileSizeMB?: number;
}
```

### IFCModelState

**Location:** `src/app/shared/models/ifc.model.ts`

```typescript
interface IFCModelState {
  id: string;
  name: string;
  status: ModelLoadingStatus;
  progress: number;
  fragmentUuid?: string;
  fileSize?: number;
  loadedAt?: Date;
  error?: {
    message: string;
    code?: string;
    timestamp: Date;
  };
  stats?: ModelStatistics;
}
```

### ModelStatistics

```typescript
interface ModelStatistics {
  fragmentCount: number;
  meshCount: number;
  vertexCount: number;
  faceCount: number;
  boundingBox?: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    size: THREE.Vector3;
    center: THREE.Vector3;
  };
  memoryUsage?: number; // MB
}
```

### ExportResult

```typescript
interface ExportResult {
  success: boolean;
  data?: Uint8Array;
  fileSize?: number;
  duration?: number;
  error?: string;
}
```

### AppError

```typescript
interface AppError {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  stack?: string;
  context?: Record<string, unknown>;
}
```

---

## Utilities

### Three.js Utilities

**Location:** `src/app/shared/utils/three.utils.ts`

#### Functions

##### `calculateBoundingBox(object: THREE.Object3D): THREE.Box3 | null`
Calculates bounding box for an object and its descendants.

**Returns:** Bounding box or null if no geometry found

##### `calculateModelStatistics(object: THREE.Object3D): ModelStatistics`
Calculates comprehensive statistics for a Three.js object.

##### `calculateCameraPosition(object: THREE.Object3D, camera: THREE.PerspectiveCamera, paddingFactor?: number): { position: THREE.Vector3; target: THREE.Vector3 }`
Calculates optimal camera position to view an object.

**Parameters:**
- `object`: Object to view
- `camera`: Camera to position
- `paddingFactor` (optional): Extra space around object (default 1.5)

##### `disposeObject(object: THREE.Object3D): void`
Disposes object and all descendants (geometry, materials, textures).

##### `disposeMaterial(material: THREE.Material): void`
Disposes material and its textures.

##### `createStyledGrid(size?: number, divisions?: number, centerColor?: THREE.Color, gridColor?: THREE.Color): THREE.GridHelper`
Creates a grid helper with custom styling.

##### `fixMaterials(object: THREE.Object3D): number`
Fixes material rendering issues. Returns number of materials fixed.

##### `estimateMemoryUsage(object: THREE.Object3D): number`
Estimates memory usage in bytes.

##### `formatBytes(bytes: number, decimals?: number): string`
Converts bytes to human-readable format.

**Example:** `formatBytes(1024) // "1 KB"`

##### `isObjectEmpty(object: THREE.Object3D): boolean`
Checks if object has renderable content.

---

### Validation Utilities

**Location:** `src/app/shared/utils/validation.utils.ts`

#### Functions

##### `validateIfcFile(file: File): { valid: boolean; error?: string }`
Validates if a file is a valid IFC file.

**Example:**
```typescript
const validation = validateIfcFile(file);
if (!validation.valid) {
  console.error(validation.error);
}
```

##### `validateConfig<T>(config: T, required: (keyof T)[]): { valid: boolean; missing?: (keyof T)[] }`
Validates configuration object has required keys.

##### `isValidUrl(url: string): boolean`
Validates URL format.

##### `isInRange(value: number, min: number, max: number): boolean`
Checks if number is within range.

##### `sanitizeFileName(fileName: string): string`
Sanitizes file name (removes special characters, converts to lowercase).

##### `isValidHexColor(color: string): boolean`
Validates hex color string format.

---

## Constants

### Viewer Constants

**Location:** `src/app/shared/constants/viewer.constants.ts`

#### VIEWER_CONFIG
Default viewer configuration.

#### FRAGMENTS_WORKER_URL
URL to the fragments worker.

#### RENDERER_CONFIG
Three.js renderer configuration.

```typescript
{
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  maxPixelRatio: 2,
  toneMapping: {
    enabled: true,
    exposure: 1.0,
  },
}
```

#### CAMERA_CONFIG
Camera configuration.

```typescript
{
  fov: 60,
  near: 0.1,
  far: 1000,
  autoFit: true,
  fitPadding: 1.5,
}
```

#### CONTROLS_CONFIG
Orbit controls configuration.

```typescript
{
  enableDamping: true,
  dampingFactor: 0.05,
  minDistance: 1,
  maxDistance: 500,
  maxPolarAngle: Math.PI * 0.95,
  enablePan: true,
  enableZoom: true,
  enableRotate: true,
  zoomSpeed: 1.0,
  rotateSpeed: 1.0,
  panSpeed: 1.0,
}
```

#### LIGHTING_CONFIG
Lighting configuration.

```typescript
{
  ambient: {
    color: 0xffffff,
    intensity: 0.6,
  },
  directional: {
    color: 0xffffff,
    intensity: 0.8,
    position: { x: 10, y: 10, z: 5 },
    castShadow: false,
  },
}
```

#### PERFORMANCE_CONFIG
Performance thresholds.

```typescript
{
  maxVertices: 5000000,
  maxFileSizeMB: 500,
  targetFPS: 60,
  minFPS: 30,
}
```

#### FILE_VALIDATION
File validation constants.

```typescript
{
  allowedExtensions: ['.ifc'],
  maxFileSize: 500 * 1024 * 1024, // 500 MB
  minFileSize: 1024, // 1 KB
}
```

---

## Usage Examples

### Complete Loading Flow

```typescript
@Component({...})
export class MyViewerComponent {
  private fragmentsService = inject(FragmentsService);
  private errorHandler = inject(ErrorHandlerService);
  
  currentModel = signal<IFCModelState | null>(null);
  isLoading = signal(false);
  
  async loadIfc(file: File): Promise<void> {
    // Validate file
    const validation = validateIfcFile(file);
    if (!validation.valid) {
      this.errorHandler.handleError(
        validation.error,
        ErrorSeverity.WARNING
      );
      return;
    }
    
    this.isLoading.set(true);
    
    try {
      // Initialize service
      await this.fragmentsService.initialize(scene, camera);
      
      // Read file
      const buffer = new Uint8Array(await file.arrayBuffer());
      
      // Load with progress
      const uuid = await this.fragmentsService.loadIfc(
        buffer,
        file.name,
        (progress) => {
          this.currentModel.update(state => 
            state ? { ...state, progress } : state
          );
        }
      );
      
      // Get statistics
      const stats = this.fragmentsService.getModelStatistics(uuid);
      
      // Update state
      this.currentModel.set({
        id: uuid,
        name: file.name,
        status: ModelLoadingStatus.LOADED,
        progress: 100,
        fragmentUuid: uuid,
        stats,
      });
      
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
        operation: 'loadIfc',
        fileName: file.name,
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

---

For more examples and detailed guides, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

