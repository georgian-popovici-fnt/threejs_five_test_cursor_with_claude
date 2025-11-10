# IFC Viewer - Quick Start Guide

## 🎯 What You Have

A production-ready 3D IFC viewer built with:
- **Angular 18** (standalone components, OnPush change detection)
- **Three.js 0.180** (sRGB color space, ACES tone mapping)
- **@thatopen/components v3.2** (IFC loading and processing)
- **@thatopen/fragments v3.2** (optimized rendering with streaming)
- **stats.js** (real-time memory monitoring)

## 🚀 Getting Started

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
cd space-modeller
npm install
```

### 2. Start Development Server

```bash
npm start
```

This automatically:
- Copies WASM files to `public/wasm/`
- Starts the Angular dev server on `http://localhost:4200`

### 3. Use the Viewer

1. **Open**: Navigate to `http://localhost:4200`
2. **Import**: Click "Import IFC" and select an `.ifc` file
3. **View**: Use mouse to navigate:
   - Left-click + drag: Rotate
   - Right-click + drag: Pan
   - Scroll: Zoom
4. **Export**: Click "Download .frag" to save as optimized fragment file

## 📁 Project Structure

```
space-modeller/
├── src/app/
│   ├── core/services/
│   │   └── fragments.service.ts     # ThatOpen components manager
│   ├── features/ifc-viewer/
│   │   ├── ifc-viewer.component.ts  # Main viewer component
│   │   ├── ifc-viewer.component.html
│   │   └── ifc-viewer.component.css
│   └── shared/
│       ├── constants/
│       │   └── viewer.constants.ts  # Configuration
│       └── models/
│           └── viewer.model.ts      # TypeScript interfaces
├── public/wasm/                     # WASM files (auto-generated)
└── scripts/copy-wasm.js             # WASM setup script
```

## ⚙️ Configuration

### WASM Path Options

Edit `src/app/shared/constants/viewer.constants.ts`:

**Option 1: Local (Default, Recommended for Production)**
```typescript
wasmPath: '/wasm/',
```

**Option 2: CDN (Quick Development)**
```typescript
wasmPath: 'https://unpkg.com/web-ifc@0.0.66/',
```

### Viewer Settings

```typescript
export const VIEWER_CONFIG: ViewerConfig = {
  wasmPath: '/wasm/',                    // WASM file location
  cameraPosition: { x: 10, y: 10, z: 10 }, // Initial camera position
  cameraTarget: { x: 0, y: 0, z: 0 },     // Initial camera target
  backgroundColor: '#0e1013',              // Scene background
  showGrid: true,                          // Show/hide grid helper
  showStats: true,                         // Show/hide stats.js panel
};
```

### Renderer Settings

```typescript
export const RENDERER_CONFIG = {
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  maxPixelRatio: 2,  // Cap at 2x for performance
};
```

## 🏗️ Building for Production

```bash
npm run build
```

Output will be in `dist/space-modeller/`.

The build process:
1. Copies WASM files to `dist/space-modeller/wasm/`
2. Bundles and optimizes the application
3. Applies tree-shaking and minification

## 🎨 Customization

### Change Theme Colors

Edit `src/app/features/ifc-viewer/ifc-viewer.component.css`:

```css
.toolbar {
  background: rgba(20, 20, 30, 0.95);  /* Toolbar background */
}

.toolbar-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); /* Button gradient */
}
```

### Adjust Camera Settings

Edit `src/app/shared/constants/viewer.constants.ts`:

```typescript
export const CAMERA_CONFIG = {
  fov: 60,        // Field of view (degrees)
  near: 0.1,      // Near clipping plane
  far: 1000,      // Far clipping plane
};
```

### Modify Controls

```typescript
export const CONTROLS_CONFIG = {
  enableDamping: true,
  dampingFactor: 0.05,
  minDistance: 1,      // Minimum zoom distance
  maxDistance: 500,    // Maximum zoom distance
  maxPolarAngle: Math.PI * 0.95,
};
```

## 🐛 Troubleshooting

### Issue: WASM Files Not Found

**Symptom**: Console errors about WASM files

**Solution**:
```bash
npm run setup:wasm
```

### Issue: Model Doesn't Load

**Check**:
1. File is valid `.ifc` format
2. Console for error messages
3. WASM path configuration is correct
4. Network tab shows WASM files loaded successfully

### Issue: Performance Problems

**Solutions**:
1. Reduce `maxPixelRatio` in `RENDERER_CONFIG`
2. Disable grid: `showGrid: false`
3. Disable stats: `showStats: false`
4. Lower camera `far` plane value

### Issue: Memory Warnings

**Check**:
- stats.js panel (top-left, MB counter)
- Dispose previous models before loading new ones
- Ensure proper cleanup in `ngOnDestroy`

## 📊 Performance Tips

1. **Pixel Ratio**: Capped at 2x for balance between quality and performance
2. **Frustum Culling**: Automatically enabled on all models
3. **Render Loop**: Runs outside Angular zone to prevent change detection overhead
4. **Memory Management**: Comprehensive disposal in component lifecycle

## 🧪 Testing

```bash
npm test
```

## 📚 Key Features Implemented

✅ IFC file loading with progress tracking  
✅ Fragment export (.frag format)  
✅ Modern Three.js rendering (sRGB, ACES)  
✅ Memory monitoring with stats.js  
✅ Responsive full-viewport canvas  
✅ OrbitControls with damping  
✅ Auto-framing on model load  
✅ Comprehensive resource cleanup  
✅ ARIA labels for accessibility  
✅ OnPush change detection  
✅ Signal-based reactive state  
✅ ResizeObserver for responsiveness  

## 🔗 Resources

- [Three.js Docs](https://threejs.org/docs/)
- [ThatOpen Components](https://docs.thatopen.com/)
- [Angular Docs](https://angular.dev/)
- [Web-IFC GitHub](https://github.com/tomvandig/web-ifc)

## 📝 Notes

- **WASM Setup**: Runs automatically before `start` and `build`
- **Worker URL**: Hosted by ThatOpen for fragment processing
- **Version**: Using @thatopen v3.2 (latest stable)
- **Browser Support**: Modern browsers with WebGL 2.0 support

## 💡 Next Steps

1. **Add IFC Properties Panel**: Display element properties on click
2. **Layer Control**: Show/hide specific IFC categories
3. **Measurements**: Add distance and area measurement tools
4. **Sections**: Implement section planes for interior views
5. **Multi-Model**: Support loading multiple IFC files simultaneously
6. **Export Options**: Add more export formats (glTF, OBJ, etc.)

---

Need help? Check the full [README.md](./README.md) for detailed documentation.

