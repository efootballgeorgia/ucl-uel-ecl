/**
 * Loading States and Skeleton Loaders
 * Provides better UX during data loading
 */

/**
 * Show loading spinner overlay
 * @param {string} message - Optional loading message
 */
export function showLoadingOverlay(message = 'Loading...') {
  let overlay = document.getElementById('loading-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-message">${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('.loading-message').textContent = message;
    overlay.style.display = 'flex';
  }
  
  // Prevent scrolling
  document.body.style.overflow = 'hidden';
}

/**
 * Hide loading spinner overlay
 */
export function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
}

/**
 * Show inline loading spinner
 * @param {HTMLElement} container - Container element
 * @param {string} size - Size ('small', 'medium', 'large')
 */
export function showInlineLoader(container, size = 'medium') {
  const loader = document.createElement('div');
  loader.className = `inline-loader inline-loader-${size}`;
  loader.innerHTML = '<div class="spinner"></div>';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-label', 'Loading');
  
  container.appendChild(loader);
  return loader;
}

/**
 * Remove inline loading spinner
 * @param {HTMLElement} loader - Loader element to remove
 */
export function hideInlineLoader(loader) {
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
}

/**
 * Create skeleton loader for table
 * @param {number} rows - Number of skeleton rows
 * @returns {string} HTML string
 */
export function createTableSkeleton(rows = 5) {
  let skeletonHTML = '';
  
  for (let i = 0; i < rows; i++) {
    skeletonHTML += `
      <tr class="skeleton-row">
        <td><div class="skeleton-box skeleton-text"></div></td>
        <td><div class="skeleton-box skeleton-text"></div></td>
        <td><div class="skeleton-box skeleton-text-short"></div></td>
        <td><div class="skeleton-box skeleton-text-short"></div></td>
        <td><div class="skeleton-box skeleton-text-short"></div></td>
        <td><div class="skeleton-box skeleton-text-short"></div></td>
        <td><div class="skeleton-box skeleton-text-short"></div></td>
        <td><div class="skeleton-box skeleton-text-short"></div></td>
        <td><div class="skeleton-box skeleton-form"></div></td>
      </tr>
    `;
  }
  
  return skeletonHTML;
}

/**
 * Create skeleton loader for match cards
 * @param {number} cards - Number of skeleton cards
 * @returns {string} HTML string
 */
export function createMatchCardsSkeleton(cards = 4) {
  let skeletonHTML = '';
  
  for (let i = 0; i < cards; i++) {
    skeletonHTML += `
      <div class="match-card skeleton-card">
        <div class="skeleton-box skeleton-title"></div>
        <div class="match-teams">
          <div class="skeleton-box skeleton-team"></div>
          <div class="skeleton-box skeleton-score"></div>
          <div class="skeleton-box skeleton-team"></div>
        </div>
        <div class="skeleton-box skeleton-date"></div>
      </div>
    `;
  }
  
  return skeletonHTML;
}

/**
 * Show progress bar
 * @param {number} progress - Progress percentage (0-100)
 * @param {HTMLElement} container - Optional container element
 */
export function showProgressBar(progress, container = null) {
  let progressBar = document.getElementById('global-progress-bar');
  
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'global-progress-bar';
    progressBar.className = 'progress-bar';
    progressBar.innerHTML = '<div class="progress-fill"></div>';
    
    if (container) {
      container.appendChild(progressBar);
    } else {
      document.body.appendChild(progressBar);
    }
  }
  
  const fill = progressBar.querySelector('.progress-fill');
  fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  progressBar.style.display = 'block';
  
  if (progress >= 100) {
    setTimeout(() => {
      progressBar.style.display = 'none';
    }, 500);
  }
}

/**
 * Hide progress bar
 */
export function hideProgressBar() {
  const progressBar = document.getElementById('global-progress-bar');
  if (progressBar) {
    progressBar.style.display = 'none';
  }
}

/**
 * Show button loading state
 * @param {HTMLButtonElement} button
 * @param {string} loadingText - Optional text to show while loading
 */
export function showButtonLoading(button, loadingText = 'Loading...') {
  if (!button) return;
  
  button.dataset.originalText = button.textContent;
  button.textContent = loadingText;
  button.classList.add('is-loading');
  button.disabled = true;
  
  // Add spinner if not exists
  if (!button.querySelector('.button-spinner')) {
    const spinner = document.createElement('span');
    spinner.className = 'button-spinner';
    button.prepend(spinner);
  }
}

/**
 * Hide button loading state
 * @param {HTMLButtonElement} button
 */
export function hideButtonLoading(button) {
  if (!button) return;
  
  button.textContent = button.dataset.originalText || 'Submit';
  button.classList.remove('is-loading');
  button.disabled = false;
  
  const spinner = button.querySelector('.button-spinner');
  if (spinner) {
    spinner.remove();
  }
}

/**
 * Create a shimmer effect element
 * @returns {HTMLElement}
 */
export function createShimmerEffect() {
  const shimmer = document.createElement('div');
  shimmer.className = 'shimmer-effect';
  return shimmer;
}

/**
 * Add loading state CSS if not already present
 */
export function injectLoadingStyles() {
  if (document.getElementById('loading-states-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'loading-states-styles';
  styles.textContent = `
    /* Loading Overlay */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(3, 4, 36, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    
    .loading-spinner {
      text-align: center;
      color: #fff;
    }
    
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-message {
      font-size: 1.1rem;
      margin: 0;
    }
    
    /* Inline Loaders */
    .inline-loader {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    
    .inline-loader-small .spinner {
      width: 20px;
      height: 20px;
      border-width: 2px;
    }
    
    .inline-loader-medium .spinner {
      width: 30px;
      height: 30px;
      border-width: 3px;
    }
    
    .inline-loader-large .spinner {
      width: 50px;
      height: 50px;
      border-width: 4px;
    }
    
    /* Skeleton Loaders */
    .skeleton-box {
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.05) 25%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.05) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
    }
    
    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .skeleton-text {
      height: 16px;
      width: 80%;
    }
    
    .skeleton-text-short {
      height: 16px;
      width: 40px;
    }
    
    .skeleton-title {
      height: 20px;
      width: 60%;
      margin-bottom: 10px;
    }
    
    .skeleton-team {
      height: 40px;
      width: 120px;
    }
    
    .skeleton-score {
      height: 30px;
      width: 60px;
    }
    
    .skeleton-date {
      height: 14px;
      width: 100px;
    }
    
    .skeleton-form {
      height: 20px;
      width: 100px;
    }
    
    /* Progress Bar */
    .progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      z-index: 9998;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4134b4, #fff500);
      transition: width 0.3s ease;
    }
    
    /* Button Loading */
    .button-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
    }
    
    button.is-loading {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `;
  
  document.head.appendChild(styles);
}

// Initialize loading styles on module load
injectLoadingStyles();

export default {
  showLoadingOverlay,
  hideLoadingOverlay,
  showInlineLoader,
  hideInlineLoader,
  createTableSkeleton,
  createMatchCardsSkeleton,
  showProgressBar,
  hideProgressBar,
  showButtonLoading,
  hideButtonLoading,
  createShimmerEffect,
  injectLoadingStyles
};
