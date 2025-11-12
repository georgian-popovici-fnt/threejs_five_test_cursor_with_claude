import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IfcFilterService, IfcClassInfo } from '../../../core/services/ifc-filter.service';

/**
 * IFC Class Filter Component
 * 
 * Displays a list of IFC classes with checkboxes to toggle visibility.
 * Shows element counts and provides bulk actions (show all / hide all).
 * 
 * Features:
 * - Checkbox list for each IFC class
 * - Element count per class
 * - Visual color indicators
 * - Bulk show/hide all actions
 * - Search/filter functionality
 * 
 * @example
 * ```html
 * <app-ifc-class-filter />
 * ```
 */
@Component({
  selector: 'app-ifc-class-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ifc-class-filter.component.html',
  styleUrls: ['./ifc-class-filter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IfcClassFilterComponent {
  private readonly ifcFilterService = inject(IfcFilterService);

  // State
  readonly searchTerm = signal<string>('');
  
  // Computed from service
  readonly availableClasses = this.ifcFilterService.availableClasses;
  readonly visibleClassCount = this.ifcFilterService.visibleClassCount;
  readonly totalClassCount = this.ifcFilterService.totalClassCount;

  // Filtered classes based on search
  readonly filteredClasses = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return this.availableClasses();
    }
    return this.availableClasses().filter(c => 
      c.name.toLowerCase().includes(term)
    );
  });

  // Check if all classes are visible
  readonly allVisible = computed(() => 
    this.visibleClassCount() === this.totalClassCount() && this.totalClassCount() > 0
  );

  // Check if no classes are visible
  readonly noneVisible = computed(() => 
    this.visibleClassCount() === 0 && this.totalClassCount() > 0
  );

  // Statistics
  readonly filterStats = computed(() => 
    this.ifcFilterService.getFilterStats()
  );

  /**
   * Toggle visibility of a specific IFC class
   */
  toggleClass(className: string): void {
    this.ifcFilterService.toggleClassVisibility(className);
  }

  /**
   * Show all IFC classes
   */
  showAll(): void {
    this.ifcFilterService.showAllClasses();
  }

  /**
   * Hide all IFC classes
   */
  hideAll(): void {
    this.ifcFilterService.hideAllClasses();
  }

  /**
   * Update search term
   */
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchTerm.set('');
  }

  /**
   * Format class name for display (remove 'Ifc' prefix)
   */
  formatClassName(name: string): string {
    return name.replace(/^Ifc/, '');
  }

  /**
   * Track by function for ngFor performance
   */
  trackByClassName(index: number, item: IfcClassInfo): string {
    return item.name;
  }
}

