import { dom, appState } from './main.js';
import { getTeamSlug, renderTeamLogoHTML } from './ui-feedback.js';


function getTableHeaderHTML() {
    return `
        <thead>
            <tr>
                <th>#</th>
                <th data-sort-key="team">Team</th>
                <th data-sort-key="played">P</th>
                <th data-sort-key="wins" class="optional-col">W</th>
                <th data-sort-key="draws" class="optional-col">D</th>
                <th data-sort-key="losses" class="optional-col">L</th>
                <th data-sort-key="gd">+/-</th>
                <th data-sort-key="points">Pts</th>
                <th class="form-col">Form</th>
            </tr>
        </thead>`;
}

function getRowHTML(teamName, index) {
    return `
        <tr data-team="${teamName}" data-gd="0">
            <td>${index + 1}</td>
            <td class="team-cell">
              ${renderTeamLogoHTML(teamName)}
              <b>${teamName}</b>
            </td>
            <td>0</td>
            <td class="optional-col">0</td>
            <td class="optional-col">0</td>
            <td class="optional-col">0</td>
            <td>0</td>
            <td><b class="points">0</b></td>
            <td class="form-col"><div class="form-container"></div></td>
        </tr>
    `;
}


export function renderSkeletonTable() {
    if (!dom.leagueViewContainer) return;

    dom.leagueViewContainer.innerHTML = `
        <div class="single-table-wrapper">
            <table>${getTableHeaderHTML()}<tbody>
                ${Array(10).fill('<tr class="skeleton"><td colspan="9" style="height:40px"></td></tr>').join('')}
            </tbody></table>
        </div>`;
}

export function renderTable(league) {
    const config = appState.config[league];
    if (!config) return;

    if (!dom.leagueViewContainer) {
        console.error("DOM Error: League View Container not found.");
        return;
    }

    dom.leagueViewContainer.innerHTML = '';
    
    if (config.group_structure) {
        renderGroupStage(config.group_structure);
    } else {
        renderStandardTable(config.teams);
    }
}

function renderStandardTable(teams) {
    if (!teams || !Array.isArray(teams)) {
        dom.leagueViewContainer.innerHTML = '<div class="empty-state">No teams found.</div>';
        return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'single-table-wrapper league-table'; 

    const table = document.createElement('table');
    table.id = 'leagueTable'; 
    table.innerHTML = getTableHeaderHTML() + '<tbody></tbody>';

    const tbody = table.querySelector('tbody');
    const fragment = document.createDocumentFragment();

    teams.forEach((teamName, index) => {
        const tempContainer = document.createElement('tbody');
        tempContainer.innerHTML = getRowHTML(teamName, index);
        fragment.appendChild(tempContainer.firstElementChild);
    });

    tbody.appendChild(fragment);
    wrapper.appendChild(table);
    dom.leagueViewContainer.appendChild(wrapper);
}

function renderGroupStage(groupStructure) {
    let groups = groupStructure;

    if (typeof groups === 'string') {
        try {
            groups = JSON.parse(groups);
        } catch (e) {
            console.error("Failed to parse group_structure:", e);
            dom.leagueViewContainer.innerHTML = '<div class="empty-state">Error loading groups.</div>';
            return;
        }
    }

    const grid = document.createElement('div');
    grid.className = 'groups-grid';

    const sortedGroupKeys = Object.keys(groups).sort();
    
    if (sortedGroupKeys.length === 0) {
        dom.leagueViewContainer.innerHTML = '<div class="empty-state">No groups defined.</div>';
        return;
    }

    sortedGroupKeys.forEach(groupName => {
        const teams = groups[groupName];

        if (!Array.isArray(teams)) {
            console.warn(`Group ${groupName} data is invalid:`, teams);
            return;
        }

        const card = document.createElement('div');
        card.className = 'group-table-card';

        card.innerHTML = `
            <div class="group-header">${groupName}</div>
            <div class="group-table-wrapper">
                <table data-group="${groupName}">
                    ${getTableHeaderHTML()}
                    <tbody></tbody>
                </table>
            </div>
        `;

        const tbody = card.querySelector('tbody');
        teams.forEach((teamName, index) => {
            const temp = document.createElement('tbody');
            temp.innerHTML = getRowHTML(teamName, index);
            tbody.appendChild(temp.firstElementChild);
        });

        grid.appendChild(card);
    });

    dom.leagueViewContainer.appendChild(grid);
}


export function updateTableFromStats(teamStats) {
    const config = appState.config[appState.currentLeague];

    const formDisplayLimit = (config && config.group_structure) ? 2 : 5;

    const allTeamRows = document.querySelectorAll('tr[data-team]');

    allTeamRows.forEach(row => {
        const teamName = row.dataset.team;
        const stats = teamStats[teamName];
        if (!stats) return;

        const cells = row.cells;
        cells[2].textContent = stats.p;
        
        if (cells[3].classList.contains('optional-col')) {
            cells[3].textContent = stats.w;
            cells[4].textContent = stats.d;
            cells[5].textContent = stats.l;
        }

        cells[6].textContent = stats.gd > 0 ? `+${stats.gd}` : stats.gd;
        row.dataset.gd = stats.gd;
        
        cells[7].querySelector('.points').textContent = stats.pts;

        const formContainer = cells[8].querySelector('.form-container');
        if (formContainer) {
            formContainer.innerHTML = '';
            
            const displayForm = stats.form.slice(0, formDisplayLimit);
            
            displayForm.forEach(result => {
                const span = document.createElement('span');
                span.className = `form-box ${result}`;
                span.textContent = result === 'victory' ? 'W' : result === 'loss' ? 'L' : 'D';
                formContainer.appendChild(span);
            });
        }
    });
}

export function sortTable() {
    if (!dom.leagueViewContainer) return;
    
    const tbodies = dom.leagueViewContainer.querySelectorAll('tbody');
    const primaryKey = appState.sortBy;
    const primaryDirection = appState.sortDirection === 'asc' ? 1 : -1;

    tbodies.forEach(tableBody => {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        if (rows.length === 0) return;

        rows.sort((a, b) => {
            const getVal = (row, key) => {
                if (key === 'team') return row.dataset.team;
                if (key === 'points') return parseInt(row.querySelector('.points')?.textContent || '0');
                if (key === 'gd') return parseInt(row.dataset.gd) || 0;
                if (key === 'played') return parseInt(row.cells[2].textContent) || 0;
                return 0;
            };

            const valA = getVal(a, primaryKey);
            const valB = getVal(b, primaryKey);

            if (valA !== valB) {
                 if (typeof valA === 'string') return valA.localeCompare(valB) * primaryDirection;
                 return (valA - valB) * primaryDirection;
            }

            const ptsA = getVal(a, 'points'); const ptsB = getVal(b, 'points');
            if (ptsA !== ptsB) return ptsB - ptsA;

            const gdA = getVal(a, 'gd'); const gdB = getVal(b, 'gd');
            if (gdA !== gdB) return gdB - gdA;

            return a.dataset.team.localeCompare(b.dataset.team);
        });

        const fragment = document.createDocumentFragment();
        rows.forEach((row, index) => {
            row.cells[0].textContent = index + 1;
            fragment.appendChild(row);
        });

        tableBody.appendChild(fragment);
    });
    
    const announcer = document.getElementById('table-sort-announcer');
    if (announcer) announcer.textContent = `Sorted by ${primaryKey}`;
}