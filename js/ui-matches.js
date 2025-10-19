import { dom } from './dom.js';
import { appState } from './state.js';
import { getTeamSlug, generateMatchId } from './utils.js';

export function updateUIFromConfig(config) {
    dom.leagueLogo.src = config.logo ? `images/logos/${config.logo}` : '';
    dom.leagueLogo.alt = config.name ? `${config.name} Logo` : 'League Logo';
    dom.matchDayTitle.textContent = `${config.name || 'N/A'} Match Day`;
    populateTeamSearchDropdown(appState.currentLeague);
}

export function renderSkeletonMatches() {
    let skeletonHTML = '';
    for (let i = 0; i < 6; i++) {
        skeletonHTML += `
            <div class="match-card skeleton">
                <div class="match-team home-team">
                    <div class="team-logo-placeholder"></div>
                    <div class="text-placeholder"></div>
                </div>
                <div class="match-result">
                    <div class="text-placeholder" style="width: 50px;"></div>
                </div>
                <div class="match-team away-team">
                    <div class="text-placeholder"></div>
                    <div class="team-logo-placeholder"></div>
                </div>
            </div>
        `;
    }
    dom.matchDayContainer.innerHTML = skeletonHTML;
}

function populateTeamSearchDropdown(league) {
    const teams = appState.config[league]?.teams || [];
    teams.sort();
    dom.teamSearchSelect.innerHTML = '<option value="">Filter by Team</option>';
    teams.forEach(team => {
        dom.teamSearchSelect.add(new Option(team, team));
    });
}

export function generateMatchDay(league) {
    const config = appState.config[league];
    if (!config || !config.teams) {
        dom.matchDayContainer.innerHTML = '<p>League configuration not loaded.</p>';
        return;
    }
    const teams = [...config.teams];
    if (teams.length < 2) {
        dom.matchDayContainer.innerHTML = '<p>Not enough teams for fixtures.</p>';
        return;
    }

    const localFixtures = [];
    const numDays = config.numberOfMatchDays || 8;
    const n = teams.length;
    for (let day = 1; day <= numDays; day++) {
        const dayFixtures = [];
        for (let i = 0; i < n / 2; i++) {
            const home = teams[i];
            const away = teams[n - 1 - i];
            dayFixtures.push(day % 2 === 0 ? { home, away } : { home: away, away: home });
        }
        localFixtures.push(dayFixtures);
        teams.splice(1, 0, teams.pop());
    }
    appState.fixtures[league] = localFixtures;

    dom.daySelector.innerHTML = '';
    for (let i = 1; i <= numDays; i++) {
        dom.daySelector.add(new Option(`Day ${i}`, i));
    }
}

function renderMatchCard(fixture, allMatches, dayNumber) {
    const playedMatch = allMatches.find(m => 
        (m.homeTeam === fixture.home && m.awayTeam === fixture.away)
    );

    const isPlayed = !!playedMatch;
    const docId = generateMatchId(fixture.home, fixture.away);
    const homeScore = isPlayed ? playedMatch.homeScore : null;
    const awayScore = isPlayed ? playedMatch.awayScore : null;
    
    const homeTeamLogo = getTeamSlug(fixture.home);
    const awayTeamLogo = getTeamSlug(fixture.away);
    
    const cardClasses = `match-card ${isPlayed ? 'played' : ''}`;
    const dayIndicatorHTML = dayNumber ? `<div class="match-day-indicator">Day ${dayNumber}</div>` : '';
    
    const adminActionsHTML = appState.isAdmin ? `
        <div class="match-actions">
            <button type="button" class="btn btn-edit">${isPlayed ? 'Edit' : 'Add Score'}</button>
            
            <!-- DELETE BUTTON LOGIC RE-ADDED -->
            ${isPlayed ? `<button type="button" class="btn btn-delete" data-doc-id="${docId}">Delete</button>` : ''}
            
            <button type="submit" form="${docId}-form" class="btn btn-save"><span class="btn-text">Save</span></button>
            <button type="button" class="btn btn-cancel"><span class="btn-text">Cancel</span></button>
        </div>
    ` : '';

    return `
        <div class="${cardClasses}" data-home="${fixture.home}" data-away="${fixture.away}">
            ${dayIndicatorHTML}
            <div class="match-team home-team">
                <img data-src="images/logos/${homeTeamLogo}.webp" alt="${fixture.home}" class="team-logo lazyload">
                <span>${fixture.home}</span>
            </div>
            
            <div class="match-result">
                ${isPlayed ? `
                    <span class="score-home">${homeScore}</span>
                    <span>-</span>
                    <span class="score-away">${awayScore}</span>
                ` : `<span class="score-pending">VS</span>`}
            </div>

            <form class="match-score-form" id="${docId}-form" data-home="${fixture.home}" data-away="${fixture.away}" data-doc-id="${docId}">
                <label for="${docId}-home-score" class="visually-hidden">Home Score</label>
                <input type="number" id="${docId}-home-score" class="score-home" min="0" value="${homeScore ?? ''}" required>
                <span>-</span>
                <label for="${docId}-away-score" class="visually-hidden">Away Score</label>
                <input type="number" id="${docId}-away-score" class="score-away" min="0" value="${awayScore ?? ''}" required>
            </form>

            <div class="match-team away-team">
                <span>${fixture.away}</span>
                <img data-src="images/logos/${awayTeamLogo}.webp" alt="${fixture.away}" class="team-logo lazyload">
            </div>
            ${adminActionsHTML}
        </div>
    `;
}  

export function displayMatchesForDay(dayNumber, allMatches = []) {
    const league = appState.currentLeague;
    const dayIndex = dayNumber - 1;
    const fixturesForDay = appState.fixtures[league]?.[dayIndex];

    if (!fixturesForDay) {
        dom.matchDayContainer.innerHTML = '<p class="empty-state" style="display:block;">No matches scheduled for this day.</p>';
        return;
    }

    const html = fixturesForDay.map(fixture => renderMatchCard(fixture, allMatches)).join('');
    dom.matchDayContainer.innerHTML = html;
}

export function filterMatches() {
    const allMatches = appState.currentLeagueMatches;
    const selectedTeam = dom.teamSearchSelect.value;
    
    if (selectedTeam === "") {
        dom.daySelector.disabled = false;
        const selectedDay = parseInt(dom.daySelector.value);
        displayMatchesForDay(selectedDay, allMatches);
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
        const teamFixturesForDay = dayFixtures.filter(fixture => 
            fixture.home === selectedTeam || fixture.away === selectedTeam
        );

        teamFixturesForDay.forEach(fixture => {
            html += renderMatchCard(fixture, allMatches, dayNumber);
        });
    });

    if (html === '') {
        dom.matchDayContainer.innerHTML = '';
        dom.noSearchResults.style.display = 'block';
    } else {
        dom.matchDayContainer.innerHTML = html;
        dom.noSearchResults.style.display = 'none';
    }
}