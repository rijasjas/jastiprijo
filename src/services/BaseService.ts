/**
 * Base Service Class - Clean Architecture Foundation
 * Provides common functionality for all services
 */

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ServiceOptions {
  retries?: number;
  timeout?: number;
  fallback?: () => Promise<any>;
}

export abstract class BaseService {
  protected retries: number;
  protected timeout: number;

  constructor(options: ServiceOptions = {}) {
    this.retries = options.retries || 3;
    this.timeout = options.timeout || 10000;
  }

  /**
   * Execute operation with retry logic and error handling
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
    context?: string
  ): Promise<ServiceResponse<T>> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        console.log(`🔄 ${context || 'Operation'} - Attempt ${attempt}/${this.retries}`);
        
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise()
        ]);
        
        console.log(`✅ ${context || 'Operation'} - Success on attempt ${attempt}`);
        return {
          success: true,
          data: result,
          message: `Operation completed successfully`
        };
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${context || 'Operation'} - Attempt ${attempt} failed:`, error);
        
        if (attempt === this.retries) {
          // Last attempt failed, try fallback if available
          if (fallback) {
            try {
              console.log(`🔄 ${context || 'Operation'} - Trying fallback...`);
              const fallbackResult = await fallback();
              return {
                success: true,
                data: fallbackResult,
                message: `Operation completed using fallback`
              };
            } catch (fallbackError) {
              console.error(`❌ ${context || 'Operation'} - Fallback also failed:`, fallbackError);
            }
          }
          
          return {
            success: false,
            error: lastError.message,
            message: `Operation failed after ${this.retries} attempts`
          };
        }
        
        // Wait before retry (exponential backoff)
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      message: 'Operation failed'
    };
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.timeout}ms`));
      }, this.timeout);
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: any, fields: string[]): string[] {
    const missing: string[] = [];
    
    for (const field of fields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field);
      }
    }
    
    return missing;
  }

  /**
   * Sanitize data for database
   */
  protected sanitizeData(data: any): any {
    const sanitized = { ...data };
    
    // Remove undefined values
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    
    // Trim string values
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key].trim();
      }
    });
    
    return sanitized;
  }
}



