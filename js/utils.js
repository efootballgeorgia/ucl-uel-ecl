/**
 * Converts a team name into a URL-friendly slug.
 * Example: 'Real Madrid' becomes 'real-madrid'.
 * @param {string} teamName The name of the team.
 * @returns {string} The slugified team name.
 */
export const getTeamSlug = (teamName) => {
  if (!teamName) return '';
  return teamName.toLowerCase().replace(/ /g, '-');
};

/**
 * Generates a predictable document ID for a match.
 * @param {string} homeTeam The name of the home team.
 * @param {string} awayTeam The name of the away team.
 * @returns {string|null} The generated match ID or null if teams are invalid.
 */
export const generateMatchId = (homeTeam, awayTeam) => {
  if (!homeTeam || !awayTeam) return null;
  return `${getTeamSlug(homeTeam)}-vs-${getTeamSlug(awayTeam)}`;
};


/**
 * Creates a debounced function that delays invoking the callback.
 * @param {Function} callback The function to debounce.
 * @param {number} delay The delay in milliseconds.
 * @returns {Function} The new debounced function.
 */
export function debounce(callback, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}