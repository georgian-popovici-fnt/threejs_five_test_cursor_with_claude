import {
  ApplicationConfig,
  provideZoneChangeDetection,
  ErrorHandler,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/services/error-handler.service';

/**
 * Application configuration
 * 
 * Configures:
 * - Zone.js with event coalescing for better performance
 * - Routing with lazy loading
 * - Global error handler for uncaught errors
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Zone configuration with event coalescing for better performance
    provideZoneChangeDetection({ eventCoalescing: true }),
    
    // Router with lazy loading
    provideRouter(routes),
    
    // Global error handler
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
  ],
};
