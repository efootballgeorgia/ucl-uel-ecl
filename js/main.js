import { dom } from './dom.js';
import { appState } from './state.js';
import { initFirebase, handleLogin, handleSignup, handleLogout } from './auth.js';
import { switchLeague, handleMatchSubmission, handleKnockoutMatchSubmission, handleMatchDeletion } from './firestore.js';
import { filterMatches } from './ui-matches.js';
import { sortTable } from './ui-table.js';
import { CSS, EVENTS } from './constants.js';

function updateURL() {
    const params = new URLSearchParams(window.location.search);
    params.set('league', appState.currentLeague);

    const selectedTeam = dom.teamSearchSelect.value;
    if (selectedTeam) {
        params.set('team', selectedTeam);
        params.delete('day');
    } else {
        params.delete('team');
        params.set('day', dom.daySelector.value);
    }
    history.replaceState(null, '', `?${params.toString()}`);
}

function resetAndFilterView() {
    dom.teamSearchSelect.value = '';
    dom.daySelector.value = 1;
    filterMatches();
    updateURL();
}

function setupEventListeners() {
    document.querySelector('.league-selector-nav').addEventListener(EVENTS.CLICK, (e) => {
        const target = e.target.closest('.league-btn');
        if (!target || target.classList.contains(CSS.ACTIVE)) return;
        
        document.querySelector('.league-btn.active').classList.remove(CSS.ACTIVE);
        target.classList.add(CSS.ACTIVE);
        
        switchLeague(target.dataset.league).then(resetAndFilterView);
    });

    document.querySelector('.main-nav').addEventListener(EVENTS.CLICK, (e) => {
        const target = e.target.closest('.nav-btn');
        if (!target || target.classList.contains(CSS.ACTIVE)) return;

        document.querySelector('.nav-btn.active').classList.remove(CSS.ACTIVE);
        target.classList.add(CSS.ACTIVE);
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove(CSS.ACTIVE));
        document.getElementById(`${target.dataset.view}-section`).classList.add(CSS.ACTIVE);
    });

    dom.daySelector.addEventListener(EVENTS.CHANGE, () => {
        dom.teamSearchSelect.value = '';
        filterMatches();
        updateURL();
    });
    dom.teamSearchSelect.addEventListener(EVENTS.CHANGE, () => {
        filterMatches();
        updateURL();
    });
    dom.clearSearchBtn.addEventListener(EVENTS.CLICK, resetAndFilterView);

    dom.matchDayContainer.addEventListener(EVENTS.CLICK, (e) => {
        const card = e.target.closest('.match-card');
        if (!card) return;

        if (e.target.closest('.btn-edit')) {
            card.classList.add(CSS.IS_EDITING);
        }

        const saveButton = e.target.closest('.btn-save');
        if (saveButton) {
            const form = card.querySelector('.match-score-form');
            if (form) {
                handleMatchSubmission(form, saveButton);
            }
        }

        const cancelButton = e.target.closest('.btn-cancel');
        if (cancelButton) {
            const originalHomeScore = card.querySelector('.match-result .score-home')?.textContent || '';
            const originalAwayScore = card.querySelector('.match-result .score-away')?.textContent || '';
            const homeInput = card.querySelector('.match-score-form .score-home');
            const awayInput = card.querySelector('.match-score-form .score-away');
            if (homeInput) homeInput.value = originalHomeScore;
            if (awayInput) awayInput.value = originalAwayScore;
            card.classList.remove(CSS.IS_EDITING);
        }

        // ADDED: Logic to handle the delete button click
        const deleteButton = e.target.closest('.btn-delete');
        if (deleteButton) {
            const docId = deleteButton.dataset.docId;
            if (docId) {
                handleMatchDeletion(docId);
            }
        }
    });

    dom.matchDayContainer.addEventListener(EVENTS.SUBMIT, (e) => {
        if (e.target.classList.contains('match-score-form')) {
            e.preventDefault();
            const form = e.target;
            const card = form.closest('.match-card');
            const saveButton = card.querySelector('.btn-save');
            handleMatchSubmission(form, saveButton);
        }
    });
    
    dom.knockoutSection.addEventListener(EVENTS.SUBMIT, (e) => {
        if (e.target.classList.contains('knockout-admin-form')) {
            e.preventDefault();
            handleKnockoutMatchSubmission(e);
        }
    });
    
    document.querySelector('#leagueTable thead').addEventListener(EVENTS.CLICK, (e) => {
        const target = e.target.closest('th[data-sort-key]');
        if (!target) return;

        const key = target.dataset.sortKey;
        
        appState.sortDirection = appState.sortBy === key 
            ? (appState.sortDirection === 'asc' ? 'desc' : 'asc') 
            : 'desc';
        
        appState.sortBy = key;
        
        sortTable();
    });

    let lastFocusedElement;

    const openAuthModal = () => {
        lastFocusedElement = document.activeElement;
        dom.authModal.classList.add(CSS.SHOW);
        dom.authEmailInput.focus();
        dom.authModal.addEventListener(EVENTS.KEYDOWN, trapFocus);
    };

    const closeAuthModal = () => {
        dom.authModal.classList.remove(CSS.SHOW);
        dom.authModal.removeEventListener(EVENTS.KEYDOWN, trapFocus);
        lastFocusedElement?.focus();
    };

    const trapFocus = (e) => {
        if (e.key !== 'Tab') return;
        const focusableElements = Array.from(dom.authModal.querySelectorAll('input, button'));
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
        }
    };

    dom.authBtn.addEventListener(EVENTS.CLICK, openAuthModal);
    dom.closeAuthModalBtn.addEventListener(EVENTS.CLICK, closeAuthModal);
    dom.authModal.addEventListener(EVENTS.CLICK, (e) => {
        if (e.target === dom.authModal) closeAuthModal();
    });
    window.addEventListener(EVENTS.KEYDOWN, (e) => {
        if (e.key === 'Escape' && dom.authModal.classList.contains(CSS.SHOW)) {
            closeAuthModal();
        }
    });
    
    dom.authForm.addEventListener(EVENTS.SUBMIT, handleLogin);
    dom.signupBtn.addEventListener(EVENTS.CLICK, (e) => {
        e.preventDefault();
        handleSignup(e);
    });
    dom.logoutBtn.addEventListener(EVENTS.CLICK, handleLogout);
}

window.onload = () => {
    initFirebase();
    setupEventListeners();
    
    const urlParams = new URLSearchParams(window.location.search);
    const initialLeague = urlParams.get('league') || appState.currentLeague;
    const initialDay = urlParams.get('day') || '1';
    const initialTeam = urlParams.get('team') || '';

    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.classList.toggle(CSS.ACTIVE, btn.dataset.league === initialLeague);
    });

    switchLeague(initialLeague).then(() => {
        if (initialTeam) {
            dom.teamSearchSelect.value = initialTeam;
        } else {
            dom.daySelector.value = initialDay;
        }
        filterMatches();
        updateURL(); 
    });
};