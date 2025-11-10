# CORS Error Fix for FragmentsManager

## Problem

When loading IFC files, the application encountered a CORS (Cross-Origin Resource Sharing) error:

```
SecurityError: Failed to construct 'Worker': Script at 'https://thatopen.github.io/engine_fragment/resources/worker.mjs' cannot be accessed from origin 'http://localhost:4200'.
```

The `@thatopen/components` library's `FragmentsManager` was attempting to load a Web Worker script from a remote URL (`https://thatopen.github.io`), which browsers block due to same-origin policy restrictions.

## Solution

### 1. Downloaded Worker Script Locally

Downloaded the `worker.mjs` file from the ThatOpen repository and placed it in the `public/` directory:

```bash
curl -o public/worker.mjs https://thatopen.github.io/engine_fragment/resources/worker.mjs
```

**File location**: `space-modeller/public/worker.mjs` (469 KB)

### 2. Updated Viewer Constants

Modified `src/app/shared/constants/viewer.constants.ts` to use the local worker URL:

```typescript
/**
 * Fragments worker URL
 * Local worker served from public folder to avoid CORS issues
 */
export const FRAGMENTS_WORKER_URL = '/worker.mjs';
```

**Changed from**: `https://thatopen.github.io/engine_fragment/resources/worker.mjs`  
**Changed to**: `/worker.mjs`

### 3. Updated FragmentsService

Modified `src/app/core/services/fragments.service.ts` to initialize the `FragmentsManager` with the local worker URL:

```typescript
import { VIEWER_CONFIG, FRAGMENTS_WORKER_URL } from '../../shared/constants/viewer.constants';

// In the initialize method:
this.fragmentsManager = this.components.get(OBC.FragmentsManager);

// Initialize FragmentsManager with local worker URL (fixes CORS issue)
this.fragmentsManager.init(FRAGMENTS_WORKER_URL);
console.log('FragmentsManager initialized with worker URL:', FRAGMENTS_WORKER_URL);
```

**Key change**: Called `fragmentsManager.init(FRAGMENTS_WORKER_URL)` to explicitly set the worker URL before loading IFC files.

## How It Works

1. **Angular Configuration**: The `angular.json` is configured to copy all files from the `public/` folder to the build output:
   ```json
   "assets": [
     {
       "glob": "**/*",
       "input": "public"
     }
   ]
   ```

2. **Worker Served Locally**: When the Angular dev server runs on `http://localhost:4200`, the `worker.mjs` file is served from the same origin at `/worker.mjs`.

3. **No CORS Issues**: Since the worker script is loaded from the same origin as the application, browsers allow the Web Worker to be created.

## File Locations

- **Development**: `space-modeller/public/worker.mjs`
- **Production Build**: `space-modeller/dist/space-modeller/browser/worker.mjs`

## Benefits

✅ Eliminates CORS errors  
✅ Works in both development and production  
✅ No need for proxy configuration  
✅ No dependency on external CDN availability  
✅ Faster worker loading (local file)  

## Updating the Worker

If ThatOpen releases an updated worker, download the latest version:

```bash
cd space-modeller
curl -o public/worker.mjs https://thatopen.github.io/engine_fragment/resources/worker.mjs
```

## References

- **ThatOpen Components v3.2.3**: Uses `FragmentsManager.init(workerURL: string)` method
- **Angular Assets**: Files in `public/` are automatically copied to dist
- **Web Workers**: Subject to same-origin policy for security

