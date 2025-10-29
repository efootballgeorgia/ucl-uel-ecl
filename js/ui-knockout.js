import { dom, appState } from './main.js';
import { getTeamSlug, renderAdminActionsHTML, renderTeamLogoHTML } from './ui-feedback.js';
import { supabase } from './supabase.js';

async function getDrawImageData(league, roundTitle) {
    const slug = roundTitle.toLowerCase().replace(/ /g, '-');

    const { data, error } = await supabase
        .from('knockout_draw_layouts')
        .select('background_image, logo_size, coordinates')
        .eq('league', league)
        .eq('round_slug', slug)
        .single();

    if (error) {
        console.error("Error fetching knockout draw layout:", error);
        return null;
    }

    return {
        backgroundImage: data.background_image,
        logoSize: data.logo_size,
        coordinates: data.coordinates
    };
}

async function renderKnockoutDraw(round) {
    const drawData = await getDrawImageData(appState.currentLeague, round.title);
    if (!drawData) return '';


    const logosHTML = round.matches.map((match, index) => {
        const coords = drawData.coordinates[index];
        if (!coords) return '';

        const getLogoHTML = (team, position) => {
            if (!team) return '';
            const style = `top: ${position.top}; left: ${position.left}; height: ${drawData.logoSize};`;
            const slug = getTeamSlug(team);
            return `<img src="images/logos/${slug}.png" alt="${team}" class="draw-logo" style="${style}">`;
        };

        const homeLogoHTML = getLogoHTML(match.homeTeam, coords.home);
        const awayLogoHTML = getLogoHTML(match.awayTeam, coords.away);

        return homeLogoHTML + awayLogoHTML;
    }).join('');

    return `
        <div class="knockout-draw-container">
            <img src="${drawData.backgroundImage}" class="draw-background-image" alt="${round.title} Draw Bracket">
            <div class="draw-logo-container">${logosHTML}</div>
        </div>
    `;
}

function areAllTeamsReadyForKnockout(teamStats) {
    const leagueConfig = appState.config[appState.currentLeague];
    if (!leagueConfig || !leagueConfig.teams || !teamStats) {
        return false;
    }

    const requiredGames = leagueConfig.numberOfMatches || 8;

    for (const teamName of leagueConfig.teams) {
        const stats = teamStats[teamName];
        if (!stats || stats.p < requiredGames) {
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

    const kopoMatches = Array.from({ length: playoffTeams.length / 2 }, (_, i) => ({
        id: `r32-${i}`,
        homeTeam: playoffTeams[i],
        awayTeam: playoffTeams[playoffTeams.length - 1 - i],
        data: knockoutData[`r32-${i}`]
    }));

    const kopoWinners = kopoMatches.map(m => getWinner(m.data));

    const generateRound = (prefix, groupA, groupB, dependencyText) => {
        return Array.from({ length: groupA.length }, (_, i) => ({
            id: `${prefix}-${i}`,
            homeTeam: groupA[i],
            awayTeam: groupB[i],
            data: knockoutData[`${prefix}-${i}`],
            dependsOn: dependencyText
        }));
    };
    
    const r16Matches = generateRound('r16', topSeeded, kopoWinners, 'Qualified Teams');
    const qfMatches = generateRound('qf', kopoWinners.slice(0, 4), kopoWinners.slice(4), 'Winners of R16');
    const sfMatches = generateRound('sf', kopoWinners.slice(0, 2), kopoWinners.slice(2), 'Winners of QF');
    const finalMatch = generateRound('final', kopoWinners.slice(0, 1), kopoWinners.slice(1), 'Winners of SF');


    return [
        { title: 'KO PLAY-OFFS', matches: kopoMatches },
        { title: 'ROUND OF 16', matches: r16Matches },
        { title: 'QUARTER-FINALS', matches: qfMatches },
        { title: 'SEMI-FINALS', matches: sfMatches },
        { title: 'FINAL', matches: finalMatch }
    ];
}


export function generateKnockoutStage(sortedTeams, knockoutMatches, teamStats) {
    if (!areAllTeamsReadyForKnockout(teamStats)) {
        dom.knockoutSection.innerHTML = `<p class="empty-state" style="display:block; padding: 4rem 2rem; font-size: 2.5rem; font-weight: 700; color: var(--accent-color); text-transform: uppercase;">SOON</p>`;
        return;
    }

    const allRounds = calculateKnockoutData(sortedTeams, knockoutMatches);

    if (!allRounds) {
        dom.knockoutSection.innerHTML = '<p class="empty-state" style="display:block; padding: 2rem;">Not enough teams to generate knockout bracket.</p>';
        return;
    }

    const activeRoundIndex = parseInt(dom.knockoutSection.querySelector('.knockout-round-btn.active')?.dataset.roundIndex, 10) || 0;

    dom.knockoutSection.innerHTML = `
        <div class="search-container-wrapper">
            <h2 id="knockout-stage-title"></h2>
            <div class="search-container">
                <nav class="knockout-nav" role="tablist"></nav>
            </div>
        </div>
        <div class="match-box">
            <!-- MODIFIED: Added a wrapper for the new draw image -->
            <div class="knockout-draw-wrapper"></div>
            <div class="knockout-matches-grid"></div>
        </div>`;

    const knockoutNav = dom.knockoutSection.querySelector('.knockout-nav');
    const knockoutTitle = dom.knockoutSection.querySelector('#knockout-stage-title');
    const drawWrapper = dom.knockoutSection.querySelector('.knockout-draw-wrapper');
    const knockoutGrid = dom.knockoutSection.querySelector('.knockout-matches-grid');

    allRounds.forEach((round, index) => {
        if (round.matches.length === 0) return;
        const btn = document.createElement('button');
        btn.className = 'btn knockout-round-btn';
        btn.textContent = round.title;
        btn.dataset.roundIndex = index;
        if (index === activeRoundIndex) btn.classList.add('active');
        knockoutNav.appendChild(btn);
    });

    const renderRound = async (roundIndex) => { 
        const round = allRounds[roundIndex];
        knockoutTitle.textContent = round.title;

        if (!round || round.matches.length === 0) {
            drawWrapper.innerHTML = '';
            knockoutGrid.innerHTML = '<p class="empty-state">No matches for this round yet.</p>';
            return;
        }

        drawWrapper.innerHTML = await renderKnockoutDraw(round); // Use await here
        knockoutGrid.innerHTML = round.matches.map(renderKnockoutCard).join('');
    };

    knockoutNav.addEventListener('click', (e) => {
        const target = e.target.closest('.knockout-round-btn');
        if (!target) return;
        knockoutNav.querySelector('.btn.active')?.classList.remove('active');
        target.classList.add('active');
        renderRound(parseInt(target.dataset.roundIndex, 10));
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
             ${renderTeamLogoHTML(team)}
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