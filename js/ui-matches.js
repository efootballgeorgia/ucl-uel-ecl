import { dom , appState,} from './main.js';
import { getTeamSlug, generateMatchId, renderAdminActionsHTML } from './ui-feedback.js';

export function updateUIFromConfig(config) {
    dom.leagueLogo.src = config.logo ? `images/logos/${config.logo}` : '';
    dom.leagueLogo.alt = config.name ? `${config.name} Logo` : 'League Logo';
    dom.matchesTitle.textContent = `${config.name || 'N/A'} FIXTURES`;
    populateTeamSearchDropdown(appState.currentLeague);
}

export function renderSkeletonMatches() {
    let skeletonHTML = '';
    for (let i = 0; i < 6; i++) {
        skeletonHTML += `<div class="match-card skeleton"><div class="card-content"></div></div>`;
    }
    dom.matchesContainer.innerHTML = skeletonHTML;
}

function populateTeamSearchDropdown(league) {
    const teams = appState.config[league]?.teams || [];
    teams.sort();
    dom.teamSearchSelect.innerHTML = '<option value="">Filter by Team</option>';
    teams.forEach(team => dom.teamSearchSelect.add(new Option(team, team)));
}

export function generateMatches(league) {
    const config = appState.config[league];
    if (!config || !config.teams) {
        dom.matchesContainer.innerHTML = '<p>League configuration not loaded or no teams found.</p>';
        return;
    }

    const teams = [...config.teams];
    
    if (teams.length < 2) {
        dom.matchesContainer.innerHTML = '<p>Not enough teams for fixtures.</p>';
        return;
    }

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

    dom.daySelector.innerHTML = '';
    for (let i = 1; i <= numDays; i++) {
        dom.daySelector.add(new Option(`Day ${i}`, i));
    }
}


function syncMatchContainerDOM(fixturesToShow, allMatches, isTeamFilter = false) {
    const container = dom.matchesContainer;
    const existingCards = new Map(
        Array.from(container.children).map(card => [card.dataset.docId, card])
    );
    const requiredCardIds = new Set(fixturesToShow.map(f => generateMatchId(f.home, f.away)));

    for (const [docId, card] of existingCards.entries()) {
        if (!requiredCardIds.has(docId)) {
            card.remove();
        }
    }
    
    fixturesToShow.forEach((fixture) => {
        const docId = generateMatchId(fixture.home, fixture.away);
        const playedMatch = allMatches.find(m => m.id === docId);
        const dayNumber = isTeamFilter ? fixture.dayNumber : null;
        const newCardHTML = renderMatchCard(fixture, playedMatch, dayNumber);

        const existingCard = existingCards.get(docId);
        if (existingCard) {
            existingCard.outerHTML = newCardHTML;
        } else {
            container.insertAdjacentHTML('beforeend', newCardHTML);
        }
    });
}

function renderMatchCard(fixture, playedMatch, dayNumber = null) {
    const isPlayed = !!playedMatch;
    const docId = generateMatchId(fixture.home, fixture.away);
    const homeScore = isPlayed ? playedMatch.homeScore : null;
    const awayScore = isPlayed ? playedMatch.awayScore : null;

    const adminActionsHTML = renderAdminActionsHTML(docId, isPlayed);

    const contentHTML = isPlayed ? `
        <div class="card-content">
            <div class="team-row">
                <div class="team-info">
                    <img data-src="images/logos/${getTeamSlug(fixture.home)}.webp" alt="${fixture.home}" class="team-logo lazyload">
                    <span>${fixture.home}</span>
                </div>
                <span class="team-score">${homeScore}</span>
            </div>
            <div class="team-row">
                <div class="team-info">
                    <img data-src="images/logos/${getTeamSlug(fixture.away)}.webp" alt="${fixture.away}" class="team-logo lazyload">
                    <span>${fixture.away}</span>
                </div>
                <span class="team-score">${awayScore}</span>
            </div>
        </div>
    ` : `<div class="card-pending">VS</div>`;

    return `
        <div class="match-card ${isPlayed ? 'played' : ''}" data-home="${fixture.home}" data-away="${fixture.away}" data-doc-id="${docId}" data-type="league">
            ${dayNumber ? `<div class="match-box-indicator">Day ${dayNumber}</div>` : ''}
            ${contentHTML}
            <form class="score-form" id="${docId}-form" data-doc-id="${docId}">
                <label for="${docId}-home-score" class="visually-hidden">Home Score</label>
                <input type="number" id="${docId}-home-score" class="score-home" min="0" value="${homeScore ?? ''}" required>
                <span>-</span>
                <label for="${docId}-away-score" class="visually-hidden">Away Score</label>
                <input type="number" id="${docId}-away-score" class="score-away" min="0" value="${awayScore ?? ''}" required>
            </form>
            ${adminActionsHTML}
        </div>
    `;
}

export function filterMatches() {
    const allMatches = appState.currentLeagueMatches;
    const selectedTeam = dom.teamSearchSelect.value;
    const league = appState.currentLeague;
    const allFixtures = appState.fixtures[league] || [];

    let fixturesToShow = [];
    let isTeamView = false;

    if (selectedTeam === "") {
        dom.daySelector.disabled = false;
        const selectedDay = parseInt(dom.daySelector.value, 10);
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
    
    dom.noSearchResults.style.display = fixturesToShow.length === 0 ? 'block' : 'none';
    syncMatchContainerDOM(fixturesToShow, allMatches, isTeamView);
}