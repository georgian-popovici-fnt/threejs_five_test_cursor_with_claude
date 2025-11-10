/**
 * Copy web-ifc WASM files to public folder
 * This ensures WASM assets are served correctly in production
 */

const { copyFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const SOURCE_DIR = join(__dirname, '../node_modules/web-ifc/');
const TARGET_DIR = join(__dirname, '../public/wasm/');

// Ensure target directory exists
if (!existsSync(TARGET_DIR)) {
  mkdirSync(TARGET_DIR, { recursive: true });
  console.log('✓ Created public/wasm/ directory');
}

// WASM files to copy
const wasmFiles = ['web-ifc.wasm', 'web-ifc-mt.wasm'];

// Copy WASM files
let copiedCount = 0;
for (const file of wasmFiles) {
  const sourcePath = join(SOURCE_DIR, file);
  const targetPath = join(TARGET_DIR, file);

  if (existsSync(sourcePath)) {
    try {
      copyFileSync(sourcePath, targetPath);
      console.log(`✓ Copied ${file}`);
      copiedCount++;
    } catch (error) {
      console.error(`✗ Failed to copy ${file}:`, error.message);
    }
  } else {
    console.warn(`⚠ Warning: ${file} not found in web-ifc package`);
  }
}

console.log(`\n✓ Successfully copied ${copiedCount} WASM file(s) to public/wasm/`);
console.log('\nNote: These files are needed for IFC loading to work correctly.');
console.log('Alternative: Use CDN path in viewer.constants.ts for development.\n');
