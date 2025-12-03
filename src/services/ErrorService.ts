/**
 * Error Service - Centralized Error Handling
 * Provides consistent error handling across the application
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: string;
}

export interface ErrorHandler {
  handle(error: AppError): void;
}

export class ErrorService {
  private static instance: ErrorService;
  private handlers: ErrorHandler[] = [];
  private errorLog: AppError[] = [];

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Register error handler
   */
  registerHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Unregister error handler
   */
  unregisterHandler(handler: ErrorHandler): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  /**
   * Create standardized error
   */
  createError(
    code: string,
    message: string,
    details?: any,
    context?: string
  ): AppError {
    const error: AppError = {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      context
    };

    // Log error
    this.logError(error);

    // Notify handlers
    this.notifyHandlers(error);

    return error;
  }

  /**
   * Handle service error
   */
  handleServiceError(
    operation: string,
    error: any,
    context?: string
  ): AppError {
    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';

    if (error instanceof Error) {
      message = error.message;
      
      // Categorize error types
      if (message.includes('network') || message.includes('fetch')) {
        code = 'NETWORK_ERROR';
      } else if (message.includes('timeout')) {
        code = 'TIMEOUT_ERROR';
      } else if (message.includes('validation')) {
        code = 'VALIDATION_ERROR';
      } else if (message.includes('not found')) {
        code = 'NOT_FOUND_ERROR';
      } else if (message.includes('unauthorized')) {
        code = 'UNAUTHORIZED_ERROR';
      } else if (message.includes('Supabase')) {
        code = 'DATABASE_ERROR';
      }
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && error.message) {
      message = error.message;
    }

    return this.createError(
      code,
      `${operation}: ${message}`,
      error,
      context
    );
  }

  /**
   * Handle validation error
   */
  handleValidationError(
    field: string,
    value: any,
    rule: string,
    context?: string
  ): AppError {
    return this.createError(
      'VALIDATION_ERROR',
      `Validation failed for ${field}: ${rule}`,
      { field, value, rule },
      context
    );
  }

  /**
   * Handle network error
   */
  handleNetworkError(
    url: string,
    status?: number,
    context?: string
  ): AppError {
    return this.createError(
      'NETWORK_ERROR',
      `Network request failed${status ? ` (${status})` : ''}: ${url}`,
      { url, status },
      context
    );
  }

  /**
   * Handle database error
   */
  handleDatabaseError(
    operation: string,
    error: any,
    context?: string
  ): AppError {
    return this.createError(
      'DATABASE_ERROR',
      `Database operation failed: ${operation}`,
      error,
      context
    );
  }

  /**
   * Log error to console and storage
   */
  private logError(error: AppError): void {
    console.error(`❌ [${error.code}] ${error.message}`, error.details);
    
    // Store in memory (keep last 100 errors)
    this.errorLog.unshift(error);
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(0, 100);
    }

    // Store in localStorage for debugging
    try {
      const storedErrors = JSON.parse(localStorage.getItem('jastiprijo_errors') || '[]');
      storedErrors.unshift(error);
      if (storedErrors.length > 50) {
        storedErrors.splice(50);
      }
      localStorage.setItem('jastiprijo_errors', JSON.stringify(storedErrors));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  }

  /**
   * Notify all registered handlers
   */
  private notifyHandlers(error: AppError): void {
    this.handlers.forEach(handler => {
      try {
        handler.handle(error);
      } catch (e) {
        console.error('Error handler failed:', e);
      }
    });
  }

  /**
   * Get error log
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    localStorage.removeItem('jastiprijo_errors');
  }

  /**
   * Get errors by code
   */
  getErrorsByCode(code: string): AppError[] {
    return this.errorLog.filter(error => error.code === code);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(0, count);
  }

  /**
   * Check if there are critical errors
   */
  hasCriticalErrors(): boolean {
    const criticalCodes = ['NETWORK_ERROR', 'DATABASE_ERROR', 'UNAUTHORIZED_ERROR'];
    return this.errorLog.some(error => criticalCodes.includes(error.code));
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { [code: string]: number } {
    const stats: { [code: string]: number } = {};
    
    this.errorLog.forEach(error => {
      stats[error.code] = (stats[error.code] || 0) + 1;
    });
    
    return stats;
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();

// Common error codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  UNAUTHORIZED_ERROR: 'UNAUTHORIZED_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// Error handler for UI notifications
export class ToastErrorHandler implements ErrorHandler {
  private toast: any;

  constructor(toast: any) {
    this.toast = toast;
  }

  handle(error: AppError): void {
    if (this.toast) {
      this.toast({
        title: this.getErrorTitle(error.code),
        description: error.message,
        variant: this.getErrorVariant(error.code)
      });
    }
  }

  private getErrorTitle(code: string): string {
    const titles: { [key: string]: string } = {
      NETWORK_ERROR: 'Koneksi Gagal',
      TIMEOUT_ERROR: 'Waktu Habis',
      VALIDATION_ERROR: 'Data Tidak Valid',
      NOT_FOUND_ERROR: 'Data Tidak Ditemukan',
      UNAUTHORIZED_ERROR: 'Akses Ditolak',
      DATABASE_ERROR: 'Database Error',
      STORAGE_ERROR: 'Storage Error',
      UNKNOWN_ERROR: 'Terjadi Kesalahan'
    };
    
    return titles[code] || 'Terjadi Kesalahan';
  }

  private getErrorVariant(code: string): 'default' | 'destructive' {
    const destructiveCodes = ['NETWORK_ERROR', 'DATABASE_ERROR', 'UNAUTHORIZED_ERROR'];
    return destructiveCodes.includes(code) ? 'destructive' : 'default';
  }
}




