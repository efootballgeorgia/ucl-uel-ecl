// Constants
const images = document.querySelectorAll('.image-gallery img');
const screens = document.querySelectorAll('.screen-gallery img');
const modal = document.getElementById('myModal');
const modalImage = document.getElementById('modalImage');
let currentSortColumn = null;
let isAscending = true;

// Modal Functionality
images.forEach(image => {
  image.addEventListener('click', () => {
    modal.classList.add('show');
    modalImage.src = image.src;
  });
});

screens.forEach(screen => {
  screen.addEventListener('click', () => {
    modal.classList.add('show');
    modalImage.src = screen.src;
  });
});

modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

function closeModal() {
  modal.classList.remove('show');
}

// Toggle Gallery Functionality
function toggleGallery(logo) {
  const gallery = logo.nextElementSibling;
  if (gallery.classList.contains('show')) {
    gallery.classList.remove('show');
  } else {
    gallery.classList.add('show');
  }
}

// Add Stickers to Team Highlights
document.querySelectorAll('.wins').forEach(teamSection => {
  const teamName = teamSection.querySelector('h3').textContent.trim();
  const sticker = document.createElement('img');
  sticker.className = 'sticker';

  switch (teamName) {
    case 'AC Milan':
      sticker.src = 'images/bacho/bacho.jpg';
      break;
    case 'Barcelona':
      sticker.src = 'images/luksona/luksona.jpg';
      break;
    case 'PSG':
      sticker.src = 'images/giga/giga.jpg';
      break;
    case 'Real Madrid':
      sticker.src = 'images/niksona/niksona.jpg';
      break;
    default:
      sticker.src = 'images/stickers/default-sticker.png';
  }

  teamSection.prepend(sticker);
});

// Enhanced Sorting Functionality
function sortTable(columnIndex, dataType) {
  const table = document.getElementById('leagueTable');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  const teamRows = rows.filter(row => !row.classList.contains('separator'));
  const separatorRows = rows.filter(row => row.classList.contains('separator'));

  // Toggle sort order if the same column is clicked again
  if (currentSortColumn === columnIndex) {
    isAscending = !isAscending;
  } else {
    currentSortColumn = columnIndex;
    isAscending = true;
  }

  teamRows.sort((a, b) => {
    const aCell = a.cells[columnIndex];
    const bCell = b.cells[columnIndex];
    let aValue, bValue;

    switch (dataType) {
      case 'number':
        aValue = parseInt(aCell.textContent);
        bValue = parseInt(bCell.textContent);
        break;
      case 'string':
        aValue = aCell.textContent.trim().toLowerCase();
        bValue = bCell.textContent.trim().toLowerCase();
        break;
      case 'goals':
        const aGoals = aCell.textContent.split(':').map(Number);
        const bGoals = bCell.textContent.split(':').map(Number);
        aValue = aGoals[0] - aGoals[1];
        bValue = bGoals[0] - bGoals[1];
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return isAscending ? -1 : 1;
    if (aValue > bValue) return isAscending ? 1 : -1;
    return 0;
  });

  // Clear and rebuild the table
  tbody.innerHTML = '';
  let teamIndex = 0;
  rows.forEach((row) => {
    if (row.classList.contains('separator')) {
      tbody.appendChild(row);
    } else {
      const teamRow = teamRows[teamIndex];
      teamRow.cells[0].textContent = teamIndex + 1; // Update position
      tbody.appendChild(teamRow);
      teamIndex++;
    }
  });

  // Add visual feedback for sorted column
  const headers = table.querySelectorAll('th');
  headers.forEach((header, index) => {
    if (index === columnIndex) {
      header.setAttribute('data-sort', isAscending ? 'asc' : 'desc');
    } else {
      header.removeAttribute('data-sort');
    }
  });
}

// --- New Code for Match Database and League Table Updates ---

// In-memory database for matches
const matchDatabase = [];

/**
 * Adds a new match result to the database and updates the league table.
 * @param {string} teamA - Name of the first team.
 * @param {string} teamB - Name of the second team.
 * @param {number} scoreA - Goals scored by teamA.
 * @param {number} scoreB - Goals scored by teamB.
 */
function addMatchResult(teamA, teamB, scoreA, scoreB) {
  // Add the match result to the database
  matchDatabase.push({ teamA, teamB, scoreA, scoreB });
  // Update the league table based on the new results
  updateLeagueTable();
}

/**
 * Recalculates the league standings based on match results stored in matchDatabase.
 * It finds the corresponding table row by matching the team name (inside the <b> tag)
 * and updates the Played, Won, Draw, Lost, +/-, Points, and Form columns.
 */
function updateLeagueTable() {
  // Create an object to store team statistics keyed by team name.
  const teams = {};

  // Initialize teams based on the table rows (skipping separator rows)
  const tableRows = document.querySelectorAll('#leagueTable tbody tr:not(.separator)');
  tableRows.forEach(row => {
    const teamNameElement = row.querySelector('td:nth-child(2) b');
    if (teamNameElement) {
      const teamName = teamNameElement.textContent.trim();
      teams[teamName] = {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        points: 0,
        form: [] // array of 'victory', 'draw', or 'loss'
      };
    }
  });

  // Process each match result and update team stats
  matchDatabase.forEach(match => {
    // Update for teamA
    if (teams[match.teamA]) {
      teams[match.teamA].played += 1;
      teams[match.teamA].gf += match.scoreA;
      teams[match.teamA].ga += match.scoreB;
      if (match.scoreA > match.scoreB) {
        teams[match.teamA].wins += 1;
        teams[match.teamA].points += 3;
        teams[match.teamA].form.push('victory');
      } else if (match.scoreA === match.scoreB) {
        teams[match.teamA].draws += 1;
        teams[match.teamA].points += 1;
        teams[match.teamA].form.push('draw');
      } else {
        teams[match.teamA].losses += 1;
        teams[match.teamA].form.push('loss');
      }
      // Keep only the last 5 results for form
      if (teams[match.teamA].form.length > 5) teams[match.teamA].form.shift();
    }
    // Update for teamB
    if (teams[match.teamB]) {
      teams[match.teamB].played += 1;
      teams[match.teamB].gf += match.scoreB;
      teams[match.teamB].ga += match.scoreA;
      if (match.scoreB > match.scoreA) {
        teams[match.teamB].wins += 1;
        teams[match.teamB].points += 3;
        teams[match.teamB].form.push('victory');
      } else if (match.scoreA === match.scoreB) {
        teams[match.teamB].draws += 1;
        teams[match.teamB].points += 1;
        teams[match.teamB].form.push('draw');
      } else {
        teams[match.teamB].losses += 1;
        teams[match.teamB].form.push('loss');
      }
      if (teams[match.teamB].form.length > 5) teams[match.teamB].form.shift();
    }
  });

  // Update the table rows with the new stats
  tableRows.forEach(row => {
    const teamNameElement = row.querySelector('td:nth-child(2) b');
    if (teamNameElement) {
      const teamName = teamNameElement.textContent.trim();
      const stats = teams[teamName];
      if (stats) {
        row.cells[2].textContent = stats.played;            // Played
        row.cells[3].textContent = stats.wins;              // Won
        row.cells[4].textContent = stats.draws;             // Draw
        row.cells[5].textContent = stats.losses;            // Lost
        row.cells[6].textContent = `${stats.gf}:${stats.ga}`; // Goals For:Against
        row.cells[7].innerHTML = `<b class="points">${stats.points}</b>`; // Points

        // Update the Form column: clear existing and add new form boxes
        const formCell = row.cells[8];
        formCell.innerHTML = '';
        stats.form.forEach(result => {
          const span = document.createElement('span');
          span.className = 'form-box ' + result;
          formCell.appendChild(span);
        });
      }
    }
  });
}

// Save database to localStorage
function saveDatabase() {
  localStorage.setItem('matchDatabase', JSON.stringify(matchDatabase));
}

// Load database from localStorage
function loadDatabase() {
  const savedData = localStorage.getItem('matchDatabase');
  if (savedData) {
    matchDatabase.push(...JSON.parse(savedData));
    updateLeagueTable();
  }
}

// Call this when adding a match
function addMatchResult(teamA, teamB, scoreA, scoreB) {
  matchDatabase.push({ teamA, teamB, scoreA, scoreB });
  saveDatabase();
  updateLeagueTable();
}

// Add these at the top with other constants
let teams = {};

// Add these functions
function initializeTeamsData() {
  const teamRows = document.querySelectorAll('#leagueTable tbody tr:not(.separator)');
  teams = {};

  teamRows.forEach(row => {
    const cells = row.cells;
    const teamName = cells[1].querySelector('b').textContent.trim();
    const formBoxes = cells[8].querySelectorAll('.form-box');
    
    teams[teamName] = {
      played: parseInt(cells[2].textContent),
      won: parseInt(cells[3].textContent),
      draw: parseInt(cells[4].textContent),
      lost: parseInt(cells[5].textContent),
      goalsFor: parseInt(cells[6].textContent.split(':')[0]),
      goalsAgainst: parseInt(cells[6].textContent.split(':')[1]),
      points: parseInt(cells[7].querySelector('.points').textContent),
      form: Array.from(formBoxes).map(box => {
        if (box.classList.contains('victory')) return 'W';
        if (box.classList.contains('draw')) return 'D';
        return 'L';
      })
    };
  });
}

function updateLeagueTable() {
  const rows = document.querySelectorAll('#leagueTable tbody tr:not(.separator)');

  rows.forEach(row => {
    const teamName = row.cells[1].querySelector('b').textContent.trim();
    const team = teams[teamName];

    // Update basic stats
    row.cells[2].textContent = team.played;
    row.cells[3].textContent = team.won;
    row.cells[4].textContent = team.draw;
    row.cells[5].textContent = team.lost;
    row.cells[6].textContent = `${team.goalsFor}:${team.goalsAgainst}`;
    row.cells[7].querySelector('.points').textContent = team.points;

    // Update form
    const formBoxes = row.cells[8].querySelectorAll('.form-box');
    team.form.forEach((result, i) => {
      formBoxes[i].className = 'form-box';
      formBoxes[i].classList.add(
        result === 'W' ? 'victory' : 
        result === 'D' ? 'draw' : 'loss'
      );
    });
  });

  // Re-sort table
  if (currentSortColumn !== null) {
    const dataType = getDataTypeForColumn(currentSortColumn);
    sortTable(currentSortColumn, dataType);
  }
}

function getDataTypeForColumn(columnIndex) {
  const dataTypes = ['number', 'string', 'number', 'number', 'number', 'number', 'goals', 'number'];
  return dataTypes[columnIndex] || 'number';
}

// Add match form handler
document.getElementById('matchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const homeTeam = document.getElementById('homeTeam').value;
  const awayTeam = document.getElementById('awayTeam').value;
  const homeScore = parseInt(document.getElementById('homeScore').value);
  const awayScore = parseInt(document.getElementById('awayScore').value);

  if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
    alert('Please select valid teams');
    return;
  }

  // Update team data
  [homeTeam, awayTeam].forEach(team => {
    teams[team].played++;
    teams[team].goalsFor += team === homeTeam ? homeScore : awayScore;
    teams[team].goalsAgainst += team === homeTeam ? awayScore : homeScore;
  });

  // Update results
  if (homeScore > awayScore) {
    teams[homeTeam].won++;
    teams[homeTeam].points += 3;
    teams[homeTeam].form.unshift('W');
    teams[awayTeam].lost++;
    teams[awayTeam].form.unshift('L');
  } else if (awayScore > homeScore) {
    teams[awayTeam].won++;
    teams[awayTeam].points += 3;
    teams[awayTeam].form.unshift('W');
    teams[homeTeam].lost++;
    teams[homeTeam].form.unshift('L');
  } else {
    teams[homeTeam].draw++;
    teams[homeTeam].points++;
    teams[homeTeam].form.unshift('D');
    teams[awayTeam].draw++;
    teams[awayTeam].points++;
    teams[awayTeam].form.unshift('D');
  }

  // Keep only last 5 matches in form
  teams[homeTeam].form = teams[homeTeam].form.slice(0, 5);
  teams[awayTeam].form = teams[awayTeam].form.slice(0, 5);

  updateLeagueTable();
  e.target.reset();
});

// Initialize teams data on load
window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  initializeTeamsData();
  sortTable(7, 'number');
};


// Loading Spinner
window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  sortTable(7, 'number'); // Sort by Points (column 7)
};
