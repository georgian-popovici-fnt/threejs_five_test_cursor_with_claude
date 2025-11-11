# Testing Instructions for IFC Rendering Fix

## Quick Test Steps

### 1. Start the Application (if not already running)

```bash
cd space-modeller
npm start
```

Wait for the server to start, then navigate to `http://localhost:4200`

### 2. Load Your IFC File

1. Click the **"Import IFC"** button in the toolbar
2. Select your IFC file
3. Wait for the loading to complete

### 3. What to Look For

#### ✅ Success Indicators:

1. **Visual Helpers Appear**:
   - You should see a **green wireframe box** around your model
   - You should see **RGB colored axes** (Red/Green/Blue lines) at the model center
   
2. **Console Logs** (Open Developer Tools - F12):
   ```
   🔍 Model Structure Inspection
   Model Object: Group {...}
   Statistics: {
     meshes: [number > 0],
     totalVertices: [number > 0],
     totalFaces: [number > 0]
   }
   Bounding Box: { size: {...}, center: {...} }
   
   🔧 Fixing Model Materials
   Fixed [number] materials
   ✓ Fixed [number] materials
   
   ✓ Added bounding box helper (green) and axes helper at model center
   ```

3. **Your Model Geometry**:
   - The actual IFC model should now be visible
   - You should be able to rotate the camera around it using the mouse
   - Materials should be visible (not transparent or black)

#### ❌ If Still Not Visible:

Check the console for these specific values:

- **`meshes: 0`** → Your IFC file has no 3D geometry or failed to parse
- **`totalVertices: 0`** → The geometry is empty
- **Bounding box size is extreme** (like `size: { x: 100000, ... }` or `x: 0.0001`) → Scale issue
- **You see the green box but no model inside** → Material properties issue (should be fixed automatically, but check logs)

### 4. Interact with the Model

If visible, test the controls:
- **Left Click + Drag**: Rotate camera
- **Right Click + Drag**: Pan camera
- **Scroll Wheel**: Zoom in/out

The green helpers will rotate with the view, and your model should remain visible from all angles.

### 5. Export Test (Optional)

Once loaded successfully:
1. Click **"Download .frag"** button
2. Verify a `.frag` file downloads
3. This confirms the model is properly stored in memory

## What Was Fixed

### Before:
- IFC loaded successfully (callbacks fired, no errors)
- But nothing rendered on screen
- No way to diagnose the issue

### After:
- **Automatic material visibility fixes**
- **Visual helpers** (green bounding box + axes)
- **Comprehensive diagnostic logging**
- **Both-side face rendering** (fixes backface culling)
- **Dark material adjustment** (prevents invisible black materials)

### The Fixes:

1. **`inspectModelStructure()`** - Logs detailed model info
2. **`fixModelMaterials()`** - Automatically fixes common material issues
3. **`addModelHelpers()`** - Adds visual debugging aids

These run automatically every time you load an IFC file.

## Troubleshooting

### Green Box Appears But No Model

This means:
- ✅ Model loaded successfully
- ✅ Geometry exists
- ❌ Materials might still have issues

**Check**: Console logs under "🔧 Fixing Model Materials" - see which materials were fixed

### Nothing Appears At All (Not Even Green Box)

This means:
- ❌ Model didn't load properly
- ❌ Or model has no geometry

**Check**: Console logs for errors or `meshes: 0`

### Model is Too Small/Large

The camera auto-centers on the model based on bounding box. If scale is wrong:
- Check console: `Bounding Box: { size: { x: ?, y: ?, z: ? } }`
- Use scroll wheel to zoom in/out
- The axes helper shows you where the model center is

### Can't Rotate Camera

- Ensure you're left-clicking on the canvas (not the buttons)
- Check for console errors related to OrbitControls

## Expected Performance

- **Loading**: Depends on file size (typically 1-5 seconds for small models)
- **FPS**: Should maintain 60 FPS with the model visible
- **Memory**: Check stats.js panel in top-left corner

## Need More Help?

See `IFC_RENDERING_FIXES.md` for:
- Detailed explanation of root causes
- Technical details of fixes
- Advanced troubleshooting
- Performance considerations

---

**Test Checklist**:
- [ ] Green bounding box appears after loading
- [ ] RGB axes helper visible at model center
- [ ] Console shows detailed diagnostics
- [ ] Console shows "Fixed X materials"
- [ ] Model geometry is visible
- [ ] Can rotate/pan/zoom camera
- [ ] Model info appears in toolbar
- [ ] Export to .frag works

If all items check out, the fix is working correctly! ✨

