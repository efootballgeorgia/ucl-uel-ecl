/* ============================================
   1. App Configuration & State
============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const appState = {
  db: null,
  auth: null,
  currentUser: null,
  isAdmin: false,
  currentLeague: 'ucl',
  currentLeagueMatches: [],
  unsubscribe: null,
  fixtures: {},
  currentSort: {
    ucl: { column: 7, isAscending: false },
    uel: { column: 7, isAscending: false },
    ecl: { column: 7, isAscending: false },
  },
  config: {}
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
  daySelector: document.getElementById('daySelector'),
  teamSearchSelect: document.getElementById('teamSearchSelect'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  noSearchResults: document.getElementById('no-search-results'),
  feedbackMessage: document.querySelector('.feedback-message'),
  authModal: document.getElementById('auth-modal'),
  closeAuthModalBtn: document.getElementById('closeAuthModal'),
  authForm: document.getElementById('auth-form'),
  authEmailInput: document.getElementById('auth-email'),
  authPasswordInput: document.getElementById('auth-password'),
  loginBtn: document.getElementById('login-btn'),
  signupBtn: document.getElementById('signup-btn'),
  authFeedbackMessage: document.querySelector('.auth-feedback-message'),
  userStatusSpan: document.getElementById('user-status'),
  authBtn: document.getElementById('auth-btn'),
  logoutBtn: document.getElementById('logout-btn')
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
  const app = initializeApp(firebaseConfig);
  appState.db = getFirestore(app);
  appState.auth = getAuth(app);
  console.log("Firebase initialized");

  onAuthStateChanged(appState.auth, async user => {
    appState.currentUser = user;
    if (user) {
        const adminRef = doc(appState.db, 'admins', user.uid);
        const adminDoc = await getDoc(adminRef);
        appState.isAdmin = adminDoc.exists();
    } else {
        appState.isAdmin = false;
    }
    updateAuthUI();
  });
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

function showAuthFeedback(message, isSuccess) {
    dom.authFeedbackMessage.textContent = message;
    dom.authFeedbackMessage.style.backgroundColor = isSuccess ? 'var(--win-color)' : 'var(--loss-color)';
    dom.authFeedbackMessage.classList.add('show');
    setTimeout(() => {
        dom.authFeedbackMessage.classList.remove('show');
    }, 3000);
}

function checkFormValidity() {
  const form = dom.matchForm;
  const submitButton = form.querySelector('button[type="submit"]');
  const homeTeam = dom.homeTeamSelect.value;
  const awayTeam = dom.awayTeamSelect.value;
  const homeScore = document.getElementById('homeScore').value;
  const awayScore = document.getElementById('awayScore').value;

  if (appState.isAdmin && homeTeam && awayTeam && homeTeam !== awayTeam && homeScore !== '' && awayScore !== '') {
    submitButton.classList.add('ready');
  } else {
    submitButton.classList.remove('ready');
  }
}

function appendQualificationSeparators(fragment, position, qualificationZones) {
    if (qualificationZones && qualificationZones[position]) {
        const separatorRow = document.createElement('tr');
        separatorRow.className = 'separator';
        separatorRow.innerHTML = `<td colspan="9" class="${qualificationZones[position]}"><span class="line"></span></td>`;
        fragment.appendChild(separatorRow);
    }
}

function updateUIFromConfig(config) {
    dom.leagueLogo.src = config.logo ? `images/logos/${config.logo}` : '';
    dom.leagueLogo.alt = config.name ? `${config.name} Logo` : 'League Logo';
    dom.matchFormTitle.textContent = `${config.name || 'N/A'}`;
    dom.matchDayTitle.textContent = `${config.name || 'N/A'} Match Day`;
    dom.knockoutTitle.textContent = `${config.name || 'N/A'} Knockout Stage`;
    populateTeamDropdowns(appState.currentLeague);
    populateTeamSearchDropdown(appState.currentLeague);
}

function populateTeamSearchDropdown(league) {
    const teams = appState.config[league]?.teams || [];
    teams.sort();
    dom.teamSearchSelect.innerHTML = '<option value="">Filter by Team</option>';
    teams.forEach(team => {
        dom.teamSearchSelect.add(new Option(team, team));
    });
}

function updateAuthUI() {
    const submitButton = dom.matchForm.querySelector('button[type="submit"]');

    if (appState.currentUser) {
        dom.userStatusSpan.textContent = `Logged in`;
        dom.authBtn.style.display = 'none';
        dom.logoutBtn.style.display = 'inline-block';

        if (appState.isAdmin) {
            dom.matchForm.style.display = 'flex';
        } else {
            dom.matchForm.style.display = 'none';
        }
    } else {
        dom.userStatusSpan.textContent = 'Not logged in';
        dom.authBtn.style.display = 'inline-block';
        dom.logoutBtn.style.display = 'none';
        dom.matchForm.style.display = 'none';
        submitButton.classList.remove('ready');
    }
}

/* ============================================
   5. Core Application Logic
============================================ */
function renderTable(league) {
    const config = appState.config[league];
    if (!config || !config.teams) return;

    const teams = config.teams;
    const qualificationZones = config.qualificationZones;
    dom.leagueTableBody.innerHTML = '';

    const fragment = document.createDocumentFragment();
    teams.forEach((teamName, index) => {
        const teamLogoName = teamName.toLowerCase().replace(/ /g, '-');
        const row = document.createElement('tr');
        row.dataset.team = teamName;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
              <picture>
                <source src="images/logos/${teamLogoName}.png" type="image/png">
                <img src="images/logos/${teamLogoName}.png" alt="${teamName}" loading="lazy" decoding="async" class="team-logo">
              </picture>
              <b>${teamName}</b>
            </td>
            <td>0</td><td>0</td><td>0</td><td>0</td><td>0:0</td>
            <td><b class="points">0</b></td>
            <td><div class="form-container"></div></td>
        `;
        fragment.appendChild(row);
        appendQualificationSeparators(fragment, index + 1, qualificationZones);
    });
    dom.leagueTableBody.appendChild(fragment);
}

function resetTableStats() {
    const rows = dom.leagueTableBody.querySelectorAll('tr:not(.separator)');
    rows.forEach(row => {
        const cells = row.cells;
        cells[2].textContent = '0';
        cells[3].textContent = '0';
        cells[4].textContent = '0';
        cells[5].textContent = '0';
        cells[6].textContent = '0:0';
        cells[7].querySelector('.points').textContent = '0';
        cells[8].querySelector('.form-container').innerHTML = '';
    });
}

function populateTeamDropdowns(league) {
    const teams = appState.config[league]?.teams || [];
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
    const qualificationZones = appState.config[league]?.qualificationZones || {};

    if (sortConfig.column === columnIndex) {
        sortConfig.isDescending = !sortConfig.isDescending;
    } else {
        sortConfig.column = columnIndex;
        sortConfig.isDescending = (columnIndex !== 1);
    }

    rows.sort((a, b) => {
        let aVal, bVal;
        const aCell = a.cells[columnIndex];
        const bCell = b.cells[columnIndex];

        if (dataType === 'goals') {
            const [aF, aA] = aCell.textContent.split(':').map(Number);
            const [bF, bA] = bCell.textContent.split(':').map(Number);
            aVal = aF - aA;
            bVal = bF - bA;
        } else if (dataType === 'number') {
            aVal = parseInt(aCell.textContent) || 0;
            bVal = parseInt(bCell.textContent) || 0;
        } else {
            aVal = aCell.textContent.trim().toLowerCase();
            bVal = bCell.textContent.trim().toLowerCase();
        }

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        if (columnIndex !== 7) {
            const aPoints = parseInt(a.cells[7].textContent);
            const bPoints = parseInt(b.cells[7].textContent);
            if (aPoints !== bPoints) {
                return bPoints - aPoints;
            }
        }

    if (comparison === 0) {
      const aGD = parseInt(a.dataset.gd) || 0;
      const bGD = parseInt(b.dataset.gd) || 0;
      if (aGD !== bGD) {
        return bGD - aGD;
      }
    }

        return sortConfig.isDescending ? -comparison : comparison;
    });

    dom.leagueTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    rows.forEach((row, index) => {
        const position = index + 1;
        row.cells[0].textContent = position;
        fragment.appendChild(row);
        appendQualificationSeparators(fragment, position, qualificationZones);
    });
    dom.leagueTableBody.appendChild(fragment);

    document.querySelectorAll('#leagueTable thead th').forEach(th => th.removeAttribute('data-sort'));
    document.querySelector(`#leagueTable thead th[data-column-index="${columnIndex}"]`).dataset.sort = sortConfig.isDescending ? 'desc' : 'asc';
}


function updateTeamStats(teamName, gf, ga, isWin, isDraw) {
    const row = dom.leagueTableBody.querySelector(`tr[data-team="${teamName.trim()}"]`);
    if (!row) return;

    const         cells = row.cells;
    cells[2].textContent = parseInt(cells[2].textContent) + 1;
    cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0);
    cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0);
    cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0);
    const [currF, currA] = cells[6].textContent.split(':').map(Number);
    const newGF = currF + gf;
    const newGA = currA + ga;
    cells[6].textContent = `${newGF}:${newGA}`;
    cells[7].querySelector('.points').textContent = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);
    row.dataset.gd = newGF - newGA; // <-- ADD THIS LINE

    const formContainer = cells[8].querySelector('.form-container');
    if (formContainer.children.length >= 5) formContainer.removeChild(formContainer.lastChild);
    const formBox = document.createElement('span');
    formBox.className = `form-box ${isWin ? 'victory' : isDraw ? 'draw' : 'loss'}`;
    formContainer.prepend(formBox);
}

function updateKnockoutStage(league) {
    const teams = Array.from(dom.leagueTableBody.querySelectorAll('tr:not(.separator)'));
    const config = appState.config[league];
    const knockoutStagesConfig = config?.knockoutStages;

    dom.knockoutContainer.innerHTML = '';

    if (!knockoutStagesConfig) {
        dom.knockoutContainer.innerHTML = '<p class="empty-state" style="display:block;">No knockout stages configured for this league.</p>';
        return;
    }

    const createLogoWrapper = (teamRow, position) => {
        const teamName = teamRow.dataset.team;
        const teamLogoName = teamName.toLowerCase().replace(/ /g, '-');
        const wrapper = document.createElement('div');
        wrapper.className = 'logo-wrapper';
        wrapper.style.top = position.top;
        wrapper.style.left = position.left;
        wrapper.innerHTML = `
          <picture>
            <source src="images/logos/${teamLogoName}.png" type="image/png">
            <img src="images/logos/${teamLogoName}.png" alt="${teamName}">
          </picture>
        `;
        return wrapper;
    };

    for (const stageKey in knockoutStagesConfig) {
        const stage = knockoutStagesConfig[stageKey];

        const stageContainer = document.createElement('div');
        stageContainer.className = 'knockout-stage-item';

        stageContainer.innerHTML = `
          <h3>${stage.title}</h3>
          <img src="images/${stage.bracket}" alt="${stage.title}" class="knockout-bg">
          <div class="logos-container"></div>
        `;
        const logosContainer = stageContainer.querySelector('.logos-container');

        if (stageKey === 'playoff') {
            stage.positions.forEach(pos => {
                const teamRow = teams.find(row => row.cells[0].textContent == pos.rank);
                if (teamRow) {
                    logosContainer.appendChild(createLogoWrapper(teamRow, pos));
                }
            });
        } else if (stageKey === 'round16') {
            const top8Teams = teams.slice(0, 8);
            stage.positions.forEach(pos => {
                if (pos.group === 'seeded' && pos.slot <= top8Teams.length) {
                    const teamRow = top8Teams[pos.slot - 1];
                    if(teamRow) {
                      logosContainer.appendChild(createLogoWrapper(teamRow, pos));
                    }
                }
            });
        }
        dom.knockoutContainer.appendChild(stageContainer);
    }
}


function generateMatchDay(league) {
    const config = appState.config[league];
    if (!config || !config.teams) {
        dom.matchDayContainer.innerHTML = '<p>League configuration not loaded.</p>';
        return;
    }
    const teams = [...config.teams];
    if (teams.length < 2) {
        dom.matchDayContainer.innerHTML = '<p>Not enough teams for fixtures.</p>';
        return;
    }

    const localFixtures = [];
    const numDays = config.numberOfMatchDays || 8;
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
    appState.fixtures[league] = localFixtures;

    dom.daySelector.innerHTML = '';
    for (let i = 1; i <= numDays; i++) {
        dom.daySelector.add(new Option(`Day ${i}`, i));
    }

    displayMatchesForDay(1);
    filterMatches();
}

function displayMatchesForDay(dayNumber, allMatches) {
    const league = appState.currentLeague;
    const dayIndex = dayNumber - 1;
    const fixturesForDay = appState.fixtures[league]?.[dayIndex];

    if (!fixturesForDay) {
        dom.matchDayContainer.innerHTML = '<p class="empty-state" style="display:block;">No matches scheduled for this day.</p>';
        return;
    }

    let html = '';
    fixturesForDay.forEach(match => {
        html += `<div class="match-card" data-home="${match.home}" data-away="${match.away}">
                    ${match.home} vs ${match.away}
                    <div class="match-result">- / -</div>
                 </div>`;
    });
    dom.matchDayContainer.innerHTML = html;

    if (allMatches) {
        allMatches.forEach(match => {
            updateMatchDayResults(match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
        });
    }
}


function updateMatchDayResults(home, away, homeScore, awayScore) {
    const trimmedHome = home.trim();
    const trimmedAway = away.trim();
    let matchCard = dom.matchDayContainer.querySelector(`.match-card[data-home="${trimmedHome}"][data-away="${trimmedAway}"]`);
    let isSwapped = false;

    if (!matchCard) {
        matchCard = dom.matchDayContainer.querySelector(`.match-card[data-home="${trimmedAway}"][data-away="${trimmedHome}"]`);
        if (matchCard) {
            isSwapped = true;
        }
    }

    if (matchCard) {
        const displayHomeScore = isSwapped ? awayScore : homeScore;
        const displayAwayScore = isSwapped ? homeScore : awayScore;
        matchCard.querySelector('.match-result').textContent = `${displayHomeScore} / ${displayAwayScore}`;
    }
}


async function handleMatchSubmission(e) {
    e.preventDefault();
    if (!appState.isAdmin) return showFeedback('You do not have permission to submit match results.', false);

    const homeTeam = dom.homeTeamSelect.value;
    const awayTeam = dom.awayTeamSelect.value;
    const homeScoreInput = document.getElementById('homeScore');
    const awayScoreInput = document.getElementById('awayScore');
    const homeScore = parseInt(homeScoreInput.value);
    const awayScore = parseInt(awayScoreInput.value);
    const league = appState.currentLeague;
    const submitButton = dom.matchForm.querySelector('button[type="submit"]');

    if (!homeTeam || !awayTeam || isNaN(homeScore) || isNaN(awayScore)) return showFeedback('Please fill all fields.', false);
    if (homeTeam === awayTeam) return showFeedback('A team cannot play against itself.', false);

    submitButton.textContent = 'Adding...';
    submitButton.disabled = true;
    submitButton.classList.remove('ready');

    const matchData = {
        homeTeam, awayTeam, homeScore, awayScore,
        timestamp: serverTimestamp()
    };

    try {
        const collectionRef = collection(appState.db, `${league}Matches`);
        await addDoc(collectionRef, matchData);
        showFeedback('Match added successfully!', true);
        homeScoreInput.value = '';
        awayScoreInput.value = '';

        checkFormValidity();
    } catch (error) {
        showFeedback(`Error adding match: ${error.message}.`, false);
        console.error(`Error adding ${league.toUpperCase(
