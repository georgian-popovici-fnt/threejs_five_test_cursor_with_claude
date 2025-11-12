# Space Modeller - IFC Viewer

A professional-grade IFC (Industry Foundation Classes) model viewer built with Angular 18, Three.js, and ThatOpen Components. This application provides a modern, performant, and user-friendly interface for loading, viewing, and exporting IFC building models.

## 🚀 Features

### Core Features
- **IFC File Loading**: Import IFC files with real-time progress tracking
- **3D Visualization**: High-quality rendering with Three.js and WebGL
- **Orbit Controls**: Intuitive camera navigation with pan, zoom, and rotate
- **Fragment Export**: Export loaded models as optimized .frag files
- **Performance Monitoring**: Built-in stats for FPS and memory usage
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Technical Features
- **Angular 18**: Modern standalone components with OnPush change detection
- **Reactive State**: Signal-based state management for optimal performance
- **Type Safety**: Full TypeScript coverage with strict mode
- **Accessibility**: ARIA labels and keyboard navigation support
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Production Ready**: Optimized build with tree-shaking and lazy loading

## 📋 Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   cd space-modeller
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup WASM files** (automatic):
   ```bash
   npm run setup:wasm
   ```
   This copies required WASM files from node_modules to the public folder.

## 🚀 Development

### Start Development Server
```bash
npm start
```
The application will be available at `http://localhost:4200`

### Watch Mode
```bash
npm run watch
```
Automatically rebuilds on file changes.

### Run Tests
```bash
npm test
```

## 🏗️ Production Build

```bash
npm run build
```
Production-optimized build will be in `dist/space-modeller/browser/`

### Build Output
- Minified and tree-shaken JavaScript
- Optimized CSS
- WASM files included
- Source maps for debugging

## 📁 Project Structure

```
space-modeller/
├── src/
│   ├── app/
│   │   ├── core/                    # Core services
│   │   │   └── services/
│   │   │       ├── config.service.ts       # Configuration management
│   │   │       ├── error-handler.service.ts # Error handling
│   │   │       └── fragments.service.ts     # IFC/Fragment management
│   │   ├── features/                # Feature modules
│   │   │   └── ifc-viewer/
│   │   │       ├── ifc-viewer.component.ts
│   │   │       ├── ifc-viewer.component.html
│   │   │       └── ifc-viewer.component.css
│   │   ├── shared/                  # Shared code
│   │   │   ├── constants/           # Application constants
│   │   │   ├── models/              # TypeScript interfaces
│   │   │   └── utils/               # Utility functions
│   │   ├── app.component.ts
│   │   ├── app.config.ts           # Application configuration
│   │   └── app.routes.ts           # Routing configuration
│   ├── environments/               # Environment configs
│   ├── index.html
│   ├── main.ts                     # Application entry point
│   └── styles.css                  # Global styles
├── public/                         # Static assets
│   ├── wasm/                      # WebAssembly files
│   └── worker.mjs                 # Fragments worker
├── scripts/
│   └── copy-wasm.js               # WASM setup script
├── angular.json                   # Angular CLI configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json
```

## 🎯 Usage

### Loading IFC Files

1. Click the **"Import IFC"** button
2. Select an IFC file from your computer
3. Wait for the model to load (progress bar shown)
4. View and interact with the 3D model

### Navigation Controls

- **Left Mouse**: Rotate camera around model
- **Right Mouse**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **Touch**: Pinch to zoom, drag to rotate/pan

### Exporting Models

1. Load an IFC model
2. Click **"Download .frag"** button
3. Optimized fragment file will download

## ⚙️ Configuration

### Viewer Configuration

Edit `src/app/shared/constants/viewer.constants.ts`:

```typescript
export const VIEWER_CONFIG: ViewerConfig = {
  wasmPath: '/wasm/',              // WASM files location
  cameraPosition: { x: 10, y: 10, z: 10 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  backgroundColor: '#0e1013',      // Dark background
  showGrid: true,                  // Show ground grid
  showStats: true,                 // Show FPS/memory stats
  showBoundingBoxHelper: true,     // Green bounding box
  showAxesHelper: true,            // RGB axes
  maxFileSizeMB: 500,             // Max file size
};
```

### Environment Configuration

- **Development**: `src/environments/environment.ts`
- **Production**: `src/environments/environment.prod.ts`

## 🏗️ Architecture

### Services

#### ConfigService
Manages application configuration with reactive updates.

```typescript
constructor(private config: ConfigService) {
  this.config.config$.subscribe(config => {
    // React to configuration changes
  });
}
```

#### FragmentsService
Handles IFC loading and fragment management.

```typescript
// Initialize
await this.fragmentsService.initialize(scene, camera);

// Load IFC
const uuid = await this.fragmentsService.loadIfc(buffer, 'model-name', (progress) => {
  console.log(`Progress: ${progress}%`);
});

// Get model
const model = this.fragmentsService.getModel(uuid);
```

#### ErrorHandlerService
Centralized error handling and logging.

```typescript
this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
  operation: 'loadModel',
  modelId: 'abc123',
});
```

### State Management

Uses Angular Signals for reactive state:

```typescript
readonly currentModel = signal<IFCModelState | null>(null);
readonly isLoading = signal<boolean>(false);
readonly hasModel = computed(() => this.currentModel() !== null);
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

Test files are located alongside their source files:
- `*.component.spec.ts` for components
- `*.service.spec.ts` for services

### Test Coverage

```bash
npm test -- --code-coverage
```

## 🐛 Troubleshooting

### Model Not Rendering

1. **Check Console**: Look for error messages in browser console
2. **WASM Files**: Ensure WASM files are in `public/wasm/`
3. **Worker**: Verify `worker.mjs` exists in `public/`
4. **File Format**: Ensure file is valid IFC format
5. **File Size**: Check file size is under 500MB

### Performance Issues

1. **Reduce Model Complexity**: Simplify IFC model if possible
2. **Disable Helpers**: Turn off bounding box and axes helpers
3. **Lower Pixel Ratio**: Reduce `maxPixelRatio` in renderer config
4. **Check Memory**: Monitor memory usage in Stats panel

### CORS Issues

When loading WASM or IFC files:
1. Ensure files are served from same origin
2. Check server CORS headers
3. Use local files instead of remote URLs

## 📦 Dependencies

### Core
- `@angular/core` v18.2.0 - Angular framework
- `three` v0.180.0 - 3D graphics library
- `rxjs` v7.8.0 - Reactive programming

### ThatOpen Components
- `@thatopen/components` v3.2.3 - IFC processing
- `@thatopen/components-front` v3.2.1 - Frontend utilities
- `@thatopen/fragments` v3.2.4 - Fragment management

### Utilities
- `stats.js` v0.17.0 - Performance monitoring
- `web-ifc` v0.0.72 - IFC parsing

## 🔒 Security

- **File Validation**: Validates file type and size before loading
- **Error Handling**: Prevents exposure of sensitive error details
- **Content Security**: WASM files loaded from trusted sources
- **Type Safety**: TypeScript prevents common security issues

## 🌐 Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (v14+)
- Mobile: ✅ Limited (performance may vary)

## 📄 License

Copyright © 2024. All rights reserved.

## 🤝 Contributing

This is a business application. For contribution guidelines, please contact the development team.

## 📞 Support

For issues, questions, or feature requests:
- Check existing issues
- Review documentation
- Contact development team

## 🗺️ Roadmap

### Planned Features
- [ ] Multiple model loading
- [ ] Model comparison view
- [ ] Property inspection panel
- [ ] Measurement tools
- [ ] Section cutting
- [ ] Annotation system
- [ ] Export to different formats
- [ ] Cloud storage integration

## 📚 Additional Resources

- [Angular Documentation](https://angular.dev)
- [Three.js Documentation](https://threejs.org/docs/)
- [ThatOpen Components](https://docs.thatopen.com/)
- [IFC Specification](https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/)

---

**Built with ❤️ using Angular, Three.js, and ThatOpen Components**
