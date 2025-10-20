import { dom } from './dom.js';
import { appState } from './state.js';

export const DURATIONS = {
    FEEDBACK_MESSAGE: 3000,
    ROW_HIGHLIGHT: 1500,
};

export function showFeedback(message, isSuccess) {
    const messageElement = document.createElement('div');
    messageElement.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
    messageElement.textContent = message;
    dom.feedbackMessage.appendChild(messageElement);

    setTimeout(() => messageElement.classList.add('show'), 10);

    setTimeout(() => {
        messageElement.classList.remove('show');
        messageElement.addEventListener('transitionend', () => messageElement.remove());
    }, DURATIONS.FEEDBACK_MESSAGE);
}

export function showAuthFeedback(message, isSuccess) {
    dom.authFeedbackMessage.textContent = message;
    dom.authFeedbackMessage.style.backgroundColor = isSuccess ? 'var(--win-color)' : 'var(--loss-color)';
    dom.authFeedbackMessage.classList.add('show');
    setTimeout(() => {
        dom.authFeedbackMessage.classList.remove('show');
    }, DURATIONS.FEEDBACK_MESSAGE);
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

export const getTeamSlug = (teamName) => {
  if (!teamName) return '';
  return teamName.toLowerCase().replace(/ /g, '-');
};

export const generateMatchId = (homeTeam, awayTeam) => {
  if (!homeTeam || !awayTeam) return null;
  return `${getTeamSlug(homeTeam)}-vs-${getTeamSlug(awayTeam)}`;
};

export function renderAdminActionsHTML(docId, isPlayed, areTeamsSet = true) {
    if (!appState.isAdmin || !areTeamsSet) return '';
    return `
        <div class="card-actions">
            <button type="button" class="btn btn-edit">${isPlayed ? 'Edit' : 'Add Score'}</button>
            ${isPlayed ? `<button type="button" class="btn btn-delete" data-doc-id="${docId}">Delete</button>` : ''}
            <button type="submit" form="${docId}-form" class="btn btn-save"><span class="btn-text">Save</span></button>
            <button type="button" class="btn btn-cancel"><span class="btn-text">Cancel</span></button>
        </div>
    `;
}