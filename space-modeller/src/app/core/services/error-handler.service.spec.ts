import { TestBed } from '@angular/core/testing';
import { ErrorHandlerService, ErrorSeverity, AppError } from './error-handler.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorHandlerService],
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError', () => {
    it('should handle Error objects', (done) => {
      const error = new Error('Test error');
      
      service.errors.subscribe((errors) => {
        if (errors.length > 0) {
          expect(errors[0].message).toBe('Test error');
          expect(errors[0].severity).toBe(ErrorSeverity.ERROR);
          done();
        }
      });

      service.handleError(error, ErrorSeverity.ERROR);
    });

    it('should handle string errors', (done) => {
      const errorMessage = 'String error';
      
      service.errors.subscribe((errors) => {
        if (errors.length > 0) {
          expect(errors[0].message).toBe(errorMessage);
          done();
        }
      });

      service.handleError(errorMessage, ErrorSeverity.WARNING);
    });

    it('should handle unknown errors', (done) => {
      const error = { unknown: 'object' };
      
      service.errors.subscribe((errors) => {
        if (errors.length > 0) {
          expect(errors[0].message).toBe('An unknown error occurred');
          done();
        }
      });

      service.handleError(error);
    });

    it('should include context information', (done) => {
      const context = { operation: 'test', userId: '123' };
      
      service.errors.subscribe((errors) => {
        if (errors.length > 0) {
          expect(errors[0].context).toEqual(context);
          done();
        }
      });

      service.handleError('Error with context', ErrorSeverity.INFO, context);
    });

    it('should assign unique IDs to errors', () => {
      service.handleError('Error 1');
      service.handleError('Error 2');
      
      const errors = service['errors$'].value;
      expect(errors[0].id).not.toBe(errors[1].id);
    });

    it('should include timestamp', () => {
      const before = new Date();
      service.handleError('Timed error');
      const after = new Date();
      
      const error = service.latestError;
      expect(error).toBeTruthy();
      expect(error!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('error storage', () => {
    it('should store multiple errors', () => {
      service.handleError('Error 1');
      service.handleError('Error 2');
      service.handleError('Error 3');
      
      const errors = service['errors$'].value;
      expect(errors.length).toBe(3);
    });

    it('should limit stored errors', () => {
      const maxErrors = service['MAX_STORED_ERRORS'];
      
      // Add more than max
      for (let i = 0; i < maxErrors + 10; i++) {
        service.handleError(`Error ${i}`);
      }
      
      const errors = service['errors$'].value;
      expect(errors.length).toBe(maxErrors);
    });

    it('should store errors in reverse chronological order', () => {
      service.handleError('First');
      service.handleError('Second');
      service.handleError('Third');
      
      const errors = service['errors$'].value;
      expect(errors[0].message).toBe('Third');
      expect(errors[1].message).toBe('Second');
      expect(errors[2].message).toBe('First');
    });
  });

  describe('latestError', () => {
    it('should return null when no errors', () => {
      expect(service.latestError).toBeNull();
    });

    it('should return most recent error', () => {
      service.handleError('First');
      service.handleError('Latest');
      
      expect(service.latestError?.message).toBe('Latest');
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      service.handleError('Error 1');
      service.handleError('Error 2');
      
      service.clearErrors();
      
      const errors = service['errors$'].value;
      expect(errors.length).toBe(0);
    });
  });

  describe('clearError', () => {
    it('should clear specific error by ID', () => {
      service.handleError('Error 1');
      service.handleError('Error 2');
      
      const errors = service['errors$'].value;
      const idToRemove = errors[0].id;
      
      service.clearError(idToRemove);
      
      const remainingErrors = service['errors$'].value;
      expect(remainingErrors.length).toBe(1);
      expect(remainingErrors[0].id).not.toBe(idToRemove);
    });
  });

  describe('getErrorsBySeverity', () => {
    beforeEach(() => {
      service.handleError('Info error', ErrorSeverity.INFO);
      service.handleError('Warning error', ErrorSeverity.WARNING);
      service.handleError('Error 1', ErrorSeverity.ERROR);
      service.handleError('Error 2', ErrorSeverity.ERROR);
      service.handleError('Critical error', ErrorSeverity.CRITICAL);
    });

    it('should filter errors by INFO severity', () => {
      const infoErrors = service.getErrorsBySeverity(ErrorSeverity.INFO);
      expect(infoErrors.length).toBe(1);
      expect(infoErrors[0].message).toBe('Info error');
    });

    it('should filter errors by WARNING severity', () => {
      const warnings = service.getErrorsBySeverity(ErrorSeverity.WARNING);
      expect(warnings.length).toBe(1);
    });

    it('should filter errors by ERROR severity', () => {
      const errors = service.getErrorsBySeverity(ErrorSeverity.ERROR);
      expect(errors.length).toBe(2);
    });

    it('should filter errors by CRITICAL severity', () => {
      const critical = service.getErrorsBySeverity(ErrorSeverity.CRITICAL);
      expect(critical.length).toBe(1);
    });
  });

  describe('hasCriticalErrors', () => {
    it('should return false when no critical errors', () => {
      service.handleError('Warning', ErrorSeverity.WARNING);
      expect(service.hasCriticalErrors()).toBe(false);
    });

    it('should return true when critical errors exist', () => {
      service.handleError('Critical', ErrorSeverity.CRITICAL);
      expect(service.hasCriticalErrors()).toBe(true);
    });
  });
});

