import { supabase } from './supabase-client.js';
import { appState } from './state.js';
import { showAuthFeedback, updateAuthUI, showFeedback } from './ui-feedback.js';
import { generateKnockoutStage } from './ui-knockout.js';
import { generateMatchDay, filterMatches, renderSkeletonMatches, updateUIFromConfig } from './ui-matches.js';
import { renderTable, updateTeamStats, subtractTeamStats, sortTable, renderSkeletonTable } from "./ui-table.js";

// --- AUTHENTICATION ---

function handleAuthError(error) {
    if (error.message.includes('Invalid login credentials')) {
        return 'Invalid email or password.';
    }
    if (error.message.includes('valid email')) {
        return 'Please enter a valid email address.';
    }
    if (error.message.includes('User already registered')) {
        return 'An account with this email already exists.';
    }
    if (error.message.includes('Password should be at least 6 characters')) {
        return 'Password must be at least 6 characters long.';
    }
    console.error("Authentication Error:", error);
    return 'An unexpected error occurred. Please try again.';
}

async function handleAuthAction(e, authFunction, successMessage) {
    e.preventDefault();
    try {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        const { error } = await authFunction({ email, password });
        if (error) throw error;
        
        showAuthFeedback(successMessage, true);
        document.getElementById('auth-modal').classList.remove('show');
        document.getElementById('auth-form').reset();
    } catch (error) {
        showAuthFeedback(handleAuthError(error), false);
    }
}

export function handleLogin(e) {
    handleAuthAction(e, supabase.auth.signInWithPassword.bind(supabase.auth), 'Logged in successfully!');
}

export function handleSignup(e) {
    if (document.getElementById('auth-password').value.length < 6) {
        return showAuthFeedback('Password must be at least 6 characters long.', false);
    }
    handleAuthAction(e, supabase.auth.signUp.bind(supabase.auth), 'Account created! Please check your email to verify.');
}

export async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        showFeedback('Logged out successfully!', true);
    } catch (error) {
        showFeedback(`Logout error: ${error.message}`, false);
    }
}

export function initializeSupabase() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        appState.currentUser = session?.user || null;

        if (appState.currentUser) {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', appState.currentUser.id)
                .single();

            appState.isAdmin = data?.role === 'admin';
        } else {
            appState.isAdmin = false;
        }

        updateAuthUI();
        if (appState.currentLeague) {
            switchLeague(appState.currentLeague);
        }
    });
}


// Replace this function in supabase.js

function processLeagueChanges(matches) {
    // --- THIS IS THE FIX ---
    // Before doing any calculations, find every form container and wipe it clean.
    dom.leagueTableBody.querySelectorAll('.form-container').forEach(container => container.innerHTML = '');
    
    const allTeamRows = dom.leagueTableBody.querySelectorAll('tr[data-team]');
    allTeamRows.forEach(row => {
        row.cells[2].textContent = '0'; // P
        row.cells[3].textContent = '0'; // W
        row.cells[4].textContent = '0'; // D
        row.cells[5].textContent = '0'; // L
        row.cells[6].textContent = '0:0'; // +/-
        row.cells[7].querySelector('.points').textContent = '0';
        row.dataset.gd = '0';
    });
    
    appState.currentLeagueMatches = matches;

    appState.currentLeagueMatches.forEach(match => {
        if (match.homeScore === null || match.homeScore === undefined) return;
        updateTeamStats(match.homeTeam, match.homeScore, match.awayScore);
        updateTeamStats(match.awayTeam, match.awayScore, match.homeScore);
    });

    sortTable();
    const rows = Array.from(document.querySelectorAll('#leagueTable tbody tr:not(.separator)'));
    appState.sortedTeams = rows.map(row => row.dataset.team);

    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
    filterMatches();
}
}

async function fetchLeagueData(league) {
    const { data: matches, error } = await supabase
        .from(`${league}Matches`)
        .select('*')
        .order('timestamp', { ascending: true });

    if (error) {
        console.error(`Error fetching ${league} matches:`, error);
        return;
    }
    processLeagueChanges(matches || []);
}

async function fetchKnockoutData(league) {
    const { data, error } = await supabase
        .from(`${league}KnockoutMatches`)
        .select('*');

    if (error) {
        console.error(`Error fetching ${league} knockout matches:`, error);
        return;
    }
    appState.currentLeagueKnockoutMatches = data || [];
    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
}

function setupLeagueUI(league, config) {
    document.body.className = `${league}-theme`;
    updateUIFromConfig(config);
    renderTable(league);
    generateMatchDay(league);
}

function removeAllSubscriptions() {
    if (appState.channel) {
        supabase.removeChannel(appState.channel);
        appState.channel = null;
    }
}

function setupLeagueListeners(league) {
    removeAllSubscriptions(); // Ensure old listeners are gone

    const channel = supabase.channel(`realtime:${league}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: `${league}Matches` }, () => fetchLeagueData(league))
        .on('postgres_changes', { event: '*', schema: 'public', table: `${league}KnockoutMatches` }, () => fetchKnockoutData(league))
        .subscribe();
        
    appState.channel = channel;
}

export async function switchLeague(league) {
    appState.currentLeague = league;
    renderSkeletonTable();
    renderSkeletonMatches();

    try {
        if (!appState.config[league]) {
            const { data, error } = await supabase.from('leagues').select('*').eq('id', league).single();
            if (error) throw error;
            if (!data) throw new Error(`No configuration found for league: ${league}`);
            appState.config[league] = data;
        }

        setupLeagueUI(league, appState.config[league]);
        await fetchLeagueData(league);
        await fetchKnockoutData(league);
        setupLeagueListeners(league);
    } catch (error) {
        console.error(`Error loading data for ${league}:`, error);
        showFeedback(`Could not load data for ${league}.`, false);
    }
}

export async function handleMatchSubmission(form) {
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);

    const button = form.closest('.match-card').querySelector('.btn-save');
    const card = form.closest('.match-card');

    button.classList.add('is-loading');
    button.disabled = true;

    const docId = form.dataset.docId;
    const homeScore = parseInt(form.querySelector('.score-home').value, 10);
    const awayScore = parseInt(form.querySelector('.score-away').value, 10);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        showFeedback('Please enter valid, non-negative scores.', false);
        button.classList.remove('is-loading');
        button.disabled = false;
        return;
    }

    const matchData = {
        id: docId, homeTeam: form.dataset.home, awayTeam: form.dataset.away,
        homeScore, awayScore, timestamp: new Date().toISOString()
    };
    
    try {
        const { error } = await supabase.from(`${appState.currentLeague}Matches`).upsert(matchData);
        if (error) throw error;
        showFeedback('Match updated successfully!', true);
        await fetchLeagueData(appState.currentLeague);

        if (card) card.classList.remove('is-editing');

    } catch (error) {
        showFeedback(`Error saving match: ${error.message}.`, false);
    } finally {
        const finalButton = card?.querySelector('.btn-save');
        if (finalButton) {
           finalButton.classList.remove('is-loading');
           finalButton.disabled = false;
        }
    }
}

export async function handleMatchDeletion(docId) {
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);
    if (!confirm('Are you sure you want to delete this match result? This action cannot be undone.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from(`${appState.currentLeague}Matches`)
            .delete()
            .eq('id', docId);

        if (error) throw error;
        showFeedback('Match deleted successfully!', true);
        await fetchLeagueData(appState.currentLeague);
    } catch (error) {
        showFeedback(`Error deleting match: ${error.message}.`, false);
    }
}

export async function handleKnockoutMatchSubmission(e) {
    e.preventDefault();
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);

    const form = e.target;
    const button = form.querySelector('button');
    button.classList.add('is-loading');
    button.disabled = true;

    const matchId = form.dataset.matchId;
    const homeScore = parseInt(form.querySelector(`#${matchId}-home`).value, 10);
    const awayScore = parseInt(form.querySelector(`#${matchId}-away`).value, 10);

    if (isNaN(homeScore) || isNaN(awayScore)) {
        showFeedback('Please enter valid scores.', false);
    } else {
        const matchData = {
            id: matchId, stage: form.dataset.stage,
            homeTeam: form.dataset.homeTeam, awayTeam: form.dataset.awayTeam,
            homeScore, awayScore
        };
        try {
            const { error } = await supabase.from(`${appState.currentLeague}KnockoutMatches`).upsert(matchData);
            if(error) throw error;
            showFeedback('Knockout result saved!', true);
        } catch (error) {
            showFeedback(`Error saving result: ${error.message}`, false);
        }
    }
    button.classList.remove('is-loading');
    button.disabled = false;

}
