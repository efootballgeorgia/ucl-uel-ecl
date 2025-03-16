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

// Handle form submission to add a new match
document.getElementById('matchForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const teamA = document.getElementById('teamA').value.trim();
  const scoreA = parseInt(document.getElementById('scoreA').value);
  const teamB = document.getElementById('teamB').value.trim();
  const scoreB = parseInt(document.getElementById('scoreB').value);

  if (!teamA || !teamB || isNaN(scoreA) || isNaN(scoreB)) {
    alert('Please fill out all fields correctly.');
    return;
  }

  // Add the match result
  addMatchResult(teamA, teamB, scoreA, scoreB);

  // Clear the form fields
  document.getElementById('teamA').value = '';
  document.getElementById('scoreA').value = '';
  document.getElementById('teamB').value = '';
  document.getElementById('scoreB').value = '';
});



// Loading Spinner
window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  sortTable(7, 'number'); // Sort by Points (column 7)
};
