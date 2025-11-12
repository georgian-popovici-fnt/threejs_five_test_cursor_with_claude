import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ViewerConfig } from '../../shared/models/viewer.model';
import { environment } from '../../../environments/environment';
import { ErrorHandlerService, ErrorSeverity } from './error-handler.service';

/**
 * Configuration service for managing application-wide settings
 * Provides reactive configuration with validation and persistence
 * 
 * @example
 * ```typescript
 * constructor(private config: ConfigService) {
 *   this.config.viewerConfig$.subscribe(config => {
 *     console.log('WASM path:', config.wasmPath);
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly errorHandler = inject(ErrorHandlerService);
  
  /**
   * Default viewer configuration
   */
  private readonly defaultConfig: ViewerConfig = {
    wasmPath: '/wasm/',
    cameraPosition: { x: 10, y: 10, z: 10 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    backgroundColor: '#0e1013',
    showGrid: true,
    gridSize: 50,
    gridDivisions: 50,
    showStats: !environment.production, // Only show stats in development
    showBoundingBoxHelper: !environment.production,
    showAxesHelper: !environment.production,
    enablePerformanceMonitoring: !environment.production,
    maxFileSizeMB: 500,
  };

  private readonly viewerConfig$ = new BehaviorSubject<ViewerConfig>(this.defaultConfig);

  /**
   * Observable stream of viewer configuration
   */
  get config$(): Observable<ViewerConfig> {
    return this.viewerConfig$.asObservable();
  }

  /**
   * Get current viewer configuration
   */
  get config(): ViewerConfig {
    return this.viewerConfig$.value;
  }

  /**
   * Get fragments worker URL
   */
  get fragmentsWorkerUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/worker.mjs`;
    }
    return '/worker.mjs';
  }

  /**
   * Update viewer configuration
   * @param updates - Partial configuration updates
   */
  updateConfig(updates: Partial<ViewerConfig>): void {
    try {
      const currentConfig = this.viewerConfig$.value;
      const newConfig = { ...currentConfig, ...updates };
      
      // Validate configuration
      this.validateConfig(newConfig);
      
      this.viewerConfig$.next(newConfig);
      console.log('Configuration updated:', updates);
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.WARNING, {
        operation: 'updateConfig',
        updates,
      });
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.viewerConfig$.next({ ...this.defaultConfig });
    console.log('Configuration reset to defaults');
  }

  /**
   * Load configuration from local storage
   * @param key - Storage key (default: 'viewer-config')
   */
  loadFromStorage(key: string = 'viewer-config'): void {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const config = JSON.parse(stored) as Partial<ViewerConfig>;
        this.updateConfig(config);
        console.log('Configuration loaded from storage');
      }
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.WARNING, {
        operation: 'loadFromStorage',
        key,
      });
    }
  }

  /**
   * Save configuration to local storage
   * @param key - Storage key (default: 'viewer-config')
   */
  saveToStorage(key: string = 'viewer-config'): void {
    try {
      const config = this.viewerConfig$.value;
      localStorage.setItem(key, JSON.stringify(config));
      console.log('Configuration saved to storage');
    } catch (error) {
      this.errorHandler.handleError(error, ErrorSeverity.WARNING, {
        operation: 'saveToStorage',
        key,
      });
    }
  }

  /**
   * Validate configuration
   * @param config - Configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: ViewerConfig): void {
    // Validate WASM path
    if (!config.wasmPath || typeof config.wasmPath !== 'string') {
      throw new Error('Invalid WASM path');
    }

    // Validate camera position and target
    if (!this.isValidVector3(config.cameraPosition)) {
      throw new Error('Invalid camera position');
    }
    if (!this.isValidVector3(config.cameraTarget)) {
      throw new Error('Invalid camera target');
    }

    // Validate grid settings
    if (config.gridSize !== undefined && config.gridSize <= 0) {
      throw new Error('Grid size must be positive');
    }
    if (config.gridDivisions !== undefined && config.gridDivisions <= 0) {
      throw new Error('Grid divisions must be positive');
    }

    // Validate max file size
    if (config.maxFileSizeMB !== undefined && config.maxFileSizeMB <= 0) {
      throw new Error('Max file size must be positive');
    }
  }

  /**
   * Check if value is a valid Vector3 config
   */
  private isValidVector3(value: any): boolean {
    return (
      value &&
      typeof value === 'object' &&
      typeof value.x === 'number' &&
      typeof value.y === 'number' &&
      typeof value.z === 'number' &&
      !isNaN(value.x) &&
      !isNaN(value.y) &&
      !isNaN(value.z)
    );
  }

  /**
   * Get environment-specific settings
   */
  get isProduction(): boolean {
    return environment.production;
  }

  /**
   * Get debug mode status
   */
  get debugMode(): boolean {
    return !environment.production;
  }
}

