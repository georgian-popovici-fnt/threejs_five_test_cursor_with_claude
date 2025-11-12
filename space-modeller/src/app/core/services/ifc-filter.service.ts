import { Injectable, inject, signal, computed } from '@angular/core';
import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import { FragmentsService } from './fragments.service';

/**
 * IFC Class information
 */
export interface IfcClassInfo {
  /** IFC class name (e.g., IfcWall, IfcDoor, IfcWindow) */
  name: string;
  /** Number of elements of this class */
  count: number;
  /** Whether this class is currently visible */
  visible: boolean;
  /** Color for visualization (optional) */
  color?: string;
}

/**
 * Service for managing IFC class filtering and visibility
 * 
 * Features:
 * - Extract IFC classes from loaded fragments
 * - Toggle visibility of specific IFC classes
 * - Manage filter state
 * 
 * @example
 * ```typescript
 * constructor(private ifcFilterService: IfcFilterService) {}
 * 
 * // Extract classes after loading model
 * await this.ifcFilterService.extractClasses(modelId);
 * 
 * // Toggle visibility
 * this.ifcFilterService.toggleClassVisibility('IfcWall');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class IfcFilterService {
  private readonly fragmentsService = inject(FragmentsService);

  // State
  private currentModelId: string | null = null;
  private fragmentClassMap = new Map<string, string>(); // fragmentId -> className
  
  // Signals for reactive state
  readonly ifcClasses = signal<Map<string, IfcClassInfo>>(new Map());
  readonly availableClasses = computed(() => 
    Array.from(this.ifcClasses().values()).sort((a, b) => a.name.localeCompare(b.name))
  );
  readonly visibleClassCount = computed(() => 
    Array.from(this.ifcClasses().values()).filter(c => c.visible).length
  );
  readonly totalClassCount = computed(() => this.ifcClasses().size);

  /**
   * Extract IFC classes from a loaded model
   * @param modelId - Fragment model UUID
   * @returns Array of discovered IFC classes
   */
  async extractClasses(modelId: string): Promise<IfcClassInfo[]> {
    try {
      console.log('🔍 Extracting IFC classes from model:', modelId);
      
      this.currentModelId = modelId;
      this.fragmentClassMap.clear();

      const model = this.fragmentsService.getModel(modelId);
      if (!model) {
        console.warn('Model not found:', modelId);
        return [];
      }

      const classMap = new Map<string, IfcClassInfo>();

      // Access fragments from model
      const modelAny = model as any;
      
      if (modelAny.items && typeof modelAny.items.forEach === 'function') {
        console.log(`📦 Processing ${modelAny.items.size || 0} fragments for class extraction...`);

        modelAny.items.forEach((fragment: any, fragmentId: string) => {
          // Try to extract IFC class from fragment
          const ifcClass = this.extractIfcClassFromFragment(fragment, fragmentId);
          
          if (ifcClass) {
            this.fragmentClassMap.set(fragmentId, ifcClass);
            
            // Update or create class info
            if (classMap.has(ifcClass)) {
              const info = classMap.get(ifcClass)!;
              info.count++;
            } else {
              classMap.set(ifcClass, {
                name: ifcClass,
                count: 1,
                visible: true, // Default to visible
                color: this.getClassColor(ifcClass),
              });
            }
          }
        });
      }

      // Update signal
      this.ifcClasses.set(classMap);

      const classes = Array.from(classMap.values());
      console.log(`✅ Found ${classes.length} unique IFC classes:`, 
        classes.map(c => `${c.name} (${c.count})`).join(', ')
      );

      return classes;
    } catch (error) {
      console.error('❌ Failed to extract IFC classes:', error);
      return [];
    }
  }

  /**
   * Extract IFC class name from a fragment
   * @param fragment - Fragment object
   * @param fragmentId - Fragment ID
   * @returns IFC class name or null
   */
  private extractIfcClassFromFragment(fragment: any, fragmentId: string): string | null {
    try {
      // Method 1: Check fragment.name (common in ThatOpen Components)
      if (fragment.name && typeof fragment.name === 'string') {
        // Sometimes the name is like "IfcWall" or contains the class name
        const match = fragment.name.match(/Ifc[A-Z][a-zA-Z]*/);
        if (match) {
          return match[0];
        }
      }

      // Method 2: Check fragment.id or fragment.expressID
      if (fragment.id && typeof fragment.id === 'string') {
        const match = fragment.id.match(/Ifc[A-Z][a-zA-Z]*/);
        if (match) {
          return match[0];
        }
      }

      // Method 3: Check mesh userData
      if (fragment.mesh && fragment.mesh.userData) {
        const userData = fragment.mesh.userData;
        
        if (userData.ifcClass) {
          return userData.ifcClass;
        }
        if (userData.type && typeof userData.type === 'string') {
          const match = userData.type.match(/Ifc[A-Z][a-zA-Z]*/);
          if (match) {
            return match[0];
          }
        }
        if (userData.name && typeof userData.name === 'string') {
          const match = userData.name.match(/Ifc[A-Z][a-zA-Z]*/);
          if (match) {
            return match[0];
          }
        }
      }

      // Method 4: Check fragment.types (ThatOpen specific)
      if (fragment.types && fragment.types.size > 0) {
        // Get the first type as a representative
        const firstType = Array.from(fragment.types.values())[0];
        if (typeof firstType === 'string') {
          const match = firstType.match(/Ifc[A-Z][a-zA-Z]*/);
          if (match) {
            return match[0];
          }
        }
      }

      // Method 5: Check fragment.fragments map (if it exists)
      if (fragment.fragments && typeof fragment.fragments === 'object') {
        const keys = Object.keys(fragment.fragments);
        if (keys.length > 0) {
          const match = keys[0].match(/Ifc[A-Z][a-zA-Z]*/);
          if (match) {
            return match[0];
          }
        }
      }

      // Default: try to extract from fragmentId itself
      if (fragmentId && typeof fragmentId === 'string') {
        const match = fragmentId.match(/Ifc[A-Z][a-zA-Z]*/);
        if (match) {
          return match[0];
        }
      }

      // If no IFC class found, return generic
      return 'IfcElement';
    } catch (error) {
      console.warn(`Failed to extract IFC class from fragment ${fragmentId}:`, error);
      return 'IfcElement';
    }
  }

  /**
   * Get a color for an IFC class (for visualization)
   * @param className - IFC class name
   * @returns Hex color string
   */
  private getClassColor(className: string): string {
    const colorMap: Record<string, string> = {
      IfcWall: '#FF6B6B',
      IfcWallStandardCase: '#FF6B6B',
      IfcDoor: '#4ECDC4',
      IfcWindow: '#95E1D3',
      IfcSlab: '#F38181',
      IfcRoof: '#AA96DA',
      IfcStair: '#FCBAD3',
      IfcColumn: '#A8E6CF',
      IfcBeam: '#FFD3B6',
      IfcSpace: '#FFAAA5',
      IfcFurniture: '#F9CA24',
      IfcCovering: '#BDC3C7',
      IfcRailing: '#74B9FF',
      IfcPlate: '#E67E22',
      IfcMember: '#9B59B6',
      IfcBuildingElementProxy: '#95A5A6',
    };

    return colorMap[className] || '#7F8C8D';
  }

  /**
   * Toggle visibility of a specific IFC class
   * @param className - IFC class name to toggle
   */
  toggleClassVisibility(className: string): void {
    const classInfo = this.ifcClasses().get(className);
    if (!classInfo) {
      console.warn('Class not found:', className);
      return;
    }

    const newVisible = !classInfo.visible;
    console.log(`🔄 Toggling ${className}: ${classInfo.visible} -> ${newVisible}`);

    // Update class info
    classInfo.visible = newVisible;
    this.ifcClasses.update(map => {
      map.set(className, { ...classInfo, visible: newVisible });
      return new Map(map);
    });

    // Apply visibility to all fragments of this class
    this.applyClassVisibility(className, newVisible);
  }

  /**
   * Set visibility for a specific IFC class
   * @param className - IFC class name
   * @param visible - Whether to show or hide
   */
  setClassVisibility(className: string, visible: boolean): void {
    const classInfo = this.ifcClasses().get(className);
    if (!classInfo || classInfo.visible === visible) {
      return;
    }

    console.log(`🔄 Setting ${className} visibility: ${visible}`);

    // Update class info
    classInfo.visible = visible;
    this.ifcClasses.update(map => {
      map.set(className, { ...classInfo, visible });
      return new Map(map);
    });

    // Apply visibility
    this.applyClassVisibility(className, visible);
  }

  /**
   * Show all IFC classes
   */
  showAllClasses(): void {
    console.log('👁️ Showing all IFC classes');
    this.ifcClasses().forEach((_, className) => {
      this.setClassVisibility(className, true);
    });
  }

  /**
   * Hide all IFC classes
   */
  hideAllClasses(): void {
    console.log('🙈 Hiding all IFC classes');
    this.ifcClasses().forEach((_, className) => {
      this.setClassVisibility(className, false);
    });
  }

  /**
   * Apply visibility to all fragments of a specific class
   * @param className - IFC class name
   * @param visible - Whether to show or hide
   */
  private applyClassVisibility(className: string, visible: boolean): void {
    if (!this.currentModelId) {
      return;
    }

    const model = this.fragmentsService.getModel(this.currentModelId);
    if (!model) {
      return;
    }

    const modelAny = model as any;
    let updatedCount = 0;

    if (modelAny.items && typeof modelAny.items.forEach === 'function') {
      modelAny.items.forEach((fragment: any, fragmentId: string) => {
        const fragmentClass = this.fragmentClassMap.get(fragmentId);
        
        if (fragmentClass === className && fragment.mesh) {
          fragment.mesh.visible = visible;
          updatedCount++;
        }
      });
    }

    console.log(`✓ Updated visibility for ${updatedCount} fragments of class ${className}`);
  }

  /**
   * Clear all filter state
   */
  clear(): void {
    console.log('🗑️ Clearing IFC filter state');
    this.currentModelId = null;
    this.fragmentClassMap.clear();
    this.ifcClasses.set(new Map());
  }

  /**
   * Get statistics about current filter state
   */
  getFilterStats(): {
    totalClasses: number;
    visibleClasses: number;
    hiddenClasses: number;
    totalElements: number;
    visibleElements: number;
  } {
    const classes = Array.from(this.ifcClasses().values());
    const visible = classes.filter(c => c.visible);
    const hidden = classes.filter(c => !c.visible);

    return {
      totalClasses: classes.length,
      visibleClasses: visible.length,
      hiddenClasses: hidden.length,
      totalElements: classes.reduce((sum, c) => sum + c.count, 0),
      visibleElements: visible.reduce((sum, c) => sum + c.count, 0),
    };
  }
}

