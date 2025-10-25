import { showFeedback } from './ui-feedback.js';

export const ErrorType = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  DATABASE: 'database',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

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

export function withErrorHandling(asyncFn, context = '') {
  return async function(...args) {
    try {
      return await asyncFn.apply(this, args);
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  };
}

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

export function safeJSONParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logError(error, { context: 'JSON parse failed', input: jsonString });
    return fallback;
  }
}

export function withTimeout(promise, timeoutMs = 30000, timeoutMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}

export function initGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    logError(new Error(event.reason), {
      context: 'Unhandled promise rejection',
      promise: event.promise
    });
  });
  
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      context: 'Global error handler',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
  
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

export function getStoredErrors() {
  try {
    return JSON.parse(localStorage.getItem('app_errors') || '[]');
  } catch {
    return [];
  }
}

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
