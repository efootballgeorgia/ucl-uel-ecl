import { dom } from './dom.js';
import { appState } from './state.js';

export function renderSkeletonTable() {
    let skeletonHTML = '';
    for (let i = 0; i < 15; i++) {
        skeletonHTML += `
            <tr class="skeleton">
                <td><div></div></td> <td><div></div></td> <td><div></div></td>
                <td><div></div></td> <td><div></div></td> <td><div></div></td>
                <td><div></div></td> <td><div></div></td> <td><div></div></td>
            </tr>
        `;
    }
    dom.leagueTableBody.innerHTML = skeletonHTML;
    dom.leagueTableBody.setAttribute('aria-busy', 'true');
}

export function renderTable(league) {
    const config = appState.config[league];
    if (!config || !config.teams) return;

    dom.leagueTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    config.teams.forEach((teamName, index) => {
        const teamLogoName = teamName.toLowerCase().replace(/ /g, '-');
        const row = document.createElement('tr');
        row.dataset.team = teamName;
        row.dataset.gd = '0';
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
    dom.leagueTableBody.setAttribute('aria-busy', 'false');
}

function updateRowStats(row, gf, ga, isWin, isDraw, isAdding) {
    const cells = row.cells;
    const factor = isAdding ? 1 : -1;

    cells[2].textContent = parseInt(cells[2].textContent) + (1 * factor);
    cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0) * factor;
    cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0) * factor;
    cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0) * factor;
    
    const [currF, currA] = cells[6].textContent.split(':').map(Number);
    const newGF = currF + (gf * factor);
    const newGA = currA + (ga * factor);
    cells[6].textContent = `${newGF}:${newGA}`;
    
    row.dataset.gd = newGF - newGA;
    cells[7].querySelector('.points').textContent = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);

    if (isAdding) {
        const formContainer = cells[8].querySelector('.form-container');
        if (formContainer.children.length >= 5) formContainer.removeChild(formContainer.lastChild);
        const formBox = document.createElement('span');
        formBox.className = `form-box ${isWin ? 'victory' : isDraw ? 'draw' : 'loss'}`;
        formContainer.prepend(formBox);
    }
}

export function updateTeamStats(teamName, gf, ga) {
    const row = dom.leagueTableBody.querySelector(`tr[data-team="${teamName.trim()}"]`);
    if (row) {
        updateRowStats(row, gf, ga, gf > ga, gf === ga, true);
    }
}

export function subtractTeamStats(teamName, gf, ga) {
    const row = dom.leagueTableBody.querySelector(`tr[data-team="${teamName.trim()}"]`);
    if (row) {
        updateRowStats(row, gf, ga, gf > ga, gf === ga, false);
    }
}

export function sortTable() {
    const tableBody = dom.leagueTableBody;
    if (!tableBody) return;

    tableBody.classList.add('is-sorting');
    tableBody.setAttribute('aria-busy', 'true');

    const rows = Array.from(tableBody.querySelectorAll('tr:not(.separator)'));
    const league = appState.currentLeague;
    const qualificationZones = appState.config[league]?.qualificationZones || {};

    const primaryKey = appState.sortBy;
    const primaryDirection = appState.sortDirection === 'asc' ? 1 : -1;

    const getRowStats = (row) => {
        const cells = row.cells;
        const [gf, ga] = cells[6].textContent.split(':').map(Number);
        return {
            team: row.dataset.team,
            played: parseInt(cells[2].textContent) || 0,
            wins: parseInt(cells[3].textContent) || 0,
            draws: parseInt(cells[4].textContent) || 0,
            losses: parseInt(cells[5].textContent) || 0,
            points: parseInt(cells[7].textContent) || 0,
            gd: parseInt(row.dataset.gd) || 0,
            gf: gf || 0,
        };
    };

    rows.sort((a, b) => {
        const statsA = getRowStats(a);
        const statsB = getRowStats(b);
        const valA = statsA[primaryKey];
        const valB = statsB[primaryKey];

        if (valA !== valB) {
            if (typeof valA === 'string') {
                return valA.localeCompare(valB) * primaryDirection;
            }
            return (valA - valB) * primaryDirection;
        }

        if (statsB.points !== statsA.points) return statsB.points - statsA.points;
        if (statsB.gd !== statsA.gd) return statsB.gd - statsA.gd;
        if (statsB.gf !== statsA.gf) return statsB.gf - statsA.gf;
        return statsA.team.localeCompare(statsB.team);
    });

    tableBody.innerHTML = '';
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
        tableBody.appendChild(row);
        
        // Dead 'if' block is now gone

        if (qualificationZones[index + 1]) {
            const separatorRow = document.createElement('tr');
            separatorRow.className = 'separator';
            separatorRow.innerHTML = `<td colspan="9" class="${qualificationZones[index + 1]}"><span class="line"></span></td>`;
            tableBody.appendChild(separatorRow);
        }
    });
    
    tableBody.previousElementSibling.querySelectorAll('th').forEach(th => th.removeAttribute('data-sort'));
    const activeHeader = tableBody.previousElementSibling.querySelector(`th[data-sort-key="${primaryKey}"]`);
    if (activeHeader) {
        activeHeader.setAttribute('data-sort', appState.sortDirection);
    }
    
    const sortAnnouncement = `Table sorted by ${primaryKey}, ${appState.sortDirection} order.`;
    const announcementElement = document.getElementById('table-sort-announcement');
    
    if (announcementElement) {
        announcementElement.textContent = sortAnnouncement;
    }

    setTimeout(() => {
        tableBody.classList.remove('is-sorting');
        tableBody.setAttribute('aria-busy', 'false');
    }, 100);
}