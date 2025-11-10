# IFC Viewer - Production-Ready 3D Viewer

A high-quality, production-ready 3D viewer for IFC files using **Three.js** and **@thatopen/components**.

## 🚀 Features

- **IFC Loading**: Load and visualize Industry Foundation Classes (IFC) files
- **Fragment Export**: Export models as optimized `.frag` files
- **Performance**: Modern Three.js setup with sRGB color space and ACES tone mapping
- **Memory Monitoring**: Real-time memory usage display with stats.js
- **Responsive**: Full-viewport 3D canvas that adapts to any screen size
- **Accessible**: ARIA labels and keyboard-friendly controls
- **Resource Management**: Robust cleanup and disposal to prevent memory leaks

## 🛠️ Tech Stack

- **Angular 18** with standalone components and OnPush change detection
- **Three.js 0.180** for WebGL rendering
- **@thatopen/components** for IFC processing
- **web-ifc** WASM library for IFC parsing
- **stats.js** for performance monitoring
- **TypeScript 5.5** with strict typing

## 📦 Installation

```bash
cd space-modeller
npm install
```

## 🎮 Usage

### Development Server

```bash
npm start
```

The WASM files will be automatically copied to `public/wasm/` before starting the dev server.

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Production Build

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## 🔧 Configuration

### WASM Path Configuration

The viewer supports two WASM loading modes:

**1. Local WASM (Recommended for Production)**

Default configuration in `src/app/shared/constants/viewer.constants.ts`:

```typescript
wasmPath: '/wasm/',
```

WASM files are automatically copied from `node_modules/web-ifc/` to `public/wasm/` via the `setup:wasm` script.

**2. CDN WASM (Quick Development)**

Alternative configuration:

```typescript
wasmPath: 'https://unpkg.com/web-ifc@0.0.66/',
```

This loads WASM files from unpkg CDN (requires internet connection).

### Viewer Settings

Customize viewer behavior in `src/app/shared/constants/viewer.constants.ts`:

```typescript
export const VIEWER_CONFIG: ViewerConfig = {
  wasmPath: '/wasm/',
  cameraPosition: { x: 10, y: 10, z: 10 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  backgroundColor: '#0e1013',
  showGrid: true,
  showStats: true,
};

// Worker URL for FragmentsManager (served locally to avoid CORS issues)
export const FRAGMENTS_WORKER_URL = '/worker.mjs';
```

## 📋 How to Use the Viewer

1. **Import IFC File**
   - Click "Import IFC" button in the toolbar
   - Select an `.ifc` file from your computer
   - Wait for the loading progress to complete

2. **View the Model**
   - Use mouse to rotate, pan, and zoom:
     - **Left Click + Drag**: Rotate camera
     - **Right Click + Drag**: Pan camera
     - **Scroll Wheel**: Zoom in/out

3. **Export as Fragment**
   - Once a model is loaded, click "Download .frag"
   - The optimized fragment file will be saved to your downloads

## 🏗️ Architecture

### Component Structure

```
src/app/
├── core/
│   └── services/
│       └── fragments.service.ts       # ThatOpen components manager
├── features/
│   └── ifc-viewer/
│       ├── ifc-viewer.component.ts    # Main viewer component
│       ├── ifc-viewer.component.html  # Viewer template
│       └── ifc-viewer.component.css   # Viewer styles
└── shared/
    ├── constants/
    │   └── viewer.constants.ts        # Configuration constants
    └── models/
        └── viewer.model.ts            # TypeScript interfaces
```

### Key Components

#### FragmentsService

Manages ThatOpen Components lifecycle:
- Initializes `FragmentsManager` and `IfcLoader`
- Handles IFC loading with progress tracking
- Exports models as fragments
- Provides camera binding for culling
- Ensures proper resource disposal

#### IfcViewerComponent

Main viewer component following Angular best practices:
- Standalone component with OnPush change detection
- Runs Three.js render loop outside Angular zone
- Uses signals for reactive state management
- Implements comprehensive resource cleanup
- ResizeObserver for responsive canvas

## 🎨 Rendering Configuration

### Three.js Setup

```typescript
// Modern color space and tone mapping
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Pixel ratio capped at 2 for performance
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

### Camera & Controls

- **Field of View**: 60°
- **OrbitControls** with damping
- **Auto-framing**: Camera automatically centers on loaded models
- **Culling Updates**: Triggered after camera movement stops

## 🔒 Resource Management

The viewer implements robust resource cleanup:

### Component Disposal (ngOnDestroy)

1. Cancel animation frame
2. Remove stats.js DOM element
3. Dispose OrbitControls
4. Disconnect ResizeObserver
5. Dispose Three.js geometries and materials
6. Dispose WebGL renderer
7. Dispose FragmentsService and workers

### Memory Leak Prevention

- All subscriptions use `takeUntilDestroyed()`
- Event listeners properly removed
- WebGL context force lost on disposal
- Fragment groups explicitly deleted

## 📊 Performance

### Optimizations

- **Instanced Rendering**: FragmentsManager uses InstancedMesh
- **Frustum Culling**: Enabled for all fragments
- **Pixel Ratio Cap**: Maximum 2x to balance quality and performance
- **Render Loop**: Runs outside Angular zone to prevent change detection overhead
- **Memory Monitoring**: stats.js panel shows real-time MB usage

### Recommended Hardware

- **Minimum**: Integrated GPU, 4GB RAM
- **Recommended**: Dedicated GPU, 8GB+ RAM
- Works on mid-range hardware for moderately large IFC files

## 🧪 Testing

Run unit tests:

```bash
npm test
```

## 📝 Development Guidelines

This project follows strict Angular and Three.js conventions:

- **Standalone Components**: All components are standalone with explicit imports
- **OnPush Change Detection**: Used everywhere for performance
- **Zone Management**: Three.js render loop runs outside Angular zone
- **No `any` Types**: Strict TypeScript with full typing
- **RxJS Best Practices**: `takeUntilDestroyed` for subscriptions
- **Resource Cleanup**: Comprehensive disposal in `ngOnDestroy`

## 🐛 Troubleshooting

### WASM Files Not Loading

**Problem**: Console errors about WASM files not found

**Solution**: Run `npm run setup:wasm` to copy WASM files to public folder

### Memory Warnings

**Problem**: Browser warns about high memory usage

**Solution**: 
- Dispose previous models before loading new ones
- Check stats.js panel for memory leaks
- Ensure proper cleanup is happening

### Model Not Visible

**Problem**: Model loads but nothing appears

**Solution**:
- Check browser console for errors
- Verify IFC file is valid
- Try different IFC files to isolate the issue

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and conventions.

## 📚 Additional Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [ThatOpen Components](https://docs.thatopen.com/)
- [Angular Documentation](https://angular.dev/)
- [Web-IFC](https://github.com/tomvandig/web-ifc)
