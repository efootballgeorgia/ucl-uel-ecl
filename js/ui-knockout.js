import { dom , appState,} from './main.js';
import { getTeamSlug, renderAdminActionsHTML } from './ui-feedback.js';

function areAllTeamsReadyForKnockout() {
    const leagueConfig = appState.config[appState.currentLeague];
    if (!leagueConfig || !leagueConfig.teams || !dom.leagueTableBody) {
        return false;
    }

    const requiredGames = leagueConfig.numberOfMatches || 8;
    
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

    const kopo_matches = Array.from({ length: playoffTeams.length / 2 }, (_, i) => ({
        id: `r32-${i}`, homeTeam: playoffTeams[i], awayTeam: playoffTeams[playoffTeams.length - 1 - i],
        data: knockoutData[`r32-${i}`]
    }));

    const r16_matches = Array.from({ length: seeded }, (_, i) => ({
        id: `r16-${i}`, homeTeam: topSeeded[i], awayTeam: getWinner(kopo_matches[i]?.data),
        data: knockoutData[`r16-${i}`], dependsOn: `Qualified Teams`
    }));

    const qf_matches = Array.from({ length: 4 }, (_, i) => ({
        id: `qf-${i}`, homeTeam: getWinner(r16_matches[i * 2]?.data), awayTeam: getWinner(r16_matches[i * 2 + 1]?.data),
        data: knockoutData[`qf-${i}`], dependsOn: `Winners of R16`
    }));
    
    const sf_matches = Array.from({ length: 2 }, (_, i) => ({
        id: `sf-${i}`, homeTeam: getWinner(qf_matches[i * 2]?.data), awayTeam: getWinner(qf_matches[i * 2 + 1]?.data),
        data: knockoutData[`sf-${i}`], dependsOn: `Winners of QF`
    }));
    
    const final_match = [{
        id: `final-0`, homeTeam: getWinner(sf_matches[0]?.data), awayTeam: getWinner(sf_matches[1]?.data),
        data: knockoutData[`final-0`], dependsOn: `Winners of SF`
    }];

    return [
        { title: 'KO PLAY-OFFS', matches: kopo_matches }, { title: 'ROUND OF 16', matches: r16_matches },
        { title: 'QUARTER-FINALS', matches: qf_matches }, { title: 'SEMI-FINALS', matches: sf_matches },
        { title: 'FINAL', matches: final_match }
    ];
}

export function generateKnockoutStage(sortedTeams, knockoutMatches) {
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
        <div class="search-container-wrapper">
            <h2 id="knockout-stage-title"></h2>
            <div class="search-container">
                <nav class="knockout-nav" role="tablist"></nav>
            </div>
        </div>
        <div class="match-box">
            <div class="knockout-matches-grid"></div>
        </div>`;
    
    const knockoutNav = dom.knockoutSection.querySelector('.knockout-nav');
    const knockoutTitle = dom.knockoutSection.querySelector('#knockout-stage-title');
    const knockoutGrid = dom.knockoutSection.querySelector('.knockout-matches-grid');
    
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
        
        knockoutTitle.textContent = round.title;

        if (!round || round.matches.length === 0) {
            knockoutGrid.innerHTML = '<p class="empty-state">No matches for this round yet.</p>';
            return;
        }
        
        knockoutGrid.innerHTML = round.matches.map(renderKnockoutCard).join('');
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
    const isPlayed = typeof data?.homeScore === 'number';
    const areTeamsSet = !!(homeTeam && awayTeam);
    const homeWinner = isPlayed && areTeamsSet && data.homeScore > data.awayScore;
    const awayWinner = isPlayed && areTeamsSet && data.awayScore > data.homeScore;
    const renderTeamRow = (team, score, isWinner) => {
    const teamInfo = team 
        ? `<div class="team-info">
             <picture>
                <source data-srcset="images/logos/${getTeamSlug(team)}.webp" type="image/webp">
                <img src="images/logos/${getTeamSlug(team)}.webp" alt="${team} logo" class="team-logo">
             </picture>
             <span class="team-name ${isWinner ? 'winner' : ''}">${team}</span>
           </div>`
        : `<div class="team-info knockout-placeholder">${dependsOn || 'TBD'}</div>`;
    
    const scoreInfo = `<span class="team-score">${score ?? ''}</span>`;

    return `<div class="team-row">${teamInfo}${scoreInfo}</div>`;
};

    const adminActionsHTML = renderAdminActionsHTML(id, isPlayed, areTeamsSet);
    const contentHTML = areTeamsSet
        ? renderTeamRow(homeTeam, data?.homeScore, homeWinner) + renderTeamRow(awayTeam, data?.awayScore, awayWinner)
        : renderTeamRow(null, null, false); 

    return `
    <div class="knockout-match-card match-card ${isPlayed ? 'played' : ''}" data-doc-id="${id}" data-type="knockout">
        <div class="card-content">
            ${contentHTML}
        </div>
        <form class="score-form" id="${id}-form" data-doc-id="${id}" data-home-team="${homeTeam || ''}" data-away-team="${awayTeam || ''}">
            <label for="${id}-home" class="visually-hidden">Home Score</label>
            <input type="number" id="${id}-home" class="score-home" min="0" value="${data?.homeScore ?? ''}" required ${!areTeamsSet ? 'disabled' : ''}>
            <span>-</span>
            <label for="${id}-away" class="visually-hidden">Away Score</label>
            <input type="number" id="${id}-away" class="score-away" min="0" value="${data?.awayScore ?? ''}" required ${!areTeamsSet ? 'disabled' : ''}>
        </form>
        ${adminActionsHTML}
    </div>`;
}