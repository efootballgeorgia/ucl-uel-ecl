import { dom } from './dom.js';
import { appState } from './state.js';

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
        (m.homeTeam === fixture.home && m.awayTeam === fixture.away) ||
        (m.homeTeam === fixture.away && m.awayTeam === fixture.home)
    );

    const isPlayed = !!playedMatch;
    const docId = isPlayed ? playedMatch.id : '';
    let homeScore = '';
    let awayScore = '';

    if (isPlayed) {
        const isHomeTeamCorrect = fixture.home === playedMatch.homeTeam;
        homeScore = isHomeTeamCorrect ? playedMatch.homeScore : playedMatch.awayScore;
        awayScore = isHomeTeamCorrect ? playedMatch.awayScore : playedMatch.homeScore;
    }
    
    const homeTeamLogo = fixture.home.toLowerCase().replace(/ /g, '-');
    const awayTeamLogo = fixture.away.toLowerCase().replace(/ /g, '-');
    
    const cardClasses = `match-card ${isPlayed ? 'played' : ''}`;
    const dayIndicatorHTML = dayNumber ? `<div class="match-day-indicator">Day ${dayNumber}</div>` : '';

    return `
        <div class="${cardClasses}" data-home="${fixture.home}" data-away="${fixture.away}">
            ${dayIndicatorHTML}
            <div class="match-team home-team">
                <img src="images/logos/${homeTeamLogo}.webp" alt="${fixture.home}" class="team-logo">
                <span>${fixture.home}</span>
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
                <form class="match-score-form" data-home="${fixture.home}" data-away="${fixture.away}" data-doc-id="${docId}">
                    <label for="${fixture.home}-${fixture.away}-score-home" class="visually-hidden">Home Score</label>
                    <input type="number" id="${fixture.home}-${fixture.away}-score-home" class="score-home" min="0" value="${homeScore}" required>
                    <span>-</span>
                    <label for="${fixture.home}-${fixture.away}-score-away" class="visually-hidden">Away Score</label>
                    <input type="number" id="${fixture.home}-${fixture.away}-score-away" class="score-away" min="0" value="${awayScore}" required>
                    <button type="submit" class="btn btn-small">Save</button>
                </form>
            ` : ''}

            <div class="match-team away-team">
                <img src="images/logos/${awayTeamLogo}.webp" alt="${fixture.away}" class="team-logo">
                <span>${fixture.away}</span>
            </div>
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