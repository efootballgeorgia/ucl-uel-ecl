/* ============================================
   1. App Configuration & State
============================================ */
const appState = {
  db: null,
  currentLeague: 'ucl',
  currentSort: {
    ucl: { column: 7, isAscending: false },
    uel: { column: 7, isAscending: false },
    ecl: { column: 7, isAscending: false },
  },
  config: {
    ucl: {
      name: "Champions League",
      logo: "champions-league-logo.webp",
      bracket: "knockout-bracket.jpg",
      qualificationZones: { 8: "round16", 16: "knockout-seeded", 24: "knockout-unseeded" },
      highlights: {
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
        "8": []
      },
      teams: [ "Parma", "Tottenham", "Hellas Verona", "Nottingham Forest", "Lyon", "Manchester City", "Arsenal", "Celta Vigo", "Athletic Bilbao", "Juventus", "Marseille", "PSG", "AC Milan", "Barcelona", "Torino", "Osasuna", "Everton", "Empoli", "Metz", "Atalanta", "Liverpool", "Mallorca", "Brest", "Villarreal", "Chelsea", "Real Betis", "Monza", "Real Madrid", "Girona", "Venezia", "Manchester United", "Crystal Palace", "Rennes", "Inter Milan", "Bayern Munich", "Atletico Madrid" ],
      knockoutPositions: [ { top: '18.5%', left: '25%' }, { top: '18.5%', left: '72%' }, { top: '85%', left: '25%' }, { top: '85%', left: '72%' }, { top: '63%', left: '25%' }, { top: '63%', left: '72%' }, { top: '40%', left: '25%' }, { top: '40%', left: '72%' }, { top: '36%', left: '10%' }, { top: '36%', left: '86%' }, { top: '60%', left: '86%' }, { top: '60%', left: '10%' }, { top: '83%', left: '86%' }, { top: '81%', left: '10%' }, { top: '15.5%', left: '86%' }, { top: '14.5%', left: '10%' }, { top: '5%', left: '86%' }, { top: '5%', left: '10%' }, { top: '72%', left: '10%' }, { top: '72%', left: '86%' }, { top: '50%', left: '10%' }, { top: '50%', left: '86%' }, { top: '27.6%', left: '86%' }, { top: '27.6%', left: '10%' }]
    },
    uel: {
      name: "Europa League",
      logo: "europa-league-logo.webp",
      bracket: "uel-knockout-bracket.jpg",
      qualificationZones: { 8: "uel-round16" },
      highlights: {
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
        "8": []
      },
      teams: [ ],
      knockoutPositions: [ { top: '23%', left: '27%' }, { top: '23%', left: '68%' }, { top: '83%', left: '27%' }, { top: '83%', left: '68%' }, { top: '64%', left: '27%' }, { top: '64%', left: '68%' }, { top: '43%', left: '27%' }, { top: '43%', left: '68%' }, { top: '39%', left: '9%' }, { top: '39%', left: '86%' }, { top: '59%', left: '86%' }, { top: '59%', left: '9%' }, { top: '79%', left: '86%' }, { top: '79%', left: '9%' }, { top: '19%', left: '86%' }, { top: '19%', left: '9%' }, { top: '10%', left: '86%' }, { top: '10%', left: '9%' }, { top: '70%', left: '9%' }, { top: '70%', left: '86%' }, { top: '50%', left: '9%' }, { top: '50%', left: '86%' }, { top: '30%', left: '86%' }, { top: '30%', left: '9%' }]
    },
    ecl: {
      name: "Conference League",
      logo: "conference-league-logo.webp",
      bracket: "ecl-knockout-bracket.jpg",
      qualificationZones: { 8: "ecl-round16" },
      highlights: {
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
        "8": []
      },
      teams: [ ],
      knockoutPositions: [ { top: '17%', left: '24.5%' }, { top: '17%', left: '70.5%' }, { top: '83%', left: '24.5%' }, { top: '83%', left: '70.5%' }, { top: '61%', left: '24.5%' }, { top: '61%', left: '70.5%' }, { top: '39%', left: '24.5%' }, { top: '39%', left: '70.5%' }, { top: '34%', left: '6.5%' }, { top: '34%', left: '88.5%' }, { top: '57%', left: '88.5%' }, { top: '57%', left: '6.5%' }, { top: '79%', left: '88.5%' }, { top: '79%', left: '6.5%' }, { top: '14%', left: '88.5%' }, { top: '14%', left: '6.5%' }, { top: '5%', left: '88.5%' }, { top: '5%', left: '6.5%' }, { top: '70%', left: '6.5%' }, { top: '70%', left: '88.5%' }, { top: '48%', left: '6.5%' }, { top: '48%', left: '88.5%' }, { top: '25%', left: '88.5%' }, { top: '25%', left: '6.5%' }]
    }
  }
};

/* ============================================
   2. DOM Elements
============================================ */
const dom = {
  loading: document.getElementById('loading'),
  modal: document.getElementById('myModal'),
  modalImage: document.getElementById('modalImage'),
  closeModalBtn: document.getElementById('closeModal'),
  leagueSection: document.getElementById('league-section'),
  matchesSection: document.getElementById('matches-section'),
  knockoutSection: document.getElementById('knockout-section'),
  highlightsSection: document.getElementById('highlights-section'),
  leagueLogo: document.getElementById('league-logo'),
  leagueTableBody: document.querySelector('#leagueTable tbody'),
  matchForm: document.getElementById('matchForm'),
  matchFormTitle: document.getElementById('match-form-title'),
  homeTeamSelect: document.getElementById('homeTeam'),
  awayTeamSelect: document.getElementById('awayTeam'),
  matchDayTitle: document.getElementById('match-day-title'),
  matchDayContainer: document.getElementById('match-day-container'),
  knockoutTitle: document.getElementById('knockout-title'),
  knockoutContainer: document.getElementById('knockout-container'),
  highlightsTitle: document.getElementById('highlights-title'),
  winGalleryContainer: document.getElementById('win-gallery-container'),
  teamSearchInput: document.getElementById('teamSearch'),
  feedbackMessage: document.querySelector('.feedback-message')
};

/* ============================================
   3. Firebase Initialization
============================================ */
function initFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyAQSPphqNP7BHzbRXLYDwrkUsPyIJpcALc",
    authDomain: "nekro-league-9e7bf.firebaseapp.com",
    projectId: "nekro-league-9e7bf",
    storageBucket: "nekro-league-9e7bf.appspot.com",
    messagingSenderId: "721371342919",
    appId: "1:721371342919:web:217f325dadb42db4a8e962"
  };
  firebase.initializeApp(firebaseConfig);
  appState.db = firebase.firestore();
  console.log("Firebase initialized");
}

/* ============================================
   4. Utility & Helper Functions
============================================ */
function showFeedback(message, isSuccess) {
    dom.feedbackMessage.textContent = message;
    dom.feedbackMessage.className = `feedback-message ${isSuccess ? 'success' : 'error'} show`;
    setTimeout(() => {
        dom.feedbackMessage.classList.remove('show');
    }, 3000);
}

const debounce = (func, delay = 300) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

/* ============================================
   5. Core Application Logic
============================================ */
function renderTable(league) {
    const teams = appState.config[league].teams;
    const qualificationZones = appState.config[league].qualificationZones;
    dom.leagueTableBody.innerHTML = '';
    if (!teams || teams.length === 0) return;

    const fragment = document.createDocumentFragment();
    teams.forEach((teamName, index) => {
        const teamLogoName = teamName.toLowerCase().replace(/ /g, '-');
        const row = document.createElement('tr');
        row.dataset.team = teamName;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
              <picture>
                <source srcset="images/logos/${teamLogoName}.webp" type="image/webp">
                <source srcset="images/logos/${teamLogoName}.png" type="image/png">
                <img src="images/logos/${teamLogoName}.png" alt="${teamName}" loading="lazy" class="team-logo">
              </picture>
              <b>${teamName}</b>
            </td>
            <td>0</td><td>0</td><td>0</td><td>0</td><td>0:0</td>
            <td><b class="points">0</b></td>
            <td><div class="form-container"></div></td>
        `;
        fragment.appendChild(row);

        const position = index + 1;
        if (qualificationZones[position]) {
            const separatorRow = document.createElement('tr');
            separatorRow.className = 'separator';
            separatorRow.innerHTML = `<td colspan="9" class="${qualificationZones[position]}"><span class="line"></span></td>`;
            fragment.appendChild(separatorRow);
        }
    });
    dom.leagueTableBody.appendChild(fragment);
}

function populateTeamDropdowns(league) {
    const teams = appState.config[league].teams;
    dom.homeTeamSelect.innerHTML = '<option value="">Home Team</option>';
    dom.awayTeamSelect.innerHTML = '<option value="">Away Team</option>';
    teams.forEach(team => {
        dom.homeTeamSelect.add(new Option(team, team));
        dom.awayTeamSelect.add(new Option(team, team));
    });
}

function sortTable(columnIndex, dataType) {
    const league = appState.currentLeague;
    const sortConfig = appState.currentSort[league];
    const rows = Array.from(dom.leagueTableBody.querySelectorAll('tr:not(.separator)'));

    if (sortConfig.column === columnIndex) {
        sortConfig.isAscending = !sortConfig.isAscending;
    } else {
        sortConfig.column = columnIndex;
        sortConfig.isAscending = (columnIndex === 1);
    }
    
    rows.sort((a, b) => {
        const aPoints = parseInt(a.cells[7].querySelector('.points').textContent);
        const bPoints = parseInt(b.cells[7].querySelector('.points').textContent);
        if (aPoints !== bPoints) return sortConfig.isAscending ? aPoints - bPoints : bPoints - aPoints;

        let aVal, bVal;
        const aCell = a.cells[columnIndex];
        const bCell = b.cells[columnIndex];

        if (dataType === 'number') {
            aVal = parseInt(aCell.textContent) || 0;
            bVal = parseInt(bCell.textContent) || 0;
        } else if (dataType === 'string') {
            aVal = aCell.textContent.trim().toLowerCase();
            bVal = bCell.textContent.trim().toLowerCase();
            return sortConfig.isAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else if (dataType === 'goals') {
            const [aF, aA] = aCell.textContent.split(':').map(Number);
            const [bF, bA] = bCell.textContent.split(':').map(Number);
            aVal = aF - aA;
            bVal = bF - bA;
        }
        return sortConfig.isAscending ? aVal - bVal : bVal - aVal;
    });

    dom.leagueTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const qualificationZones = appState.config[league].qualificationZones;

    rows.forEach((row, index) => {
        const position = index + 1;
        row.cells[0].textContent = position;
        fragment.appendChild(row);
        if (qualificationZones[position]) {
            const separatorRow = document.createElement('tr');
            separatorRow.className = 'separator';
            separatorRow.innerHTML = `<td colspan="9" class="${qualificationZones[position]}"><span class="line"></span></td>`;
            fragment.appendChild(separatorRow);
        }
    });
    dom.leagueTableBody.appendChild(fragment);

    document.querySelectorAll('#leagueTable thead th').forEach(th => th.removeAttribute('data-sort'));
    document.querySelector(`#leagueTable thead th[data-column-index="${columnIndex}"]`).dataset.sort = sortConfig.isAscending ? 'asc' : 'desc';
}

function updateTeamStats(teamName, gf, ga, isWin, isDraw) {
    const row = dom.leagueTableBody.querySelector(`tr[data-team="${teamName}"]`);
    if (!row) return;

    const cells = row.cells;
    cells[2].textContent = parseInt(cells[2].textContent) + 1;
    cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0);
    cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0);
    cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0);
    const [currF, currA] = cells[6].textContent.split(':').map(Number);
    cells[6].textContent = `${currF + gf}:${currA + ga}`;
    cells[7].querySelector('.points').textContent = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);

    const formContainer = cells[8].querySelector('.form-container');
    if (formContainer.children.length >= 5) formContainer.removeChild(formContainer.lastChild);
    const formBox = document.createElement('span');
    formBox.className = `form-box ${isWin ? 'victory' : isDraw ? 'draw' : 'loss'}`;
    formContainer.prepend(formBox);
}

function updateKnockoutStage(league) {
    const teams = Array.from(dom.leagueTableBody.querySelectorAll('tr:not(.separator)'));
    const positions = appState.config[league].knockoutPositions;
    dom.knockoutContainer.innerHTML = `<img src="images/${appState.config[league].bracket}" alt="${appState.config[league].name} Knockout Stage" class="knockout-bg">`;
    if (!positions) return;

    const logosContainer = document.createElement('div');
    logosContainer.className = 'logos-container';

    teams.forEach((teamRow, index) => {
        if (index >= positions.length) return;
        
        const position = positions[index];
        const teamName = teamRow.dataset.team;
        const teamLogoName = teamName.toLowerCase().replace(/ /g, '-');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'logo-wrapper';
        wrapper.style.top = position.top;
        wrapper.style.left = position.left;
        wrapper.innerHTML = `
          <picture>
            <source srcset="images/logos/${teamLogoName}.webp" type="image/webp">
            <source srcset="images/logos/${teamLogoName}.png" type="image/png">
            <img src="images/logos/${teamLogoName}.png" alt="${teamName}">
          </picture>
        `;
        logosContainer.appendChild(wrapper);
    });
    dom.knockoutContainer.appendChild(logosContainer);
}

function generateMatchDay(league) {
    const teams = [...appState.config[league].teams];
    if (teams.length < 2) {
        dom.matchDayContainer.innerHTML = '<p>Not enough teams for fixtures.</p>';
        return;
    }
    
    const localFixtures = [];
    const numDays = 8;
    const n = teams.length;
    for (let day = 1; day <= numDays; day++) {
        const dayFixtures = [];
        for (let i = 0; i < n / 2; i++) {
            const home = teams[i];
            const away = teams[n - 1 - i];
            dayFixtures.push(day % 2 === 0 ? { home, away } : { home: away, away: home });
        }
        localFixtures.push(dayFixtures);
        teams.splice(1, 0, teams.pop());
    }

    let html = '';
    localFixtures.forEach((dayFixtures, i) => {
        html += `<div class="match-day-card"><h3>Day ${i + 1}</h3>`;
        dayFixtures.forEach(match => {
            html += `<div class="match-card" data-home="${match.home}" data-away="${match.away}">
                        ${match.home} vs ${match.away}
                        <div class="match-result">- / -</div>
                     </div>`;
        });
        html += '</div>';
    });
    dom.matchDayContainer.innerHTML = html;
}

function updateMatchDayResults(home, away, homeScore, awayScore) {
    const matchCard = dom.matchDayContainer.querySelector(`.match-card[data-home="${home}"][data-away="${away}"]`);
    if (matchCard) {
        matchCard.querySelector('.match-result').textContent = `${homeScore} / ${awayScore}`;
    }
}

function renderHighlights(league) {
    const logoFile = appState.config[league].logo;
    const highlightsByDay = appState.config[league].highlights || {};
    const galleryContainer = dom.winGalleryContainer;
    galleryContainer.innerHTML = ''; // Clear previous league's gallery
    let allDaysHtml = '';

    for (let i = 1; i <= 8; i++) {
        const dayImages = highlightsByDay[i] || [];
        let imagesHtml = '';

        dayImages.forEach(imagePath => {
            imagesHtml += `<img src="${imagePath}" loading="lazy" alt="Highlight for Day ${i}">`;
        });

        allDaysHtml += `
            <div class="wins">
              <h3>
                <img src="images/logos/${logoFile}" style="height: 40px; vertical-align: middle; margin-right: 10px;" alt="${league.toUpperCase()} Day ${i} Logo">
                <b>Day ${i}</b>
              </h3>
              <div class="screen-gallery">${imagesHtml}</div>
            </div>
        `;
    }
    galleryContainer.innerHTML = allDaysHtml;
}

async function handleMatchSubmission(e) {
    e.preventDefault();
    const homeTeam = dom.homeTeamSelect.value;
    const awayTeam = dom.awayTeamSelect.value;
    const homeScore = parseInt(document.getElementById('homeScore').value);
    const awayScore = parseInt(document.getElementById('awayScore').value);
    const league = appState.currentLeague;
    const submitButton = dom.matchForm.querySelector('button[type="submit"]');

    if (!homeTeam || !awayTeam || isNaN(homeScore) || isNaN(awayScore)) {
        return showFeedback('Please fill all fields.', false);
    }
    if (homeTeam === awayTeam) {
        return showFeedback('A team cannot play itself.', false);
    }
    
    submitButton.textContent = 'Adding...';
    submitButton.disabled = true;

    const matchData = {
        homeTeam, awayTeam, homeScore, awayScore,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await appState.db.collection(`${league}Matches`).add(matchData);
        
        showFeedback('Match added successfully!', true);
        loadLeagueData(league);
        dom.matchForm.reset();
    } catch (error) {
        showFeedback(`Error: ${error.message}. You may need to log in.`, false);
        console.error(`Error adding ${league.toUpperCase()} match:`, error);
    } finally {
        submitButton.textContent = 'Add Match';
        submitButton.disabled = false;
    }
}

async function loadLeagueData(league) {
    appState.currentLeague = league;
    const config = appState.config[league];

    dom.leagueLogo.src = `images/logos/${config.logo}`;
    dom.matchFormTitle.textContent = `Add ${config.name} Match Result`;
    dom.matchDayTitle.textContent = `${config.name} Match Day`;
    dom.knockoutTitle.textContent = `${config.name} Knockout Stage`;
    dom.highlightsTitle.textContent = `${config.name} Highlights`;
    
    renderTable(league);
    populateTeamDropdowns(league);
    generateMatchDay(league);
    renderHighlights(league);
    
    try {
        const snapshot = await appState.db.collection(`${league}Matches`).orderBy('timestamp', 'desc').get();
        const matches = snapshot.docs.map(doc => doc.data());

        matches.forEach(match => {
            const isDraw = match.homeScore === match.awayScore;
            updateTeamStats(match.homeTeam, match.homeScore, match.awayScore, match.homeScore > match.awayScore, isDraw);
            updateTeamStats(match.awayTeam, match.awayScore, match.homeScore, match.awayScore > match.homeScore, isDraw);
            updateMatchDayResults(match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
        });
        
    } catch (error) {
        console.error(`Error loading data for ${league}:`, error);
        showFeedback(`Could not load data for ${league}.`, false);
    }

    sortTable(appState.currentSort[league].column, document.querySelector(`#leagueTable thead th[data-column-index="${appState.currentSort[league].column}"]`).dataset.type);
    updateKnockoutStage(league);
}

/* ============================================
   6. Event Listeners & App Initialization
============================================ */
function setupEventListeners() {
    document.querySelector('.league-selector-nav').addEventListener('click', (e) => {
        if (e.target.matches('.league-btn')) {
            const league = e.target.dataset.league;
            document.querySelector('.league-btn.active').classList.remove('active');
            e.target.classList.add('active');
            document.querySelector('.league-logo').classList.add('active');
            loadLeagueData(league);
        }
    });

    document.querySelector('.main-nav').addEventListener('click', (e) => {
        if (e.target.matches('.nav-btn')) {
            const page = e.target.dataset.page;
            document.querySelector('.nav-btn.active').classList.remove('active');
            e.target.classList.add('active');
            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${page}-section`).classList.add('active');
        }
    });

    document.querySelector('#leagueTable thead').addEventListener('click', (e) => {
        const header = e.target.closest('th');
        if (header && header.dataset.columnIndex) {
            sortTable(parseInt(header.dataset.columnIndex), header.dataset.type);
        }
    });
    
    dom.matchForm.addEventListener('submit', handleMatchSubmission);

    dom.teamSearchInput.addEventListener('keyup', debounce(() => {
        const searchTerm = dom.teamSearchInput.value.toLowerCase();
        dom.matchDayContainer.querySelectorAll('.match-day-card').forEach(day => {
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
    }));

    // Add event delegation for highlight images
    dom.highlightsSection.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG' && e.target.closest('.screen-gallery')) {
            dom.modalImage.src = e.target.src;
            dom.modal.classList.add('show');
        }
    });

    dom.leagueSection.addEventListener('click', (e) => {
        if (e.target.matches('.team-logo')) {
            const teamName = e.target.closest('td').querySelector('b').textContent;
            const gameplanPath = `images/gameplans/${teamName.toLowerCase().replace(/ /g, '-')}.jpg`;
            dom.modalImage.src = gameplanPath;
            dom.modal.classList.add('show');
        }
    });
    
    dom.closeModalBtn.addEventListener('click', () => dom.modal.classList.remove('show'));
    dom.modal.addEventListener('click', (e) => {
        if (e.target === dom.modal) dom.modal.classList.remove('show');
    });
}

window.onload = () => {
    initFirebase();
    setupEventListeners();
    loadLeagueData(appState.currentLeague);
    dom.loading.style.display = 'none';
};
