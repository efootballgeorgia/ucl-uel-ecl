// Adding stickers to team highlights
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