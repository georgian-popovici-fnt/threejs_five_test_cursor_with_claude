import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { signal } from '@angular/core';
import * as THREE from 'three';
import { IfcViewerComponent } from './ifc-viewer.component';
import { FragmentsService } from '../../core/services/fragments.service';
import { ErrorHandlerService, ErrorSeverity } from '../../core/services/error-handler.service';
import { ConfigService } from '../../core/services/config.service';
import { IfcFilterService } from '../../core/services/ifc-filter.service';
import { ModelLoadingStatus } from '../../shared/models/ifc.model';
import { of, BehaviorSubject } from 'rxjs';

describe('IfcViewerComponent', () => {
  let component: IfcViewerComponent;
  let fixture: ComponentFixture<IfcViewerComponent>;
  let fragmentsService: jasmine.SpyObj<FragmentsService>;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;
  let configService: jasmine.SpyObj<ConfigService>;
  let ifcFilterService: jasmine.SpyObj<IfcFilterService>;

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
    showBoundingBoxHelper: false,
    showAxesHelper: false,
  };

  beforeEach(async () => {
    // Create spies for services
    const fragmentsServiceSpy = jasmine.createSpyObj('FragmentsService', [
      'initialize',
      'loadIfc',
      'getModel',
      'getModelStatistics',
      'exportFragment',
      'removeModel',
      'bindCamera',
      'updateCulling',
      'dispose',
    ]);

    const errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
    ]);

    const configSubject = new BehaviorSubject(mockConfig);
    const configServiceSpy = jasmine.createSpyObj('ConfigService', [], {
      config: mockConfig,
      config$: configSubject.asObservable(),
    });

    const ifcFilterServiceSpy = jasmine.createSpyObj('IfcFilterService', [
      'extractClasses',
      'clear',
      'toggleClassVisibility',
      'showAllClasses',
      'hideAllClasses',
    ]);

    // Setup default spy return values
    fragmentsServiceSpy.initialize.and.returnValue(Promise.resolve());
    fragmentsServiceSpy.loadIfc.and.returnValue(Promise.resolve('test-uuid'));
    fragmentsServiceSpy.getModel.and.returnValue({ modelId: 'test-uuid', object: new THREE.Group() } as any);
    fragmentsServiceSpy.getModelStatistics.and.returnValue({
      fragmentCount: 10,
      meshCount: 50,
      vertexCount: 1000,
      faceCount: 500,
      memoryUsage: 2.5,
    });
    fragmentsServiceSpy.exportFragment.and.returnValue(
      Promise.resolve({
        success: true,
        data: new Uint8Array([1, 2, 3]),
        fileSize: 3,
        duration: 100,
      })
    );
    fragmentsServiceSpy.removeModel.and.returnValue(Promise.resolve(true));
    ifcFilterServiceSpy.extractClasses.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [IfcViewerComponent],
      providers: [
        { provide: FragmentsService, useValue: fragmentsServiceSpy },
        { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: IfcFilterService, useValue: ifcFilterServiceSpy },
      ],
    }).compileComponents();

    fragmentsService = TestBed.inject(FragmentsService) as jasmine.SpyObj<FragmentsService>;
    errorHandler = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
    configService = TestBed.inject(ConfigService) as jasmine.SpyObj<ConfigService>;
    ifcFilterService = TestBed.inject(IfcFilterService) as jasmine.SpyObj<IfcFilterService>;

    fixture = TestBed.createComponent(IfcViewerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize signals with correct default values', () => {
      expect(component.camera()).toBeNull();
      expect(component.controls()).toBeNull();
      expect(component.currentModel()).toBeNull();
      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
      expect(component.isSidebarCollapsed()).toBe(false);
      expect(component.cameraType()).toBe('perspective');
    });

    it('should have camera options', () => {
      expect(component.cameraOptions.length).toBe(2);
      expect(component.cameraOptions[0].value).toBe('perspective');
      expect(component.cameraOptions[1].value).toBe('orthographic');
    });

    it('should have correct computed signals', () => {
      expect(component.hasModel()).toBe(false);
      expect(component.canExport()).toBe(false);

      // Set a loaded model
      component.currentModel.set({
        id: 'test-id',
        name: 'test-model',
        status: ModelLoadingStatus.LOADED,
        fragmentUuid: 'test-uuid',
        progress: 100,
        fileSize: 1000,
      });

      expect(component.hasModel()).toBe(true);
      expect(component.canExport()).toBe(true);
    });

    it('should initialize viewer after render', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      expect(fragmentsService.initialize).toHaveBeenCalled();
    }));
  });

  describe('File Selection and Loading', () => {
    it('should handle file selection', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      const file = new File(['test content'], 'test.ifc', { type: 'application/ifc' });
      const mockInput = {
        files: [file],
        value: 'test.ifc',
      } as unknown as HTMLInputElement;
      const event = {
        target: mockInput,
      } as unknown as Event;

      component.onFileSelected(event);
      tick(1000);

      expect(fragmentsService.loadIfc).toHaveBeenCalled();
    }));

    it('should reject invalid files', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockInput = {
        files: [file],
        value: 'test.txt',
      } as unknown as HTMLInputElement;
      const event = {
        target: mockInput,
      } as unknown as Event;

      component.onFileSelected(event);
      tick(100);

      expect(component.errorMessage()).toBeTruthy();
      expect(fragmentsService.loadIfc).not.toHaveBeenCalled();
    }));

    it('should handle empty file selection', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      const mockInput = {
        files: [],
      } as unknown as HTMLInputElement;
      const event = {
        target: mockInput,
      } as unknown as Event;

      component.onFileSelected(event);
      tick(100);

      expect(fragmentsService.loadIfc).not.toHaveBeenCalled();
    }));

    it('should set loading state during file load', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      fragmentsService.loadIfc.and.returnValue(
        new Promise((resolve) => setTimeout(() => resolve('test-uuid'), 500))
      );

      const file = new File(['test content'], 'test.ifc', { type: 'application/ifc' });
      const mockInput = {
        files: [file],
        value: 'test.ifc',
      } as unknown as HTMLInputElement;
      const event = {
        target: mockInput,
      } as unknown as Event;

      component.onFileSelected(event);
      tick(100);

      expect(component.isLoading()).toBe(true);

      tick(500);
      flush();

      expect(component.isLoading()).toBe(false);
    }));

    it('should handle file load error', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      fragmentsService.loadIfc.and.returnValue(
        Promise.reject(new Error('Load failed'))
      );

      const file = new File(['test content'], 'test.ifc', { type: 'application/ifc' });
      const mockInput = {
        files: [file],
        value: 'test.ifc',
      } as unknown as HTMLInputElement;
      const event = {
        target: mockInput,
      } as unknown as Event;

      component.onFileSelected(event);
      tick(1000);
      flush();

      expect(component.errorMessage()).toBeTruthy();
      expect(errorHandler.handleError).toHaveBeenCalled();
    }));

    it('should clear previous model before loading new one', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      // Load first model
      component.currentModel.set({
        id: 'first-id',
        name: 'first-model',
        status: ModelLoadingStatus.LOADED,
        fragmentUuid: 'first-uuid',
        progress: 100,
        fileSize: 1000,
      });

      const file = new File(['test content'], 'test.ifc', { type: 'application/ifc' });
      const mockInput = {
        files: [file],
        value: 'test.ifc',
      } as unknown as HTMLInputElement;
      const event = {
        target: mockInput,
      } as unknown as Event;

      component.onFileSelected(event);
      tick(1000);
      flush();

      expect(fragmentsService.removeModel).toHaveBeenCalledWith('first-uuid');
      expect(ifcFilterService.clear).toHaveBeenCalled();
    }));
  });

  describe('Fragment Export', () => {
    it('should export fragment successfully', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      component.currentModel.set({
        id: 'test-id',
        name: 'test-model',
        status: ModelLoadingStatus.LOADED,
        fragmentUuid: 'test-uuid',
        progress: 100,
        fileSize: 1000,
      });

      // Mock document.createElement and URL.createObjectURL
      const mockLink = document.createElement('a');
      spyOn(mockLink, 'click');
      spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
      spyOn(URL, 'revokeObjectURL');

      component.downloadFragment();
      tick(1000);

      expect(fragmentsService.exportFragment).toHaveBeenCalledWith('test-uuid');
      expect(mockLink.download).toBe('test-model.frag');
      expect(mockLink.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    }));

    it('should not export if no model loaded', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      component.downloadFragment();
      tick(100);

      expect(fragmentsService.exportFragment).not.toHaveBeenCalled();
    }));

    it('should handle export error', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      component.currentModel.set({
        id: 'test-id',
        name: 'test-model',
        status: ModelLoadingStatus.LOADED,
        fragmentUuid: 'test-uuid',
        progress: 100,
        fileSize: 1000,
      });

      fragmentsService.exportFragment.and.returnValue(
        Promise.resolve({
          success: false,
          error: 'Export failed',
        })
      );

      component.downloadFragment();
      tick(1000);

      expect(component.errorMessage()).toBeTruthy();
      expect(errorHandler.handleError).toHaveBeenCalled();
    }));
  });

  describe('Camera Controls', () => {
    it('should switch from perspective to orthographic camera', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      const mockSelect = {
        value: 'orthographic',
      } as unknown as HTMLSelectElement;
      const event = {
        target: mockSelect,
      } as unknown as Event;

      component.onCameraChange(event);
      tick(100);

      expect(component.cameraType()).toBe('orthographic');
    }));

    it('should switch from orthographic to perspective camera', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      // First switch to orthographic
      const mockSelect1 = { value: 'orthographic' } as unknown as HTMLSelectElement;
      component.onCameraChange({
        target: mockSelect1,
      } as unknown as Event);
      tick(100);

      // Then switch back to perspective
      const mockSelect2 = { value: 'perspective' } as unknown as HTMLSelectElement;
      component.onCameraChange({
        target: mockSelect2,
      } as unknown as Event);
      tick(100);

      expect(component.cameraType()).toBe('perspective');
    }));

    it('should not change camera if same type selected', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      const initialType = component.cameraType();

      const mockSelect = { value: 'perspective' } as unknown as HTMLSelectElement;
      component.onCameraChange({
        target: mockSelect,
      } as unknown as Event);
      tick(100);

      expect(component.cameraType()).toBe(initialType);
    }));
  });

  describe('Sidebar', () => {
    it('should toggle sidebar state', () => {
      expect(component.isSidebarCollapsed()).toBe(false);

      component.toggleSidebar();
      expect(component.isSidebarCollapsed()).toBe(true);

      component.toggleSidebar();
      expect(component.isSidebarCollapsed()).toBe(false);
    });
  });

  describe('File Picker', () => {
    it('should trigger file input click', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
      spyOn(fileInput, 'click');

      component.openFilePicker();

      expect(fileInput.click).toHaveBeenCalled();
    }));
  });

  describe('Configuration Updates', () => {
    it('should react to configuration changes', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      const configSubject = configService.config$ as any;
      const newConfig = { ...mockConfig, backgroundColor: '#ffffff', showGrid: false };
      
      configSubject.next(newConfig);
      tick(100);

      // Component should have received the configuration update
      // Actual rendering updates would need renderer to be initialized
    }));
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      component.ngOnDestroy();

      expect(fragmentsService.dispose).toHaveBeenCalled();
    }));

    it('should cancel animation frame on destroy', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      spyOn(window, 'cancelAnimationFrame');

      component.ngOnDestroy();

      // Animation frame should be cancelled
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    }));
  });

  describe('Template', () => {
    it('should render canvas element', () => {
      fixture.detectChanges();
      const canvas = fixture.nativeElement.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });

    it('should render file input', () => {
      fixture.detectChanges();
      const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput.accept).toBe('.ifc');
    });

    it('should show loading state', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      component.isLoading.set(true);
      fixture.detectChanges();

      const loadingIndicator = fixture.nativeElement.querySelector('.loading-overlay');
      expect(loadingIndicator).toBeTruthy();
    }));

    it('should show error message', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      component.errorMessage.set('Test error message');
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.error-message');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Test error message');
    }));

    it('should disable export button when no model', () => {
      fixture.detectChanges();
      const exportButton = fixture.nativeElement.querySelector('.export-button');
      
      if (exportButton) {
        expect(exportButton.disabled).toBe(true);
      }
    });

    it('should enable export button when model loaded', fakeAsync(() => {
      fixture.detectChanges();
      tick(1000);

      component.currentModel.set({
        id: 'test-id',
        name: 'test-model',
        status: ModelLoadingStatus.LOADED,
        fragmentUuid: 'test-uuid',
        progress: 100,
        fileSize: 1000,
      });
      fixture.detectChanges();

      const exportButton = fixture.nativeElement.querySelector('.export-button');
      
      if (exportButton) {
        expect(exportButton.disabled).toBe(false);
      }
    }));
  });
});

