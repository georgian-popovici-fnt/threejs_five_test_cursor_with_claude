#!/usr/bin/env node

/**
 * Setup script to copy web-ifc WASM files to public directory
 * 
 * Usage:
 *   node setup-wasm.js
 *   npm run setup-wasm (if added to package.json scripts)
 */

import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = join(__dirname, 'node_modules', 'web-ifc');
const targetDir = join(__dirname, 'public', 'wasm');

const wasmFiles = [
    'web-ifc.wasm',
    'web-ifc-mt.wasm'
];

async function setupWasm() {
    console.log('🔧 Setting up web-ifc WASM files...\n');

    try {
        // Check if node_modules exists
        if (!existsSync(sourceDir)) {
            console.error('❌ Error: node_modules/web-ifc not found');
            console.error('   Please run "npm install" first');
            process.exit(1);
        }

        // Create target directory if it doesn't exist
        if (!existsSync(targetDir)) {
            console.log(`📁 Creating directory: ${targetDir}`);
            await mkdir(targetDir, { recursive: true });
        }

        // Copy WASM files
        let copiedCount = 0;
        for (const file of wasmFiles) {
            const sourcePath = join(sourceDir, file);
            const targetPath = join(targetDir, file);

            if (existsSync(sourcePath)) {
                await copyFile(sourcePath, targetPath);
                console.log(`✅ Copied: ${file}`);
                copiedCount++;
            } else {
                console.log(`⚠️  Not found: ${file} (skipping)`);
            }
        }

        if (copiedCount === 0) {
            console.error('\n❌ No WASM files were copied');
            process.exit(1);
        }

        console.log(`\n✅ Setup complete! Copied ${copiedCount} file(s)`);
        console.log('\n💡 Next steps:');
        console.log('   1. Run "npm run dev" to start development server');
        console.log('   2. Or run "npm run build" to build for production\n');

    } catch (error) {
        console.error('\n❌ Error during setup:', error.message);
        process.exit(1);
    }
}

setupWasm();





