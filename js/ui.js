import { dom } from './dom.js';
import { appState } from './state.js';
import { handleKnockoutMatchSubmission } from './firestore.js';


// ============================================
// 1. Feedback & General UI
// ============================================

export function showFeedback(message, isSuccess) {
    const messageElement = document.createElement('div');
    messageElement.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
    messageElement.textContent = message;
    dom.feedbackMessage.appendChild(messageElement);

    setTimeout(() => messageElement.classList.add('show'), 10);

    setTimeout(() => {
        messageElement.classList.remove('show');
        messageElement.addEventListener('transitionend', () => messageElement.remove());
    }, 3000);
}

export function showAuthFeedback(message, isSuccess) {
    dom.authFeedbackMessage.textContent = message;
    dom.authFeedbackMessage.style.backgroundColor = isSuccess ? 'var(--win-color)' : 'var(--loss-color)';
    dom.authFeedbackMessage.classList.add('show');
    setTimeout(() => {
        dom.authFeedbackMessage.classList.remove('show');
    }, 3000);
}

export function updateUIFromConfig(config) {
    dom.leagueLogo.src = config.logo ? `images/logos/${config.logo}` : '';
    dom.leagueLogo.alt = config.name ? `${config.name} Logo` : 'League Logo';
    dom.matchDayTitle.textContent = `${config.name || 'N/A'} Match Day`;
    populateTeamSearchDropdown(appState.currentLeague);
}

export function updateAuthUI() {
    if (appState.currentUser) {
        dom.userStatusSpan.textContent = `Logged in`;
        dom.authBtn.style.display = 'none';
        dom.logoutBtn.style.display = 'inline-block';
    } else {
        dom.userStatusSpan.textContent = 'Not logged in';
        dom.authBtn.style.display = 'inline-block';
        dom.logoutBtn.style.display = 'none';
    }
}


// ============================================
// 2. League Table Rendering & Real-time Updates
// ============================================

export function renderSkeletonTable() {
    let skeletonHTML = '';
    for (let i = 0; i < 15; i++) {
        skeletonHTML += `
            <tr class="skeleton">
                <td><div></div></td>
                <td><div></div></td>
                <td><div></div></td>
                <td><div></div></td>
                <td><div></div></td>
                <td><div></div></td>
                <td><div></div></td>
                <td><div></div></td>
                <td><div></div></td>
            </tr>
        `;
    }
    dom.leagueTableBody.innerHTML = skeletonHTML;
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


export function resetTableStats() {
    const rows = dom.leagueTableBody.querySelectorAll('tr:not(.separator)');
    rows.forEach(row => {
        const cells = row.cells;
        cells[2].textContent = '0';
        cells[3].textContent = '0';
        cells[4].textContent = '0';
        cells[5].textContent = '0';
        cells[6].textContent = '0:0';
        cells[7].querySelector('.points').textContent = '0';
        cells[8].querySelector('.form-container').innerHTML = '';
        row.dataset.gd = '0';
    });
}

export function sortTable() {
    const rows = Array.from(dom.leagueTableBody.querySelectorAll('tr:not(.separator)'));
    const league = appState.currentLeague;
    const qualificationZones = appState.config[league]?.qualificationZones || {};

    const key = appState.sortBy;
    const direction = appState.sortDirection === 'asc' ? 1 : -1;

    const columnMap = {
        team: 1, played: 2, wins: 3, draws: 4, losses: 5, points: 7
    };

    rows.sort((a, b) => {
        let valA, valB;

        if (key === 'gd') {
            valA = parseInt(a.dataset.gd) || 0;
            valB = parseInt(b.dataset.gd) || 0;
        } else if (key === 'team') {
            valA = a.dataset.team;
            valB = b.dataset.team;
            return valA.localeCompare(valB) * direction; 
        } else {
            valA = parseInt(a.cells[columnMap[key]].textContent) || 0;
            valB = parseInt(b.cells[columnMap[key]].textContent) || 0;
        }

        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        
        const pointsA = parseInt(a.cells[columnMap.points].textContent) || 0;
        const pointsB = parseInt(b.cells[columnMap.points].textContent) || 0;
        if (pointsA !== pointsB) return pointsB - pointsA;

        const gdA = parseInt(a.dataset.gd) || 0;
        const gdB = parseInt(b.dataset.gd) || 0;
        if (gdA !== gdB) return gdB - gdA;
        
        return 0;
    });

    dom.leagueTableBody.innerHTML = '';
    rows.forEach((row, index) => {
        const newPosition = index + 1;
        row.cells[0].textContent = newPosition;
        dom.leagueTableBody.appendChild(row);

        if (qualificationZones[newPosition]) {
            const separatorRow = document.createElement('tr');
            separatorRow.className = 'separator';
            separatorRow.innerHTML = `<td colspan="9" class="${qualificationZones[newPosition]}"><span class="line"></span></td>`;
            dom.leagueTableBody.appendChild(separatorRow);
        }
    });
    
    dom.leagueTableBody.previousElementSibling.querySelectorAll('th').forEach(th => th.removeAttribute('data-sort'));
    const activeHeader = dom.leagueTableBody.previousElementSibling.querySelector(`th[data-sort-key="${key}"]`);
    if (activeHeader) {
        activeHeader.setAttribute('data-sort', appState.sortDirection);
    }
}

export function updateTeamStats(teamName, gf, ga, isWin, isDraw, shouldHighlight) {
    const row = dom.leagueTableBody.querySelector(`tr[data-team="${teamName.trim()}"]`);
    if (!row) return;

    if (shouldHighlight) {
        row.classList.remove('row-updated');
        void row.offsetWidth;
        row.classList.add('row-updated');
    }

    const cells = row.cells;
    cells[2].textContent = parseInt(cells[2].textContent) + 1;
    cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0);
    cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0);
    cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0);
    const [currF, currA] = cells[6].textContent.split(':').map(Number);
    const newGF = currF + gf;
    const newGA = currA + ga;
    cells[6].textContent = `${newGF}:${newGA}`;
    cells[7].querySelector('.points').textContent = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);
    
    row.dataset.gd = newGF - newGA;

    const formContainer = cells[8].querySelector('.form-container');
    if (formContainer.children.length >= 5) formContainer.removeChild(formContainer.lastChild);
    const formBox = document.createElement('span');
    formBox.className = `form-box ${isWin ? 'victory' : isDraw ? 'draw' : 'loss'}`;
    formContainer.prepend(formBox);
}

export function renderTable(league) {
    const config = appState.config[league];
    if (!config || !config.teams) return;

    const { teams } = config;
    dom.leagueTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    teams.forEach((teamName, index) => {
        const teamLogoName = teamName.toLowerCase().replace(/ /g, '-');
        const row = document.createElement('tr');
        row.dataset.team = teamName;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
              <picture>
                <source srcset="images/logos/${teamLogoName}.webp" type="image/webp">
                <img src="images/logos/${teamLogoName}.png" alt="${teamName}" loading="lazy" class="team-logo">
              </picture>
              <b>${teamName}</b>
            </td>
            <td>0</td><td>0</td><td>0</td><td>0</td><td>0:0</td>
            <td><b class="points">0</b></td>
            <td><div class="form-container"></div></td>
        `;
        fragment.appendChild(row);
    });
    dom.leagueTableBody.appendChild(fragment);
}


// ============================================
// 3. Dropdowns & Match Day
// ============================================

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

    displayMatchesForDay(1);
    filterMatches();
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
    
    const isAdminEditable = appState.isAdmin && !isPlayed;
    const homeTeamLogo = fixture.home.toLowerCase().replace(/ /g, '-');
    const awayTeamLogo = fixture.away.toLowerCase().replace(/ /g, '-');
    
    const cardClasses = `match-card ${isPlayed ? 'played' : ''} ${isAdminEditable ? 'editable' : ''}`;
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
                    <input type="number" id="${fixture.home}-${fixture.away}-score-home" class="score-home" min="0" value="${homeScore}" ${isPlayed && !appState.isAdmin ? 'disabled' : ''} required>
                    <span>-</span>
                    <label for="${fixture.home}-${fixture.away}-score-away" class="visually-hidden">Away Score</label>
                    <input type="number" id="${fixture.home}-${fixture.away}-score-away" class="score-away" min="0" value="${awayScore}" ${isPlayed && !appState.isAdmin ? 'disabled' : ''} required>
                    <button type="submit" class="btn btn-small" ${isPlayed ? '' : ''}>Save</button>
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

export function filterMatches(allMatches = appState.currentLeagueMatches) {
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


// ============================================
// 4. Knockout Stage 
// ============================================

function calculateKnockoutData(sortedTeams, knockoutMatches) {
    if (sortedTeams.length < 24) {
        return null;
    }

    const knockoutData = knockoutMatches.reduce((acc, match) => {
        acc[match.id] = match;
        return acc;
    }, {});

    const qualifiedTeams = sortedTeams.slice(0, 24);
    const top8 = qualifiedTeams.slice(0, 8);
    const teams9to24 = qualifiedTeams.slice(8, 24);

    const kopo_matches = Array.from({ length: 8 }, (_, i) => {
        const homeTeam = teams9to24[i];    
        const awayTeam = teams9to24[15 - i]; 
        const matchId = `r32-${i}`;
        return { id: matchId, homeTeam, awayTeam, data: knockoutData[matchId] };
    });

    const r16_matches = Array.from({ length: 8 }, (_, i) => {
        const homeTeam = top8[i];
        const kopoWinnerMatch = kopo_matches[i].data;
        let awayTeam = null;
        if (kopoWinnerMatch && typeof kopoWinnerMatch.homeScore === 'number') {
            awayTeam = kopoWinnerMatch.homeScore > kopoWinnerMatch.awayScore ? kopoWinnerMatch.homeTeam : kopoWinnerMatch.awayTeam;
        }
        const matchId = `r16-${i}`;
        return { id: matchId, homeTeam, awayTeam, data: knockoutData[matchId], dependsOn: `Winner Play-off` };
    });

    const qf_matches = Array.from({ length: 4 }, (_, i) => {
        const match1Data = r16_matches[i * 2].data;
        const match2Data = r16_matches[i * 2 + 1].data;
        let homeTeam = null;
        let awayTeam = null;
        if (match1Data && r16_matches[i * 2].awayTeam) { 
            homeTeam = match1Data.homeScore > match1Data.awayScore ? match1Data.homeTeam : match1Data.awayTeam;
        }
        if (match2Data && r16_matches[i * 2 + 1].awayTeam) {
            awayTeam = match2Data.homeScore > match2Data.awayScore ? match2Data.homeTeam : match2Data.awayTeam;
        }
        const matchId = `qf-${i}`;
        return { id: matchId, homeTeam, awayTeam, data: knockoutData[matchId], dependsOn: `Winner R16` };
    });
    
    const sf_matches = Array.from({ length: 2 }, (_, i) => {
        const match1Data = qf_matches[i * 2].data;
        const match2Data = qf_matches[i * 2 + 1].data;
        let homeTeam = null;
        let awayTeam = null;
        if (match1Data && qf_matches[i * 2].homeTeam && qf_matches[i * 2].awayTeam) {
            homeTeam = match1Data.homeScore > match1Data.awayScore ? match1Data.homeTeam : match1Data.awayTeam;
        }
        if (match2Data && qf_matches[i * 2 + 1].homeTeam && qf_matches[i * 2 + 1].awayTeam) {
            awayTeam = match2Data.homeScore > match2Data.awayScore ? match2Data.homeTeam : match2Data.awayTeam;
        }
        const matchId = `sf-${i}`;
        return { id: matchId, homeTeam, awayTeam, data: knockoutData[matchId], dependsOn: `Winner QF` };
    });
    
    const final_match = (() => {
        const sfMatch1Data = sf_matches[0]?.data;
        const sfMatch2Data = sf_matches[1]?.data;
        let finalHomeTeam = null;
        let finalAwayTeam = null;
        if (sfMatch1Data && sf_matches[0].homeTeam && sf_matches[0].awayTeam) {
            finalHomeTeam = sfMatch1Data.homeScore > sfMatch1Data.awayScore ? sfMatch1Data.homeTeam : sfMatch1Data.awayTeam;
        }
        if (sfMatch2Data && sf_matches[1].homeTeam && sf_matches[1].awayTeam) {
            finalAwayTeam = sfMatch2Data.homeScore > sfMatch2Data.awayScore ? sfMatch2Data.homeTeam : sfMatch2Data.awayTeam;
        }
        return [{ id: `final-0`, homeTeam: finalHomeTeam, awayTeam: finalAwayTeam, data: knockoutData[`final-0`], dependsOn: `Winner SF` }];
    })();

    return [
        { title: 'Knockout Play-off', matches: kopo_matches },
        { title: 'Round of 16', matches: r16_matches },
        { title: 'Quarter Finals', matches: qf_matches },
        { title: 'Semi Finals', matches: sf_matches },
        { title: 'Final', matches: final_match }
    ];
}

export function generateKnockoutStage(sortedTeams, knockoutMatches) {
    const knockoutSection = dom.knockoutSection;
    const allRounds = calculateKnockoutData(sortedTeams, knockoutMatches);

    if (!allRounds) {
        knockoutSection.innerHTML = '<p class="empty-state" style="display:block; padding: 2rem;">Not enough teams have played to generate the knockout bracket.</p>';
        return;
    }

    knockoutSection.innerHTML = `
        <div class="knockout-nav-wrapper">
            <nav class="knockout-nav" role="tablist" aria-label="Knockout Rounds Navigation"></nav>
        </div>
        <div id="knockout-content-container"></div>
    `;
    
    const knockoutNav = knockoutSection.querySelector('.knockout-nav');
    const knockoutContent = knockoutSection.querySelector('#knockout-content-container');
    
    allRounds.forEach((round, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn knockout-round-btn';
        btn.textContent = round.title;
        btn.dataset.roundIndex = index;
        if (index === 0) {
            btn.classList.add('active');
        }
        knockoutNav.appendChild(btn);
    });
    
    const renderRound = (roundIndex) => {
        const round = allRounds[roundIndex];
        if (!round || round.matches.length === 0) {
            knockoutContent.innerHTML = '<p class="empty-state">No matches for this round yet.</p>';
            return;
        }

        const matchesHTML = round.matches.map(match => renderKnockoutCard(match)).join('');
        
        knockoutContent.innerHTML = `
            <div class="knockout-round">
                <h2 class="knockout-round-title">${round.title}</h2>
                <div class="knockout-matches-grid">
                    ${matchesHTML}
                </div>
            </div>
        `;
        
        knockoutContent.querySelectorAll('.knockout-admin-form').forEach(form => {
            form.addEventListener('submit', handleKnockoutMatchSubmission);
        });
    };

    knockoutNav.addEventListener('click', (e) => {
        const target = e.target.closest('.knockout-round-btn');
        if (!target) return;

        knockoutNav.querySelector('.btn.active')?.classList.remove('active');
        target.classList.add('active');
        
        renderRound(parseInt(target.dataset.roundIndex));
    });

    renderRound(0);
}


function renderKnockoutCard(match) {
    const { id, homeTeam, awayTeam, data, dependsOn } = match;
    const homeScore = data?.homeScore ?? '-';
    const awayScore = data?.awayScore ?? '-';

    const hasBeenPlayed = typeof data?.homeScore === 'number';
    const homeWinner = hasBeenPlayed && homeScore > awayScore;
    const awayWinner = hasBeenPlayed && awayScore > homeScore;

    const renderTeam = (team, score, isWinner, isLoser) => {
        if (!team) {
            return `<div class="knockout-team knockout-placeholder">${dependsOn || 'TBD'}</div>`;
        }
        const teamLogoName = team.toLowerCase().replace(/ /g, '-');
        const winnerClass = isWinner ? 'winner' : '';
        const loserClass = isLoser ? 'loser' : '';
        return `
            <div class="knockout-team ${winnerClass} ${loserClass}">
                <img src="images/logos/${teamLogoName}.webp" alt="${team} logo">
                <span class="team-name">${team}</span>
                <span class="team-score">${score}</span>
            </div>
        `;
    };

    const renderAdminForm = () => {
        if (!appState.isAdmin || !homeTeam || !awayTeam) return '';
        return `
            <form class="knockout-admin-form" data-match-id="${id}" data-stage="${id.split('-')[0]}" data-home-team="${homeTeam}" data-away-team="${awayTeam}">
                <label for="${id}-home" class="visually-hidden">Home Score</label>
                <input type="number" id="${id}-home" min="0" value="${data?.homeScore ?? ''}" required>
                <span>-</span>
                <label for="${id}-away" class="visually-hidden">Away Score</label>
                <input type="number" id="${id}-away" min="0" value="${data?.awayScore ?? ''}" required>
                <button type="submit" class="btn btn-small">Save</button>
            </form>
        `;
    }

    return `
        <div class="knockout-match-card">
            ${renderTeam(homeTeam, homeScore, homeWinner, awayWinner)}
            ${renderTeam(awayTeam, awayScore, awayWinner, homeWinner)}
            ${renderAdminForm()}
        </div>
    `;
}