/**
 * Performance Utilities
 * Provides debouncing, throttling, and other performance optimization helpers
 */

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait before executing
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions (ms)
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Lazy load images when they enter viewport
 * Uses Intersection Observer for better performance
 */
export function initLazyLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          img.classList.add('lazy-loaded');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
    
    return imageObserver;
  } else {
    // Fallback for browsers without Intersection Observer
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
    });
  }
}

/**
 * Preload critical images
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export function preloadImages(imageUrls) {
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Request Idle Callback polyfill for non-critical tasks
 * @param {Function} callback - Function to run when idle
 * @param {Object} options - Options object
 */
export function requestIdleCallback(callback, options = {}) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  } else {
    // Fallback for browsers without requestIdleCallback
    return setTimeout(() => callback({
      didTimeout: false,
      timeRemaining: () => 50
    }), 1);
  }
}

/**
 * Optimize scroll event listeners
 * @param {Function} callback - Scroll handler function
 * @param {number} delay - Throttle delay in ms
 * @returns {Function} Cleanup function
 */
export function optimizedScrollListener(callback, delay = 100) {
  const throttledCallback = throttle(callback, delay);
  
  window.addEventListener('scroll', throttledCallback, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', throttledCallback);
  };
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Defer non-critical JavaScript execution
 * @param {Function} callback - Function to defer
 */
export function deferExecution(callback) {
  if (document.readyState === 'complete') {
    requestIdleCallback(callback);
  } else {
    window.addEventListener('load', () => {
      requestIdleCallback(callback);
    }, { once: true });
  }
}

/**
 * Performance monitoring helper
 * @param {string} mark - Performance mark name
 */
export function measurePerformance(mark) {
  if ('performance' in window && 'mark' in window.performance) {
    performance.mark(mark);
  }
}

/**
 * Get performance metrics
 * @returns {Object} Performance metrics
 */
export function getPerformanceMetrics() {
  if (!('performance' in window)) {
    return null;
  }
  
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  const connectTime = perfData.responseEnd - perfData.requestStart;
  const renderTime = perfData.domComplete - perfData.domLoading;
  
  return {
    pageLoadTime,
    connectTime,
    renderTime,
    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
    timeToInteractive: perfData.domInteractive - perfData.navigationStart
  };
}

/**
 * Log performance metrics to console (development only)
 */
export function logPerformanceMetrics() {
  deferExecution(() => {
    const metrics = getPerformanceMetrics();
    if (metrics && console.table) {
      console.log('📊 Performance Metrics:');
      console.table(metrics);
    }
  });
}

export default {
  debounce,
  throttle,
  initLazyLoading,
  preloadImages,
  requestIdleCallback,
  optimizedScrollListener,
  prefersReducedMotion,
  deferExecution,
  measurePerformance,
  getPerformanceMetrics,
  logPerformanceMetrics
};
