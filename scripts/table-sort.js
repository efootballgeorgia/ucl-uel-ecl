// Enhanced Sorting Functionality for League Table
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
      const aPoints = parseInt(a.cells[7].querySelector('.points').textContent);
      const bPoints = parseInt(b.cells[7].querySelector('.points').textContent);
  
      // Primary sort: points
      if (aPoints !== bPoints) {
        return isAscending ? bPoints - aPoints : aPoints - bPoints;
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
  
      if (aValue < bValue) return isAscending ? -1 : 1;
      if (aValue > bValue) return isAscending ? 1 : -1;
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
        header.setAttribute('data-sort', isAscending ? 'asc' : 'desc');
      } else {
        header.removeAttribute('data-sort');
      }
    });
  }

  // Fetch and Display Existing Matches
function fetchMatches() {
    db.collection('matches').orderBy('timestamp', 'desc').get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const match = doc.data();
          updateTeamStats(
            match.homeTeam,
            match.homeScore,
            match.awayScore,
            match.homeScore > match.awayScore,
            match.homeScore === match.awayScore
          );
          updateTeamStats(
            match.awayTeam,
            match.awayScore,
            match.homeScore,
            match.awayScore > match.homeScore,
            match.homeScore === match.awayScore
          );
        });
        sortTable(7, 'number'); // Sort by points on page load
      })
      .catch((error) => {
        console.error('Error fetching matches: ', error);
      });
  }
  