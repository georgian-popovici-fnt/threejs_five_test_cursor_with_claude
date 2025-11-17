import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import * as THREE from 'three';
import { OrientationCubeComponent } from './orientation-cube.component';

/**
 * Test host component that provides a camera input
 */
@Component({
  standalone: true,
  imports: [OrientationCubeComponent],
  template: `<app-orientation-cube [camera]="camera()" />`,
})
class TestHostComponent {
  readonly camera = signal(new THREE.PerspectiveCamera(75, 1, 0.1, 1000));
}

describe('OrientationCubeComponent', () => {
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;
  let component: OrientationCubeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, OrientationCubeComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    hostFixture.detectChanges();

    // Get the orientation cube component instance
    const debugElement = hostFixture.debugElement.children[0];
    component = debugElement?.componentInstance;
  });

  afterEach(() => {
    hostFixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept camera input', () => {
    expect(component.camera()).toBeDefined();
    expect(component.camera()).toBeInstanceOf(THREE.Camera);
  });

  it('should have a canvas element', () => {
    const canvas = hostFixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas?.classList.contains('orientation-cube-canvas')).toBe(true);
  });

  it('should be positioned fixed in top-right corner', () => {
    const hostElement = hostFixture.nativeElement.querySelector('app-orientation-cube');
    const styles = window.getComputedStyle(hostElement);
    
    expect(styles.position).toBe('fixed');
    expect(styles.top).toBe('16px');
    expect(styles.right).toBe('16px');
  });

  it('should have pointer-events none', () => {
    const hostElement = hostFixture.nativeElement.querySelector('app-orientation-cube');
    const styles = window.getComputedStyle(hostElement);
    
    expect(styles.pointerEvents).toBe('none');
  });

  it('should have correct dimensions', () => {
    const hostElement = hostFixture.nativeElement.querySelector('app-orientation-cube');
    const styles = window.getComputedStyle(hostElement);
    
    expect(styles.width).toBe('80px');
    expect(styles.height).toBe('80px');
  });

  it('should update when camera changes', () => {
    // Create a new camera with different orientation
    const newCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    newCamera.position.set(10, 10, 10);
    newCamera.lookAt(0, 0, 0);

    // Update the camera
    hostComponent.camera.set(newCamera);
    hostFixture.detectChanges();

    // Component should receive the new camera
    expect(component.camera()).toBe(newCamera);
  });

  it('should have aria-hidden on canvas for accessibility', () => {
    const canvas = hostFixture.nativeElement.querySelector('canvas');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should cleanup resources on destroy', () => {
    // Create spies on cleanup methods
    const disposeSpy = jasmine.createSpy('dispose');
    const forceContextLossSpy = jasmine.createSpy('forceContextLoss');
    
    // Access private renderer for testing
    const renderer = (component as any).renderer;
    if (renderer) {
      spyOn(renderer, 'dispose').and.callFake(disposeSpy);
      spyOn(renderer, 'forceContextLoss').and.callFake(forceContextLossSpy);
    }

    // Destroy the component
    hostFixture.destroy();

    // Verify cleanup was called
    if (renderer) {
      expect(disposeSpy).toHaveBeenCalled();
      expect(forceContextLossSpy).toHaveBeenCalled();
    }
  });
});

