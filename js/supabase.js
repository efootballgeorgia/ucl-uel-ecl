import { dom, appState } from './main.js';
import { showAuthFeedback, updateAuthUI, showFeedback } from './ui-feedback.js';
import { generateKnockoutStage } from './ui-knockout.js';
import { generateMatches, filterMatches, renderSkeletonMatches, updateUIFromConfig } from './ui-matches.js';
import { renderTable, sortTable, renderSkeletonTable, updateTableFromStats } from "./ui-table.js";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = 'https://nturffjkprilmvqwbnml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXJmZmprcHJpbG12cXdibm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDIxNzQsImV4cCI6MjA3NjM3ODE3NH0.wGNftRwd-AyBt38vKk2SfNwODdEhjIcmDXy9EQMAcuw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function debounce(func, delay = 350) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function calculateAllTeamStats(matches, teams) {
    const stats = Object.fromEntries(teams.map(team => [team, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));

    const updateStats = (teamStat, goalsFor, goalsAgainst, result) => {
        teamStat.p++;
        teamStat.gf += goalsFor;
        teamStat.ga += goalsAgainst;
        teamStat.w += (result === 'victory');
        teamStat.d += (result === 'draw');
        teamStat.l += (result === 'loss');
        teamStat.pts += (result === 'victory' ? 3 : (result === 'draw' ? 1 : 0));
        teamStat.form.unshift(result);
    };

    matches.forEach(match => {
        if (typeof match.homeScore !== 'number' || !stats[match.homeTeam] || !stats[match.awayTeam]) return;

        let homeResult = 'draw', awayResult = 'draw';
        if (match.homeScore > match.awayScore) {
            homeResult = 'victory'; awayResult = 'loss';
        } else if (match.awayScore > match.homeScore) {
            homeResult = 'loss'; awayResult = 'victory';
        }

        updateStats(stats[match.homeTeam], match.homeScore, match.awayScore, homeResult);
        updateStats(stats[match.awayTeam], match.awayScore, match.homeScore, awayResult);
    });
    
    Object.values(stats).forEach(s => s.form.splice(5));
    return stats;
}

async function handleSessionUpdate(session) {
    appState.currentUser = session?.user || null;
    appState.isAdmin = false; 

    if (appState.currentUser) {
        try {
            const { data } = await supabase.from('profiles').select('role').eq('id', appState.currentUser.id).single();
            appState.isAdmin = data?.role === 'admin';
        } catch (err) {}
    }
    updateAuthUI();

    if (appState.currentLeague && appState.config[appState.currentLeague]) {
        filterMatches();
        const leagueConfig = appState.config[appState.currentLeague];
        if (leagueConfig.teams && appState.currentLeagueMatches.length > 0) {
            const teamStats = calculateAllTeamStats(appState.currentLeagueMatches, leagueConfig.teams);
            generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches, teamStats);
        }
    }
}

export async function initializeSupabase() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("Session error:", error);
        await handleSessionUpdate(session);
        supabase.auth.onAuthStateChange((_e, session) => handleSessionUpdate(session));
        return session;
    } catch (err) { return null; }
}

export async function handleAuthAction(e) {
    e.preventDefault();
    const action = e.submitter.dataset.action;
    try {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        if (action === 'signup' && password.length < 6) return showAuthFeedback('Password too short', false);

        const method = action === 'login' ? supabase.auth.signInWithPassword.bind(supabase.auth) : supabase.auth.signUp.bind(supabase.auth);
        const { error } = await method({ email, password });
        if (error) throw error;

        showAuthFeedback('Success!', true);
        dom.authModal.classList.remove('show');
        dom.authForm.reset();
    } catch (error) { showAuthFeedback(error.message, false); }
}

export async function handleLogout() {
    await supabase.auth.signOut();
    showFeedback('Logged out', true);
}


function processLeagueChanges(matches) {
    if (!dom.leagueViewContainer) return;
    appState.currentLeagueMatches = matches;
    const leagueConfig = appState.config[appState.currentLeague];
    if (!leagueConfig || !leagueConfig.teams) return;

    const teamStats = calculateAllTeamStats(matches, leagueConfig.teams);
    updateTableFromStats(teamStats);
    sortTable();
    const rows = Array.from(document.querySelectorAll('tr[data-team]'));
    appState.sortedTeams = rows.map(row => row.dataset.team);
    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches, teamStats);
    filterMatches();
}

async function fetchLeagueData(league) {
    const { data: matches, error } = await supabase.from('matches').select('*').eq('league_id', league).order('timestamp');
    if (error) return console.error(error);
    processLeagueChanges(matches || []);
}

async function fetchKnockoutData(league) {
    const { data, error } = await supabase.from('knockout_matches').select('*').eq('league_id', league);
    if (error) return console.error(error);
    appState.currentLeagueKnockoutMatches = data || [];
    const leagueConfig = appState.config[appState.currentLeague];
    if (leagueConfig?.teams) {
        const teamStats = calculateAllTeamStats(appState.currentLeagueMatches, leagueConfig.teams);
        generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches, teamStats);
    }
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
    const debouncedFetchLeagueData = debounce(() => fetchLeagueData(league));
    let channel = supabase.channel(`realtime:${league}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `league_id=eq.${league}` }, debouncedFetchLeagueData);
    
    if (appState.config[league]?.has_knockout_stage) {
        const debouncedKO = debounce(() => fetchKnockoutData(league));
        channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'knockout_matches', filter: `league_id=eq.${league}` }, debouncedKO);
    }
    channel.subscribe();
    appState.channel = channel;
}

export async function switchLeague(league) {
    appState.currentLeague = league;
    renderSkeletonTable();
    renderSkeletonMatches();
    dom.matchesContainer.innerHTML = '';
    dom.knockoutSection.innerHTML = '';
    
    try {
        if (!appState.config[league]) {
            const { data, error } = await supabase.from('leagues').select('*').eq('id', league).single();
            if (error) throw error;
            if (data) appState.config[league] = data;
        }
        const currentConfig = appState.config[league];
        setupLeagueUI(league, currentConfig);
        renderTable(league);
        await fetchLeagueData(league);
        if (currentConfig.has_knockout_stage) await fetchKnockoutData(league);
        else appState.currentLeagueKnockoutMatches = [];
        setupLeagueListeners(league);
    } catch (error) {
        console.error(error);
        if (dom.leagueViewContainer) dom.leagueViewContainer.innerHTML = `<div class="empty-state">Failed to load league.</div>`;
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

    const visualLeftScore = parseInt(form.querySelector('.score-home').value, 10);
    const visualRightScore = parseInt(form.querySelector('.score-away').value, 10);

    if (isNaN(visualLeftScore) || isNaN(visualRightScore) || visualLeftScore < 0 || visualRightScore < 0) {
        showFeedback('Please enter valid scores.', false);
        button.classList.remove('is-loading');
        button.disabled = false;
        return;
    }

    card.classList.remove('is-editing');

    const isReversed = form.dataset.isReversed === 'true';
    let dbHomeScore = isReversed ? visualRightScore : visualLeftScore;
    let dbAwayScore = isReversed ? visualLeftScore : visualRightScore;

    let dbHomeTeam, dbAwayTeam;

    if (matchType === 'league') {
        dbHomeTeam = isReversed ? card.dataset.away : card.dataset.home;
        dbAwayTeam = isReversed ? card.dataset.home : card.dataset.away;
    } else {

        dbHomeTeam = form.dataset.homeTeam;
        dbAwayTeam = form.dataset.awayTeam;
        dbHomeScore = visualLeftScore; 
        dbAwayScore = visualRightScore;
    }

    const matchData = {
        id: docId,
        homeScore: dbHomeScore,
        awayScore: dbAwayScore,
        homeTeam: dbHomeTeam,
        awayTeam: dbAwayTeam,
        league_id: appState.currentLeague
    };

    const tableName = matchType === 'league' ? 'matches' : 'knockout_matches';
    
    if (matchType === 'league') {
        matchData.timestamp = new Date().toISOString();
    } else {
        matchData.stage = docId.split('-')[0];
    }

    try {
        const { error } = await supabase.from(tableName).upsert(matchData);
        if (error) throw error;
        showFeedback('Match updated successfully!', true);

        const targetArray = matchType === 'league' ? appState.currentLeagueMatches : appState.currentLeagueKnockoutMatches;
        const matchIndex = targetArray.findIndex(m => m.id === docId);

        if (matchIndex > -1) {
            targetArray[matchIndex] = { ...targetArray[matchIndex], ...matchData };
        } else {
            targetArray.push(matchData);
        }

        if (matchType === 'league') processLeagueChanges(appState.currentLeagueMatches);
        else generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);

    } catch (error) {
        showFeedback(`Error: ${error.message}.`, false);
    } finally {
        button.classList.remove('is-loading');
        button.disabled = false;
    }
}

export async function handleDelete(docId, matchType) {
    if (!appState.isAdmin) return showFeedback('Permission denied.', false);
    const tableName = matchType === 'league' ? 'matches' : 'knockout_matches';
    try {
        const { error } = await supabase.from(tableName).delete().eq('id', docId);
        if (error) throw error;
        showFeedback('Match deleted', true);
        if (matchType === 'league') {
            appState.currentLeagueMatches = appState.currentLeagueMatches.filter(m => m.id !== docId);
            processLeagueChanges(appState.currentLeagueMatches);
        } else {
            appState.currentLeagueKnockoutMatches = appState.currentLeagueKnockoutMatches.filter(m => m.id !== docId);
            generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
        }
    } catch (e) { showFeedback(`Error: ${e.message}`, false); }
}