import { Injectable, inject, ErrorHandler as AngularErrorHandler } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Structured error interface
 */
export interface AppError {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

/**
 * Error handling service for application-wide error management
 * Provides structured error logging, notifications, and reporting
 * 
 * @example
 * ```typescript
 * constructor(private errorHandler: ErrorHandlerService) {}
 * 
 * try {
 *   // risky operation
 * } catch (error) {
 *   this.errorHandler.handleError(error, ErrorSeverity.ERROR, {
 *     operation: 'loadModel',
 *     modelId: 'abc123'
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private readonly errors$ = new BehaviorSubject<AppError[]>([]);
  private readonly MAX_STORED_ERRORS = 50;

  /**
   * Observable stream of all errors
   */
  get errors(): Observable<AppError[]> {
    return this.errors$.asObservable();
  }

  /**
   * Get the latest error
   */
  get latestError(): AppError | null {
    const errors = this.errors$.value;
    return errors.length > 0 ? errors[0] : null;
  }

  /**
   * Handle an error with optional context
   * @param error - The error to handle (Error object, string, or unknown)
   * @param severity - Severity level of the error
   * @param context - Additional context information
   */
  handleError(
    error: unknown,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context?: Record<string, unknown>
  ): void {
    const appError = this.createAppError(error, severity, context);
    this.logError(appError);
    this.addToErrorList(appError);
  }

  /**
   * Create a structured AppError from an unknown error
   */
  private createAppError(
    error: unknown,
    severity: ErrorSeverity,
    context?: Record<string, unknown>
  ): AppError {
    const id = this.generateErrorId();
    const timestamp = new Date();

    if (error instanceof Error) {
      return {
        id,
        timestamp,
        severity,
        message: error.message,
        details: error.name,
        stack: error.stack,
        context,
      };
    }

    if (typeof error === 'string') {
      return {
        id,
        timestamp,
        severity,
        message: error,
        context,
      };
    }

    return {
      id,
      timestamp,
      severity,
      message: 'An unknown error occurred',
      details: JSON.stringify(error),
      context,
    };
  }

  /**
   * Log error to console with appropriate severity
   */
  private logError(appError: AppError): void {
    const logMessage = `[${appError.severity.toUpperCase()}] ${appError.message}`;
    const logData = {
      id: appError.id,
      timestamp: appError.timestamp.toISOString(),
      details: appError.details,
      context: appError.context,
    };

    switch (appError.severity) {
      case ErrorSeverity.INFO:
        console.info(logMessage, logData);
        break;
      case ErrorSeverity.WARNING:
        console.warn(logMessage, logData);
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, logData);
        if (appError.stack) {
          console.error('Stack trace:', appError.stack);
        }
        break;
    }
  }

  /**
   * Add error to the stored error list
   */
  private addToErrorList(appError: AppError): void {
    const currentErrors = this.errors$.value;
    const newErrors = [appError, ...currentErrors].slice(0, this.MAX_STORED_ERRORS);
    this.errors$.next(newErrors);
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clear all stored errors
   */
  clearErrors(): void {
    this.errors$.next([]);
  }

  /**
   * Clear a specific error by ID
   */
  clearError(errorId: string): void {
    const currentErrors = this.errors$.value;
    const filteredErrors = currentErrors.filter((err) => err.id !== errorId);
    this.errors$.next(filteredErrors);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors$.value.filter((err) => err.severity === severity);
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.errors$.value.some((err) => err.severity === ErrorSeverity.CRITICAL);
  }
}

/**
 * Global error handler for Angular
 * Catches uncaught errors and routes them through ErrorHandlerService
 */
@Injectable()
export class GlobalErrorHandler implements AngularErrorHandler {
  private readonly errorHandlerService = inject(ErrorHandlerService);

  handleError(error: unknown): void {
    this.errorHandlerService.handleError(error, ErrorSeverity.CRITICAL, {
      source: 'GlobalErrorHandler',
    });
  }
}

