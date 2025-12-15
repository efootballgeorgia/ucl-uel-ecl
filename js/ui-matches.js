import { dom, appState } from './main.js';
import { getTeamSlug, generateMatchId, renderAdminActionsHTML, renderTeamLogoHTML } from './ui-feedback.js';

export function updateUIFromConfig(config) {
    dom.leagueLogo.src = config.logo ? `images/leagues/${config.logo}` : '';
    dom.leagueLogo.alt = config.name ? `${config.name} Logo` : 'League Logo';
    dom.matchesTitle.textContent = `${config.name || 'N/A'} FIXTURES`;
    populateTeamSearchDropdown(appState.currentLeague);
    const knockoutTab = document.getElementById('tab-knockout');
    if (knockoutTab) {
        const hasKnockout = config.has_knockout_stage === true;
        knockoutTab.style.display = hasKnockout ? 'block' : 'none';
        if (!hasKnockout && knockoutTab.classList.contains('active')) {
            knockoutTab.classList.remove('active');
            dom.knockoutSection.classList.remove('active');
            const leagueTab = document.getElementById('tab-league');
            if (leagueTab) {
                leagueTab.classList.add('active');
                if (dom.leagueSection) dom.leagueSection.classList.add('active');
            }
        }
    }
}

export function renderSkeletonMatches() {
    let skeletonHTML = '';
    for (let i = 0; i < 6; i++) {
        skeletonHTML += `<div class="match-card skeleton"><div class="card-content"></div></div>`;
    }
    dom.matchesContainer.innerHTML = skeletonHTML;
}

function populateTeamSearchDropdown(league) {
    const config = appState.config[league];
    const teams = config?.teams || [];
    const sortedTeams = [...teams].sort();

    dom.teamSearchSelect.innerHTML = '<option value="">Filter by Team</option>';
    sortedTeams.forEach(team => dom.teamSearchSelect.add(new Option(team, team)));
}

function generateSingleGroupFixtures(teams) {
    if (!teams || teams.length !== 4) return [];
    const [t1, t2, t3, t4] = teams;
    return [
        [{ home: t1, away: t4 }, { home: t2, away: t3 }],
        [{ home: t1, away: t3 }, { home: t4, away: t2 }],
        [{ home: t1, away: t2 }, { home: t3, away: t4 }]
    ];
}

export function generateMatches(league) {
    const config = appState.config[league];
    if (!config) {
        dom.matchesContainer.innerHTML = '<p>League configuration not loaded.</p>';
        return;
    }

    if (config.group_structure) {
        let groupGroups = config.group_structure;
        if (typeof groupGroups === 'string') {
            try { groupGroups = JSON.parse(groupGroups); } catch (e) { }
        }

        const numberOfMatches = config.numberOfMatches || 3;
        const globalFixtures = Array.from({ length: numberOfMatches }, () => []);

        const sortedGroupKeys = Object.keys(groupGroups).sort();

        sortedGroupKeys.forEach(groupName => {
            const teams = groupGroups[groupName];
            if (Array.isArray(teams) && teams.length === 4) {
                const groupFixtures = generateSingleGroupFixtures(teams);
                groupFixtures.forEach((dayFix, dayIndex) => {
                    if (globalFixtures[dayIndex]) {
                        globalFixtures[dayIndex].push(...dayFix);
                    }
                });
            }
        });

        appState.fixtures[league] = globalFixtures;
        setupDaySelector(numberOfMatches);
        return;
    }

    if (!config.teams || config.teams.length < 2) {
        dom.matchesContainer.innerHTML = '<p>Not enough teams for fixtures.</p>';
        return;
    }

    const teams = [...config.teams];
    const localFixtures = [];
    const numDays = config.numberOfMatches || 8;
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
    setupDaySelector(numDays);
}

function setupDaySelector(numDays) {
    dom.daySelector.innerHTML = '';
    for (let i = 1; i <= numDays; i++) {
        dom.daySelector.add(new Option(`Day ${i}`, i));
    }
}

function syncMatchContainerDOM(fixturesToShow, allMatches, isTeamFilter = false) {
    const container = dom.matchesContainer;

    const existingCards = new Map(
        Array.from(container.children).map(card => [card.dataset.fixtureId, card])
    );

    const requiredFixtureIds = new Set(fixturesToShow.map(f => generateMatchId(f.home, f.away)));

    for (const [fixId, card] of existingCards.entries()) {
        if (!requiredFixtureIds.has(fixId)) {
            card.remove();
        }
    }

    fixturesToShow.forEach((fixture) => {
        const fixtureId = generateMatchId(fixture.home, fixture.away);
        const reverseId = generateMatchId(fixture.away, fixture.home);

        let playedMatch = allMatches.find(m => m.id === fixtureId || m.id === reverseId);

        let isReversed = false;
        if (playedMatch && playedMatch.homeTeam === fixture.away) {
            isReversed = true;
        }

        const dayNumber = isTeamFilter ? fixture.dayNumber : null;

        const newCardHTML = renderMatchCard(fixture, playedMatch, isReversed, fixtureId, dayNumber);

        const existingCard = existingCards.get(fixtureId);
        if (existingCard) {
            existingCard.outerHTML = newCardHTML;
        } else {
            container.insertAdjacentHTML('beforeend', newCardHTML);
        }
    });
}

function renderMatchCard(fixture, playedMatch, isReversed, fixtureId, dayNumber = null) {
    const isPlayed = !!playedMatch;

    const realDbId = isPlayed ? playedMatch.id : fixtureId;
    const visualHomeScore = isPlayed
        ? (isReversed ? playedMatch.awayScore : playedMatch.homeScore)
        : '';

    const visualAwayScore = isPlayed
        ? (isReversed ? playedMatch.homeScore : playedMatch.awayScore)
        : '';

    const adminActionsHTML = renderAdminActionsHTML(realDbId, isPlayed);

    const contentHTML = `
        <div class="card-content">
            <div class="team-row">
                <div class="team-info">
                    ${renderTeamLogoHTML(fixture.home)}
                    <span>${fixture.home}</span>
                </div>
                <span class="team-score">${visualHomeScore}</span>
            </div>
            <div class="team-row">
                <div class="team-info">
                    ${renderTeamLogoHTML(fixture.away)}
                    <span>${fixture.away}</span>
                </div>
                <span class="team-score">${visualAwayScore}</span>
            </div>
        </div>
    `;

    return `
        <div class="match-card ${isPlayed ? 'played' : ''}" 
             data-fixture-id="${fixtureId}" 
             data-home="${fixture.home}" 
             data-away="${fixture.away}" 
             data-doc-id="${realDbId}" 
             data-type="league">
             
            ${dayNumber ? `<div class="match-box-indicator">Day ${dayNumber}</div>` : ''}
            
            ${contentHTML} 

            <!-- Form handles specific inputs -->
            <form class="score-form" id="${realDbId}-form" 
                  data-doc-id="${realDbId}" 
                  data-is-reversed="${isReversed}">
                
                <label for="${realDbId}-left" class="visually-hidden">Home Score</label>
                <!-- We map classes purely visually here: score-left vs score-right -->
                <input type="number" id="${realDbId}-left" class="score-home" min="0" value="${visualHomeScore}" required>
                <span>-</span>
                <label for="${realDbId}-right" class="visually-hidden">Away Score</label>
                <input type="number" id="${realDbId}-right" class="score-away" min="0" value="${visualAwayScore}" required>
            </form>
            ${adminActionsHTML}
        </div>
    `;
}

export function filterMatches() {
    const allMatches = appState.currentLeagueMatches || [];
    const selectedTeam = dom.teamSearchSelect.value;
    const league = appState.currentLeague;
    const allFixtures = appState.fixtures[league] || [];

    let fixturesToShow = [];
    let isTeamView = false;

    if (selectedTeam === "") {
        dom.daySelector.disabled = false;
        const val = dom.daySelector.value;
        const selectedDay = val ? parseInt(val, 10) : 1;
        fixturesToShow = allFixtures[selectedDay - 1] || [];
        dom.clearSearchBtn.style.display = 'none';
    } else {
        dom.daySelector.disabled = true;
        isTeamView = true;
        allFixtures.forEach((dayFixtures, dayIndex) => {
            dayFixtures.forEach(fixture => {
                if (fixture.home === selectedTeam || fixture.away === selectedTeam) {
                    fixturesToShow.push({ ...fixture, dayNumber: dayIndex + 1 });
                }
            });
        });
        dom.clearSearchBtn.style.display = 'inline-block';
    }

    if (dom.noSearchResults) {
        dom.noSearchResults.style.display = (fixturesToShow.length === 0 && allFixtures.length > 0) ? 'block' : 'none';
    }

    syncMatchContainerDOM(fixturesToShow, allMatches, isTeamView);
}