import { appState } from './state.js';
import { dom } from './dom.js';
import { showAuthFeedback, updateAuthUI, showFeedback } from './ui-feedback.js';
import { generateKnockoutStage } from './ui-knockout.js';
import { generateMatches, filterMatches, renderSkeletonMatches, updateUIFromConfig } from './ui-matches.js';
import { renderTable, sortTable, renderSkeletonTable, updateTableFromStats } from "./ui-table.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://nturffjkprilmvqwbnml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXJmZmprcHJpbG12cXdibm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDIxNzQsImV4cCI6MjA3NjM3ODE3NH0.wGNftRwd-AyBt38vKk2SfNwODdEhjIcmDXy9EQMAcuw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


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

export async function handleAuthAction(e) {
    e.preventDefault();
    const action = e.submitter.dataset.action;
    
    try {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (action === 'signup' && password.length < 6) {
            return showAuthFeedback('Password must be at least 6 characters long.', false);
        }

        const authMethod = action === 'login' 
            ? supabase.auth.signInWithPassword.bind(supabase.auth)
            : supabase.auth.signUp.bind(supabase.auth);

        const { error } = await authMethod({ email, password });
        if (error) throw error;
        
        const successMessage = action === 'login'
            ? 'Logged in successfully!'
            : 'Account created! Please check your email to verify.';
        
        showAuthFeedback(successMessage, true);
        dom.authModal.classList.remove('show');
        dom.authForm.reset();

    } catch (error) {
        showAuthFeedback(handleAuthError(error), false);
    }
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

function calculateAllTeamStats(matches, teams) {
    const stats = {};
    teams.forEach(team => {
        stats[team] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
    });

    matches.forEach(match => {
        if (typeof match.homeScore !== 'number') return;
        const { homeTeam, awayTeam, homeScore, awayScore } = match;
        const home = stats[homeTeam];
        const away = stats[awayTeam];
        if (!home || !away) return;

        home.p++; away.p++;
        home.gf += homeScore; home.ga += awayScore;
        away.gf += awayScore; away.ga += homeScore;

        if (homeScore > awayScore) {
            home.w++; home.pts += 3; home.form.unshift('victory');
            away.l++; away.form.unshift('loss');
        } else if (awayScore > homeScore) {
            away.w++; away.pts += 3; away.form.unshift('victory');
            home.l++; home.form.unshift('loss');
        } else {
            home.d++; away.d++; home.pts++; away.pts++;
            home.form.unshift('draw'); away.form.unshift('draw');
        }
    });

    Object.values(stats).forEach(s => s.form = s.form.slice(0, 5));
    return stats;
}

function processLeagueChanges(matches) {
    if (!dom.leagueTableBody) {
        console.error("League table body not found in DOM, cannot process changes.");
        return;
    }
    
    appState.currentLeagueMatches = matches;
    const leagueConfig = appState.config[appState.currentLeague];
    if (!leagueConfig || !leagueConfig.teams) return;

    const teamStats = calculateAllTeamStats(matches, leagueConfig.teams);

    updateTableFromStats(teamStats);
    sortTable();

    const rows = Array.from(document.querySelectorAll('#leagueTable tbody tr:not(.separator)'));
    appState.sortedTeams = rows.map(row => row.dataset.team);

    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
    filterMatches();
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
    generateMatches(league);
}

function removeAllSubscriptions() {
    if (appState.channel) {
        supabase.removeChannel(appState.channel);
        appState.channel = null;
    }
}

function setupLeagueListeners(league) {
    removeAllSubscriptions();

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
    dom.matchesContainer.innerHTML = '';

    try {
        if (!appState.config[league]) {
            const { data, error } = await supabase.from('leagues').select('*').eq('id', league).single();
            if (error) throw error;
            if (!data) throw new Error(`No configuration found for league: ${league}`);
            appState.config[league] = data;
        }

        setupLeagueUI(league, appState.config[league]);
        renderTable(league); 
        await fetchLeagueData(league); 
        await fetchKnockoutData(league);
        setupLeagueListeners(league);
    } catch (error) {
        console.error(`Error loading data for ${league}:`, error);
    }
}

export async function handleScoreSubmission(e) {
    e.preventDefault();
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);
    
    const form = e.target;
    const card = form.closest('.match-card, .knockout-match-card');
    const button = card.querySelector('.btn-save');
    const docId = form.dataset.docId;
    const matchType = card.dataset.type;

    button.classList.add('is-loading');
    button.disabled = true;

    const homeScore = parseInt(form.querySelector('.score-home').value, 10);
    const awayScore = parseInt(form.querySelector('.score-away').value, 10);
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        showFeedback('Please enter valid, non-negative scores.', false);
        button.classList.remove('is-loading');
        button.disabled = false;
        return;
    }
    
    card.classList.remove('is-editing');
    
    const tableName = `${appState.currentLeague}${matchType === 'league' ? 'Matches' : 'KnockoutMatches'}`;
    const homeTeam = matchType === 'league' ? card.dataset.home : form.dataset.homeTeam;
    const awayTeam = matchType === 'league' ? card.dataset.away : form.dataset.awayTeam;

    const matchData = { id: docId, homeScore, awayScore, homeTeam, awayTeam };
    if (matchType === 'league') matchData.timestamp = new Date().toISOString();
    else matchData.stage = docId.split('-')[0];
    
    try {
        const { error } = await supabase.from(tableName).upsert(matchData);
        if (error) throw error;
        showFeedback('Match updated successfully!', true);

        const matchIndex = matchType === 'league' 
            ? appState.currentLeagueMatches.findIndex(m => m.id === docId)
            : appState.currentLeagueKnockoutMatches.findIndex(m => m.id === docId);

        const targetArray = matchType === 'league' ? appState.currentLeagueMatches : appState.currentLeagueKnockoutMatches;
        
        if (matchIndex > -1) {
            targetArray[matchIndex] = { ...targetArray[matchIndex], ...matchData };
        } else {
            targetArray.push(matchData);
        }

        if (matchType === 'league') {
            processLeagueChanges(appState.currentLeagueMatches);
        } else {
            generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
        }

    } catch (error) {
        showFeedback(`Error saving match: ${error.message}.`, false);
    } finally {
        button.classList.remove('is-loading');
        button.disabled = false;
    }
}

export async function handleDelete(docId, matchType) {
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);
    if (!confirm('Are you sure you want to delete this match result? This action cannot be undone.')) {
        return;
    }

    const card = document.querySelector(`[data-doc-id="${docId}"]`);
    if (card) card.style.opacity = '0.5';

    const tableName = `${appState.currentLeague}${matchType === 'league' ? 'Matches' : 'KnockoutMatches'}`;

    try {
        const { error } = await supabase.from(tableName).delete().eq('id', docId);
        if (error) throw error;
        showFeedback('Match deleted successfully!', true);

        if (matchType === 'league') {
            appState.currentLeagueMatches = appState.currentLeagueMatches.filter(m => m.id !== docId);
            processLeagueChanges(appState.currentLeagueMatches);
        } else {
            appState.currentLeagueKnockoutMatches = appState.currentLeagueKnockoutMatches.filter(m => m.id !== docId);
            generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
        }

    } catch (error) {
        showFeedback(`Error deleting match: ${error.message}.`, false);
        if (card) card.style.opacity = '1';
    }
}
