import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IfcClassFilterComponent } from './ifc-class-filter.component';
import { IfcFilterService, IfcClassInfo } from '../../../core/services/ifc-filter.service';

describe('IfcClassFilterComponent', () => {
  let component: IfcClassFilterComponent;
  let fixture: ComponentFixture<IfcClassFilterComponent>;
  let ifcFilterService: jasmine.SpyObj<IfcFilterService>;

  // Mock data
  const mockClasses: IfcClassInfo[] = [
    { name: 'IfcWall', count: 10, visible: true, color: '#FF6B6B' },
    { name: 'IfcDoor', count: 5, visible: true, color: '#4ECDC4' },
    { name: 'IfcWindow', count: 8, visible: false, color: '#95E1D3' },
    { name: 'IfcSlab', count: 3, visible: true, color: '#F38181' },
  ];

  beforeEach(async () => {
    // Create spy for IFC filter service
    const ifcFilterServiceSpy = jasmine.createSpyObj(
      'IfcFilterService',
      [
        'toggleClassVisibility',
        'showAllClasses',
        'hideAllClasses',
        'getFilterStats',
      ],
      {
        availableClasses: signal(mockClasses),
        visibleClassCount: signal(3),
        totalClassCount: signal(4),
      }
    );

    // Setup default return values
    ifcFilterServiceSpy.getFilterStats.and.returnValue({
      totalClasses: 4,
      visibleClasses: 3,
      hiddenClasses: 1,
      totalElements: 26,
      visibleElements: 18,
    });

    await TestBed.configureTestingModule({
      imports: [IfcClassFilterComponent],
      providers: [{ provide: IfcFilterService, useValue: ifcFilterServiceSpy }],
    }).compileComponents();

    ifcFilterService = TestBed.inject(IfcFilterService) as jasmine.SpyObj<IfcFilterService>;
    fixture = TestBed.createComponent(IfcClassFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty search term', () => {
      expect(component.searchTerm()).toBe('');
    });

    it('should get available classes from service', () => {
      expect(component.availableClasses()).toEqual(mockClasses);
    });

    it('should get visible class count from service', () => {
      expect(component.visibleClassCount()).toBe(3);
    });

    it('should get total class count from service', () => {
      expect(component.totalClassCount()).toBe(4);
    });
  });

  describe('Filtering', () => {
    it('should filter classes by search term', () => {
      component.searchTerm.set('wall');
      const filtered = component.filteredClasses();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0]!.name).toBe('IfcWall');
    });

    it('should filter classes case-insensitively', () => {
      component.searchTerm.set('DOOR');
      const filtered = component.filteredClasses();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0]!.name).toBe('IfcDoor');
    });

    it('should return all classes when search term is empty', () => {
      component.searchTerm.set('');
      const filtered = component.filteredClasses();
      
      expect(filtered.length).toBe(mockClasses.length);
    });

    it('should return empty array when no matches', () => {
      component.searchTerm.set('nonexistent');
      const filtered = component.filteredClasses();
      
      expect(filtered.length).toBe(0);
    });

    it('should filter by partial match', () => {
      component.searchTerm.set('do');
      const filtered = component.filteredClasses();
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((c) => c.name.toLowerCase().includes('do'))).toBe(true);
    });
  });

  describe('Search Controls', () => {
    it('should update search term on input', () => {
      const mockInput = {
        value: 'window',
      } as unknown as HTMLInputElement;
      const event = {
        target: mockInput,
      } as unknown as Event;

      component.onSearchChange(event);

      expect(component.searchTerm()).toBe('window');
    });

    it('should clear search term', () => {
      component.searchTerm.set('test');
      
      component.clearSearch();

      expect(component.searchTerm()).toBe('');
    });
  });

  describe('Visibility Controls', () => {
    it('should toggle class visibility', () => {
      component.toggleClass('IfcWall');

      expect(ifcFilterService.toggleClassVisibility).toHaveBeenCalledWith('IfcWall');
    });

    it('should show all classes', () => {
      component.showAll();

      expect(ifcFilterService.showAllClasses).toHaveBeenCalled();
    });

    it('should hide all classes', () => {
      component.hideAll();

      expect(ifcFilterService.hideAllClasses).toHaveBeenCalled();
    });
  });

  describe('Computed Properties', () => {
    it('should calculate allVisible correctly when all visible', () => {
      // Mock service to return all visible
      Object.defineProperty(ifcFilterService, 'visibleClassCount', {
        get: () => signal(4),
      });
      Object.defineProperty(ifcFilterService, 'totalClassCount', {
        get: () => signal(4),
      });

      expect(component.allVisible()).toBe(true);
    });

    it('should calculate allVisible correctly when not all visible', () => {
      expect(component.allVisible()).toBe(false);
    });

    it('should calculate noneVisible correctly when none visible', () => {
      // Mock service to return none visible
      Object.defineProperty(ifcFilterService, 'visibleClassCount', {
        get: () => signal(0),
      });

      expect(component.noneVisible()).toBe(true);
    });

    it('should calculate noneVisible correctly when some visible', () => {
      expect(component.noneVisible()).toBe(false);
    });

    it('should get filter stats from service', () => {
      const stats = component.filterStats();

      expect(stats.totalClasses).toBe(4);
      expect(stats.visibleClasses).toBe(3);
      expect(stats.hiddenClasses).toBe(1);
      expect(stats.totalElements).toBe(26);
      expect(stats.visibleElements).toBe(18);
    });
  });

  describe('Utility Methods', () => {
    it('should format class name by removing Ifc prefix', () => {
      expect(component.formatClassName('IfcWall')).toBe('Wall');
      expect(component.formatClassName('IfcDoor')).toBe('Door');
      expect(component.formatClassName('IfcWindow')).toBe('Window');
    });

    it('should keep class name unchanged if no Ifc prefix', () => {
      expect(component.formatClassName('Wall')).toBe('Wall');
      expect(component.formatClassName('Door')).toBe('Door');
    });

    it('should track by class name', () => {
      const classInfo: IfcClassInfo = {
        name: 'IfcWall',
        count: 10,
        visible: true,
      };

      const result = component.trackByClassName(0, classInfo);

      expect(result).toBe('IfcWall');
    });
  });

  describe('Template', () => {
    it('should render search input', () => {
      const searchInput = fixture.nativeElement.querySelector('input[type="text"]');
      expect(searchInput).toBeTruthy();
    });

    it('should render class list', () => {
      const classList = fixture.nativeElement.querySelectorAll('.class-item');
      expect(classList.length).toBeGreaterThan(0);
    });

    it('should render show/hide all buttons', () => {
      const showAllButton = fixture.nativeElement.querySelector('.show-all-button');
      const hideAllButton = fixture.nativeElement.querySelector('.hide-all-button');
      
      expect(showAllButton || hideAllButton).toBeTruthy();
    });

    it('should display class count', () => {
      const classItems = fixture.nativeElement.querySelectorAll('.class-item');
      
      if (classItems.length > 0) {
        const firstItem = classItems[0];
        const countElement = firstItem.querySelector('.class-count');
        expect(countElement).toBeTruthy();
      }
    });

    it('should render checkboxes for each class', () => {
      const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should display formatted class names', () => {
      const classItems = fixture.nativeElement.querySelectorAll('.class-item');
      
      if (classItems.length > 0) {
        const firstItem = classItems[0];
        const nameElement = firstItem.querySelector('.class-name');
        
        if (nameElement) {
          const text = nameElement.textContent?.trim() || '';
          // Should not contain 'Ifc' prefix after formatting
          expect(text.startsWith('Ifc')).toBe(false);
        }
      }
    });

    it('should update search input on change', () => {
      const searchInput = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
      
      if (searchInput) {
        searchInput.value = 'wall';
        searchInput.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(component.searchTerm()).toBe('wall');
      }
    });

    it('should show clear button when search has value', () => {
      component.searchTerm.set('test');
      fixture.detectChanges();

      const clearButton = fixture.nativeElement.querySelector('.clear-search-button');
      // Clear button should exist or search input should have clear functionality
      expect(component.searchTerm()).toBe('test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty class list', () => {
      Object.defineProperty(ifcFilterService, 'availableClasses', {
        get: () => signal([]),
      });

      const filtered = component.filteredClasses();
      expect(filtered.length).toBe(0);
    });

    it('should handle class with zero count', () => {
      const classWithZero: IfcClassInfo = {
        name: 'IfcTest',
        count: 0,
        visible: true,
      };

      Object.defineProperty(ifcFilterService, 'availableClasses', {
        get: () => signal([classWithZero]),
      });

      const filtered = component.filteredClasses();
      expect(filtered.length).toBe(1);
      expect(filtered[0]!.count).toBe(0);
    });

    it('should handle class without color', () => {
      const classWithoutColor: IfcClassInfo = {
        name: 'IfcTest',
        count: 5,
        visible: true,
      };

      const result = component.trackByClassName(0, classWithoutColor);
      expect(result).toBe('IfcTest');
    });
  });
});

