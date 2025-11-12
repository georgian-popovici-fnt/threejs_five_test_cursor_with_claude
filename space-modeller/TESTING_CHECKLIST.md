# IFC Import Testing Checklist

## Quick Test Steps

### 1. ✅ Verify Server is Running
- Navigate to: `http://localhost:4200`
- You should see the 3D viewer with grid

### 2. ✅ Import Your IFC File
- Click the **"Import IFC"** button
- Select your `.ifc` file
- Wait for loading to complete

### 3. ✅ Check Console Output (F12)

Look for these key messages:

```
✅ Scene and camera stored in service
✅ Loading IFC file: your-file.ifc (X.XX MB)
✅ Model "your-file" loaded successfully
✅ Adding model object to scene from FragmentsService
✅ Fragment child: Mesh visible: true material: MeshStandardMaterial
✅ ✓ Model object added to scene with X children
```

### 4. ✅ Visual Verification

You should now see **THREE things**:

1. **Your actual IFC model** with proper geometry and materials ← **THIS IS THE FIX!**
2. Green wireframe box around the model (bounding box helper)
3. RGB colored axes at model center (Red=X, Green=Y, Blue=Z)

### 5. ✅ Test Interaction

- **Left Click + Drag**: Rotate camera around model
- **Right Click + Drag**: Pan camera
- **Scroll Wheel**: Zoom in/out
- **Model should remain visible** from all angles

## What Changed vs. Before

| Before Fix | After Fix |
|------------|-----------|
| ❌ Only green cube visible | ✅ **Full IFC model visible** |
| ❌ Model geometry not rendered | ✅ **All geometry renders** |
| ❌ Only helpers showed | ✅ **Model + helpers show** |
| Console: "Model loaded" | Console: "Model added to scene" |

## If You Still Only See the Green Cube

### Check Console for These Values:

1. **Meshes count**:
   ```
   Statistics: { meshes: X, ... }
   ```
   - If `meshes: 0` → Your IFC file has no 3D geometry

2. **Model children**:
   ```
   ✓ Model object added to scene with X children
   ```
   - If `X = 0` → Model object is empty

3. **Fragment children logged**:
   ```
   Fragment child: Mesh visible: true material: ...
   ```
   - If none appear → Fragments weren't created

4. **Any errors**:
   - Look for red error messages in console

### Common Issues:

| Issue | Solution |
|-------|----------|
| `meshes: 0` | IFC file is empty or failed to parse |
| No "added to scene" message | Service didn't add model (check fix was applied) |
| Bounding box extremely large | Scale issue - zoom out |
| Bounding box extremely small | Scale issue - zoom in |
| Errors about "scene is null" | FragmentsService not properly initialized |

## Disable Diagnostic Helpers

Once you confirm the model renders correctly, you can disable the helpers:

**Edit**: `space-modeller/src/app/shared/constants/viewer.constants.ts`

```typescript
export const VIEWER_CONFIG: ViewerConfig = {
  // ... other settings ...
  
  // Disable helpers after confirming model works:
  showBoundingBoxHelper: false,  // Hide green box
  showAxesHelper: false,          // Hide RGB axes
};
```

Save the file and the dev server will auto-reload.

## Success Criteria

✅ IFC file loads without errors  
✅ Console shows "Model object added to scene"  
✅ **Actual IFC geometry is visible and correctly rendered**  
✅ Can rotate, pan, zoom around the model  
✅ Materials look correct (not all black/transparent)  
✅ Model stays visible from all camera angles  

## Need Help?

If the model still doesn't render:

1. **Check** `IFC_IMPORT_FIX_SUMMARY.md` for detailed technical explanation
2. **Verify** the fix was applied (check if `fragments.service.ts` has `private scene: THREE.Scene | null = null`)
3. **Share** console output to diagnose the issue
4. **Try** a different IFC file to rule out file-specific issues
5. **Verify** your IFC file opens correctly in other IFC viewers

---

**Last Updated**: 2025-11-11  
**Fix Status**: ✅ Complete and Ready for Testing

