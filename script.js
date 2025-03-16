// Constants
const images = document.querySelectorAll('.image-gallery img');
const screens = document.querySelectorAll('.screen-gallery img');
const modal = document.getElementById('myModal');
const modalImage = document.getElementById('modalImage');
let currentSortColumn = null;
let isAscending = true;

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwmL2pHpqmaAOHXnWffdQ-NRXwmwLLFAE",
  authDomain: "nekro-league.firebaseapp.com",
  projectId: "nekro-league",
  storageBucket: "nekro-league.firebasestorage.app",
  messagingSenderId: "961908970420",
  appId: "1:961908970420:web:77c9b841d4f5ba40b9d8e1",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Log Firebase initialization
console.log("Firebase initialized:", app);

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

// Add at the top with other constants
const matchForm = document.getElementById('matchForm');
let matches = JSON.parse(localStorage.getItem('matches')) || [];

// Add this function to update team statistics
function updateTeamStats(teamName, goalsFor, goalsAgainst, isWin, isDraw) {
  const rows = document.querySelectorAll('#leagueTable tbody tr:not(.separator)');
  
  rows.forEach(row => {
    const teamCell = row.cells[1];
    if (teamCell.querySelector('b').textContent === teamName) {
      const cells = row.cells;
      cells[2].textContent = parseInt(cells[2].textContent) + 1; // Played
      cells[3].textContent = parseInt(cells[3].textContent) + (isWin ? 1 : 0); // Won
      cells[4].textContent = parseInt(cells[4].textContent) + (isDraw ? 1 : 0); // Draw
      cells[5].textContent = parseInt(cells[5].textContent) + (!isWin && !isDraw ? 1 : 0); // Lost
      
      const [currentFor, currentAgainst] = cells[6].textContent.split(':').map(Number);
      cells[6].textContent = `${currentFor + goalsFor}:${currentAgainst + goalsAgainst}`; // +/- 
      
      const points = (parseInt(cells[3].textContent) * 3) + parseInt(cells[4].textContent);
      cells[7].querySelector('.points').textContent = points; // Points
    }
  });
}

// Add match form submission handler
matchForm.addEventListener('submit', function(e) {
  e.preventDefault();
  
  const homeTeam = document.getElementById('homeTeam').value;
  const awayTeam = document.getElementById('awayTeam').value;
  const homeScore = parseInt(document.getElementById('homeScore').value);
  const awayScore = parseInt(document.getElementById('awayScore').value);

  if (homeTeam === awayTeam) {
    alert('A team cannot play against itself!');
    return;
  }

  // Save match to Firestore
  addMatch(homeTeam, awayTeam, homeScore, awayScore);

  // Add this function definition to your script.js file.
function addMatch(homeTeam, awayTeam, homeScore, awayScore) {
  // Code for saving the match to Firestore should go here.
  console.log(
    `Match added: ${homeTeam} ${homeScore} - ${awayTeam} ${awayScore}`
  );
}

  // Update stats
  const isDraw = homeScore === awayScore;
  
  // Update home team stats
  updateTeamStats(
    homeTeam,
    homeScore,
    awayScore,
    homeScore > awayScore,
    isDraw
  );

  // Update away team stats
  updateTeamStats(
    awayTeam,
    awayScore,
    homeScore,
    awayScore > homeScore,
    isDraw
  );

  // Update form and sort table
  sortTable(7, 'number');
  this.reset();
});

// Add this at the end of window.onload to process existing matches
matches.forEach(match => {
  document.getElementById('homeTeam').value = match.homeTeam;
  document.getElementById('awayTeam').value = match.awayTeam;
  document.getElementById('homeScore').value = match.homeScore;
  document.getElementById('awayScore').value = match.awayScore;
  matchForm.dispatchEvent(new Event('submit'));
});

// Loading Spinner
window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  sortTable(7, 'number'); // Sort by Points (column 7)
};
