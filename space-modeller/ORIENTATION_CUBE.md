# Orientation Cube Component

## Overview

The Orientation Cube is a 3D view gizmo that provides visual feedback about the camera's current orientation in the IFC viewer. It's always visible in the top-right corner of the viewport and mirrors the main camera's rotation.

## Features

- ✨ **Lightweight Rendering**: Uses a separate Three.js scene and canvas for efficient rendering
- 🧭 **Cardinal Directions**: Shows North (N), South (S), East (E), West (W), and Top labels
- 📱 **HiDPI Support**: Crisp rendering on high-resolution displays
- 🎯 **Non-Interactive**: Positioned with `pointer-events: none` to avoid blocking main scene interactions
- 🔄 **Smooth Updates**: Syncs with main camera via `requestAnimationFrame`
- ♿ **Accessible**: Properly marked for screen readers with `aria-hidden="true"`
- 🌓 **Dark Mode Support**: Adapts background based on system color scheme

## Axis Mapping

The orientation cube follows this coordinate system mapping:

| Axis | Direction | Cardinal | Color  |
|------|-----------|----------|--------|
| +Z   | Front     | North (N)| Blue   |
| -Z   | Back      | South (S)| Green  |
| +X   | Right     | East (E) | Orange |
| -X   | Left      | West (W) | Red    |
| +Y   | Top       | Top      | Purple |
| -Y   | Bottom    | (hidden) | Gray   |

## Installation

The component is already integrated into the IFC Viewer. No additional installation steps required.

### File Location

```
space-modeller/
  src/
    app/
      shared/
        components/
          orientation-cube.component.ts
          orientation-cube.component.spec.ts
```

## Usage

### Basic Usage

```typescript
import { OrientationCubeComponent } from '../../shared/components/orientation-cube.component';

@Component({
  // ...
  imports: [OrientationCubeComponent],
})
export class MyViewerComponent {
  camera!: THREE.Camera;
}
```

```html
<app-orientation-cube [camera]="camera" />
```

### Integration in IFC Viewer

The orientation cube is already integrated into the IFC Viewer component:

```html
<!-- ifc-viewer.component.html -->
<div class="viewer-container">
  <canvas #canvas class="viewer-canvas"></canvas>
  
  @if (camera) {
    <app-orientation-cube [camera]="camera" />
  }
</div>
```

## Component API

### Inputs

| Input    | Type           | Required | Description                                    |
|----------|----------------|----------|------------------------------------------------|
| `camera` | `THREE.Camera` | Yes      | The main camera whose orientation to mirror    |

### Styling

The component uses fixed positioning and can be customized via CSS:

```typescript
styles: [`
  :host {
    position: fixed;
    top: 16px;        // Distance from top
    right: 16px;      // Distance from right
    width: 80px;      // Cube size
    height: 80px;     // Cube size
    z-index: 1000;    // Stack order
  }
`]
```

### Customization

To customize the position or size, you can wrap the component and override styles:

```html
<div class="custom-orientation-cube">
  <app-orientation-cube [camera]="camera" />
</div>
```

```css
.custom-orientation-cube app-orientation-cube {
  top: 24px;
  right: 24px;
  width: 100px;
  height: 100px;
}
```

## Technical Details

### Performance

- **Separate Rendering Context**: Uses its own WebGLRenderer and scene to avoid impacting main scene performance
- **Efficient Animation Loop**: Runs outside Angular zone using `NgZone.runOutsideAngular()`
- **Resource Management**: Properly disposes all Three.js resources on component destruction
- **Optimized Materials**: Uses canvas-based textures for crisp text rendering

### Rendering Pipeline

1. Component initializes with its own `WebGLRenderer` and `Scene`
2. Creates a cube with 6 face materials (text rendered on canvas)
3. Listens for camera changes via Angular `effect()`
4. Updates cube rotation to mirror main camera's orientation
5. Renders the cube in its own canvas at 60 FPS

### Memory Management

The component properly cleans up resources in `ngOnDestroy()`:

- Cancels animation frame
- Disposes geometries
- Disposes materials and textures
- Disposes renderer and forces context loss
- Clears scene

## Testing

### Running Tests

```bash
cd space-modeller
npm test
```

### Test Coverage

The component includes comprehensive tests:

- ✅ Component creation
- ✅ Camera input handling
- ✅ Canvas rendering
- ✅ Positioning and styling
- ✅ Pointer events
- ✅ Responsive behavior
- ✅ Resource cleanup
- ✅ Accessibility attributes

### Manual Testing

1. Start the dev server: `npm start`
2. Navigate to `http://localhost:4200`
3. Load an IFC file
4. Observe the orientation cube in the top-right corner
5. Rotate the main camera using left-click + drag
6. Verify the cube mirrors the camera rotation
7. Try switching between perspective and orthographic views

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ℹ️ Requires WebGL support

## Accessibility

- Canvas marked with `aria-hidden="true"` (purely visual indicator)
- Does not interfere with keyboard navigation
- High contrast text on face labels
- Respects system color scheme preferences

## Known Limitations

1. **Fixed Position**: Always top-right corner (by design)
2. **No Click Interaction**: Cannot click faces to snap camera (could be added in future)
3. **Text Rendering**: Uses canvas-based text (not DOM text) for performance
4. **Size**: Fixed 80×80px (can be customized via CSS)

## Future Enhancements

Potential improvements for future versions:

- [ ] Click-to-orient: Clicking a face snaps camera to that view
- [ ] Configurable position (top-left, bottom-right, etc.)
- [ ] Size variants (small, medium, large)
- [ ] Custom color schemes
- [ ] Animation transitions when camera orientation changes
- [ ] Hover effects on faces
- [ ] Hide/show toggle

## Troubleshooting

### Cube not visible

**Check:**
- Camera is properly initialized and passed to component
- Component is rendered in template
- No CSS conflicts with `z-index` or `position`
- WebGL is supported and working

### Cube not rotating

**Check:**
- Camera input is reactive (using signals or change detection)
- Animation loop is running (check console for errors)
- Camera orientation is actually changing

### Performance issues

**Check:**
- Only one orientation cube instance per view
- Animation frame is properly cleaned up on destroy
- No memory leaks (use Chrome DevTools Memory profiler)

## Contributing

When modifying this component:

1. Follow the Angular conventions in `.cursorrules`
2. Maintain TypeScript strict type checking
3. Use OnPush change detection
4. Update tests for new features
5. Document breaking changes

## License

Same as the main project license.

## Credits

Built with:
- [Angular 18](https://angular.io/)
- [Three.js 0.180](https://threejs.org/)
- [TypeScript 5.5](https://www.typescriptlang.org/)

---

For questions or issues, please refer to the main project documentation or create an issue in the repository.

