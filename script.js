/* ============================================
   1. App Configuration & State
============================================ */
const leagueConfig = {
  ucl: {
    teams: [
      "Parma", "Tottenham", "Hellas Verona", "Nottingham Forest", "Lyon", "Manchester City",
      "Arsenal", "Celta Vigo", "Athletic Bilbao", "Juventus", "Marseille", "PSG", "AC Milan",
      "Barcelona", "Torino", "Osasuna", "Everton", "Empoli", "Metz", "Atalanta", "Liverpool",
      "Mallorca", "Brest", "Villarreal", "Chelsea", "Real Betis", "Monza", "Real Madrid",
      "Girona", "Venezia", "Manchester United", "Crystal Palace", "Rennes", "Inter Milan",
      "Bayern Munich", "Atletico Madrid"
    ]
  },
  uel: {
    teams: [ ] // Example teams
  },
  ecl: {
    teams: [ ] // Example teams
  }
};

const modal = document.getElementById('myModal');
const modalImage = document.getElementById('modalImage');
const matchDayContainers = {
  ucl: document.querySelector('.ucl-match-day-container'),
  uel: document.querySelector('.uel-match-day-container'),
  ecl: document.querySelector('.ecl-match-day-container')
};

let currentLeague = 'ucl';
let currentSortColumn = {};
let isAscending = {};
let matchDayGenerated = { ucl: false, uel: false, ecl: false };
let fixtures = { ucl: [], uel: [], ecl: [] };

/* ============================================
   2. Firebase Configuration & Initialization
============================================ */
// IMPORTANT: For production, move this configuration to a secure environment.
const firebaseConfig = {
    apiKey: "AIzaSyAQSPphqNP7BHzbRXLYDwrkUsPyIJpcALc",
    authDomain: "nekro-league-9e7bf.firebaseapp.com",
    projectId: "nekro-league-9e7bf",
    storageBucket: "nekro-league-9e7bf.appspot.com",
    messagingSenderId: "721371342919",
    appId: "1:721371342919:web:217f325dadb42db4a8e962"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
console.log("Firebase initialized");

/* ============================================
   3. Utility & Helper Functions
============================================ */
function closeModal() {
  modal.classList.remove('show');
}

function debounce(func, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

function showFeedback(formElement, message, isSuccess) {
  const feedbackDiv = formElement.querySelector('.feedback-message');
  feedbackDiv.textContent = message;
  feedbackDiv.className = `feedback-message ${isSuccess ? 'success' : 'error'} show`;
  setTimeout(() => {
    feedbackDiv.className = 'feedback-message';
  }, 3000);
}

/* ============================================
   4. Core Table & Data Functions
============================================ */
function renderTable(league) {
    const tableBody = document.querySelector(`#${league}LeagueTable tbody`);
    const teams = leagueConfig[league].teams;
    const fragment = document.createDocumentFragment(); // Use a Document Fragment

    tableBody.innerHTML = '';

    if (!teams || teams.length === 0) {
        return;
    }

    teams.forEach((teamName, index) => {
        const teamLogoName = teamName.toLowerCase().replace(/ /g, '-');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
              <picture>
                <source srcset="images/logos/${teamLogoName}.webp" type="image/webp">
                <source srcset="images/logos/${teamLogoName}.png" type="image/png">
                <img src="images/logos/${teamLogoName}.png" alt="${teamName}" loading="lazy">
              </picture>
              <b>${teamName}</b>
            </td>
            <td>0</td><td>0</td><td>0</td><td>0</td><td>0:0</td>
            <td><b class="points">0</b></td>
            <td><span class="form-box draw"></span></td>
        `;
        fragment.appendChild(row); // Append row to the fragment

        if ([7, 15, 23].includes(index)) {
            const separatorRow = document.createElement('tr');
            separatorRow.className = 'separator';
            let lineClass = index === 7 ? 'round16' : (index === 15 ? 'knockout-seeded' : 'knockout-unseeded');
            separatorRow.innerHTML = `<td colspan="9" class="${lineClass}"><span class="line"></span></td>`;
            fragment.appendChild(separatorRow); // Append separator to the fragment
        }
    });

    tableBody.appendChild(fragment); // Append the entire fragment to the DOM once
}


function populateTeamDropdowns(league) {
    const homeSelect = document.getElementById(`${league}HomeTeam`);
    const awaySelect = document.getElementById(`${league}AwayTeam`);
    const teams = leagueConfig[league].teams;

    homeSelect.innerHTML = '<option value="">Home Team</option>';
    awaySelect.innerHTML = '<option value="">Away Team</option>';

    teams.forEach(team => {
        homeSelect.add(new Option(team, team));
        awaySelect.add(new Option(team, team));
    });
}

function sortTable(league, columnIndex, dataType) {
  const table = document.getElementById(`${league}LeagueTable`);
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr:not(.separator)'));

  if (currentSortColumn[league] === undefined) {
    currentSortColumn[league] = 7;
    isAscending[league] = false;
  }

  if (currentSortColumn[league] === columnIndex) {
    isAscending[league] = !isAscending[league];
  } else {
    currentSortColumn[league] = columnIndex;
    isAscending[league] = (columnIndex === 1);
  }

  rows.sort((a, b) => {
    const aPoints = parseInt(a.cells[7].querySelector('.points').textContent);
    const bPoints = parseInt(b.cells[7].querySelector('.points').textContent);
    if (aPoints !== bPoints) {
        return isAscending[league] ? aPoints - bPoints : bPoints - aPoints;
    }

    const aCell = a.cells[columnIndex];
    const bCell = b.cells[columnIndex];
    let aVal, bVal;

    switch (dataType) {
        case 'number':
            aVal = parseInt(aCell.textContent) || 0;
            bVal = parseInt(bCell.textContent) || 0;
            return isAscending[league] ? aVal - bVal : bVal - aVal;
        case 'string':
            aVal = aCell.textContent.trim().toLowerCase();
            bVal = bCell.textContent.trim().toLowerCase();
            return isAscending[league] ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'goals':
            const [aF, aA] = aCell.textContent.split(':').map(Number);
            const [bF, bA] = bCell.textContent.split(':').map(Number);
            aVal = aF - aA;
            bVal = bF - bA;
            return isAscending[league] ? aVal - bVal : bVal - aVal;
        default:
            return 0;
    }
  });

  const fragment = document.createDocumentFragment();
  let teamIndex = 0;
  let separatorIndex = 0;
  const originalRows = Array.from(tbody.querySelectorAll('tr'));
  const separators = originalRows.filter(row => row.classList.contains('separator'));

  rows.forEach(row => {
      teamIndex++;
      row.cells[0].textContent = teamIndex;
      fragment.appendChild(row);
      if ([8, 16, 24].includes(teamIndex) && separatorIndex < separators.length) {
          fragment.appendChild(separators[separatorIndex++]);
      }
  });
  tbody.innerHTML = '';
  tbody.appendChild(fragment);

  table.querySelectorAll('th').forEach((th, i) => th.dataset.sort = (i === columnIndex) ? (isAscending[league] ? 'asc' : 'desc') : '');
}

function updateTeamStats(league, teamName, gf, ga, isWin, isDraw) {
  const rows = document.querySelectorAll(`#${league}LeagueTable tbody tr`);
  rows.forEach(row => {
    if (row.cells.length > 1 && row.cells[1].querySelector('b')?.textContent === teamName) {
      const cells = row.cells;
      cells[2].textContent = parseInt(cells[2].textContent) + 1; // P
      cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0); // W
      cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0); // D
      cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0); // L
      const [currF, currA] = cells[6].textContent.split(':').map(Number);
      cells[6].textContent = `${currF + gf}:${currA + ga}`; // +/-
      cells[7].querySelector('.points').textContent = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);

      const formCell = cells[8];
      if (formCell.children.length >= 5) formCell.removeChild(formCell.lastChild);
      const formBox = document.createElement('span');
      formBox.className = `form-box ${isWin ? 'victory' : isDraw ? 'draw' : 'loss'}`;
      formCell.prepend(formBox);
    }
  });
}

function updateKnockoutStage(league) {
    const teams = Array.from(document.querySelectorAll(`#${league}LeagueTable tbody tr:not(.separator)`));
    const leagueContainer = document.querySelector(`.${league}-logos-container`);

    if (!leagueContainer) return;

    leagueContainer.querySelectorAll('div').forEach(div => div.innerHTML = '');

    teams.forEach((team, index) => {
        const position = index + 1;
        const pictureElement = team.querySelector('picture').cloneNode(true);
        const logoImage = pictureElement.querySelector('img');
        if (logoImage) {
            logoImage.style.width = '100%';
            logoImage.style.height = '100%';
            logoImage.style.objectFit = 'cover';
        }
        let targetClass;
        if (position <= 8) {
            targetClass = league === 'ucl' ? `.r16-team.pos${position}` : `.${league}-r16-team.pos${position}`;
        } else if (position <= 16) {
            targetClass = league === 'ucl' ? `.playoff-seeded.pos${position}` : `.${league}-playoff-seeded.pos${position}`;
        } else if (position <= 24) {
            targetClass = league === 'ucl' ? `.playoff-unseeded.pos${position}` : `.${league}-playoff-unseeded.pos${position}`;
        }

        if (targetClass) {
            const container = leagueContainer.querySelector(targetClass);
            if (container) {
                container.appendChild(pictureElement);
            }
        }
    });
}

/* ============================================
   5. Match Day & Fixtures
============================================ */
function generateMatchDay(league) {
    if (matchDayGenerated[league]) return;
    const teams = [...leagueConfig[league].teams];
    if (teams.length < 2) {
        matchDayContainers[league].innerHTML = '<p>Not enough teams for fixtures.</p>';
        return;
    }
    fixtures[league] = [];
    const numDays = 8;
    const n = teams.length;
    for (let day = 1; day <= numDays; day++) {
        const dayFixtures = [];
        for (let i = 0; i < n / 2; i++) {
            dayFixtures.push(day % 2 === 0 ? { home: teams[i], away: teams[n - 1 - i] } : { home: teams[n - 1 - i], away: teams[i] });
        }
        fixtures[league].push(dayFixtures);
        teams.splice(1, 0, teams.pop());
    }
    let html = '';
    fixtures[league].forEach((dayFixtures, i) => {
        html += `<div class="match-day-card"><h3>Day ${i + 1}</h3>`;
        dayFixtures.forEach(match => {
            html += `<div class="match-card" data-home="${match.home}" data-away="${match.away}">
                        ${match.home} vs ${match.away}
                        <div class="match-result">- / -</div>
                     </div>`;
        });
        html += '</div>';
    });
    matchDayContainers[league].innerHTML = html;
    matchDayGenerated[league] = true;
}

function updateMatchDayResults(league, home, away, homeScore, awayScore) {
  const matchCards = document.querySelectorAll(`#${league}-matches-section .match-card`);
  matchCards.forEach(card => {
    if (card.dataset.home === home && card.dataset.away === away) {
      card.querySelector('.match-result').textContent = `${homeScore} / ${awayScore}`;
    } else if (card.dataset.home === away && card.dataset.away === home) {
        card.querySelector('.match-result').textContent = `${awayScore} / ${homeScore}`;
    }
  });
}

function loadMatchDayResults(league) {
    fetchMatches(league).then(snapshot => {
        snapshot.forEach(doc => {
            const match = doc.data();
            updateMatchDayResults(league, match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
        });
    });
}

/* ============================================
   6. Firebase Interactions
============================================ */
function addMatch(league, homeTeam, awayTeam, homeScore, awayScore) {
  return db.collection(`${league}Matches`).add({
    homeTeam, awayTeam, homeScore, awayScore,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function fetchMatches(league) {
  return db.collection(`${league}Matches`).orderBy('timestamp', 'desc').get();
}

/* ============================================
   7. Event Listeners & App Initialization
============================================ */
function handleMatchSubmission(league) {
    const homeTeam = document.getElementById(`${league}HomeTeam`).value;
    const awayTeam = document.getElementById(`${league}AwayTeam`).value;
    const homeScore = parseInt(document.getElementById(`${league}HomeScore`).value);
    const awayScore = parseInt(document.getElementById(`${league}AwayScore`).value);
    const form = document.getElementById(`${league}MatchForm`);
    const submitButton = form.querySelector('button[type="submit"]');

    if (!homeTeam || !awayTeam || isNaN(homeScore) || isNaN(awayScore)) {
        showFeedback(form, 'Please fill all fields.', false);
        return;
    }
    if (homeTeam === awayTeam) {
        showFeedback(form, 'A team cannot play itself.', false);
        return;
    }
    
    submitButton.textContent = 'Adding...';
    submitButton.disabled = true;

    addMatch(league, homeTeam, awayTeam, homeScore, awayScore).then(() => {
        showFeedback(form, 'Match added successfully!', true);
        const isDraw = homeScore === awayScore;
        updateTeamStats(league, homeTeam, homeScore, awayScore, homeScore > awayScore, isDraw);
        updateTeamStats(league, awayTeam, awayScore, homeScore, awayScore > homeScore, isDraw);
        sortTable(league, 7, 'number');
        updateMatchDayResults(league, homeTeam, awayTeam, homeScore, awayScore);
        updateKnockoutStage(league);
        form.reset();
    }).catch(error => {
        showFeedback(form, 'Error adding match.', false);
        console.error(`Error adding ${league.toUpperCase()} match:`, error);
    }).finally(() => {
        submitButton.textContent = 'Add Match';
        submitButton.disabled = false;
    });
}

function setupNavigation() {
    document.querySelectorAll('.main-nav .nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.main-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
            const pageId = button.dataset.page;
            document.getElementById(`${currentLeague}-${pageId}-section`).classList.add('active');
            if (pageId === 'matches') generateMatchDay(currentLeague);
        });
    });
}

function setupLeagueNavigation() {
    document.querySelectorAll('.league-selector-nav .league-btn').forEach(button => {
        button.addEventListener('click', () => {
            currentLeague = button.dataset.league;
            document.querySelectorAll('.league-selector-nav .league-btn, .league-logo').forEach(el => el.classList.remove('active'));
            button.classList.add('active');
            document.querySelector(`[data-league-logo="${currentLeague}"]`).classList.add('active');
            document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
            document.querySelector('.main-nav .nav-btn.active').classList.remove('active');
            document.querySelector('.main-nav .nav-btn[data-page="league"]').classList.add('active');
            document.getElementById(`${currentLeague}-league-section`).classList.add('active');
            loadLeagueData(currentLeague);
        });
    });
}

function setupSearchFilters() {
    const handleSearch = (league) => {
        const searchTerm = document.getElementById(`${league}TeamSearch`).value.toLowerCase();
        const matchDays = document.querySelector(`.${league}-match-day-container`).querySelectorAll('.match-day-card');
        matchDays.forEach(day => {
            let dayHasVisibleMatch = false;
            day.querySelectorAll('.match-card').forEach(match => {
                const home = match.dataset.home.toLowerCase();
                const away = match.dataset.away.toLowerCase();
                const isVisible = home.includes(searchTerm) || away.includes(searchTerm);
                match.style.display = isVisible ? 'block' : 'none';
                if (isVisible) dayHasVisibleMatch = true;
            });
            day.style.display = dayHasVisibleMatch ? 'block' : 'none';
        });
    };
    ['ucl', 'uel', 'ecl'].forEach(league => {
        const input = document.getElementById(`${league}TeamSearch`);
        if (input) input.addEventListener('keyup', debounce(() => handleSearch(league)));
    });
}

function loadLeagueData(league) {
    renderTable(league);
    populateTeamDropdowns(league);
    fetchMatches(league).then(snapshot => {
        snapshot.forEach(doc => {
            const match = doc.data();
            updateTeamStats(league, match.homeTeam, match.homeScore, match.awayScore, match.homeScore > match.awayScore, match.homeScore === match.awayScore);
            updateTeamStats(league, match.awayTeam, match.awayScore, match.homeScore, match.awayScore > match.homeScore, match.homeScore === match.awayScore);
        });
        sortTable(league, 7, 'number');
        matchDayGenerated[league] = false;
        generateMatchDay(league);
        loadMatchDayResults(league);
        updateKnockoutStage(league);
    }).catch(error => console.error(`Error loading data for ${league}:`, error));
}

function renderHighlightGalleries() {
  const leagues = {
    ucl: 'champions-league-logo',
    uel: 'europa-league-logo',
    ecl: 'conference-league-logo'
  };

  for (const [league, logoFile] of Object.entries(leagues)) {
    const galleryContainer = document.querySelector(`#${league}-day-win-images-section .win-gallery`);
    if (galleryContainer) {
      let galleryHtml = '';
      for (let i = 1; i <= 8; i++) {
        galleryHtml += `
          <div class="wins">
            <h3>
              <img src="images/logos/${logoFile}.webp" style="height: 40px; vertical-align: middle; margin-right: 10px;" alt="${league.toUpperCase()} Day ${i} Logo">
              <b>Day ${i}</b>
            </h3>
            <div class="screen-gallery">
              </div>
          </div>
        `;
      }
      galleryContainer.innerHTML = galleryHtml;
    }
  }
}

window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  setupNavigation();
  setupLeagueNavigation();
  setupSearchFilters();
  renderHighlightGalleries();
  
  ['ucl', 'uel', 'ecl'].forEach(league => {
      document.getElementById(`${league}MatchForm`).addEventListener('submit', (e) => {
          e.preventDefault();
          handleMatchSubmission(league);
      });
  });

  // Event Delegation for all logo clicks
  document.querySelector('main').addEventListener('click', function(event) {
      const logo = event.target.closest('.league-table img');
      if (logo) {
          const teamName = logo.closest('td').querySelector('b').textContent;
          const gameplanPath = `images/gameplans/${teamName.toLowerCase().replace(/ /g, '-')}.jpg`;
          modalImage.src = gameplanPath;
          modal.classList.add('show');
      }
  });
  
  modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
  });

  loadLeagueData('ucl');
};
