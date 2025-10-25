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

export function preloadImages(imageUrls) {
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

export function requestIdleCallback(callback, options = {}) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  } else {
    return setTimeout(() => callback({
      didTimeout: false,
      timeRemaining: () => 50
    }), 1);
  }
}

export function optimizedScrollListener(callback, delay = 100) {
  const throttledCallback = throttle(callback, delay);
  
  window.addEventListener('scroll', throttledCallback, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', throttledCallback);
  };
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function deferExecution(callback) {
  if (document.readyState === 'complete') {
    requestIdleCallback(callback);
  } else {
    window.addEventListener('load', () => {
      requestIdleCallback(callback);
    }, { once: true });
  }
}

export function measurePerformance(mark) {
  if ('performance' in window && 'mark' in window.performance) {
    performance.mark(mark);
  }
}

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
