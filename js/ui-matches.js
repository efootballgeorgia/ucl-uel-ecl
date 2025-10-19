// js/ui-matches.js

import { dom } from './dom.js';
import { appState } from './state.js';
import { fetchMatchesForDay } from './supabase.js';

/**
 * Generates a full round-robin schedule for a given league and stores it in appState.
 * @param {string} league - The ID of the league (e.g., 'ucl').
 */
function generateFixturesForLeague(league) {
    const config = appState.config[league];
    if (!config || !config.teams || config.teams.length < 2) {
        appState.fixtures[league] = [];
        return;
    }

    const teams = [...config.teams];
    const localFixtures = [];
    const numDays = config.numberOfMatchDays || (teams.length - 1);
    
    if (teams.length % 2 !== 0) {
        teams.push(null);
    }
    const n = teams.length;

    for (let day = 0; day < numDays; day++) {
        const dayFixtures = [];
        for (let i = 0; i < n / 2; i++) {
            const home = teams[i];
            const away = teams[n - 1 - i];
            if (home && away) {
                dayFixtures.push(day % 2 === 0 ? { home, away } : { home: away, away: home });
            }
        }
        localFixtures.push(dayFixtures);
        teams.splice(1, 0, teams.pop());
    }
    appState.fixtures[league] = localFixtures;
}

export function updateUIFromConfig(config) {
    dom.leagueLogo.src = config.logo ? `images/logos/${config.logo}` : '';
    dom.leagueLogo.alt = config.name ? `${config.name} Logo` : 'League Logo';
    dom.matchDayTitle.textContent = `${config.name || 'N/A'} Match Day`;
    populateTeamSearchDropdown(appState.currentLeague);

    const numDays = config.numberOfMatchDays || 8;
    dom.daySelector.innerHTML = '';
    for (let i = 1; i <= numDays; i++) {
        dom.daySelector.add(new Option(`Day ${i}`, i));
    }
    dom.daySelector.value = appState.currentDay;
    generateFixturesForLeague(appState.currentLeague);
}

export function renderSkeletonMatches() {
    let skeletonHTML = '';
    for (let i = 0; i < 6; i++) {
        skeletonHTML += `<div class="match-card skeleton"><div class="match-team home-team"><div class="team-logo-placeholder"></div><div class="text-placeholder"></div></div><div class="match-result"><div class="text-placeholder" style="width: 50px;"></div></div><div class="match-team away-team"><div class="text-placeholder"></div><div class="team-logo-placeholder"></div></div></div>`;
    }
    dom.matchDayContainer.innerHTML = skeletonHTML;
}

function populateTeamSearchDropdown(league) {
    const teams = appState.config[league]?.teams || [];
    teams.sort();
    dom.teamSearchSelect.innerHTML = '<option value="">Filter by Team</option>';
    teams.forEach(team => dom.teamSearchSelect.add(new Option(team, team)));
}

function renderMatchCard(fixture, playedMatchData, dayNumber) {
    const { home, away } = fixture;
    const isPlayed = !!playedMatchData;
    const homeScore = isPlayed ? playedMatchData.homeScore : '';
    const awayScore = isPlayed ? playedMatchData.awayScore : '';
    const docId = isPlayed ? playedMatchData.id : '';

    const homeTeamLogo = home.toLowerCase().replace(/ /g, '-');
    const awayTeamLogo = away.toLowerCase().replace(/ /g, '-');
    const cardClasses = `match-card ${isPlayed ? 'played' : ''}`;
    const dayIndicatorHTML = `<div class="match-day-indicator">Day ${dayNumber}</div>`;

    // Store original scores in data attributes for the cancel button functionality
    const originalScores = isPlayed ? `data-original-home-score="${homeScore}" data-original-away-score="${awayScore}"` : '';

    return `
        <div class="${cardClasses}" data-home="${home}" data-away="${away}" data-doc-id="${docId}" ${originalScores}>
            ${dayIndicatorHTML}
            <div class="match-team home-team">
                <img src="images/logos/${homeTeamLogo}.webp" alt="${home}" class="team-logo">
                <span>${home}</span>
            </div>
            
            <div class="match-result">
                ${isPlayed ? `
                    <span class="score-home">${homeScore}</span>
                    <span>-</span>
                    <span class="score-away">${awayScore}</span>
                    ${appState.isAdmin ? `<button class="btn btn-small btn-edit">Edit</button>` : ''}
                ` : `
                    <span class="score-pending">VS</span>
                `}
            </div>

            ${appState.isAdmin ? `
                <form class="match-score-form">
                    <label for="${home}-${away}-score-home" class="visually-hidden">Home Score</label>
                    <input type="number" class="score-home" min="0" value="${homeScore ?? ''}" required>
                    <span>-</span>
                    <label for="${home}-${away}-score-away" class="visually-hidden">Away Score</label>
                    <input type="number" class="score-away" min="0" value="${awayScore ?? ''}" required>
                    
                    <button type="submit" class="btn btn-small btn-save">Save</button>
                    <button type="button" class="btn btn-small btn-cancel">Cancel</button>
                    <button type="button" class="btn btn-small btn-delete" style="background-color: var(--loss-color);">Delete</button>
                </form>
            ` : ''}

            <div class="match-team away-team">
                <img src="images/logos/${awayTeamLogo}.webp" alt="${away}" class="team-logo">
                <span>${away}</span>
            </div>
        </div>
    `;
}

export function displayMatchesForDay(dayNumber, playedMatches = []) {
    const league = appState.currentLeague;
    const fixturesForThisDay = appState.fixtures[league]?.[dayNumber - 1];

    if (!fixturesForThisDay || fixturesForThisDay.length === 0) {
        dom.matchDayContainer.innerHTML = `<p class="empty-state" style="display:block;">Could not generate schedule for Day ${dayNumber}.</p>`;
        return;
    }

    const html = fixturesForThisDay.map(fixture => {
        const playedMatch = playedMatches.find(m =>
            (m.homeTeam === fixture.home && m.awayTeam === fixture.away) ||
            (m.homeTeam === fixture.away && m.awayTeam === fixture.home)
        );
        return renderMatchCard(fixture, playedMatch, dayNumber);
    }).join('');
    dom.matchDayContainer.innerHTML = html;
}

export function filterMatches() {
    const selectedTeam = dom.teamSearchSelect.value;
    if (selectedTeam === "") {
        dom.daySelector.disabled = false;
        appState.currentDay = parseInt(dom.daySelector.value);
        fetchMatchesForDay(appState.currentDay);
        dom.noSearchResults.style.display = 'none';
        dom.clearSearchBtn.style.display = 'none';
        return;
    }
    
    dom.daySelector.disabled = true;
    dom.clearSearchBtn.style.display = 'inline-block';
    const league = appState.currentLeague;
    const allFixtures = appState.fixtures[league] || [];
    let html = '';

    allFixtures.forEach((dayFixtures, dayIndex) => {
        const dayNumber = dayIndex + 1;
        const teamFixturesForDay = dayFixtures.filter(fixture => fixture.home === selectedTeam || fixture.away === selectedTeam);
        teamFixturesForDay.forEach(fixture => {
            const playedMatch = appState.currentLeagueMatches.find(m => (m.match_day === dayNumber) && ((m.homeTeam === fixture.home && m.awayTeam === fixture.away) || (m.homeTeam === fixture.away && m.awayTeam === fixture.home)));
            html += renderMatchCard(fixture, playedMatch, dayNumber);
        });
    });

    dom.matchDayContainer.innerHTML = html || `<p class="empty-state" style="display:block;">No matches found for this team.</p>`;
    dom.noSearchResults.style.display = html ? 'none' : 'block';
}