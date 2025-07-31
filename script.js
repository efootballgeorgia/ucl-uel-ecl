/* ============================================
   1. App Configuration & State
============================================ */
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
  firebase.initializeApp(firebaseConfig);
  appState.db = firebase.firestore();
  appState.auth = firebase.auth();
  console.log("Firebase initialized");

  appState.auth.onAuthStateChanged(async user => {
    appState.currentUser = user;
    if (user) {
        const adminDoc = await appState.db.collection('admins').doc(user.uid).get();
        appState.isAdmin = adminDoc.exists;
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

        const [aGF, aGA] = a.cells[6].textContent.split(':').map(Number);
        const [bGF, bGA] = b.cells[6].textContent.split(':').map(Number);
        const aGD = aGF - aGA;
        const bGD = bGF - bGA;

        if (comparison === 0 && aGD !== bGD) {
            return bGD - aGD;
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
    if (!matchCard) {
        matchCard = dom.matchDayContainer.querySelector(`.match-card[data-home="${trimmedAway}"][data-away="${trimmedHome}"]`);
    }
    if (matchCard) {
        matchCard.querySelector('.match-result').textContent = `${homeScore} / ${awayScore}`;
    }
}


async function handleMatchSubmission(e) {
    e.preventDefault();

    if (!appState.isAdmin) {
        showFeedback('You do not have permission to submit match results.', false);
        return;
    }

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
        return showFeedback('A team cannot play against itself.', false);
    }

    submitButton.textContent = 'Adding...';
    submitButton.disabled = true;
    submitButton.classList.remove('ready');

    const matchData = {
        homeTeam, awayTeam, homeScore, awayScore,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await appState.db.collection(`${league}Matches`).add(matchData);
        showFeedback('Match added successfully!', true);
        dom.matchForm.reset();
        checkFormValidity();
    } catch (error) {
        showFeedback(`Error adding match: ${error.message}.`, false);
        console.error(`Error adding ${league.toUpperCase()} match:`, error);
    } finally {
        submitButton.textContent = 'Add Match';
        submitButton.disabled = false;
    }
}


function processMatchesAndUpdateUI(matches, league) {
    appState.currentLeagueMatches = matches;
    resetTableStats();
    
    matches.forEach(match => {
        const isDraw = match.homeScore === match.awayScore;
        const homeWin = match.homeScore > match.awayScore;
        const awayWin = match.awayScore > match.homeScore;
        updateTeamStats(match.homeTeam, match.homeScore, match.awayScore, homeWin, isDraw);
        updateTeamStats(match.awayTeam, match.awayScore, match.homeScore, awayWin, isDraw);
        updateMatchDayResults(match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
    });
    
    filterMatches(matches);

    const currentSort = appState.currentSort[league];
    const sortDataType = document.querySelector(`#leagueTable thead th[data-column-index="${currentSort.column}"]`).dataset.type;
    sortTable(currentSort.column, sortDataType);
    updateKnockoutStage(league);
}

// *** MOVED filterMatches function here, to the global scope ***
function filterMatches(allMatches) {
    const selectedTeam = dom.teamSearchSelect.value;
    const league = appState.currentLeague;
    const allFixtures = appState.fixtures[league];

    if (selectedTeam === "") {
        dom.daySelector.disabled = false;
        const selectedDay = parseInt(dom.daySelector.value);
        displayMatchesForDay(selectedDay, allMatches);
        dom.noSearchResults.style.display = 'none';
        dom.clearSearchBtn.style.display = 'none';
        return;
    }

    dom.daySelector.disabled = true;
    dom.clearSearchBtn.style.display = 'inline-block';
    let html = '';
    let hasVisibleMatch = false;

    if (allFixtures) {
        allFixtures.forEach((dayFixtures, dayIndex) => {
            const matchesForTeamInDay = dayFixtures.filter(m => m.home === selectedTeam || m.away === selectedTeam);
            if (matchesForTeamInDay.length > 0) {
                hasVisibleMatch = true;
                html += `<h3 class="match-day-header">Day ${dayIndex + 1}</h3>`;
                matchesForTeamInDay.forEach(match => {
                    html += `<div class="match-card" data-home="${match.home}" data-away="${match.away}">
                                ${match.home} vs ${match.away}
                                <div class="match-result">- / -</div>
                                </div>`;
                });
            }
        });
    }
    
    dom.matchDayContainer.innerHTML = html;
    dom.noSearchResults.style.display = hasVisibleMatch ? 'none' : 'block';

    if (hasVisibleMatch && allMatches) {
        allMatches.forEach(match => {
            updateMatchDayResults(match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
        });
    }
}


async function switchLeague(league) {
    dom.loading.style.display = 'flex';
    appState.currentLeague = league;

    if (appState.unsubscribe) {
        appState.unsubscribe();
    }

    const cachedConfig = localStorage.getItem(`leagueConfig_${league}`);
    if (cachedConfig) {
        try {
            appState.config[league] = JSON.parse(cachedConfig);
        } catch (e) {
            console.error("Error parsing cached config, fetching fresh.", e);
            localStorage.removeItem(`leagueConfig_${league}`);
            appState.config[league] = {};
        }
    } else {
        appState.config[league] = {};
    }


    try {
        const configDoc = await appState.db.collection('leagues').doc(league).get();
        if (configDoc.exists) {
            const freshConfig = configDoc.data();
            if (JSON.stringify(freshConfig) !== cachedConfig) {
                appState.config[league] = freshConfig;
                localStorage.setItem(`leagueConfig_${league}`, JSON.stringify(freshConfig));
                console.log(`Updated ${league} config from Firestore.`);
            } else {
                console.log(`Cached ${league} config is up-to-date.`);
            }
        } else {
            console.error(`No configuration found for league: ${league}`);
            showFeedback(`Configuration for ${league.toUpperCase()} is missing.`, false);
        }

        updateUIFromConfig(appState.config[league]);
        renderTable(league);
        generateMatchDay(league); 
        const matchesCollection = appState.db.collection(`${league}Matches`);
        appState.unsubscribe = matchesCollection.orderBy('timestamp', 'asc').onSnapshot(snapshot => {
            const matches = snapshot.docs.map(doc => doc.data());
            processMatchesAndUpdateUI(matches, league); 
        }, error => {
            console.error(`Error listening to ${league} matches:`, error);
            showFeedback(`Could not load real-time data for ${league}.`, false);
        });

    } catch (error) {
        console.error(`Error loading data for ${league}:`, error);
        showFeedback(`Could not load data for ${league}.`, false);
    } finally {
        dom.loading.style.display = 'none';
    }
}

/* ============================================
   6. Authentication Functions
============================================ */

function handleAuthError(error) {
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters long.';
        default:
            return `An unexpected error occurred: ${error.message}`;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = dom.authEmailInput.value;
    const password = dom.authPasswordInput.value;

    try {
        await appState.auth.signInWithEmailAndPassword(email, password);
        showAuthFeedback('Logged in successfully!', true);
        dom.authModal.classList.remove('show');
        dom.authForm.reset();
    } catch (error) {
        const errorMessage = handleAuthError(error);
        showAuthFeedback(errorMessage, false);
        console.error('Login error:', error);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = dom.authEmailInput.value;
    const password = dom.authPasswordInput.value;

    if (password.length < 6) {
        showAuthFeedback('Password must be at least 6 characters long.', false);
        return;
    }

    try {
        await appState.auth.createUserWithEmailAndPassword(email, password);
        showAuthFeedback('Account created and logged in!', true);
        dom.authModal.classList.remove('show');
        dom.authForm.reset();
    } catch (error) {
        const errorMessage = handleAuthError(error);
        showAuthFeedback(errorMessage, false);
        console.error('Signup error:', error);
    }
}

async function handleLogout() {
    try {
        await appState.auth.signOut();
        showFeedback('Logged out successfully!', true);
    } catch (error) {
        showFeedback(`Logout error: ${error.message}`, false);
        console.error('Logout error:', error);
    }
}


/* ============================================
   7. Event Listeners & App Initialization
============================================ */
function setupEventListeners() {
    let lastFocusedElement;

    function closeModal(modal) {
        modal.classList.remove('show');
        if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    }

    document.querySelector('.league-selector-nav').addEventListener('click', (e) => {
        const target = e.target.closest('.league-btn');
        if (target) {
            document.querySelector('.league-btn.active').classList.remove('active');
            target.classList.add('active');
            document.querySelector('.league-logo').classList.add('active');
            history.pushState(null, '', `?league=${target.dataset.league}`);
            switchLeague(target.dataset.league);
        }
    });

    document.querySelector('.main-nav').addEventListener('click', (e) => {
        const target = e.target.closest('.nav-btn');
        if (target) {
            document.querySelector('.nav-btn.active').classList.remove('active');
            document.querySelector('.nav-btn[aria-selected="true"]').setAttribute('aria-selected', 'false');
            target.classList.add('active');
            target.setAttribute('aria-selected', 'true');
            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
            const panelId = target.getAttribute('aria-controls');
            document.getElementById(panelId.replace('panel-', '') + '-section').classList.add('active');
        }
    });

    document.querySelector('#leagueTable thead').addEventListener('click', (e) => {
        const header = e.target.closest('th');
        if (header && header.dataset.columnIndex) {
            sortTable(parseInt(header.dataset.columnIndex), header.dataset.type);
        }
    });

    dom.matchForm.addEventListener('submit', handleMatchSubmission);
    dom.matchForm.addEventListener('input', checkFormValidity);

    dom.daySelector.addEventListener('change', () => {
        dom.teamSearchSelect.value = '';
        filterMatches(appState.currentLeagueMatches);
    });

    dom.teamSearchSelect.addEventListener('change', () => filterMatches(appState.currentLeagueMatches));

dom.clearSearchBtn.addEventListener('click', () => { dom.teamSearchSelect.value = ''; filterMatches(appState.currentLeagueMatches); });

    dom.leagueSection.addEventListener('click', (e) => {
        if (e.target.matches('.team-logo')) {
            lastFocusedElement = e.target;
            const teamName = e.target.closest('td').querySelector('b').textContent;
            const gameplanPath = `images/gameplans/${teamName.toLowerCase().replace(/ /g, '-')}.jpg`;
            dom.modalImage.src = gameplanPath;
            dom.modal.classList.add('show');
            dom.closeModalBtn.focus();
        }
    });

    dom.closeModalBtn.addEventListener('click', () => closeModal(dom.modal));
    dom.modal.addEventListener('click', (e) => {
        if (e.target === dom.modal) closeModal(dom.modal);
    });

    dom.authBtn.addEventListener('click', () => {
        lastFocusedElement = dom.authBtn;
        dom.authModal.classList.add('show');
        dom.authEmailInput.focus();
    });
    dom.closeAuthModalBtn.addEventListener('click', () => closeModal(dom.authModal));
    dom.authModal.addEventListener('click', (e) => {
        if (e.target === dom.authModal) closeModal(dom.authModal);
    });

    dom.authForm.addEventListener('submit', handleLogin);
    dom.signupBtn.addEventListener('click', handleSignup);
    dom.logoutBtn.addEventListener('click', handleLogout);

    window.addEventListener('scroll', () => {
      const header = document.querySelector('header');
      header.classList.toggle('scrolled', window.scrollY > 50);
    });

    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const leagueFromUrl = urlParams.get('league') || 'ucl';
        document.querySelectorAll('.league-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.league === leagueFromUrl);
        });
        if (leagueFromUrl !== appState.currentLeague) {
            switchLeague(leagueFromUrl);
        }
    });
}

window.onload = () => {
    initFirebase();
    setupEventListeners();
    const urlParams = new URLSearchParams(window.location.search);
    const initialLeague = urlParams.get('league') || appState.currentLeague;
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.league === initialLeague);
    });
    switchLeague(initialLeague);
};
