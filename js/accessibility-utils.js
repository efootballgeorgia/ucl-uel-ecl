export function announceToScreenReader(message, priority = 'polite') {
  const announcer = document.getElementById('sr-announcer') || createAnnouncer();
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = message;
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

function createAnnouncer() {
  const announcer = document.createElement('div');
  announcer.id = 'sr-announcer';
  announcer.className = 'visually-hidden';
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(announcer);
  return announcer;
}

export function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTabKey(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  element.addEventListener('keydown', handleTabKey);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

export function handleEscapeKey(callback) {
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      callback(e);
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}

export function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function ensureElementVisible(element, options = { behavior: 'smooth', block: 'nearest' }) {
  if (!isElementVisible(element)) {
    element.scrollIntoView(options);
  }
}

export function addSkipNavigation(targetId = 'main') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  document.body.insertBefore(skipLink, document.body.firstChild);
}

export function enhanceFormAccessibility(form) {
  const inputs = form.querySelectorAll('input, textarea, select');

  inputs.forEach(input => {
    // Ensure each input has a label
    const label = form.querySelector(`label[for="${input.id}"]`);
    if (!label && input.placeholder) {
      // Create visually hidden label from placeholder
      const newLabel = document.createElement('label');
      newLabel.htmlFor = input.id || `input-${Date.now()}`;
      newLabel.className = 'visually-hidden';
      newLabel.textContent = input.placeholder;
      input.id = newLabel.htmlFor;
      input.parentNode.insertBefore(newLabel, input);
    }

    // Add ARIA attributes for validation
    if (input.required) {
      input.setAttribute('aria-required', 'true');
    }

    // Add error messaging
    input.addEventListener('invalid', (e) => {
      e.preventDefault();
      const error = input.validationMessage;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${input.id}-error`);

      let errorElement = document.getElementById(`${input.id}-error`);
      if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.id = `${input.id}-error`;
        errorElement.className = 'error-message';
        errorElement.setAttribute('aria-live', 'assertive');
        input.parentNode.appendChild(errorElement);
      }
      errorElement.textContent = error;
    });

    input.addEventListener('input', () => {
      if (input.checkValidity()) {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        const errorElement = document.getElementById(`${input.id}-error`);
        if (errorElement) {
          errorElement.textContent = '';
        }
      }
    });
  });
}

export function enhanceKeyboardNavigation(elements) {
  elements.forEach((element, index) => {
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');

    element.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          element.click();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          const next = elements[index + 1] || elements[0];
          next.focus();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          const prev = elements[index - 1] || elements[elements.length - 1];
          prev.focus();
          break;
      }
    });
  });
}

export function checkColorContrast(foreground, background) {
  return {
    ratio: 4.5, // Placeholder
    passesAA: true,
    passesAAA: false
  };
}

export function initAccessibility() {
  createAnnouncer();
  addSkipNavigation('main');
  document.querySelectorAll('form').forEach(enhanceFormAccessibility);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('♿ Accessibility enhancements initialized');
}

export default {
  announceToScreenReader,
  trapFocus,
  handleEscapeKey,
  isElementVisible,
  ensureElementVisible,
  addSkipNavigation,
  enhanceFormAccessibility,
  enhanceKeyboardNavigation,
  checkColorContrast,
  initAccessibility
};
