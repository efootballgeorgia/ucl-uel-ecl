import { dom } from './dom.js';
import { appState } from './state.js';
import { initFirebase, handleLogin, handleSignup, handleLogout } from './auth.js';
import { switchLeague, handleMatchSubmission } from './firestore.js';
import { filterMatches, sortTable } from './ui.js';

function setupEventListeners() {
    document.querySelector('.league-selector-nav').addEventListener('click', (e) => {
        const target = e.target.closest('.league-btn');
        if (!target || target.classList.contains('active')) return;
        
        document.querySelector('.league-btn.active').classList.remove('active');
        target.classList.add('active');
        history.pushState(null, '', `?league=${target.dataset.league}`);
        switchLeague(target.dataset.league);
    });

    document.querySelector('.main-nav').addEventListener('click', (e) => {
        const target = e.target.closest('.nav-btn');
        if (!target || target.classList.contains('active')) return;

        document.querySelector('.nav-btn.active').classList.remove('active');
        target.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${target.dataset.view}-section`).classList.add('active');
    });

    dom.daySelector.addEventListener('change', () => filterMatches());
    dom.teamSearchSelect.addEventListener('change', () => filterMatches());
    dom.clearSearchBtn.addEventListener('click', () => {
        dom.teamSearchSelect.value = '';
        filterMatches();
    });

    dom.matchDayContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const matchCard = e.target.closest('.match-card');
            if (matchCard) {
                matchCard.classList.add('is-editing');
            }
        }
    });

    dom.matchDayContainer.addEventListener('submit', (e) => {
        if (e.target.classList.contains('match-score-form')) {
            e.preventDefault();
            handleMatchSubmission(e.target); 
        }
    });

    dom.leagueTableBody.previousElementSibling.addEventListener('click', (e) => {
        const header = e.target.closest('th');
        const sortKey = header?.dataset.sortKey;

        if (!sortKey) return; 

        if (appState.sortBy === sortKey) {
            appState.sortDirection = appState.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            appState.sortBy = sortKey;
            appState.sortDirection = 'desc';
        }
        
        sortTable();
    });

    // Modal listeners
    dom.closeModalBtn.addEventListener('click', () => dom.modal.classList.remove('show'));
    dom.modal.addEventListener('click', (e) => {
        if (e.target === dom.modal) dom.modal.classList.remove('show');
    });

    dom.leagueSection.addEventListener('click', (e) => {
        if (e.target.matches('.team-logo')) {
            const teamName = e.target.alt;
            const gameplanPath = `images/gameplans/${teamName.toLowerCase().replace(/ /g, '-')}.jpg`;
            dom.modalImage.src = gameplanPath;
            dom.modal.classList.add('show');
        }
    });

    // Auth listeners
    dom.authBtn.addEventListener('click', () => dom.authModal.classList.add('show'));
    dom.closeAuthModalBtn.addEventListener('click', () => dom.authModal.classList.remove('show'));
    dom.authModal.addEventListener('click', (e) => {
        if (e.target === dom.authModal) dom.authModal.classList.remove('show');
    });
    dom.authForm.addEventListener('submit', handleLogin);
    dom.signupBtn.addEventListener('click', handleSignup);
    dom.logoutBtn.addEventListener('click', handleLogout);
}

window.onload = () => {
    initFirebase();
    setupEventListeners();
    const urlParams = new URLSearchParams(window.location.search);
    const initialLeague = urlParams.get('league') || appState.currentLeague;
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.league === initialLeague);
    });
    switchLeague(initialLeague);
};