/* ============================================
   1. App Configuration & State
============================================ */
const appState = {
  db: null,
  auth: null, // Added for Firebase Auth
  currentUser: null, // To store current authenticated user
  isAdmin: false, // New: To track if the current user is an admin
  currentLeague: 'ucl',
  // Unsubscribe function for the real-time listener
  unsubscribe: null,
  currentSort: {
    ucl: { column: 7, isAscending: false },
    uel: { column: 7, isAscending: false },
    ecl: { column: 7, isAscending: false },
  },
  // Config will now be loaded from Firestore
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
  noSearchResults: document.getElementById('no-search-results'),
  feedbackMessage: document.querySelector('.feedback-message'),
  authRequiredMessage: document.querySelector('.auth-required-message'), // This message now applies to non-admins
  // Auth Modal Elements
  authModal: document.getElementById('auth-modal'),
  closeAuthModalBtn: document.getElementById('closeAuthModal'),
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

  // Auth State Listener
  appState.auth.onAuthStateChanged(async user => { // Made async to await admin check
    appState.currentUser = user;
    if (user) {
        // Check if the logged-in user is an admin
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


const debounce = (func, delay = 300) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

function checkFormValidity() {
  const form = dom.matchForm;
  const submitButton = form.querySelector('button[type="submit"]');
  const homeTeam = dom.homeTeamSelect.value;
  const awayTeam = dom.awayTeamSelect.value;
  const homeScore = document.getElementById('homeScore').value;
  const awayScore = document.getElementById('awayScore').value;

  // Form is valid only if an admin is logged in AND all fields are filled correctly
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

// Helper function to update UI elements based on loaded config
function updateUIFromConfig(config) {
    dom.leagueLogo.src = config.logo ? `images/logos/${config.logo}` : '';
    dom.leagueLogo.alt = config.name ? `${config.name} Logo` : 'League Logo';
    dom.matchFormTitle.textContent = `Champions League`;
    dom.matchDayTitle.textContent = `${config.name || 'N/A'} Match Day`;
    dom.knockoutTitle.textContent = `${config.name || 'N/A'} Knockout Stage`;
    dom.highlightsTitle.textContent = `${config.name || 'N/A'} Highlights`;
    populateTeamDropdowns(appState.currentLeague);
    renderHighlights(appState.currentLeague);
}

// Function to update the UI based on authentication status and admin role
function updateAuthUI() {
    const submitButton = dom.matchForm.querySelector('button[type="submit"]');

    // Initially hide both the form and the message
    dom.matchForm.style.display = 'none';
    dom.authRequiredMessage.style.display = 'none';

    if (appState.currentUser) {
        dom.userStatusSpan.textContent = `Logged in`;
        dom.authBtn.style.display = 'none';
        dom.logoutBtn.style.display = 'inline-block';

        if (appState.isAdmin) {
            dom.matchForm.style.display = 'flex'; // Show match form for admins
            dom.authRequiredMessage.style.display = 'none'; // Hide message
        } else {
            dom.matchForm.style.display = 'none'; // Hide form for non-admins
        }
        checkFormValidity(); // Re-check validity based on admin status
    } else {
        dom.userStatusSpan.textContent = 'Not logged in';
        dom.authBtn.style.display = 'inline-block';
        dom.logoutBtn.style.display = 'none';
        dom.matchForm.style.display = 'none'; // Ensure match form is hidden
        submitButton.classList.remove('ready'); // Ensure button is not ready
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
        appendQualificationSeparators(fragment, index + 1, qualificationZones);
    });
    dom.leagueTableBody.appendChild(fragment);
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

    // Determine sort direction
    if (sortConfig.column === columnIndex) {
        sortConfig.isDescending = !sortConfig.isDescending;
    } else {
        sortConfig.column = columnIndex;
        // Default to descending for points, ascending for name
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
        } else { // string
            aVal = aCell.textContent.trim().toLowerCase();
            bVal = bCell.textContent.trim().toLowerCase();
        }

        // Primary sort: by the selected column
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        // Secondary sort: points (if not sorting by points)
        if (columnIndex !== 7) {
            const aPoints = parseInt(a.cells[7].textContent);
            const bPoints = parseInt(b.cells[7].textContent);
            if (aPoints !== bPoints) {
                return bPoints - aPoints; // Always sort by points descending
            }
        }

        // Tertiary sort: goal difference (if points are equal)
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
    const row = dom.leagueTableBody.querySelector(`tr[data-team="${teamName}"]`);
    if (!row) return;

    const cells = row.cells;
    cells[2].textContent = parseInt(cells[2].textContent) + 1; // Played
    cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0); // Wins
    cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0); // Draws
    cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0); // Losses
    const [currF, currA] = cells[6].textContent.split(':').map(Number);
    cells[6].textContent = `${currF + gf}:${currA + ga}`; // Goals
    cells[7].querySelector('.points').textContent = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent); // Points

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

    dom.knockoutContainer.innerHTML = ''; // Clear previous content

    if (!knockoutStagesConfig) {
        dom.knockoutContainer.innerHTML = '<p class="empty-state" style="display:block;">No knockout stages configured for this league.</p>';
        return;
    }

    // A helper to create a logo element
    const createLogoWrapper = (teamRow, position) => {
        const teamName = teamRow.dataset.team;
        const teamLogoName = teamName.toLowerCase().replace(/ /g, '-');
        const wrapper = document.createElement('div');
        wrapper.className = 'logo-wrapper';
        wrapper.style.top = position.top;
        wrapper.style.left = position.left;
        wrapper.innerHTML = `
          <picture>
            <source srcset="images/logos/${teamLogoName}.png" type="image/png">
            <img src="images/logos/${teamLogoName}.png" alt="${teamName}">
          </picture>
        `;
        return wrapper;
    };

    // Iterate over the stages defined in the config (e.g., 'playoff', 'round16')
    for (const stageKey in knockoutStagesConfig) {
        const stage = knockoutStagesConfig[stageKey];

        // 1. Create the container for this stage
        const stageContainer = document.createElement('div');
        stageContainer.className = 'knockout-stage-item';

        // 2. Create and add title, background image, and logo container
        stageContainer.innerHTML = `
          <h3>${stage.title}</h3>
          <img src="images/${stage.bracket}" alt="${stage.title}" class="knockout-bg">
          <div class="logos-container"></div>
        `;
        const logosContainer = stageContainer.querySelector('.logos-container');

        // 3. Populate logos based on stage type
        if (stageKey === 'playoff') {
            stage.positions.forEach(pos => {
                // Find the team row that has the matching rank in the first cell
                const teamRow = teams.find(row => row.cells[0].textContent == pos.rank);
                if (teamRow) {
                    logosContainer.appendChild(createLogoWrapper(teamRow, pos));
                }
            });
        } else if (stageKey === 'round16') {
            const top8Teams = teams.slice(0, 8); // Assumes top 8 teams from the sorted table
            stage.positions.forEach(pos => {
                // We only populate 'seeded' slots from the top 8 teams.
                // 'unseeded' slots are for playoff winners and remain empty for now.
                if (pos.group === 'seeded' && pos.slot <= top8Teams.length) {
                    const teamRow = top8Teams[pos.slot - 1]; // pos.slot is 1-based
                    if(teamRow) {
                      logosContainer.appendChild(createLogoWrapper(teamRow, pos));
                    }
                }
            });
        }

        // 4. Append the completed stage container to the main knockout container
        dom.knockoutContainer.appendChild(stageContainer);
    }
}


function generateMatchDay(league) {
    const config = appState.config[league];
    const teams = [...config.teams];
    if (teams.length < 2) {
        dom.matchDayContainer.innerHTML = '<p>Not enough teams for fixtures.</p>';
        return;
    }

    const localFixtures = [];
    // Dynamically retrieve numDays from config, with a fallback to 8 if not defined
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
    const config = appState.config[league];
    if (!config) {
      dom.winGalleryContainer.innerHTML = '';
      return;
    }

    const logoFile = config.logo;
    const highlightsByDay = config.highlights || {};
    const knockoutHighlights = config.knockoutHighlights || {};

    const galleryContainer = dom.winGalleryContainer;
    galleryContainer.innerHTML = ''; // Clear previous league's gallery
    let allDaysHtml = '';
    // Dynamically retrieve numMatchDays from config, with a fallback to 8 if not defined
    const numMatchDays = config.numberOfMatchDays || 8;

    // --- Render Regular Match Day Highlights ---
    for (let i = 1; i <= numMatchDays; i++) {
        const dayImages = highlightsByDay[i] || [];
        let imagesHtml = dayImages.length > 0
            ? dayImages.map(imagePath => `<img src="${imagePath}" loading="lazy" alt="Highlight for Day ${i}">`).join('')
            : '<p class="empty-state">No highlights for this day yet.</p>';

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

    // --- Render Knockout Stage Highlights ---
    // Loop through each knockout stage defined in the config
    for (const stageKey in knockoutHighlights) {
        if (knockoutHighlights.hasOwnProperty(stageKey)) {
            const stageImages = knockoutHighlights[stageKey];
            const stageTitle = stageKey.charAt(0).toUpperCase() + stageKey.slice(1).replace(/([A-Z])/g, ' $1'); // Simple conversion like 'round16' to 'Round 16'

            let knockoutImagesHtml = stageImages.length > 0
                ? stageImages.map(imagePath => `<img src="${imagePath}" loading="lazy" alt="Highlight for ${stageTitle}">`).join('')
                : '<p class="empty-state">No highlights for this stage yet.</p>';

            allDaysHtml += `
                <div class="wins">
                  <h3>
                    <img src="images/logos/${logoFile}" style="height: 40px; vertical-align: middle; margin-right: 10px;" alt="${league.toUpperCase()} ${stageTitle} Logo">
                    <b>${stageTitle}</b>
                  </h3>
                  <div class="screen-gallery">${knockoutImagesHtml}</div>
                </div>
            `;
        }
    }

    galleryContainer.innerHTML = allDaysHtml;
}


async function handleMatchSubmission(e) {
    e.preventDefault();

    // Only allow submission if the user is an admin
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
    // Updated Validation
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

// New function to process matches and update the UI
function processMatchesAndUpdateUI(matches, league) {
    // Reset and render the base table and fixtures first
    renderTable(league);
    generateMatchDay(league);

    matches.forEach(match => {
        const isDraw = match.homeScore === match.awayScore;
        const homeWin = match.homeScore > match.awayScore;
        const awayWin = match.awayScore > match.homeScore;
        updateTeamStats(match.homeTeam, match.homeScore, match.awayScore, homeWin, isDraw);
        updateTeamStats(match.awayTeam, match.awayScore, match.homeScore, awayWin, isDraw);
        updateMatchDayResults(match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
    });

    // Sort table and update knockout stage after all stats are processed
    const currentSort = appState.currentSort[league];
    const sortDataType = document.querySelector(`#leagueTable thead th[data-column-index="${currentSort.column}"]`).dataset.type;
    sortTable(currentSort.column, sortDataType);
    updateKnockoutStage(league);
}

// Updated function to handle loading all league data
async function switchLeague(league) {
    dom.loading.style.display = 'flex';
    appState.currentLeague = league;

    // Unsubscribe from the previous listener if it exists
    if (appState.unsubscribe) {
        appState.unsubscribe();
    }

    // Attempt to load from localStorage first for instant display (Client-side Caching)
    const cachedConfig = localStorage.getItem(`leagueConfig_${league}`);
    if (cachedConfig) {
        try {
            appState.config[league] = JSON.parse(cachedConfig);
            updateUIFromConfig(appState.config[league]);
            console.log(`Loaded ${league} config from cache.`);
        } catch (e) {
            console.error("Error parsing cached config, fetching fresh.", e);
            localStorage.removeItem(`leagueConfig_${league}`); // Invalidate bad cache
            appState.config[league] = {}; // Clear config if cache is bad
        }
    } else {
        appState.config[league] = {}; // Clear config if no cache
    }


    try {
        // Always attempt to fetch fresh config from Firestore in the background
        // to ensure data is up-to-date and to prime the cache.
        const configDoc = await appState.db.collection('leagues').doc(league).get();
        if (configDoc.exists) {
            const freshConfig = configDoc.data();
            // Only update if fresh config is different or if there was no cached config
            if (JSON.stringify(freshConfig) !== cachedConfig) {
                appState.config[league] = freshConfig;
                localStorage.setItem(`leagueConfig_${league}`, JSON.stringify(freshConfig)); // Update cache
                updateUIFromConfig(freshConfig); // Update UI with fresh data
                console.log(`Updated ${league} config from Firestore.`);
            } else {
                console.log(`Cached ${league} config is up-to-date.`);
            }
        } else {
            console.error(`No configuration found for league: ${league}`);
            showFeedback(`Configuration for ${league.toUpperCase()} is missing.`, false);
        }

        // Set up real-time listener for matches
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

async function handleLogin(e) {
    e.preventDefault();
    const email = dom.authEmailInput.value;
    const password = dom.authPasswordInput.value;

    try {
        await appState.auth.signInWithEmailAndPassword(email, password);
        showAuthFeedback('Logged in successfully!', true);
        dom.authModal.classList.remove('show');
        dom.authEmailInput.value = '';
        dom.authPasswordInput.value = '';
    } catch (error) {
        let errorMessage = 'Login failed.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format.';
        } else {
            errorMessage = `Error: ${error.message}`;
        }
        showAuthFeedback(errorMessage, false);
        console.error('Login error:', error);
    }
}

async function handleSignup() {
    const email = dom.authEmailInput.value;
    const password = dom.authPasswordInput.value;

    if (password.length < 6) {
        showAuthFeedback('Password must be at least 6 characters long.', false);
        return;
    }

    try {
        await appState.auth.createUserWithEmailAndPassword(email, password);
        showAuthFeedback('Account created and logged in successfully!', true);
        dom.authModal.classList.remove('show');
        dom.authEmailInput.value = '';
        dom.authPasswordInput.value = '';
    } catch (error) {
        let errorMessage = 'Signup failed.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak.';
        } else {
            errorMessage = `Error: ${error.message}`;
        }
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
    document.querySelector('.league-selector-nav').addEventListener('click', (e) => {
        const target = e.target.closest('.league-btn');
        if (target) {
            document.querySelector('.league-btn.active').classList.remove('active');
            target.classList.add('active');
            document.querySelector('.league-logo').classList.add('active');
            // Update URL without reloading page (for shareability)
            history.pushState(null, '', `?league=${target.dataset.league}`);
            switchLeague(target.dataset.league);
        }
    });

    document.querySelector('.main-nav').addEventListener('click', (e) => {
        const target = e.target.closest('.nav-btn');
        if (target) {
            // Update button active state and ARIA attributes
            document.querySelector('.nav-btn.active').classList.remove('active');
            document.querySelector('.nav-btn[aria-selected="true"]').setAttribute('aria-selected', 'false');
            target.classList.add('active');
            target.setAttribute('aria-selected', 'true');

            // Update page visibility
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
    dom.matchForm.addEventListener('input', checkFormValidity); // Validity now depends on login state

    dom.teamSearchInput.addEventListener('keyup', debounce(() => {
        const searchTerm = dom.teamSearchInput.value.toLowerCase();
        let hasVisibleMatch = false;

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
            if (dayHasVisibleMatch) hasVisibleMatch = true;
        });

        // Show or hide the "no results" message
        if (hasVisibleMatch) {
            dom.noSearchResults.style.display = 'none';
        } else {
            dom.noSearchResults.style.display = 'block';
        }
    }));

    // Event delegation for dynamically added highlight images
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

    // Auth Modal Event Listeners
    dom.authBtn.addEventListener('click', () => dom.authModal.classList.add('show'));
    dom.closeAuthModalBtn.addEventListener('click', () => dom.authModal.classList.remove('show'));
    dom.authModal.addEventListener('click', (e) => {
        if (e.target === dom.authModal) dom.authModal.classList.remove('show');
    });
    dom.loginBtn.addEventListener('click', handleLogin);
    dom.signupBtn.addEventListener('click', handleSignup);
    dom.logoutBtn.addEventListener('click', handleLogout);

    window.addEventListener('scroll', () => {
      const header = document.querySelector('header');
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });

    // Handle back/forward browser navigation for URL parameters
    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const leagueFromUrl = urlParams.get('league') || 'ucl'; // Default to 'ucl'
        // Update active button state in the UI
        document.querySelectorAll('.league-btn').forEach(btn => {
            if (btn.dataset.league === leagueFromUrl) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        if (leagueFromUrl !== appState.currentLeague) {
            switchLeague(leagueFromUrl);
        }
    });
}

window.onload = () => {
    initFirebase();
    setupEventListeners();
    // Initial load: Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const initialLeague = urlParams.get('league') || appState.currentLeague;
    // Ensure the correct button is active on initial load
    document.querySelectorAll('.league-btn').forEach(btn => {
        if (btn.dataset.league === initialLeague) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    switchLeague(initialLeague);
};
