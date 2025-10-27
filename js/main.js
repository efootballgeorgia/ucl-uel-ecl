import { initializeSupabase, handleAuthAction, handleLogout, switchLeague, handleScoreSubmission, handleDelete } from './supabase.js';
import { filterMatches } from './ui-matches.js';
import { sortTable } from './ui-table.js';

export const dom = {
    leagueSection: document.getElementById('league-section'),
    matchesSection: document.getElementById('matches-section'),
    knockoutSection: document.getElementById('knockout-section'),
    knockoutContainer: document.querySelector('.knockout-container'),
    leagueLogo: document.getElementById('league-logo'),
    leagueSelectorNav: document.querySelector('.league-selector-nav'),
    leagueTableBody: document.querySelector('#leagueTable tbody'),
    leagueTable: document.querySelector('.league-table'),
    tableViewToggle: document.querySelector('.table-view-toggle'),
    matchesTitle: document.getElementById('match-box-title'),
    matchesContainer: document.getElementById('match-box-container'),
    daySelector: document.getElementById('daySelector'),
    teamSearchSelect: document.getElementById('teamSearchSelect'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    noSearchResults: document.getElementById('no-search-results'),
    feedbackMessage: document.getElementById('global-feedback'),
    authModal: document.getElementById('auth-modal'),
    closeAuthModalBtn: document.getElementById('closeAuthModal'),
    authForm: document.getElementById('auth-form'),
    authEmailInput: document.getElementById('auth-email'),
    authPasswordInput: document.getElementById('auth-password'),
    loginBtn: document.getElementById('login-btn'),
    signupBtn: document.getElementById('signup-btn'),
    authFeedbackMessage: document.querySelector('.auth-feedback-message'),
    userStatusSpan: document.getElementById('user-status'),
    authBtn: document.getElementById('auth-btn'),
    logoutBtn: document.getElementById('logout-btn')
};

export const appState = {
    db: null,
    auth: null,
    currentUser: null,
    isAdmin: false,
    currentLeague: 'ucl',
    currentLeagueMatches: [],
    currentLeagueKnockoutMatches: [],
    sortedTeams: [],
    channel: null,
    fixtures: {},
    config: {},
    sortBy: 'points',
    sortDirection: 'desc'
};

export function setSort(newSortKey) {
    if (appState.sortBy === newSortKey) {
        appState.sortDirection = appState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        appState.sortBy = newSortKey;
        appState.sortDirection = 'desc';
    }
}

export const CSS = {
    ACTIVE: 'active',
    SHOW: 'show',
    IS_EDITING: 'is-editing',
    ROW_UPDATED: 'row-updated',
    IS_LOADING: 'is-loading',
};

export const EVENTS = {
    CLICK: 'click',
    SUBMIT: 'submit',
    CHANGE: 'change',
    KEYDOWN: 'keydown',
};


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

function setupEventListeners() {
    dom.leagueSelectorNav.addEventListener(EVENTS.CLICK, (e) => {
        const target = e.target.closest('.league-btn');
        if (!target || target.classList.contains(CSS.ACTIVE)) return;

        const currentActiveBtn = dom.leagueSelectorNav.querySelector('.league-btn.active');
        if (currentActiveBtn) {
            currentActiveBtn.classList.remove(CSS.ACTIVE);
        }
        target.classList.add(CSS.ACTIVE);

        switchLeague(target.dataset.league).then(() => {
            dom.teamSearchSelect.value = '';
            dom.daySelector.value = 1;
            filterMatches();
            updateURL();
            dom.leagueSelectorNav.classList.remove(CSS.SHOW); // Close dropdown
        });
    });

    if (dom.tableViewToggle) {
        dom.tableViewToggle.addEventListener(EVENTS.CLICK, (e) => {
            const target = e.target.closest('.btn-view-toggle');
            if (!target || target.classList.contains(CSS.ACTIVE)) return;

            dom.tableViewToggle.querySelector('.btn-view-toggle.active').classList.remove(CSS.ACTIVE);
            target.classList.add(CSS.ACTIVE);

            const view = target.dataset.view;
            if (view === 'simplified') {
                dom.leagueTable.classList.add('simplified-view');
            } else {
                dom.leagueTable.classList.remove('simplified-view');
            }
        });
    }

    dom.leagueLogo.addEventListener(EVENTS.CLICK, (e) => {
        e.stopPropagation();
        dom.leagueSelectorNav.classList.toggle(CSS.SHOW);
    });

    window.addEventListener(EVENTS.CLICK, (e) => {
        if (dom.leagueSelectorNav.classList.contains(CSS.SHOW)) {
            if (!dom.leagueLogo.contains(e.target) && !dom.leagueSelectorNav.contains(e.target)) {
                dom.leagueSelectorNav.classList.remove(CSS.SHOW);
            }
        }
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

    const mainContentArea = document.querySelector('main');

    mainContentArea.addEventListener(EVENTS.CLICK, (e) => {
        const button = e.target.closest('.btn-edit, .btn-cancel, .btn-delete');
        if (!button) return;

        const card = button.closest('.match-card, .knockout-match-card');
        if (!card) return;

        if (button.classList.contains('btn-edit')) {
            card.classList.add(CSS.IS_EDITING);
        } else if (button.classList.contains('btn-cancel')) {
            card.classList.remove(CSS.IS_EDITING);
        } else if (button.classList.contains('btn-delete')) {
            const docId = button.dataset.docId;
            const matchType = card.dataset.type;
            if (docId && matchType) {
                handleDelete(docId, matchType);
            }
        }
    });

    mainContentArea.addEventListener(EVENTS.SUBMIT, (e) => {
        if (e.target.classList.contains('score-form')) {
            handleScoreSubmission(e);
        }
    });

    dom.leagueTableBody.previousElementSibling.addEventListener(EVENTS.CLICK, (e) => {
        const target = e.target.closest('th[data-sort-key]');
        if (!target) return;
        const key = target.dataset.sortKey;
        setSort(key);
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

        const isTabbingBackwards = e.shiftKey;
        const isonFirstElement = document.activeElement === firstElement;
        const isonLastElement = document.activeElement === lastElement;

        if (isTabbingBackwards && isonFirstElement) {
            lastElement.focus();
            e.preventDefault();
        } else if (!isTabbingBackwards && isonLastElement) {
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

    dom.authForm.addEventListener(EVENTS.SUBMIT, handleAuthAction);
    dom.logoutBtn.addEventListener(EVENTS.CLICK, handleLogout);
}

function setInitialTableView() {
    const isMobile = window.innerWidth <= 768;
    const simplifiedBtn = dom.tableViewToggle.querySelector('[data-view="simplified"]');
    const fullBtn = dom.tableViewToggle.querySelector('[data-view="full"]');

    if (isMobile) {
        dom.leagueTable.classList.add('simplified-view');
        simplifiedBtn.classList.add(CSS.ACTIVE);
        fullBtn.classList.remove(CSS.ACTIVE);
    } else {
        dom.leagueTable.classList.remove('simplified-view');
        simplifiedBtn.classList.remove(CSS.ACTIVE);
        fullBtn.classList.add(CSS.ACTIVE);
    }
}


window.onload = () => {
    initializeSupabase();
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
        setInitialTableView();
    });
};