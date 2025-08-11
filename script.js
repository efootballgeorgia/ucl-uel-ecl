/* ============================================
   1. App Configuration & State
============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const appState = {
  db: null,
  auth: null,
  currentUser: null,
  isAdmin: false,
  currentLeague: 'ucl',
  currentLeagueMatches: [],
  sortedTeams: [],
  knockoutMatches: {},
  unsubscribe: null,
  unsubscribeKnockout: null,
  fixtures: {},
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
  knockoutMasterContainer: document.querySelector('.knockout-master-container'),
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
    // Re-render knockout bracket to show/hide admin forms
    if (appState.sortedTeams.length > 0) {
        renderKnockoutBracket();
    }
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
                <source src="images/logos/${teamLogoName}.webp" type="image/webp">
                <img src="images/logos/${teamLogoName}.webp" alt="${teamName}" loading="lazy" decoding="async" class="team-logo">
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

function updateTeamStats(teamName, gf, ga, isWin, isDraw) {
    const row = dom.leagueTableBody.querySelector(`tr[data-team="${teamName.trim()}"]`);
    if (!row) return;

    const cells = row.cells;
    cells[2].textContent = parseInt(cells[2].textContent) + 1;
    cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0);
    cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0);
    cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0);
    const [currF, currA] = cells[6].textContent.split(':').map(Number);
    const newGF = currF + gf;
    const newGA = currA + ga;
    cells[6].textContent = `${newGF}:${newGA}`;
    cells[7].querySelector('.points').textContent = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);
    
    const goalDifference = newGF - newGA;
    row.dataset.gd = goalDifference;

    const formContainer = cells[8].querySelector('.form-container');
    if (formContainer.children.length >= 5) formContainer.removeChild(formContainer.lastChild);
    const formBox = document.createElement('span');
    formBox.className = `form-box ${isWin ? 'victory' : isDraw ? 'draw' : 'loss'}`;
    formContainer.prepend(formBox);
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
    const matchCard = dom.matchDayContainer.querySelector(
        `.match-card[data-home="${trimmedHome}"][data-away="${trimmedAway}"], .match-card[data-home="${trimmedAway}"][data-away="${trimmedHome}"]`
    );

    if (matchCard) {
        const cardHomeTeam = matchCard.dataset.home;
        if (cardHomeTeam === trimmedHome) {
            matchCard.querySelector('.match-result').textContent = `${homeScore} / ${awayScore}`;
        } else {
            matchCard.querySelector('.match-result').textContent = `${awayScore} / ${homeScore}`;
        }
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
    renderTable(league);

    matches.forEach(match => {
        const isDraw = match.homeScore === match.awayScore;
        const homeWin = match.homeScore > match.awayScore;
        const awayWin = match.awayScore > match.homeScore;
        updateTeamStats(match.homeTeam, match.homeScore, match.awayScore, homeWin, isDraw);
        updateTeamStats(match.awayTeam, match.awayScore, match.homeScore, awayWin, isDraw);
        updateMatchDayResults(match.homeTeam, match.awayTeam, match.homeScore, match.awayScore);
    });

    filterMatches(matches);

    const rows = Array.from(dom.leagueTableBody.querySelectorAll('tr:not(.separator)'));
    const qualificationZones = appState.config[league]?.qualificationZones || {};

    rows.sort((a, b) => {
        const aPoints = parseInt(a.cells[7].textContent) || 0;
        const bPoints = parseInt(b.cells[7].textContent) || 0;
        if (aPoints !== bPoints) return bPoints - aPoints;
        const aGD = parseInt(a.dataset.gd) || 0;
        const bGD = parseInt(b.dataset.gd) || 0;
        return bGD - aGD;
    });

    const fragment = document.createDocumentFragment();
    appState.sortedTeams = [];
    rows.forEach((row, index) => {
        const position = index + 1;
        row.cells[0].textContent = position;
        appState.sortedTeams.push(row.dataset.team);
        fragment.appendChild(row);
        appendQualificationSeparators(fragment, position, qualificationZones);
    });
    
    dom.leagueTableBody.innerHTML = '';
    dom.leagueTableBody.appendChild(fragment);

    renderKnockoutBracket();
}

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
    dom.loading.style.display = 'none';
    const config = appState.config[league];
    if (config && config.teams) {
        dom.leagueTableBody.innerHTML = '';
        const skeletonRows = new Array(config.teams.length).fill(0).map(() => `
            <tr class="skeleton">
                <td><div></div></td> <td><div></div></td> <td><div></div></td>
                <td><div></div></td> <td><div></div></td> <td><div></div></td>
                <td><div></div></td> <td><div></div></td> <td><div></div></td>
            </tr>
        `).join('');
        dom.leagueTableBody.innerHTML = skeletonRows;
    }

    appState.currentLeague = league;
    if (appState.unsubscribe) appState.unsubscribe();
    if (appState.unsubscribeKnockout) appState.unsubscribeKnockout();

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
        const configDocRef = doc(appState.db, 'leagues', league);
        const configDocSnap = await getDoc(configDocRef);

        if (configDocSnap.exists()) {
            const freshConfig = configDocSnap.data();
            if (JSON.stringify(freshConfig) !== cachedConfig) {
                appState.config[league] = freshConfig;
                localStorage.setItem(`leagueConfig_${league}`, JSON.stringify(freshConfig));
            }
        } else {
            console.error(`No configuration found for league: ${league}`);
            showFeedback(`Configuration for ${league.toUpperCase()} is missing.`, false);
        }

        updateUIFromConfig(appState.config[league]);
        generateMatchDay(league);

        const leagueMatchesRef = collection(appState.db, `${league}Matches`);
        const qLeague = query(leagueMatchesRef, orderBy('timestamp', 'asc'));
        appState.unsubscribe = onSnapshot(qLeague, snapshot => {
            const matches = snapshot.docs.map(doc => doc.data());
            processMatchesAndUpdateUI(matches, league);
        });

        const knockoutMatchesRef = collection(appState.db, `${league}KnockoutMatches`);
        appState.unsubscribeKnockout = onSnapshot(knockoutMatchesRef, snapshot => {
            appState.knockoutMatches = snapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data();
                return acc;
            }, {});
            renderKnockoutBracket();
        });

    } catch (error) {
        console.error(`Error loading data for ${league}:`, error);
        showFeedback(`Could not load data for ${league}.`, false);
    }
}


/* ============================================
   6. Knockout Stage Logic
============================================ */

const knockoutPairings = {
    playoffs: [
        { homeRank: 18, awayRank: 15 }, { homeRank: 17, awayRank: 16 },
        { homeRank: 24, awayRank: 9 }, { homeRank: 23, awayRank: 10 },
        { homeRank: 22, awayRank: 11 }, { homeRank: 21, awayRank: 12 },
        { homeRank: 20, awayRank: 14 }, { homeRank: 19, awayRank: 13 },
    ],
    round16: [
        { seededRank: 1, winnerFrom: 'playoffs-0' }, { seededRank: 2, winnerFrom: 'playoffs-1' },
        { seededRank: 3, winnerFrom: 'playoffs-2' }, { seededRank: 4, winnerFrom: 'playoffs-3' },
        { seededRank: 5, winnerFrom: 'playoffs-4' }, { seededRank: 6, winnerFrom: 'playoffs-5' },
        { seededRank: 7, winnerFrom: 'playoffs-6' }, { seededRank: 8, winnerFrom: 'playoffs-7' },
    ],
    quarterfinals: [
        { winnerFrom: 'round16-0' }, { winnerFrom: 'round16-1' }, 
        { winnerFrom: 'round16-2' }, { winnerFrom: 'round16-3' },
        { winnerFrom: 'round16-4' }, { winnerFrom: 'round16-5' },
        { winnerFrom: 'round16-6' }, { winnerFrom: 'round16-7' },
    ],
    semifinals: [
        { winnerFrom: 'quarterfinals-0' }, { winnerFrom: 'quarterfinals-1' },
        { winnerFrom: 'quarterfinals-2' }, { winnerFrom: 'quarterfinals-3' },
    ],
    final: [
        { winnerFrom: 'semifinals-0' }, { winnerFrom: 'semifinals-1' },
    ]
};

function getTeamByRank(rank) {
    return appState.sortedTeams[rank - 1] || null;
}

function getWinner(matchId) {
    const match = appState.knockoutMatches[matchId];
    if (!match) return null;
    if (match.homeScore > match.awayScore) return match.homeTeam;
    if (match.awayScore > match.homeScore) return match.awayTeam;
    return null; // Draw or no result
}

function renderKnockoutBracket() {
    // If the league phase is not complete, display a waiting message but keep the container structure.
    if (appState.sortedTeams.length < 24) {
        dom.knockoutMasterContainer.innerHTML = `
            <h2 id="knockout-title">${appState.config[appState.currentLeague]?.name || 'N/A'} Knockout Stage</h2>
            <p class="empty-state" style="display:block;">Awaiting completion of the league phase. At least 24 teams must be ranked.</p>
            
            <div id="knockout-playoffs-container" class="knockout-stage-container" style="display:none;">
                <h3>Knockout Play-offs</h3>
                <div class="knockout-stage-grid"></div>
            </div>
            <div id="knockout-round16-container" class="knockout-stage-container" style="display:none;">
                <h3>Round of 16</h3>
                <div class="knockout-stage-grid"></div>
            </div>
            <div id="knockout-quarterfinals-container" class="knockout-stage-container" style="display:none;">
                <h3>Quarter-finals</h3>
                <div class="knockout-stage-grid"></div>
            </div>
            <div id="knockout-semifinals-container" class="knockout-stage-container" style="display:none;">
                <h3>Semi-finals</h3>
                <div class="knockout-stage-grid"></div>
            </div>
            <div id="knockout-final-container" class="knockout-stage-container" style="display:none;">
                <h3>Final</h3>
                <div class="knockout-stage-grid"></div>
            </div>
        `;
        return;
    }

    // Restore visibility of containers if they were hidden
    const containers = dom.knockoutMasterContainer.querySelectorAll('.knockout-stage-container');
    containers.forEach(c => c.style.display = 'block');
    const waitingMessage = dom.knockoutMasterContainer.querySelector('.empty-state');
    if (waitingMessage) {
      waitingMessage.style.display = 'none';
    }


    const winners = {
      playoffs: {}, round16: {}, quarterfinals: {}, semifinals: {}, final: {}
    };

    Object.keys(appState.knockoutMatches).forEach(id => {
        const match = appState.knockoutMatches[id];
        const winner = getWinner(id);
        if(winner) {
            winners[match.stage][id] = winner;
        }
    });
    
    const renderMatchCard = (matchId, stage, homeTeam, awayTeam) => {
        const matchData = appState.knockoutMatches[matchId];

        const createTeamHtml = (team, isLoser) => {
            if (!team) {
                return '<div class="knockout-team"><span class="knockout-placeholder">TBD</span></div>';
            }
            const logoSrc = `images/logos/${team.toLowerCase().replace(/ /g, '-')}.webp`;
            const loserClass = isLoser ? 'loser' : '';
            return `
                <div class="knockout-team ${loserClass}">
                    <div class="team-logo-container">
                       <img src="${logoSrc}" alt="${team}" class="team-logo">
                    </div>
                    <span class="knockout-team-name">${team}</span>
                </div>`;
        };

        const homeIsLoser = matchData && matchData.homeScore < matchData.awayScore;
        const awayIsLoser = matchData && matchData.awayScore < matchData.homeScore;

        const homeTeamHtml = createTeamHtml(homeTeam, homeIsLoser);
        const awayTeamHtml = createTeamHtml(awayTeam, awayIsLoser);
        
        let resultOrFormHtml = '';
        if (matchData) {
            resultOrFormHtml = `
                <div class="knockout-result">
                    <p>${matchData.homeScore} - ${matchData.awayScore}</p>
                </div>`;
        } else if (appState.isAdmin && homeTeam && awayTeam) {
            resultOrFormHtml = `
                <div class="knockout-form">
                    <form data-match-id="${matchId}" data-stage="${stage}" data-home="${homeTeam}" data-away="${awayTeam}">
                        <input type="number" min="0" required placeholder="H">
                        <span>-</span>
                        <input type="number" min="0" required placeholder="A">
                        <button type="submit" class="btn">Save</button>
                    </form>
                </div>`;
        }
        
        return `
            <div class="knockout-match-card" data-match-id="${matchId}">
                <div class="knockout-teams">
                    ${homeTeamHtml}
                    <span class="knockout-vs">VS</span>
                    ${awayTeamHtml}
                </div>
                ${resultOrFormHtml}
            </div>`;
    };

    // Play-offs
    const playoffsGrid = dom.knockoutMasterContainer.querySelector('#knockout-playoffs-container .knockout-stage-grid');
    playoffsGrid.innerHTML = knockoutPairings.playoffs.map((p, i) => {
        const matchId = `playoffs-${i}`;
        const homeTeam = getTeamByRank(p.homeRank);
        const awayTeam = getTeamByRank(p.awayRank);
        return renderMatchCard(matchId, 'playoffs', homeTeam, awayTeam);
    }).join('');

    // Round of 16
    const round16Grid = dom.knockoutMasterContainer.querySelector('#knockout-round16-container .knockout-stage-grid');
    round16Grid.innerHTML = knockoutPairings.round16.map((p, i) => {
        const matchId = `round16-${i}`;
        const homeTeam = getTeamByRank(p.seededRank);
        const awayTeam = winners.playoffs[p.winnerFrom];
        return renderMatchCard(matchId, 'round16', homeTeam, awayTeam);
    }).join('');

    // Quarter-finals
    const quarterfinalsGrid = dom.knockoutMasterContainer.querySelector('#knockout-quarterfinals-container .knockout-stage-grid');
    const qfPairings = [];
    for(let i = 0; i < knockoutPairings.quarterfinals.length; i += 2) {
      qfPairings.push({
        homeWinnerFrom: knockoutPairings.quarterfinals[i].winnerFrom,
        awayWinnerFrom: knockoutPairings.quarterfinals[i+1].winnerFrom
      });
    }
    quarterfinalsGrid.innerHTML = qfPairings.map((p, i) => {
        const matchId = `quarterfinals-${i}`;
        const homeTeam = winners.round16[p.homeWinnerFrom];
        const awayTeam = winners.round16[p.awayWinnerFrom];
        return renderMatchCard(matchId, 'quarterfinals', homeTeam, awayTeam);
    }).join('');

    // Semi-finals
    const semifinalsGrid = dom.knockoutMasterContainer.querySelector('#knockout-semifinals-container .knockout-stage-grid');
    const sfPairings = [];
    for(let i = 0; i < knockoutPairings.semifinals.length; i += 2) {
      sfPairings.push({
        homeWinnerFrom: knockoutPairings.semifinals[i].winnerFrom,
        awayWinnerFrom: knockoutPairings.semifinals[i+1].winnerFrom
      });
    }
    semifinalsGrid.innerHTML = sfPairings.map((p, i) => {
        const matchId = `semifinals-${i}`;
        const homeTeam = winners.quarterfinals[p.homeWinnerFrom];
        const awayTeam = winners.quarterfinals[p.awayWinnerFrom];
        return renderMatchCard(matchId, 'semifinals', homeTeam, awayTeam);
    }).join('');

    // Final
    const finalGrid = dom.knockoutMasterContainer.querySelector('#knockout-final-container .knockout-stage-grid');
    const finalPairing = knockoutPairings.final[0];
    const homeTeamFinal = winners.semifinals[finalPairing.homeWinnerFrom];
    const awayTeamFinal = winners.semifinals[finalPairing.awayWinnerFrom];
    finalGrid.innerHTML = renderMatchCard('final-0', 'final', homeTeamFinal, awayTeamFinal);
}

async function handleKnockoutMatchSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const { matchId, stage, home, away } = form.dataset;
    const homeScore = parseInt(form.elements[0].value);
    const awayScore = parseInt(form.elements[1].value);

    if (isNaN(homeScore) || isNaN(awayScore)) {
        showFeedback('Please enter valid scores.', false);
        return;
    }
    
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.textContent = 'Saving...';
    submitButton.disabled = true;

    const matchData = {
        stage,
        homeTeam: home,
        awayTeam: away,
        homeScore,
        awayScore
    };

    try {
        const docRef = doc(appState.db, `${appState.currentLeague}KnockoutMatches`, matchId);
        await setDoc(docRef, matchData);
        // The onSnapshot listener will automatically re-render the bracket
    } catch (error) {
        console.error("Error saving knockout match:", error);
        showFeedback(`Error: ${error.message}`, false);
        submitButton.textContent = 'Save';
        submitButton.disabled = false;
    }
}


/* ============================================
   7. Authentication Functions
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
        await signInWithEmailAndPassword(appState.auth, email, password);
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
        await createUserWithEmailAndPassword(appState.auth, email, password);
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
        await signOut(appState.auth);
        showFeedback('Logged out successfully!', true);
    } catch (error) {
        showFeedback(`Logout error: ${error.message}`, false);
        console.error('Logout error:', error);
    }
}


/* ============================================
   8. Event Listeners & App Initialization
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

    dom.matchForm.addEventListener('submit', handleMatchSubmission);
    dom.knockoutSection.addEventListener('submit', (e) => {
        if (e.target.closest('.knockout-form form')) {
            handleKnockoutMatchSubmit(e);
        }
    });


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
