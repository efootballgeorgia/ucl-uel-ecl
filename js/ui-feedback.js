import { dom } from './dom.js';
import { appState } from './state.js';

export function showFeedback(message, isSuccess) {
    const messageElement = document.createElement('div');
    messageElement.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
    messageElement.textContent = message;
    dom.feedbackMessage.appendChild(messageElement);

    setTimeout(() => messageElement.classList.add('show'), 10);

    setTimeout(() => {
        messageElement.classList.remove('show');
        messageElement.addEventListener('transitionend', () => messageElement.remove());
    }, 3000);
}

export function showAuthFeedback(message, isSuccess) {
    dom.authFeedbackMessage.textContent = message;
    dom.authFeedbackMessage.style.backgroundColor = isSuccess ? 'var(--win-color)' : 'var(--loss-color)';
    dom.authFeedbackMessage.classList.add('show');
    setTimeout(() => {
        dom.authFeedbackMessage.classList.remove('show');
    }, 3000);
}

export function updateAuthUI() {
    if (appState.currentUser) {
        dom.userStatusSpan.textContent = `Logged in`;
        dom.authBtn.style.display = 'none';
        dom.logoutBtn.style.display = 'inline-block';
    } else {
        dom.userStatusSpan.textContent = 'Not logged in';
        dom.authBtn.style.display = 'inline-block';
        dom.logoutBtn.style.display = 'none';
    }
}