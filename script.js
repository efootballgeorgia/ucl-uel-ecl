/* ============================================
   1. Constants & DOM Elements
============================================ */
const images = document.querySelectorAll('.image-gallery img');
const screens = document.querySelectorAll('.screen-gallery img');
const modal = document.getElementById('myModal');
const modalImage = document.getElementById('modalImage');

let currentSortColumn = {}; // Object to store sort column per league
let isAscending = {}; // Object to store sort order per league
const matchDayContainers = {
  ucl: document.querySelector('.ucl-match-day-container'),
  uel: document.querySelector('.uel-match-day-container')
};
let matchDayGenerated = { ucl: false, uel: false }; // Flag per league
let fixtures = { ucl: [], uel: [] }; // Store generated fixtures per league

let currentLeague = 'ucl'; // Default to UCL

/* ============================================
   2. Firebase Configuration & Initialization
============================================ */
const firebaseConfig = {
  apiKey: "AIzaSyAQSPphqNP7BHzbRXLYDwrkUsPyIJpcALc",
  authDomain: "nekro-league-9e7bf.firebaseapp.com",
  projectId: "nekro-league-9e7bf",
  storageBucket: "nekro-league-9e7bf.appspot.com",
  messagingSenderId: "721371342919",
  appId: "1:721371342919:web:217f325dadb42db4a8e962",
  measurementId: "G-0NCFK58SMN"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const analytics = firebase.analytics(app);
console.log("Firebase initialized:", app);

/* ============================================
   3. Utility Functions
============================================ */

// Modal Control
function closeModal() {
  modal.classList.remove('show');
}

// Toggle Gallery Display (if still used)
function toggleGallery(logo) {
  const gallery = logo.nextElementSibling;
  if (gallery.classList.contains('show')) {
    gallery.classList.remove('show');
  } else {
    gallery.classList.add('show');
  }
}

// Enhanced Sorting Functionality for League Table
function sortTable(league, columnIndex, dataType) {
  const table = document.getElementById(`${league}LeagueTable`);
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  const teamRows = rows.filter(row => !row.classList.contains('separator'));
  const separatorRows = rows.filter(row => row.classList.contains('separator'));

  // Initialize sort state for the league if not present
  if (currentSortColumn[league] === undefined) {
    currentSortColumn[league] = null;
    isAscending[league] = true;
  }

  // Toggle sort order if the same column is clicked again
  if (currentSortColumn[league] === columnIndex) {
    isAscending[league] = !isAscending[league];
  } else {
    currentSortColumn[league] = columnIndex;
    isAscending[league] = true;
  }

  teamRows.sort((a, b) => {
    const aPoints = parseInt(a.cells[7].querySelector('.points').textContent);
    const bPoints = parseInt(b.cells[7].querySelector('.points').textContent);

    // Primary sort: points
    if (aPoints !== bPoints) {
      return isAscending[league] ? bPoints - aPoints : aPoints - bPoints;
    }

    // Secondary sort: selected column based on data type
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

    if (aValue < bValue) return isAscending[league] ? -1 : 1;
    if (aValue > bValue) return isAscending[league] ? 1 : -1;
    return 0;
  });

  // Rebuild the table with updated rows and positions
  tbody.innerHTML = '';
  let teamIndex = 0;
  rows.forEach((row) => {
    if (row.classList.contains('separator')) {
      tbody.appendChild(row);
    } else {
      const teamRow = teamRows[teamIndex];
      teamRow.cells[0].textContent = teamIndex + 1; // Update team position
      tbody.appendChild(teamRow);
      teamIndex++;
    }
  });

  // Add visual feedback for sorted column
  const headers = table.querySelectorAll('th');
  headers.forEach((header, index) => {
    if (index === columnIndex) {
      header.setAttribute('data-sort', isAscending[league] ? 'asc' : 'desc');
    } else {
      header.removeAttribute('data-sort');
    }
  });
}

// Update Team Statistics
function updateTeamStats(league, teamName, goalsFor, goalsAgainst, isWin, isDraw) {
  const rows = document.querySelectorAll(`#${league}LeagueTable tbody tr:not(.separator)`);

  rows.forEach(row => {
    const teamCell = row.cells[1];
    if (teamCell.querySelector('b').textContent === teamName) {
      const cells = row.cells;
      cells[2].textContent = parseInt(cells[2].textContent) + 1; // Played
      cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0); // Won
      cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0); // Draw
      cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0); // Lost

      const [currentFor, currentAgainst] = cells[6].textContent.split(':').map(Number);
      cells[6].textContent = `${currentFor + goalsFor}:${currentAgainst + goalsAgainst}`; // Goal difference

      const points = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);
      cells[7].querySelector('.points').textContent = points; // Update points

      // Update the match form cell with new form box
      const formCell = cells[8];

      // Remove the oldest form box if there are already 5 form boxes
      if (formCell.children.length >= 5) {
        formCell.removeChild(formCell.lastChild);
      }

      // Create and add the new form box
      const formBox = document.createElement('span');
      formBox.className = 'form-box';
      if (isWin) {
        formBox.classList.add('victory');
      } else if (isDraw) {
        formBox.classList.add('draw');
      } else {
        formBox.classList.add('loss');
      }
      formCell.prepend(formBox);
    }
  });
}

// Add Match to Firestore
function addMatch(league, homeTeam, awayTeam, homeScore, awayScore) {
  return db.collection(`${league}Matches`).add({ // Use league to determine collection
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    homeScore: homeScore,
    awayScore: awayScore,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Fetch and Display Existing Matches
function fetchMatches(league) {
  return db.collection(`${league}Matches`).orderBy('timestamp', 'desc').get(); // Use league to determine collection
}

/* ============================================
   4. Event Listeners for Modal & Gallery
============================================ */
// Open modal when any gallery image is clicked
screens.forEach(screen => {
  screen.addEventListener('click', (event) => { // Add event parameter
    modal.classList.add('show');
    modalImage.src = event.target.src; // Use clicked image's src
  });
});

// Close modal when clicking outside the modal image
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

/* ============================================
   5. Event Listener for Match Form Submission
============================================ */
document.getElementById('uclMatchForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const homeTeam = document.getElementById('uclHomeTeam').value;
  const awayTeam = document.getElementById('uclAwayTeam').value;
  const homeScore = parseInt(document.getElementById('uclHomeScore').value);
  const awayScore = parseInt(document.getElementById('uclAwayScore').value);

  if (homeTeam === awayTeam) {
    alert('A team cannot play against itself!');
    return;
  }

  this.reset();
  updateAll('ucl'); // Pass league to updateAll

  // Save match to Firestore and update UI
  addMatch('ucl', homeTeam, awayTeam, homeScore, awayScore)
    .then(() => {
      console.log('UCL Match added to Firestore');
      const isDraw = homeScore === awayScore;

      updateTeamStats(
        'ucl',
        homeTeam,
        homeScore,
        awayScore,
        homeScore > awayScore,
        isDraw
      );
      updateTeamStats(
        'ucl',
        awayTeam,
        awayScore,
        homeScore,
        awayScore > homeScore,
        isDraw
      );

      sortTable('ucl', 7, 'number');
      updateMatchDayResults('ucl', homeTeam, awayTeam, homeScore, awayScore);
    })
    .catch(error => console.error("Error adding UCL match:", error));
});

document.getElementById('uelMatchForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const homeTeam = document.getElementById('uelHomeTeam').value;
  const awayTeam = document.getElementById('uelAwayTeam').value;
  const homeScore = parseInt(document.getElementById('uelHomeScore').value);
  const awayScore = parseInt(document.getElementById('uelAwayScore').value);

  if (homeTeam === awayTeam) {
    alert('A team cannot play against itself!');
    return;
  }

  this.reset();
  updateAll('uel'); // Pass league to updateAll

  // Save match to Firestore and update UI
  addMatch('uel', homeTeam, awayTeam, homeScore, awayScore)
    .then(() => {
      console.log('UEL Match added to Firestore');
      const isDraw = homeScore === awayScore;

      updateTeamStats(
        'uel',
        homeTeam,
        homeScore,
        awayScore,
        homeScore > awayScore,
        isDraw
      );
      updateTeamStats(
        'uel',
        awayTeam,
        awayScore,
        homeScore,
        awayScore > homeTeam,
        isDraw
      );

      sortTable('uel', 7, 'number');
      updateMatchDayResults('uel', homeTeam, awayTeam, homeScore, awayScore);
    })
    .catch(error => console.error("Error adding UEL match:", error));
});


/* ============================================
   6. Player Squad Interaction
============================================ */

// Initialize player interactions (if applicable for both leagues)
function initPlayerInteractions(league) {
  // Assuming player details are still global or handled elsewhere.
  // If player data becomes league-specific, this function would need
  // to be adapted to fetch correct data based on the league.
  document.querySelectorAll(`#${league}LeagueTable tbody td img`).forEach(logo => {
    logo.addEventListener('click', function() {
      const teamName = this.closest('td').querySelector('b').textContent;
      const formattedName = teamName.toLowerCase().replace(/ /g, '-');
      const gameplanPath = `images/gameplans/${formattedName}.jpg`;

      modalImage.src = gameplanPath;
      modal.classList.add('show');
    });
  });
}

function showPlayerDetails(playerId, teamContainer) {
  // Hide all player details in this team first
  teamContainer.querySelectorAll('.player-details').forEach(detail => {
    detail.style.display = 'none';
  });

  // Show the selected player
  const playerDetail = teamContainer.querySelector(`.player-details[data-player="${playerId}"]`);
  if (playerDetail) {
    playerDetail.style.display = 'flex';
    teamContainer.querySelector('.player-details-container').classList.add('active');
  }
}

function closePlayerDetails(teamContainer) {
  teamContainer.querySelector('.player-details-container').classList.remove('active');
}

function updateKnockoutStage(league) {
  const teams = Array.from(document.querySelectorAll(`#${league}LeagueTable tbody tr:not(.separator)`));

  // Clear existing logos for the current league
  document.querySelector(`.${league}-logos-container`).querySelectorAll('div').forEach(div => div.innerHTML = '');

  teams.forEach((team, index) => {
    const position = index + 1;
    const logo = team.querySelector('img').cloneNode(true);
    logo.style.width = '100%';
    logo.style.height = '100%';
    logo.style.objectFit = 'cover';

    let targetSelector;
    if (league === 'ucl') {
      if (position <= 8) targetSelector = `.r16-team.pos${position}`;
      else if (position <= 16) targetSelector = `.playoff-seeded.pos${position}`;
      else if (position <= 24) targetSelector = `.playoff-unseeded.pos${position}`; 
    }
    
    if (league === 'uel') {
      if (position <= 8) targetSelector = `.uel-r16-team.pos${position}`;
      else if (position <= 16) targetSelector = `.uel-playoff-seeded.pos${position}`;
      else if (position <= 24) targetSelector = `.uel-playoff-unseeded.pos${position}`;
    }

    if (targetSelector) {
      const container = document.querySelector(`.${league}-logos-container ${targetSelector}`);
      if (container) container.appendChild(logo);
    }
  });
}

// Call this after any table update
function updateAll(league) {
  sortTable(league, 7, 'number');
  updateKnockoutStage(league);
}

// Function to generate and display match day fixtures
function generateMatchDay(league) {
  if (matchDayGenerated[league]) return; // Only generate once per league

  const teams = Array.from(document.querySelectorAll(`#${league}LeagueTable tbody tr:not(.separator)`)).map(row => row.cells[1].querySelector('b').textContent);
  fixtures[league] = [];

  // Basic Round-Robin Scheduling (e.g., 8 days for UCL, fewer for UEL if fewer teams)
  const numDays = league === 'ucl' ? 8 : 8; // Example: fewer match days for UEL if fewer teams
  for (let day = 1; day <= numDays; day++) {
    const dayFixtures = [];
    let matchIndex = 0;
    for (let i = 0; i < teams.length; i += 2) {
      if (day % 2 === 0) {
        if (i + 1 < teams.length) {
          dayFixtures.push({ home: teams[i], away: teams[i + 1], day: day, matchIndex: matchIndex });
        }
      } else {
        if (i + 1 < teams.length) {
          dayFixtures.push({ home: teams[i + 1], away: teams[i], day: day, matchIndex: matchIndex });
        }
      }
      matchIndex++;
    }
    fixtures[league].push(dayFixtures);
    // Rotate teams for the next day (except the first team)
    teams.splice(1, 0, teams.pop());
  }

  // Display fixtures
  let matchDayHTML = '';
  fixtures[league].forEach((dayFixtures, index) => {
    matchDayHTML += `
            <div class="match-day-card">
                <h3>Day ${index + 1}</h3>
        `;
    dayFixtures.forEach(match => {
      matchDayHTML += `
                <div class="match-card" data-home="${match.home}" data-away="${match.away}" data-day="${match.day}" data-match-index="${match.matchIndex}">
                    ${match.home} vs ${match.away}
                    <div class="match-result">- / -</div>
                </div>
            `;
    });
    matchDayHTML += '</div>';
  });

  matchDayContainers[league].innerHTML = matchDayHTML;
  matchDayGenerated[league] = true;
}

// Update match results in the Match Day section
function updateMatchDayResults(league, homeTeam, awayTeam, homeScore, awayScore) {
  const matchCards = document.querySelectorAll(`#${league}-matches-section .match-card`);
  matchCards.forEach(card => {
    if ((card.dataset.home === homeTeam && card.dataset.away === awayTeam) ||
      (card.dataset.home === awayTeam && card.dataset.away === homeTeam)) { // Handle both home/away scenarios
      card.querySelector('.match-result').textContent = `${homeScore} / ${awayScore}`;
    }
  });
}

function loadMatchDayResults(league) {
  fetchMatches(league)
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        const match = doc.data();
        updateMatchDayResults(league, match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
      });
    })
    .catch(error => console.error(`Error fetching matches for ${league} Match Day:`, error));
}

function initTeamLogoInteractions(league) {
  document.querySelectorAll(`#${league}LeagueTable tbody td img`).forEach(logo => {
    logo.addEventListener('click', function() {
      const teamName = this.closest('td').querySelector('b').textContent;
      const formattedName = teamName.toLowerCase().replace(/ /g, '-');
      const gameplanPath = `images/gameplans/${formattedName}.jpg`;

      modalImage.src = gameplanPath;
      modal.classList.add('show');
    });
  });
}

// Navigation functionality (main tabs: League Table, Match Day, Knockout)
function setupNavigation() {
  const navButtons = document.querySelectorAll('.main-nav .nav-btn');
  // Sections are now filtered by league
  const pageSections = document.querySelectorAll('.page-section');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active'); // Add active class to clicked button

      // Hide all page sections for both leagues
      pageSections.forEach(section => section.classList.remove('active'));

      // Show the corresponding section for the currentLeague
      const pageId = button.dataset.page;
      document.getElementById(`${currentLeague}-${pageId}-section`).classList.add('active');

      // Special handling for each page if needed
      if (pageId === 'matches') {
        generateMatchDay(currentLeague);
        loadMatchDayResults(currentLeague);
      }
      if (pageId === 'knockout') {
        updateKnockoutStage(currentLeague);
      }
    });
  });
}

// League selection functionality (UCL, UEL)
function setupLeagueNavigation() {
  const leagueButtons = document.querySelectorAll('.league-selector-nav .league-btn');
  const leagueLogos = document.querySelectorAll('.league-logo');

  leagueButtons.forEach(button => {
    button.addEventListener('click', () => {
      const selectedLeague = button.dataset.league;

      // Update active button classes
      leagueButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update active league logo
      leagueLogos.forEach(logo => logo.classList.remove('active'));
      document.querySelector(`[data-league-logo="${selectedLeague}"]`).classList.add('active');


      currentLeague = selectedLeague; // Update global currentLeague

      // Hide all main page sections
      document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
      });

      // Activate the default section ('league') for the newly selected league
      document.getElementById(`${currentLeague}-league-section`).classList.add('active');

      // Reset main navigation active state to 'League Table'
      document.querySelectorAll('.main-nav .nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === 'league') {
          btn.classList.add('active');
        }
      });

      // Load data for the newly selected league
      loadLeagueData(currentLeague);
    });
  });
}

// New function to load all data for a given league
function loadLeagueData(league) {
  // Reset table stats for the current league
  document.querySelectorAll(`#${league}LeagueTable tbody tr:not(.separator)`).forEach(row => {
    const cells = row.cells;
    cells[2].textContent = '0'; // Played
    cells[3].textContent = '0'; // Won
    cells[4].textContent = '0'; // Draw
    cells[5].textContent = '0'; // Lost
    cells[6].textContent = '0:0'; // Goal difference
    cells[7].querySelector('.points').textContent = '0'; // Points
    cells[8].innerHTML = '<span class="form-box draw"></span>'; // Reset form to draw
  });

  fetchMatches(league)
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        const match = doc.data();
        updateTeamStats(
          league,
          match.homeTeam,
          match.homeScore,
          match.awayScore,
          match.homeScore > match.awayScore,
          match.homeScore === match.awayScore
        );
        updateTeamStats(
          league,
          match.awayTeam,
          match.awayScore,
          match.homeScore,
          match.awayScore > match.homeScore,
          match.homeScore === match.awayScore
        );
      });
      sortTable(league, 7, 'number');
      // Reset matchDayGenerated flag for the current league if you want it regenerated on switch
      matchDayGenerated[league] = false;
      generateMatchDay(league);
      loadMatchDayResults(league);
      updateKnockoutStage(league);
      initTeamLogoInteractions(league);
    })
    .catch(error => console.error(`Error fetching initial data for ${league}:`, error));
}


window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  setupNavigation(); // Initialize main page navigation
  setupLeagueNavigation(); // Initialize league selection navigation

  // Initial load for the default league (UCL)
  loadLeagueData('ucl');
};
