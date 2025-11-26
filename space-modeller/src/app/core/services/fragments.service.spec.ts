import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import * as THREE from 'three';
import { FragmentsService } from './fragments.service';
import { ErrorHandlerService, ErrorSeverity } from './error-handler.service';
import { ConfigService } from './config.service';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';

describe('FragmentsService', () => {
  let service: FragmentsService;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;
  let configService: jasmine.SpyObj<ConfigService>;
  let mockScene: THREE.Scene;
  let mockCamera: THREE.PerspectiveCamera;

  // Mock configuration
  const mockConfig = {
    wasmPath: '/wasm/',
    cameraPosition: { x: 10, y: 10, z: 10 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    backgroundColor: '#0e1013',
    showGrid: true,
    gridSize: 50,
    gridDivisions: 50,
    showStats: false,
  };

  beforeEach(() => {
    const errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);
    const configServiceSpy = jasmine.createSpyObj('ConfigService', [], {
      config: mockConfig,
      fragmentsWorkerUrl: '/worker.mjs',
    });

    TestBed.configureTestingModule({
      providers: [
        FragmentsService,
        { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        { provide: ConfigService, useValue: configServiceSpy },
      ],
    });

    service = TestBed.inject(FragmentsService);
    errorHandler = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
    configService = TestBed.inject(ConfigService) as jasmine.SpyObj<ConfigService>;

    mockScene = new THREE.Scene();
    mockCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should start not initialized', () => {
      expect(service.isInitialized).toBe(false);
    });

    it('should have zero model count initially', () => {
      expect(service.modelCount).toBe(0);
    });

    it('should throw error if scene or camera not provided', async () => {
      await expectAsync(
        service.initialize(null as any, mockCamera)
      ).toBeRejectedWithError(/Scene and camera are required/);

      await expectAsync(
        service.initialize(mockScene, null as any)
      ).toBeRejectedWithError(/Scene and camera are required/);
    });

    it('should not initialize twice', async () => {
      // Mock successful initialization
      spyOn<any>(service, 'initializeFragmentsManager').and.returnValue(Promise.resolve());
      spyOn<any>(service, 'initializeIfcLoader').and.returnValue(Promise.resolve());

      // Mock Components class
      const mockComponents = {
        get: jasmine.createSpy('get').and.returnValue({
          init: jasmine.createSpy('init'),
          initialized: true,
        }),
      };
      
      spyOn(OBC, 'Components' as any).and.returnValue(mockComponents);

      await service.initialize(mockScene, mockCamera);
      const firstCall = (service as any).components;

      await service.initialize(mockScene, mockCamera);
      const secondCall = (service as any).components;

      // Should use same components instance
      expect(firstCall).toBe(secondCall);
    });
  });

  describe('ensureInitialized', () => {
    it('should throw error if not initialized', () => {
      expect(() => {
        (service as any).ensureInitialized();
      }).toThrowError(/FragmentsService not initialized/);
    });

    it('should not throw if initialized', async () => {
      // Mock initialization
      (service as any).initialized = true;
      (service as any).ifcLoader = {};
      (service as any).fragmentsManager = {};

      expect(() => {
        (service as any).ensureInitialized();
      }).not.toThrow();
    });
  });

  describe('loadIfc', () => {
    beforeEach(async () => {
      // Mock successful initialization
      (service as any).initialized = true;
      (service as any).scene = mockScene;
      (service as any).camera = mockCamera;
      
      // Mock IFC loader
      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
        items: new Map(),
      };

      (service as any).ifcLoader = {
        load: jasmine.createSpy('load').and.returnValue(Promise.resolve(mockModel)),
      };

      (service as any).fragmentsManager = {};
    });

    it('should throw error if buffer is empty', async () => {
      await expectAsync(
        service.loadIfc(new Uint8Array([]), 'test-model')
      ).toBeRejectedWithError(/Invalid buffer: empty or null/);
    });

    it('should throw error if name is invalid', async () => {
      await expectAsync(
        service.loadIfc(new Uint8Array([1, 2, 3]), '')
      ).toBeRejectedWithError(/Invalid model name/);
    });

    it('should load IFC file successfully', async () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      const uuid = await service.loadIfc(buffer, 'test-model');

      expect(uuid).toBe('test-uuid');
      expect(service.modelCount).toBe(1);
    });

    it('should call progress callback', fakeAsync(() => {
      const buffer = new Uint8Array([1, 2, 3]);
      const progressSpy = jasmine.createSpy('progress');

      service.loadIfc(buffer, 'test-model', progressSpy);
      tick(100);
      flush();

      expect(progressSpy).toHaveBeenCalledWith(0);
      expect(progressSpy).toHaveBeenCalledWith(100);
    }));

    it('should handle load error', async () => {
      const mockError = new Error('Load failed');
      (service as any).ifcLoader.load.and.returnValue(Promise.reject(mockError));

      await expectAsync(
        service.loadIfc(new Uint8Array([1, 2, 3]), 'test-model')
      ).toBeRejectedWithError(/Failed to load IFC file/);

      expect(errorHandler.handleError).toHaveBeenCalledWith(
        mockError,
        ErrorSeverity.ERROR,
        jasmine.any(Object)
      );
    });

    it('should throw error if model has no ID', async () => {
      const mockModel = {
        modelId: null,
        object: new THREE.Group(),
      };
      (service as any).ifcLoader.load.and.returnValue(Promise.resolve(mockModel));

      await expectAsync(
        service.loadIfc(new Uint8Array([1, 2, 3]), 'test-model')
      ).toBeRejectedWithError(/Failed to load IFC model: model is null or has no ID/);
    });
  });

  describe('getModel', () => {
    beforeEach(() => {
      (service as any).initialized = true;
    });

    it('should return model if exists', () => {
      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
      };

      (service as any).loadedModels.set('test-uuid', mockModel);

      const result = service.getModel('test-uuid');

      expect(result).toEqual(mockModel as any);
    });

    it('should return undefined if model not found', () => {
      const result = service.getModel('nonexistent-uuid');

      expect(result).toBeUndefined();
    });

    it('should check fragmentsManager if not in cache', () => {
      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
      };

      (service as any).fragmentsManager = {
        list: new Map([['test-uuid', mockModel]]),
      };

      const result = service.getModel('test-uuid');

      expect(result).toEqual(mockModel as any);
      // Should also cache it
      expect((service as any).loadedModels.has('test-uuid')).toBe(true);
    });
  });

  describe('getAllModels', () => {
    it('should return all loaded models', () => {
      const mockModel1 = { modelId: 'uuid-1', object: new THREE.Group() };
      const mockModel2 = { modelId: 'uuid-2', object: new THREE.Group() };

      (service as any).loadedModels.set('uuid-1', mockModel1);
      (service as any).loadedModels.set('uuid-2', mockModel2);

      const models = service.getAllModels();

      expect(models.length).toBe(2);
      expect(models).toContain(mockModel1 as any);
      expect(models).toContain(mockModel2 as any);
    });

    it('should return empty array if no models', () => {
      const models = service.getAllModels();

      expect(models).toEqual([]);
    });
  });

  describe('getModelStatistics', () => {
    it('should return null if model not found', () => {
      const stats = service.getModelStatistics('nonexistent-uuid');

      expect(stats).toBeNull();
    });

    it('should return statistics for existing model', () => {
      const mockMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      const mockGroup = new THREE.Group();
      mockGroup.add(mockMesh);

      const mockModel = {
        modelId: 'test-uuid',
        object: mockGroup,
      };

      (service as any).loadedModels.set('test-uuid', mockModel);

      const stats = service.getModelStatistics('test-uuid');

      expect(stats).toBeTruthy();
      expect(stats?.meshCount).toBeGreaterThan(0);
      expect(stats?.vertexCount).toBeGreaterThan(0);
      expect(stats?.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should return null if model has no object', () => {
      const mockModel = {
        modelId: 'test-uuid',
        object: null,
      };

      (service as any).loadedModels.set('test-uuid', mockModel);

      const stats = service.getModelStatistics('test-uuid');

      expect(stats).toBeNull();
    });
  });

  describe('exportFragment', () => {
    it('should export fragment successfully', async () => {
      const mockBuffer = new ArrayBuffer(100);
      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
        getBuffer: jasmine.createSpy('getBuffer').and.returnValue(Promise.resolve(mockBuffer)),
      };

      (service as any).loadedModels.set('test-uuid', mockModel);

      const result = await service.exportFragment('test-uuid');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.fileSize).toBe(100);
      expect(result.duration).toBeDefined();
    });

    it('should return error if model not found', async () => {
      const result = await service.exportFragment('nonexistent-uuid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle export error', async () => {
      const mockError = new Error('Export failed');
      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
        getBuffer: jasmine.createSpy('getBuffer').and.returnValue(Promise.reject(mockError)),
      };

      (service as any).loadedModels.set('test-uuid', mockModel);

      const result = await service.exportFragment('test-uuid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Export failed');
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('removeModel', () => {
    it('should remove model successfully', async () => {
      const mockGroup = new THREE.Group();
      const mockModel = {
        modelId: 'test-uuid',
        object: mockGroup,
        items: new Map(),
        dispose: jasmine.createSpy('dispose').and.returnValue(Promise.resolve()),
      };

      mockScene.add(mockGroup);
      (service as any).scene = mockScene;
      (service as any).loadedModels.set('test-uuid', mockModel);

      const result = await service.removeModel('test-uuid');

      expect(result).toBe(true);
      expect(mockModel.dispose).toHaveBeenCalled();
      expect((service as any).loadedModels.has('test-uuid')).toBe(false);
    });

    it('should return false if model not found', async () => {
      const result = await service.removeModel('nonexistent-uuid');

      expect(result).toBe(false);
    });

    it('should handle disposal error gracefully', async () => {
      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
        dispose: jasmine.createSpy('dispose').and.returnValue(Promise.reject(new Error('Dispose failed'))),
      };

      (service as any).scene = mockScene;
      (service as any).loadedModels.set('test-uuid', mockModel);

      const result = await service.removeModel('test-uuid');

      expect(result).toBe(false);
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('bindCamera', () => {
    it('should bind camera', () => {
      service.bindCamera(mockCamera);

      expect((service as any).camera).toBe(mockCamera);
    });

    it('should accept different camera types', () => {
      const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      service.bindCamera(orthoCamera);

      expect((service as any).camera).toBe(orthoCamera);
    });
  });

  describe('updateCulling', () => {
    it('should not throw error', async () => {
      await expectAsync(service.updateCulling()).toBeResolved();
    });
  });

  describe('dispose', () => {
    it('should dispose all resources', async () => {
      (service as any).initialized = true;
      (service as any).scene = mockScene;
      (service as any).camera = mockCamera;

      const mockModel1 = {
        modelId: 'uuid-1',
        object: new THREE.Group(),
        dispose: jasmine.createSpy('dispose').and.returnValue(Promise.resolve()),
      };
      const mockModel2 = {
        modelId: 'uuid-2',
        object: new THREE.Group(),
        dispose: jasmine.createSpy('dispose').and.returnValue(Promise.resolve()),
      };

      (service as any).loadedModels.set('uuid-1', mockModel1);
      (service as any).loadedModels.set('uuid-2', mockModel2);

      (service as any).ifcLoader = {
        dispose: jasmine.createSpy('dispose'),
      };

      (service as any).components = {
        dispose: jasmine.createSpy('dispose'),
      };

      await service.dispose();

      expect(mockModel1.dispose).toHaveBeenCalled();
      expect(mockModel2.dispose).toHaveBeenCalled();
      expect((service as any).ifcLoader.dispose).toHaveBeenCalled();
      expect((service as any).components.dispose).toHaveBeenCalled();
      expect(service.isInitialized).toBe(false);
      expect(service.modelCount).toBe(0);
    });

    it('should not throw if not initialized', async () => {
      await expectAsync(service.dispose()).toBeResolved();
    });

    it('should handle disposal errors gracefully', async () => {
      (service as any).initialized = true;
      (service as any).components = {
        dispose: jasmine.createSpy('dispose').and.throwError('Dispose failed'),
      };

      await expectAsync(service.dispose()).toBeResolved();
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle model with no items', async () => {
      (service as any).initialized = true;
      (service as any).scene = mockScene;

      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
        items: undefined,
      };

      (service as any).ifcLoader = {
        load: jasmine.createSpy('load').and.returnValue(Promise.resolve(mockModel)),
      };

      const buffer = new Uint8Array([1, 2, 3]);
      const uuid = await service.loadIfc(buffer, 'test-model');

      expect(uuid).toBe('test-uuid');
    });

    it('should handle fragments without mesh', async () => {
      (service as any).initialized = true;
      (service as any).scene = mockScene;

      const fragmentMap = new Map();
      fragmentMap.set('frag-1', { name: 'test', mesh: null });

      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
        items: fragmentMap,
      };

      (service as any).ifcLoader = {
        load: jasmine.createSpy('load').and.returnValue(Promise.resolve(mockModel)),
      };

      const buffer = new Uint8Array([1, 2, 3]);
      
      await expectAsync(service.loadIfc(buffer, 'test-model')).toBeResolved();
    });

    it('should handle model without dispose method', async () => {
      const mockModel = {
        modelId: 'test-uuid',
        object: new THREE.Group(),
        // No dispose method
      };

      (service as any).scene = mockScene;
      (service as any).loadedModels.set('test-uuid', mockModel);

      const result = await service.removeModel('test-uuid');

      // Should still succeed
      expect(result).toBe(true);
    });
  });
});

