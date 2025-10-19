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
                <div class="match-team home-team"><div class="team-logo-placeholder"></div><div class="text-placeholder"></div></div>
                <div class="match-result"><div class="text-placeholder" style="width: 50px;"></div></div>
                <div class="match-team away-team"><div class="text-placeholder"></div><div class="team-logo-placeholder"></div></div>
            </div>
        `;
    }
    dom.matchDayContainer.innerHTML = skeletonHTML;
}

function populateTeamSearchDropdown(league) {
    const teams = appState.config[league]?.teams || [];
    teams.sort();
    dom.teamSearchSelect.innerHTML = '<option value="">Filter by Team</option>';
    teams.forEach(team => dom.teamSearchSelect.add(new Option(team, team)));
}

export function generateMatchDay(league) {
    const config = appState.config[league];
    if (!config || !config.teams) {
        dom.matchDayContainer.innerHTML = '<p>League configuration not loaded or no teams found.</p>';
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


function syncMatchContainerDOM(fixturesToShow, allMatches, isTeamFilter = false) {
    const existingCards = new Map(
        Array.from(dom.matchDayContainer.children).map(card => [card.dataset.docId, card])
    );
    const requiredCardIds = new Set(fixturesToShow.map(f => generateMatchId(f.home, f.away)));

    for (const [docId, card] of existingCards.entries()) {
        if (!requiredCardIds.has(docId)) {
            card.remove();
        }
    }
    
    fixturesToShow.forEach((fixture, index) => {
        const docId = generateMatchId(fixture.home, fixture.away);
        const playedMatch = allMatches.find(m => m.id === docId);
        const existingCard = existingCards.get(docId);

        if (existingCard) {
            updateMatchCard(existingCard, playedMatch, isTeamFilter ? fixture.dayNumber : null);
        } else {
            const newCardHTML = renderMatchCard(fixture, playedMatch, isTeamFilter ? fixture.dayNumber : null);
            dom.matchDayContainer.insertAdjacentHTML('beforeend', newCardHTML);
        }
    });
}


function updateMatchCard(cardElement, playedMatch, dayNumber = null) {
    const isPlayed = !!playedMatch;
    const homeScore = isPlayed ? playedMatch.homeScore : null;
    const awayScore = isPlayed ? playedMatch.awayScore : null;

    cardElement.classList.toggle('played', isPlayed);
    
    const resultContainer = cardElement.querySelector('.match-result');
    resultContainer.innerHTML = isPlayed
        ? `<span class="score-home">${homeScore}</span><span>-</span><span class="score-away">${awayScore}</span>`
        : `<span class="score-pending">VS</span>`;

    const form = cardElement.querySelector('.match-score-form');
    if (form) {
        form.querySelector('.score-home').value = homeScore ?? '';
        form.querySelector('.score-away').value = awayScore ?? '';
    }
    
    const actionsContainer = cardElement.querySelector('.match-actions');
    if (appState.isAdmin && actionsContainer) {
        const deleteBtn = actionsContainer.querySelector('.btn-delete');
        if (isPlayed && !deleteBtn) {
            const newDeleteBtn = document.createElement('button');
            newDeleteBtn.type = 'button';
            newDeleteBtn.className = 'btn btn-delete';
            newDeleteBtn.dataset.docId = cardElement.dataset.docId;
            newDeleteBtn.textContent = 'Delete';
            actionsContainer.insertBefore(newDeleteBtn, actionsContainer.querySelector('.btn-save'));
        } else if (!isPlayed && deleteBtn) {
            deleteBtn.remove();
        }
    }

    const dayIndicator = cardElement.querySelector('.match-day-indicator');
    if (dayNumber && !dayIndicator) {
        cardElement.insertAdjacentHTML('afterbegin', `<div class="match-day-indicator">Day ${dayNumber}</div>`);
    } else if (!dayNumber && dayIndicator) {
        dayIndicator.remove();
    }
}


function renderMatchCard(fixture, playedMatch, dayNumber = null) {
    const isPlayed = !!playedMatch;
    const docId = generateMatchId(fixture.home, fixture.away);
    const homeScore = isPlayed ? playedMatch.homeScore : null;
    const awayScore = isPlayed ? playedMatch.awayScore : null;
    
    const adminActionsHTML = appState.isAdmin ? `
        <div class="match-actions">
            <button type="button" class="btn btn-edit">${isPlayed ? 'Edit' : 'Add Score'}</button>
            ${isPlayed ? `<button type="button" class="btn btn-delete" data-doc-id="${docId}">Delete</button>` : ''}
            <button type="submit" form="${docId}-form" class="btn btn-save"><span class="btn-text">Save</span></button>
            <button type="button" class="btn btn-cancel"><span class="btn-text">Cancel</span></button>
        </div>
    ` : '';

    return `
        <div class="match-card ${isPlayed ? 'played' : ''}" data-home="${fixture.home}" data-away="${fixture.away}" data-doc-id="${docId}">
            ${dayNumber ? `<div class="match-day-indicator">Day ${dayNumber}</div>` : ''}
            <div class="match-team home-team">
                <img data-src="images/logos/${getTeamSlug(fixture.home)}.webp" alt="${fixture.home}" class="team-logo lazyload">
                <span>${fixture.home}</span>
            </div>
            <div class="match-result">
                ${isPlayed ? `<span class="score-home">${homeScore}</span><span>-</span><span class="score-away">${awayScore}</span>` : `<span class="score-pending">VS</span>`}
            </div>
            <form class="match-score-form" id="${docId}-form" data-doc-id="${docId}">
                <label for="${docId}-home-score" class="visually-hidden">Home Score</label>
                <input type="number" id="${docId}-home-score" class="score-home" min="0" value="${homeScore ?? ''}" required>
                <span>-</span>
                <label for="${docId}-away-score" class="visually-hidden">Away Score</label>
                <input type="number" id="${docId}-away-score" class="score-away" min="0" value="${awayScore ?? ''}" required>
            </form>
            <div class="match-team away-team">
                <span>${fixture.away}</span>
                <img data-src="images/logos/${getTeamSlug(fixture.away)}.webp" alt="${fixture.away}" class="team-logo lazyload">
            </div>
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