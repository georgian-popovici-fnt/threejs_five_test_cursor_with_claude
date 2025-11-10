import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/ifc-viewer/ifc-viewer.component').then((m) => m.IfcViewerComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
