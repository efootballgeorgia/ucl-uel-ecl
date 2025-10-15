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