// js/supabase.js

import { supabase } from './config.js';
import { appState } from './state.js';
import { showFeedback } from './ui-feedback.js';
import { generateKnockoutStage } from './ui-knockout.js';
import { displayMatchesForDay, renderSkeletonMatches, updateUIFromConfig } from './ui-matches.js';
import { renderTable, sortTable, renderSkeletonTable, updateTeamStatsFromSnapshot } from "./ui-table.js";

async function fetchLeagueConfig(leagueId) {
    const { data: leagueData, error } = await supabase
        .from('leagues')
        .select('name, logo_url, number_of_match_days, qualification_zones')
        .eq('id', leagueId)
        .single(); 

    if (error) {
        console.error("Error fetching league config:", error);
        return null;
    }
    return leagueData;
}

async function fetchTeamsForLeague(leagueId) {
    const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', leagueId)
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching teams:", error);
        return [];
    }
    appState.teamNameToIdMap = new Map(data.map(t => [t.name, t.id]));
    return data.map(t => t.name);
}

async function processLeagueTable(leagueId) {
    const { data: matches, error } = await supabase
        .from('matches')
        .select(`
            *,
            home_team:teams!matches_home_team_id_fkey ( name ),
            away_team:teams!matches_away_team_id_fkey ( name )
        `)
        .eq('league_id', leagueId)
        .not('home_score', 'is', null); // Only fetch played matches

    if (error) {
        console.error("Error fetching league matches for table processing:", error);
        return;
    }

    const formattedMatches = matches.map(m => ({
        ...m,
        homeTeam: m.home_team.name,
        awayTeam: m.away_team.name
    }));

    appState.currentLeagueMatches = formattedMatches;
    updateTeamStatsFromSnapshot(formattedMatches);
    sortTable();

    const rows = Array.from(document.querySelectorAll('#leagueTable tbody tr:not(.separator)'));
    appState.sortedTeams = rows.map(row => row.dataset.team);
    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
}

export async function switchLeague(league) {
    appState.currentLeague = league;

    if (appState.unsubscribe) {
        supabase.removeChannel(appState.unsubscribe);
    }
    if (appState.unsubscribeKnockout) {
        supabase.removeChannel(appState.unsubscribeKnockout);
    }

    document.body.className = `${league}-theme`;
    renderSkeletonTable();
    renderSkeletonMatches();

    try {
        const leagueConfig = await fetchLeagueConfig(league);
        if (!leagueConfig) {
            throw new Error(`Configuration for league '${league}' not found in the database.`);
        }

        const teams = await fetchTeamsForLeague(league);

        appState.config[league] = {
            name: leagueConfig.name,
            logo: leagueConfig.logo_url,
            numberOfMatchDays: leagueConfig.number_of_match_days,
            qualificationZones: leagueConfig.qualification_zones,
            teams: teams,
        };

        updateUIFromConfig(appState.config[league]);
        renderTable(league);
        
        await processLeagueTable(league);
        await fetchMatchesForDay(appState.currentDay);
        await fetchKnockoutMatches(league);

        appState.unsubscribe = supabase.channel(`public:matches:league_id=eq.${league}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                processLeagueTable(league);
                fetchMatchesForDay(appState.currentDay);
            })
            .subscribe();

        appState.unsubscribeKnockout = supabase.channel(`public:knockout_matches:league_id=eq.${league}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'knockout_matches' }, () => {
                fetchKnockoutMatches(league);
            })
            .subscribe();

    } catch (error) {
        console.error(`Error loading data for ${league}:`, error);
        showFeedback(`Could not load data for ${league}.`, false);
    }
}

async function fetchKnockoutMatches(league) {
    const { data, error } = await supabase
        .from('knockout_matches')
        .select('*')
        .eq('league_id', league);
    
    if(error) {
        console.error("Error fetching knockout matches:", error);
        return;
    }
    appState.currentLeagueKnockoutMatches = data;
    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
}

export async function fetchMatchesForDay(day) {
    const { data, error } = await supabase
        .from('matches')
        .select(`
            *,
            home_team:teams!matches_home_team_id_fkey ( name ),
            away_team:teams!matches_away_team_id_fkey ( name )
        `)
        .eq('league_id', appState.currentLeague)
        .eq('match_day', day);

    if (error) {
        console.error("Error fetching matches for day:", error);
        displayMatchesForDay(day, []);
        return;
    }
    const formattedMatches = data.map(m => ({
        ...m,
        homeTeam: m.home_team.name,
        awayTeam: m.away_team.name
    }));

    displayMatchesForDay(day, formattedMatches);
}

export async function handleMatchSubmission(form) {
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);

    const button = form.querySelector('button.btn-save');
    button.textContent = 'Saving...';
    button.disabled = true;

    const matchCard = form.closest('.match-card');
    const homeTeamName = matchCard.dataset.home;
    const awayTeamName = matchCard.dataset.away;
    const match_day = parseInt(form.dataset.matchDay, 10);
    const docId = matchCard.dataset.docId;

    const home_score = parseInt(form.querySelector('.score-home').value, 10);
    const away_score = parseInt(form.querySelector('.score-away').value, 10);

    if (isNaN(home_score) || isNaN(away_score) || home_score < 0 || away_score < 0 || isNaN(match_day)) {
        showFeedback('Please enter valid, non-negative scores.', false);
        button.textContent = 'Save';
        button.disabled = false;
        return;
    }

    const home_team_id = appState.teamNameToIdMap.get(homeTeamName);
    const away_team_id = appState.teamNameToIdMap.get(awayTeamName);

    if (!home_team_id || !away_team_id) {
        showFeedback('Could not find team ID. Please refresh.', false);
        button.textContent = 'Save';
        button.disabled = false;
        return;
    }

    const matchData = {
        league_id: appState.currentLeague,
        match_day,
        home_team_id,
        away_team_id,
        home_score,
        away_score
    };

    if (docId) {
        matchData.id = docId;
    }

    const { error } = await supabase.from('matches').upsert(matchData);

    if (error) {
        showFeedback(`Error saving match: ${error.message}`, false);
        console.error("Supabase error:", error);
    } else {
        showFeedback('Match saved successfully!', true);
    }

    button.textContent = 'Save';
    button.disabled = false;
    matchCard.classList.remove('is-editing');
}

export async function handleMatchDeletion(matchId) {
    if (!appState.isAdmin) {
        return showFeedback('You do not have permission.', false);
    }

    if (!confirm('Are you sure you want to delete this match result? This will remove the score but keep the fixture.')) {
        return;
    }

    const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

    if (error) {
        showFeedback(`Error deleting match: ${error.message}`, false);
        console.error("Supabase delete error:", error);
    } else {
        showFeedback('Match result deleted successfully!', true);
    }
}

export async function handleKnockoutMatchSubmission(e) {
    e.preventDefault();
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);

    const form = e.target;
    const button = form.querySelector('button');
    button.textContent = '...';
    button.disabled = true;

    const matchId = form.dataset.matchId;
    const homeTeamName = form.dataset.homeTeam;
    const awayTeamName = form.dataset.awayTeam;

    const home_team_id = appState.teamNameToIdMap.get(homeTeamName);
    const away_team_id = appState.teamNameToIdMap.get(awayTeamName);
    const home_score = parseInt(form.querySelector(`#${matchId}-home`).value);
    const away_score = parseInt(form.querySelector(`#${matchId}-away`).value);

    if (isNaN(home_score) || isNaN(away_score) || home_score < 0 || away_score < 0) {
        showFeedback('Please enter valid, non-negative scores.', false);
        button.textContent = 'Save';
        button.disabled = false;
        return;
    }
    
    const matchData = {
        id: `${appState.currentLeague}-${matchId}`,
        league_id: appState.currentLeague,
        stage: form.dataset.stage,
        home_team_id,
        away_team_id,
        home_score,
        away_score
    };

    const { error } = await supabase.from('knockout_matches').upsert(matchData);

    if (error) {
        showFeedback(`Error saving result: ${error.message}`, false);
        console.error("Supabase error:", error);
    } else {
        showFeedback('Knockout result saved!', true);
    }

    button.textContent = 'Save';
    button.disabled = false;
}