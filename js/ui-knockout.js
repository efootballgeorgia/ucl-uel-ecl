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
    if (!leagueConfig || !teamStats) return false;

    const requiredGames = leagueConfig.numberOfMatches || 8;
    const teamNames = leagueConfig.teams || [];

    for (const teamName of teamNames) {
        const stats = teamStats[teamName];
        if (!stats || stats.p < requiredGames) {
            return false;
        }
    }
    return true;
}

function getWinner(matchData) {
    if (!matchData || typeof matchData.homeScore !== 'number') return null;
    if (matchData.homeScore > matchData.awayScore) return matchData.homeTeam;
    if (matchData.awayScore > matchData.homeScore) return matchData.awayTeam;
    return null;
}


function calculateKnockoutData(sortedTeams, knockoutMatches) {
    const config = appState.config[appState.currentLeague];
    const knockoutData = knockoutMatches.reduce((acc, match) => { acc[match.id] = match; return acc; }, {});
    
    if (config?.group_structure) {
        if (sortedTeams.length < 32) return null;

        const r16Pairs = [
            { h: 0, a: 5,  id: 'r16-0', desc: 'Winner A vs Runner-up B' }, 
            { h: 8, a: 13, id: 'r16-1', desc: 'Winner C vs Runner-up D' }, 
            { h: 16, a: 21, id: 'r16-2', desc: 'Winner E vs Runner-up F' },
            { h: 24, a: 29, id: 'r16-3', desc: 'Winner G vs Runner-up H' },
            
            { h: 4, a: 1,  id: 'r16-4', desc: 'Winner B vs Runner-up A' }, 
            { h: 12, a: 9, id: 'r16-5', desc: 'Winner D vs Runner-up C' },
            { h: 20, a: 17, id: 'r16-6', desc: 'Winner F vs Runner-up E' },
            { h: 28, a: 25, id: 'r16-7', desc: 'Winner H vs Runner-up G' }
        ];

        const r16Matches = r16Pairs.map(pair => ({
            id: pair.id,
            homeTeam: sortedTeams[pair.h] || null,
            awayTeam: sortedTeams[pair.a] || null,
            data: knockoutData[pair.id],
            dependsOn: pair.desc
        }));
        
        const r16Winners = r16Matches.map(m => getWinner(m.data));

        const qfMatches = [0, 1, 2, 3].map(i => {
             const idx1 = i * 2;
             const idx2 = i * 2 + 1;
             return {
                id: `qf-${i}`,
                homeTeam: r16Winners[idx1],
                awayTeam: r16Winners[idx2],
                data: knockoutData[`qf-${i}`],
                dependsOn: 'Winner of R16'
             };
        });

        const qfWinners = qfMatches.map(m => getWinner(m.data));

        const sfMatches = [0, 1].map(i => {
             const idx1 = i * 2;
             const idx2 = i * 2 + 1;
             return {
                id: `sf-${i}`,
                homeTeam: qfWinners[idx1],
                awayTeam: qfWinners[idx2],
                data: knockoutData[`sf-${i}`],
                dependsOn: 'Winner of QF'
             };
        });

        const sfWinners = sfMatches.map(m => getWinner(m.data));

        const finalMatch = [{
            id: `final-0`,
            homeTeam: sfWinners[0],
            awayTeam: sfWinners[1],
            data: knockoutData[`final-0`],
            dependsOn: 'Winner of SF'
        }];

        return [
            { title: 'ROUND OF 16', matches: r16Matches },
            { title: 'QUARTER-FINALS', matches: qfMatches },
            { title: 'SEMI-FINALS', matches: sfMatches },
            { title: 'FINAL', matches: finalMatch }
        ];
    }
    
    const knockoutConfig = config?.knockoutSettings || { qualified: 24, seeded: 8 };
    const { qualified, seeded } = knockoutConfig;

    if (sortedTeams.length < qualified) return null;

    const qualifiedTeams = sortedTeams.slice(0, qualified);
    const topSeeded = qualifiedTeams.slice(0, seeded); 
    const playoffTeams = qualifiedTeams.slice(seeded);

    const kopoMatches = Array.from({ length: playoffTeams.length / 2 }, (_, i) => ({
        id: `r32-${i}`,
        homeTeam: playoffTeams[i],
        awayTeam: playoffTeams[playoffTeams.length - 1 - i],
        data: knockoutData[`r32-${i}`],
        dependsOn: `Rank ${seeded + i + 1} v ${qualified - i}`
    }));

    const kopoWinners = kopoMatches.map(m => getWinner(m.data));

    const r16Matches = Array.from({ length: Math.min(topSeeded.length, kopoWinners.length) }, (_, i) => ({
            id: `r16-${i}`,
            homeTeam: topSeeded[i],
            awayTeam: kopoWinners[i],
            data: knockoutData[`r16-${i}`],
            dependsOn: 'KO Play-offs Winner'
    }));

    const generateNextRound = (prefix, prevRoundMatches, prevRoundName) => {
        const prevWinners = prevRoundMatches.map(m => getWinner(m.data));
        return Array.from({ length: Math.floor(prevWinners.length / 2) }, (_, i) => ({
            id: `${prefix}-${i}`,
            homeTeam: prevWinners[i * 2],
            awayTeam: prevWinners[i * 2 + 1],
            data: knockoutData[`${prefix}-${i}`],
            dependsOn: `Winner ${prevRoundName}`
        }));
    };

    const qfMatches = generateNextRound('qf', r16Matches, 'R16');
    const sfMatches = generateNextRound('sf', qfMatches, 'QF');
    const finalMatch = generateNextRound('final', sfMatches, 'SF');

    return [
        { title: 'KO PLAY-OFFS', matches: kopoMatches },
        { title: 'ROUND OF 16', matches: r16Matches },
        { title: 'QUARTER-FINALS', matches: qfMatches },
        { title: 'SEMI-FINALS', matches: sfMatches },
        { title: 'FINAL', matches: finalMatch }
    ];
}

export async function generateKnockoutStage(sortedTeams, knockoutMatches, teamStats) {
    if (!areAllTeamsReadyForKnockout(teamStats)) {
        dom.knockoutSection.innerHTML = `<p class="empty-state" style="display:block; padding: 4rem 2rem; font-size: 2.5rem; font-weight: 700; color: var(--accent-color); text-transform: uppercase;">TOURNAMENT IN PROGRESS</p>`;
        return;
    }

    const allRounds = calculateKnockoutData(sortedTeams, knockoutMatches);

    if (!allRounds) {
        dom.knockoutSection.innerHTML = '<p class="empty-state" style="display:block; padding: 2rem;">Bracket calculation failed (Check teams count).</p>';
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

        drawWrapper.innerHTML = await renderKnockoutDraw(round); 
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
    
    let homeWinner = false; 
    let awayWinner = false;
    
    if (isPlayed && areTeamsSet) {
        if (data.homeScore > data.awayScore) homeWinner = true;
        else if (data.awayScore > data.homeScore) awayWinner = true;
    }

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