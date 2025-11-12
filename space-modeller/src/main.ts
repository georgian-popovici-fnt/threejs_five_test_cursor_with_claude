import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

/**
 * Application entry point
 * 
 * Bootstraps the Angular application with the root component and configuration.
 * Enables production mode optimizations when appropriate.
 */

// Enable production mode if in production environment
if (environment.production) {
  console.log('🚀 Running in production mode');
} else {
  console.log('🔧 Running in development mode');
}

// Bootstrap application
bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('✅ Application bootstrapped successfully');
  })
  .catch((err) => {
    console.error('❌ Failed to bootstrap application:', err);
  });
