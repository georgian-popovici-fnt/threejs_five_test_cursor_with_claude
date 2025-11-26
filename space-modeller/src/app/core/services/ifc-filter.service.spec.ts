import { TestBed } from '@angular/core/testing';
import { IfcFilterService, IfcClassInfo } from './ifc-filter.service';
import { FragmentsService } from './fragments.service';
import * as FRAGS from '@thatopen/fragments';

describe('IfcFilterService', () => {
  let service: IfcFilterService;
  let fragmentsService: jasmine.SpyObj<FragmentsService>;

  // Mock fragment model
  const createMockFragment = (fragmentId: string, className: string) => ({
    name: className,
    id: fragmentId,
    mesh: {
      visible: true,
    },
  });

  const createMockModel = (fragments: any[]) => {
    const fragmentMap = new Map();
    fragments.forEach((frag, index) => {
      fragmentMap.set(`fragment-${index}`, frag);
    });

    return {
      modelId: 'test-model-id',
      items: fragmentMap,
    };
  };

  beforeEach(() => {
    const fragmentsServiceSpy = jasmine.createSpyObj('FragmentsService', ['getModel']);

    TestBed.configureTestingModule({
      providers: [
        IfcFilterService,
        { provide: FragmentsService, useValue: fragmentsServiceSpy },
      ],
    });

    service = TestBed.inject(IfcFilterService);
    fragmentsService = TestBed.inject(FragmentsService) as jasmine.SpyObj<FragmentsService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty class map', () => {
      expect(service.ifcClasses().size).toBe(0);
      expect(service.availableClasses().length).toBe(0);
      expect(service.visibleClassCount()).toBe(0);
      expect(service.totalClassCount()).toBe(0);
    });
  });

  describe('extractClasses', () => {
    it('should extract classes from model', async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcWall'),
        createMockFragment('frag-2', 'IfcDoor'),
        createMockFragment('frag-3', 'IfcWindow'),
        createMockFragment('frag-4', 'IfcWall'), // Duplicate class
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      const classes = await service.extractClasses('test-model-id');

      expect(classes.length).toBe(3); // IfcWall, IfcDoor, IfcWindow
      expect(service.totalClassCount()).toBe(3);
    });

    it('should count elements per class', async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcWall'),
        createMockFragment('frag-2', 'IfcWall'),
        createMockFragment('frag-3', 'IfcWall'),
        createMockFragment('frag-4', 'IfcDoor'),
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      const classes = await service.extractClasses('test-model-id');

      const wallClass = classes.find((c) => c.name === 'IfcWall');
      const doorClass = classes.find((c) => c.name === 'IfcDoor');

      expect(wallClass?.count).toBe(3);
      expect(doorClass?.count).toBe(1);
    });

    it('should set IfcSpace as hidden by default', async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcSpace'),
        createMockFragment('frag-2', 'IfcWall'),
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      const classes = await service.extractClasses('test-model-id');

      const spaceClass = classes.find((c) => c.name === 'IfcSpace');
      const wallClass = classes.find((c) => c.name === 'IfcWall');

      expect(spaceClass?.visible).toBe(false);
      expect(wallClass?.visible).toBe(true);
    });

    it('should assign colors to classes', async () => {
      const mockFragments = [createMockFragment('frag-1', 'IfcWall')];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      const classes = await service.extractClasses('test-model-id');

      expect(classes[0]!.color).toBeDefined();
      expect(classes[0]!.color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should handle model not found', async () => {
      fragmentsService.getModel.and.returnValue(undefined);

      const classes = await service.extractClasses('nonexistent-id');

      expect(classes.length).toBe(0);
    });

    it('should handle empty model', async () => {
      const emptyModel = {
        modelId: 'empty-model',
        items: new Map(),
      };

      fragmentsService.getModel.and.returnValue(emptyModel as any);

      const classes = await service.extractClasses('empty-model');

      expect(classes.length).toBe(0);
    });

    it('should handle fragments without IFC class', async () => {
      const mockFragments = [
        {
          name: 'unknown-fragment',
          id: 'frag-1',
          mesh: { visible: true },
        },
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      const classes = await service.extractClasses('test-model-id');

      // Should fall back to 'IfcElement' for unknown classes
      expect(classes.length).toBeGreaterThan(0);
    });
  });

  describe('toggleClassVisibility', () => {
    beforeEach(async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcWall'),
        createMockFragment('frag-2', 'IfcWall'),
        createMockFragment('frag-3', 'IfcDoor'),
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      await service.extractClasses('test-model-id');
    });

    it('should toggle visibility from visible to hidden', () => {
      const wallClass = service.ifcClasses().get('IfcWall');
      expect(wallClass?.visible).toBe(true);

      service.toggleClassVisibility('IfcWall');

      const updatedWallClass = service.ifcClasses().get('IfcWall');
      expect(updatedWallClass?.visible).toBe(false);
    });

    it('should toggle visibility from hidden to visible', () => {
      // First hide it
      service.toggleClassVisibility('IfcWall');
      
      // Then show it again
      service.toggleClassVisibility('IfcWall');

      const wallClass = service.ifcClasses().get('IfcWall');
      expect(wallClass?.visible).toBe(true);
    });

    it('should update visible class count', () => {
      const initialCount = service.visibleClassCount();

      service.toggleClassVisibility('IfcWall');

      expect(service.visibleClassCount()).toBe(initialCount - 1);

      service.toggleClassVisibility('IfcWall');

      expect(service.visibleClassCount()).toBe(initialCount);
    });

    it('should handle non-existent class', () => {
      expect(() => {
        service.toggleClassVisibility('NonExistentClass');
      }).not.toThrow();
    });
  });

  describe('setClassVisibility', () => {
    beforeEach(async () => {
      const mockFragments = [createMockFragment('frag-1', 'IfcWall')];
      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      await service.extractClasses('test-model-id');
    });

    it('should set visibility to hidden', () => {
      service.setClassVisibility('IfcWall', false);

      const wallClass = service.ifcClasses().get('IfcWall');
      expect(wallClass?.visible).toBe(false);
    });

    it('should set visibility to visible', () => {
      service.setClassVisibility('IfcWall', false);
      service.setClassVisibility('IfcWall', true);

      const wallClass = service.ifcClasses().get('IfcWall');
      expect(wallClass?.visible).toBe(true);
    });

    it('should not change if already at target state', () => {
      const initialState = service.ifcClasses();

      service.setClassVisibility('IfcWall', true); // Already visible

      expect(service.ifcClasses()).toBe(initialState);
    });
  });

  describe('showAllClasses', () => {
    beforeEach(async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcWall'),
        createMockFragment('frag-2', 'IfcDoor'),
        createMockFragment('frag-3', 'IfcWindow'),
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      await service.extractClasses('test-model-id');

      // Hide some classes
      service.setClassVisibility('IfcWall', false);
      service.setClassVisibility('IfcDoor', false);
    });

    it('should make all classes visible', () => {
      service.showAllClasses();

      const classes = Array.from(service.ifcClasses().values());
      const allVisible = classes.every((c) => c.visible);

      expect(allVisible).toBe(true);
    });

    it('should update visible class count to total', () => {
      service.showAllClasses();

      expect(service.visibleClassCount()).toBe(service.totalClassCount());
    });
  });

  describe('hideAllClasses', () => {
    beforeEach(async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcWall'),
        createMockFragment('frag-2', 'IfcDoor'),
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      await service.extractClasses('test-model-id');
    });

    it('should make all classes hidden', () => {
      service.hideAllClasses();

      const classes = Array.from(service.ifcClasses().values());
      const allHidden = classes.every((c) => !c.visible);

      expect(allHidden).toBe(true);
    });

    it('should update visible class count to zero', () => {
      service.hideAllClasses();

      expect(service.visibleClassCount()).toBe(0);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      const mockFragments = [createMockFragment('frag-1', 'IfcWall')];
      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      await service.extractClasses('test-model-id');
    });

    it('should clear all state', () => {
      service.clear();

      expect(service.ifcClasses().size).toBe(0);
      expect(service.availableClasses().length).toBe(0);
      expect(service.visibleClassCount()).toBe(0);
      expect(service.totalClassCount()).toBe(0);
    });
  });

  describe('getFilterStats', () => {
    beforeEach(async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcWall'),
        createMockFragment('frag-2', 'IfcWall'),
        createMockFragment('frag-3', 'IfcDoor'),
        createMockFragment('frag-4', 'IfcWindow'),
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      await service.extractClasses('test-model-id');

      // Hide one class
      service.setClassVisibility('IfcWindow', false);
    });

    it('should return correct statistics', () => {
      const stats = service.getFilterStats();

      expect(stats.totalClasses).toBe(3);
      expect(stats.visibleClasses).toBe(2);
      expect(stats.hiddenClasses).toBe(1);
      expect(stats.totalElements).toBe(4);
      expect(stats.visibleElements).toBe(3); // 2 walls + 1 door
    });

    it('should return zero stats for empty state', () => {
      service.clear();
      const stats = service.getFilterStats();

      expect(stats.totalClasses).toBe(0);
      expect(stats.visibleClasses).toBe(0);
      expect(stats.hiddenClasses).toBe(0);
      expect(stats.totalElements).toBe(0);
      expect(stats.visibleElements).toBe(0);
    });
  });

  describe('availableClasses computed', () => {
    it('should return sorted classes by name', async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcWindow'),
        createMockFragment('frag-2', 'IfcDoor'),
        createMockFragment('frag-3', 'IfcWall'),
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      await service.extractClasses('test-model-id');

      const classes = service.availableClasses();
      const names = classes.map((c) => c.name);

      expect(names).toEqual(['IfcDoor', 'IfcWall', 'IfcWindow']);
    });
  });

  describe('Color Assignment', () => {
    it('should assign predefined colors to known classes', async () => {
      const mockFragments = [
        createMockFragment('frag-1', 'IfcWall'),
        createMockFragment('frag-2', 'IfcDoor'),
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      const classes = await service.extractClasses('test-model-id');

      const wallClass = classes.find((c) => c.name === 'IfcWall');
      const doorClass = classes.find((c) => c.name === 'IfcDoor');

      expect(wallClass?.color).toBe('#FF6B6B');
      expect(doorClass?.color).toBe('#4ECDC4');
    });

    it('should assign default color to unknown classes', async () => {
      const mockFragments = [createMockFragment('frag-1', 'IfcUnknownClass')];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      const classes = await service.extractClasses('test-model-id');

      expect(classes[0]!.color).toBe('#7F8C8D');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extraction error gracefully', async () => {
      fragmentsService.getModel.and.throwError('Test error');

      const classes = await service.extractClasses('test-model-id');

      expect(classes.length).toBe(0);
    });

    it('should handle model without items property', async () => {
      const invalidModel = {
        modelId: 'invalid-model',
      };

      fragmentsService.getModel.and.returnValue(invalidModel as any);

      const classes = await service.extractClasses('invalid-model');

      expect(classes.length).toBe(0);
    });

    it('should handle fragments with null mesh', async () => {
      const mockFragments = [
        {
          name: 'IfcWall',
          id: 'frag-1',
          mesh: null,
        },
      ];

      const mockModel = createMockModel(mockFragments);
      fragmentsService.getModel.and.returnValue(mockModel as any);

      expect(async () => {
        await service.extractClasses('test-model-id');
      }).not.toThrow();
    });
  });
});

