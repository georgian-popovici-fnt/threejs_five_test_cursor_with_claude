import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { ViewerConfig } from '../../shared/models/viewer.model';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigService],
    });
    service = TestBed.inject(ConfigService);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial configuration', () => {
    it('should have default configuration', () => {
      const config = service.config;
      
      expect(config).toBeDefined();
      expect(config.wasmPath).toBe('/wasm/');
      expect(config.cameraPosition).toEqual({ x: 10, y: 10, z: 10 });
      expect(config.backgroundColor).toBe('#0e1013');
    });

    it('should provide configuration as observable', (done) => {
      service.config$.subscribe((config) => {
        expect(config).toBeDefined();
        expect(config.showGrid).toBeDefined();
        done();
      });
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const updates: Partial<ViewerConfig> = {
        showGrid: false,
        backgroundColor: '#ffffff',
      };

      service.updateConfig(updates);

      const config = service.config;
      expect(config.showGrid).toBe(false);
      expect(config.backgroundColor).toBe('#ffffff');
    });

    it('should emit updated configuration', (done) => {
      let emissionCount = 0;
      
      service.config$.subscribe((config) => {
        emissionCount++;
        
        if (emissionCount === 2) {
          expect(config.showStats).toBe(false);
          done();
        }
      });

      service.updateConfig({ showStats: false });
    });

    it('should preserve unmodified values', () => {
      const originalWasmPath = service.config.wasmPath;
      
      service.updateConfig({ showGrid: false });
      
      expect(service.config.wasmPath).toBe(originalWasmPath);
    });
  });

  describe('resetConfig', () => {
    it('should reset to default configuration', () => {
      // Modify configuration
      service.updateConfig({ showGrid: false, showStats: false });
      
      // Reset
      service.resetConfig();
      
      const config = service.config;
      expect(config.showGrid).toBe(true);
    });
  });

  describe('local storage', () => {
    const storageKey = 'test-config';

    it('should save configuration to storage', () => {
      service.updateConfig({ showGrid: false });
      service.saveToStorage(storageKey);
      
      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.showGrid).toBe(false);
    });

    it('should load configuration from storage', () => {
      const testConfig: Partial<ViewerConfig> = {
        showGrid: false,
        backgroundColor: '#ff0000',
      };
      
      localStorage.setItem(storageKey, JSON.stringify(testConfig));
      
      service.loadFromStorage(storageKey);
      
      const config = service.config;
      expect(config.showGrid).toBe(false);
      expect(config.backgroundColor).toBe('#ff0000');
    });

    it('should handle invalid storage data gracefully', () => {
      localStorage.setItem(storageKey, 'invalid json');
      
      expect(() => service.loadFromStorage(storageKey)).not.toThrow();
    });
  });

  describe('fragmentsWorkerUrl', () => {
    it('should return worker URL', () => {
      const url = service.fragmentsWorkerUrl;
      expect(url).toContain('worker.mjs');
    });
  });

  describe('environment flags', () => {
    it('should provide production flag', () => {
      expect(typeof service.isProduction).toBe('boolean');
    });

    it('should provide debug mode flag', () => {
      expect(typeof service.debugMode).toBe('boolean');
    });
  });
});

