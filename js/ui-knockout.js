import { dom } from './dom.js';
import { appState } from './state.js';
import { getTeamSlug } from './utils.js';


function areAllTeamsReadyForKnockout() {
    const leagueConfig = appState.config[appState.currentLeague];
    if (!leagueConfig || !leagueConfig.teams || !dom.leagueTableBody) {
        return false;
    }

    const requiredGames = leagueConfig.numberOfMatchDays || 8;
    
    for (const teamName of leagueConfig.teams) {
        const row = dom.leagueTableBody.querySelector(`tr[data-team="${teamName}"]`);
        
        if (!row || row.classList.contains('skeleton')) {
            return false;
        }

        const playedGames = parseInt(row.cells[2].textContent, 10);
        
        if (isNaN(playedGames) || playedGames < requiredGames) {
            return false;
        }
    }
    
    return true;
}


function getWinner(matchData) {
    if (!matchData || typeof matchData.homeScore !== 'number') return null;
    return matchData.homeScore > matchData.awayScore ? matchData.homeTeam : matchData.awayTeam;
}

function calculateKnockoutData(sortedTeams, knockoutMatches) {
    const knockoutConfig = appState.config[appState.currentLeague]?.knockoutSettings || { qualified: 24, seeded: 8 };
    const { qualified, seeded } = knockoutConfig;

    if (sortedTeams.length < qualified) return null;

    const knockoutData = knockoutMatches.reduce((acc, match) => { acc[match.id] = match; return acc; }, {});
    const qualifiedTeams = sortedTeams.slice(0, qualified);
    const topSeeded = qualifiedTeams.slice(0, seeded);
    const playoffTeams = qualifiedTeams.slice(seeded);

    const kopo_matches = Array.from({ length: playoffTeams.length / 2}, (_, i) => ({
        id: `r32-${i}`, homeTeam: playoffTeams[i], awayTeam: playoffTeams[playoffTeams.length - 1 - i],
        data: knockoutData[`r32-${i}`]
    }));

    const r16_matches = Array.from({ length: seeded }, (_, i) => ({
        id: `r16-${i}`, homeTeam: topSeeded[i], awayTeam: getWinner(kopo_matches[i]?.data),
        data: knockoutData[`r16-${i}`], dependsOn: `Winner Play-off`
    }));

    const qf_matches = Array.from({ length: 4 }, (_, i) => ({
        id: `qf-${i}`, homeTeam: getWinner(r16_matches[i * 2]?.data), awayTeam: getWinner(r16_matches[i * 2 + 1]?.data),
        data: knockoutData[`qf-${i}`], dependsOn: `Winner R16`
    }));
    
    const sf_matches = Array.from({ length: 2 }, (_, i) => ({
        id: `sf-${i}`, homeTeam: getWinner(qf_matches[i * 2]?.data), awayTeam: getWinner(qf_matches[i * 2 + 1]?.data),
        data: knockoutData[`sf-${i}`], dependsOn: `Winner QF`
    }));
    
    const final_match = [{
        id: `final-0`, homeTeam: getWinner(sf_matches[0]?.data), awayTeam: getWinner(sf_matches[1]?.data),
        data: knockoutData[`final-0`], dependsOn: `Winner SF`
    }];

    return [
        { title: 'Knockout Play-off', matches: kopo_matches }, { title: 'Round of 16', matches: r16_matches },
        { title: 'Quarter Finals', matches: qf_matches }, { title: 'Semi Finals', matches: sf_matches },
        { title: 'Final', matches: final_match }
    ];
}

export function generateKnockoutStage(sortedTeams, knockoutMatches) {
    // Check if the league stage is complete before generating the bracket
    if (!areAllTeamsReadyForKnockout()) {
        dom.knockoutSection.innerHTML = `<p class="empty-state" style="display:block; padding: 4rem 2rem; font-size: 2.5rem; font-weight: 700; color: var(--accent-color); text-transform: uppercase;">SOON</p>`;
        return;
    }
    
    const allRounds = calculateKnockoutData(sortedTeams, knockoutMatches);

    if (!allRounds) {
        dom.knockoutSection.innerHTML = '<p class="empty-state" style="display:block; padding: 2rem;">Not enough teams to generate knockout bracket.</p>';
        return;
    }

    const activeRoundIndex = dom.knockoutSection.querySelector('.knockout-round-btn.active')?.dataset.roundIndex || 0;

    dom.knockoutSection.innerHTML = `
        <div class="knockout-nav-wrapper"><nav class="knockout-nav" role="tablist"></nav></div>
        <div id="knockout-content-container"></div>`;
    
    const knockoutNav = dom.knockoutSection.querySelector('.knockout-nav');
    
    allRounds.forEach((round, index) => {
        if (round.matches.length === 0) return;
        const btn = document.createElement('button');
        btn.className = 'btn knockout-round-btn';
        btn.textContent = round.title;
        btn.dataset.roundIndex = index;
        if (index == activeRoundIndex) btn.classList.add('active');
        knockoutNav.appendChild(btn);
    });
    
    const renderRound = (roundIndex) => {
        const round = allRounds[roundIndex];
        const knockoutContent = dom.knockoutSection.querySelector('#knockout-content-container');
        if (!round || round.matches.length === 0) {
            knockoutContent.innerHTML = '<p class="empty-state">No matches for this round yet.</p>';
            return;
        }
        knockoutContent.innerHTML = `<div class="knockout-round">
            <h2 class="knockout-round-title">${round.title}</h2>
            <div class="knockout-matches-grid">${round.matches.map(renderKnockoutCard).join('')}</div>
        </div>`;
    };

    knockoutNav.addEventListener('click', (e) => {
        const target = e.target.closest('.knockout-round-btn');
        if (!target) return;
        knockoutNav.querySelector('.btn.active')?.classList.remove('active');
        target.classList.add('active');
        renderRound(parseInt(target.dataset.roundIndex));
    });

    renderRound(activeRoundIndex);
}

function renderKnockoutCard(match) {
    const { id, homeTeam, awayTeam, data, dependsOn } = match;
    const hasBeenPlayed = typeof data?.homeScore === 'number';
    const homeWinner = hasBeenPlayed && data.homeScore > data.awayScore;
    const awayWinner = hasBeenPlayed && data.awayScore > data.homeScore;

    const renderTeam = (team, score, isWinner, isLoser) => {
        if (!team) return `<div class="knockout-team knockout-placeholder">${dependsOn || 'TBD'}</div>`;
        const teamLogoName = getTeamSlug(team);
        return `<div class="knockout-team ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">
            <img data-src="images/logos/${teamLogoName}.webp" alt="${team} logo" class="lazyload">
            <span class="team-name">${team}</span>
            <span class="team-score">${score ?? '-'}</span>
        </div>`;
    };

    const renderAdminForm = () => {
        if (!appState.isAdmin || !homeTeam || !awayTeam) return '';
        return `<form class="knockout-admin-form" data-match-id="${id}" data-stage="${id.split('-')[0]}" data-home-team="${homeTeam}" data-away-team="${awayTeam}">
            <label for="${id}-home" class="visually-hidden">Home</label>
            <input type="number" id="${id}-home" min="0" value="${data?.homeScore ?? ''}" required>
            <span>-</span>
            <label for="${id}-away" class="visually-hidden">Away</label>
            <input type="number" id="${id}-away" min="0" value="${data?.awayScore ?? ''}" required>
            <button type="submit" class="btn btn-small">Save</button>
        </form>`;
    }

    return `<div class="knockout-match-card">
        ${renderTeam(homeTeam, data?.homeScore, homeWinner, awayWinner)}
        ${renderTeam(awayTeam, data?.awayScore, awayWinner, homeWinner)}
        ${renderAdminForm()}
    </div>`;

}





