// Update Team Statistics
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
  
      // Resort table after updating stats
    sortTable(7, 'number');
    this.reset();
  });
  