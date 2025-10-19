// js/main.js

import { dom } from './dom.js';
import { appState, setSort } from './state.js';
import { initAuthListener, handleLogin, handleSignup, handleLogout } from './auth.js';
import { switchLeague, handleMatchSubmission, handleKnockoutMatchSubmission, handleMatchDeletion } from './supabase.js';
import { filterMatches } from './ui-matches.js';
import { sortTable } from './ui-table.js';
import { CSS, EVENTS } from './constants.js';

/**
 * Updates the URL in the browser's address bar to reflect the current state (league, day, team filter).
 */
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

/**
 * Attaches all the necessary event listeners for the application's UI.
 */
function setupEventListeners() {
    // League and main navigation tabs
    document.querySelector('.league-selector-nav').addEventListener(EVENTS.CLICK, (e) => {
        const target = e.target.closest('.league-btn');
        if (!target || target.classList.contains(CSS.ACTIVE)) return;
        document.querySelector('.league-btn.active').classList.remove(CSS.ACTIVE);
        target.classList.add(CSS.ACTIVE);
        switchLeague(target.dataset.league);
    });

    document.querySelector('.main-nav').addEventListener(EVENTS.CLICK, (e) => {
        const target = e.target.closest('.nav-btn');
        if (!target || target.classList.contains(CSS.ACTIVE)) return;
        document.querySelector('.nav-btn.active').classList.remove(CSS.ACTIVE);
        target.classList.add(CSS.ACTIVE);
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove(CSS.ACTIVE));
        document.getElementById(`${target.dataset.view}-section`).classList.add(CSS.ACTIVE);
    });

    // Filtering and sorting controls
    dom.daySelector.addEventListener(EVENTS.CHANGE, () => {
        appState.currentDay = parseInt(dom.daySelector.value);
        filterMatches();
        updateURL();
    });
    dom.teamSearchSelect.addEventListener(EVENTS.CHANGE, () => {
        filterMatches();
        updateURL();
    });
    dom.clearSearchBtn.addEventListener(EVENTS.CLICK, () => {
        dom.teamSearchSelect.value = '';
        filterMatches();
        updateURL();
    });

    dom.leagueTableBody.previousElementSibling.addEventListener(EVENTS.CLICK, (e) => {
        const target = e.target.closest('th[data-sort-key]');
        if (!target) return;
        setSort(target.dataset.sortKey);
        sortTable();
    });

    // Match card interactions (Edit, Cancel, Delete) via event delegation
    dom.matchDayContainer.addEventListener(EVENTS.CLICK, (e) => {
        const matchCard = e.target.closest('.match-card');
        if (!matchCard) return;

        if (e.target.classList.contains('btn-edit')) {
            matchCard.classList.add(CSS.IS_EDITING);
        }
        if (e.target.classList.contains('btn-cancel')) {
            matchCard.classList.remove(CSS.IS_EDITING);
            const form = matchCard.querySelector('.match-score-form');
            form.querySelector('.score-home').value = matchCard.dataset.originalHomeScore || '';
            form.querySelector('.score-away').value = matchCard.dataset.originalAwayScore || '';
        }
        if (e.target.classList.contains('btn-delete')) {
            const matchId = matchCard.dataset.docId;
            if (matchId) {
                handleMatchDeletion(matchId);
            } else {
                showFeedback("Cannot delete a result that hasn't been saved yet.", false);
            }
        }
    });

    // Match and Knockout form submissions
    dom.matchDayContainer.addEventListener(EVENTS.SUBMIT, (e) => {
        e.preventDefault();
        if (e.target.classList.contains('match-score-form')) {
            handleMatchSubmission(e.target);
        }
    });
    
    dom.knockoutSection.addEventListener(EVENTS.SUBMIT, (e) => {
        e.preventDefault();
        if (e.target.classList.contains('knockout-admin-form')) {
            handleKnockoutMatchSubmission(e);
        }
    });
    
    // Authentication Modal Listeners
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
        if (lastFocusedElement) lastFocusedElement.focus();
    };
    const trapFocus = (e) => {
        if (e.key !== 'Tab') return;
        const focusableElements = Array.from(dom.authModal.querySelectorAll('input, button'));
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    };

    dom.authBtn.addEventListener(EVENTS.CLICK, openAuthModal);
    dom.closeAuthModalBtn.addEventListener(EVENTS.CLICK, closeAuthModal);
    dom.authModal.addEventListener(EVENTS.CLICK, (e) => { if (e.target === dom.authModal) closeAuthModal(); });
    window.addEventListener(EVENTS.KEYDOWN, (e) => { if (e.key === 'Escape' && dom.authModal.classList.contains(CSS.SHOW)) closeAuthModal(); });
    
    // Connect auth actions to their handlers
    dom.authForm.addEventListener(EVENTS.SUBMIT, handleLogin);
    dom.signupBtn.addEventListener(EVENTS.CLICK, handleSignup);
    dom.logoutBtn.addEventListener(EVENTS.CLICK, handleLogout);
}

/**
 * Main entry point for the application, runs when the window has loaded.
 */
window.onload = () => {
    // Sets up the listener that manages user state and triggers the initial data load.
    initAuthListener();
    // Attaches all the interactive event listeners to the DOM.
    setupEventListeners();
};