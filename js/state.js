export const appState = {
  db: null,
  auth: null,
  currentUser: null,
  isAdmin: false,
  currentLeague: 'ucl',
  currentLeagueMatches: [],
  currentLeagueKnockoutMatches: [],
  sortedTeams: [],
  channel: null,
  fixtures: {},
  config: {},
  sortBy: 'points',
  sortDirection: 'desc'
};

export function setSort(newSortKey) {
  if (appState.sortBy === newSortKey) {
    appState.sortDirection = appState.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    appState.sortBy = newSortKey;
    appState.sortDirection = 'desc';
  }
}