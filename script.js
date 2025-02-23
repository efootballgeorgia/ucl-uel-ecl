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
      sticker.src = 'images/logos/bacho.jpg';
      break;
    case 'Barcelona (L)':
      sticker.src = 'images/logos/luksona.jpg';
      break;
    case 'Barcelona (G)':
      sticker.src = 'images/logos/giga.jpg';
      break;
    case 'Real Madrid':
      sticker.src = 'images/logos/niksona.jpg';
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

// Loading Spinner
window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  sortTable(6, 'number'); // Initial sort by points
};
