export const getTeamSlug = (teamName) => {
  if (!teamName) return '';
  return teamName.toLowerCase().replace(/ /g, '-');
};

export const generateMatchId = (homeTeam, awayTeam) => {
  if (!homeTeam || !awayTeam) return null;
  return `${getTeamSlug(homeTeam)}-vs-${getTeamSlug(awayTeam)}`;
};

export function debounce(callback, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}