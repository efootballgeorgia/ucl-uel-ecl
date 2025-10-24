/**
 * Error Handling and Logging Utilities
 * Provides centralized error handling with user-friendly messages
 */

import { showFeedback } from './ui-feedback.js';

/**
 * Error types for categorization
 */
export const ErrorType = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  DATABASE: 'database',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

/**
 * Determine error type from error object
 * @param {Error} error
 * @returns {string} Error type
 */
function determineErrorType(error) {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return ErrorType.NETWORK;
  }
  if (message.includes('auth') || message.includes('login') || message.includes('token')) {
    return ErrorType.AUTH;
  }
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return ErrorType.VALIDATION;
  }
  if (message.includes('database') || message.includes('query') || message.includes('sql')) {
    return ErrorType.DATABASE;
  }
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorType.PERMISSION;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 * @param {Error} error
 * @param {string} context - Context where error occurred
 * @returns {string} User-friendly message
 */
export function getUserFriendlyMessage(error, context = '') {
  const errorType = determineErrorType(error);
  
  const messages = {
    [ErrorType.NETWORK]: 'Unable to connect to the server. Please check your internet connection and try again.',
    [ErrorType.AUTH]: 'Authentication failed. Please log in again.',
    [ErrorType.VALIDATION]: 'Please check your input and try again.',
    [ErrorType.DATABASE]: 'Unable to load data. Please try again later.',
    [ErrorType.PERMISSION]: 'You don\'t have permission to perform this action.',
    [ErrorType.UNKNOWN]: 'Something went wrong. Please try again.'
  };
  
  const baseMessage = messages[errorType];
  return context ? `${context}: ${baseMessage}` : baseMessage;
}

/**
 * Log error to console (development) and/or external service (production)
 * @param {Error} error
 * @param {Object} context - Additional context information
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    type: determineErrorType(error),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...context
  };
  
  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('🔴 Error occurred:', errorInfo);
  }
  
  // Send to error tracking service (e.g., Sentry) in production
  if (typeof window.Sentry !== 'undefined') {
    window.Sentry.captureException(error, {
      contexts: { custom: context }
    });
  }
  
  // Store in local storage for debugging (keep last 10 errors)
  storeErrorLocally(errorInfo);
}

/**
 * Store error in local storage for debugging
 * @param {Object} errorInfo
 */
function storeErrorLocally(errorInfo) {
  try {
    const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    errors.unshift(errorInfo);
    
    // Keep only last 10 errors
    if (errors.length > 10) {
      errors.length = 10;
    }
    
    localStorage.setItem('app_errors', JSON.stringify(errors));
  } catch (e) {
    // Silently fail if localStorage is not available
  }
}

/**
 * Handle error with logging and user feedback
 * @param {Error} error
 * @param {string} context - Context message
 * @param {boolean} showToUser - Whether to show feedback to user
 */
export function handleError(error, context = '', showToUser = true) {
  logError(error, { context });
  
  if (showToUser) {
    const message = getUserFriendlyMessage(error, context);
    if (typeof showFeedback === 'function') {
      showFeedback(message, false);
    } else {
      alert(message); // Fallback
    }
  }
}

/**
 * Async error wrapper - wraps async functions with error handling
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} context - Error context
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(asyncFn, context = '') {
  return async function(...args) {
    try {
      return await asyncFn.apply(this, args);
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw for caller to handle if needed
    }
  };
}

/**
 * Retry async operation with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} Result of operation
 */
export async function retryWithBackoff(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const waitTime = delay * Math.pow(2, i);
        console.log(`Retry attempt ${i + 1} after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

/**
 * Safe JSON parse with fallback
 * @param {string} jsonString
 * @param {*} fallback - Fallback value if parse fails
 * @returns {*} Parsed object or fallback
 */
export function safeJSONParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logError(error, { context: 'JSON parse failed', input: jsonString });
    return fallback;
  }
}

/**
 * Safe async operation with timeout
 * @param {Promise} promise
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} timeoutMessage - Custom timeout message
 * @returns {Promise}
 */
export function withTimeout(promise, timeoutMs = 30000, timeoutMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}

/**
 * Initialize global error handlers
 */
export function initGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    logError(new Error(event.reason), {
      context: 'Unhandled promise rejection',
      promise: event.promise
    });
  });
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      context: 'Global error handler',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
  
  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      logError(new Error(`Failed to load resource: ${event.target.src || event.target.href}`), {
        context: 'Resource loading error',
        tagName: event.target.tagName
      });
    }
  }, true);
  
  console.log('🛡️ Global error handlers initialized');
}

/**
 * Get stored errors for debugging
 * @returns {Array} Array of error objects
 */
export function getStoredErrors() {
  try {
    return JSON.parse(localStorage.getItem('app_errors') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear stored errors
 */
export function clearStoredErrors() {
  try {
    localStorage.removeItem('app_errors');
  } catch {
    // Silently fail
  }
}

export default {
  ErrorType,
  getUserFriendlyMessage,
  logError,
  handleError,
  withErrorHandling,
  retryWithBackoff,
  safeJSONParse,
  withTimeout,
  initGlobalErrorHandlers,
  getStoredErrors,
  clearStoredErrors
};
