/**
 * SEO Utilities
 * Handles dynamic SEO updates for page title, meta tags, and Open Graph data
 */

const leagueNames = {
  ucl: 'Champions League',
  uel: 'Europa League',
  ecl: 'Conference League'
};

const leagueFullNames = {
  ucl: 'UEFA Champions League',
  uel: 'UEFA Europa League',
  ecl: 'UEFA Europa Conference League'
};

const viewNames = {
  league: 'Table',
  matches: 'Matches',
  knockout: 'Knockout Stage'
};

/**
 * Update the page title based on current league and view
 * @param {string} league - Current league (ucl, uel, ecl)
 * @param {string} view - Current view (league, matches, knockout)
 */
export function updatePageTitle(league, view = 'league') {
  const leagueName = leagueNames[league] || 'Champions League';
  const viewName = viewNames[view] || 'Table';
  const baseTitle = 'Efootball Georgia';
  
  document.title = `${leagueName} ${viewName} | ${baseTitle}`;
}

/**
 * Update Open Graph meta tags dynamically
 * @param {string} league - Current league (ucl, uel, ecl)
 */
export function updateOpenGraphTags(league) {
  const leagueFullName = leagueFullNames[league] || leagueFullNames.ucl;
  const title = `${leagueFullName} - Efootball Georgia`;
  const description = `View live ${leagueFullName} standings, match schedules, and knockout stage results with real-time updates.`;
  
  updateMetaTag('og:title', title);
  updateMetaTag('og:description', description);
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
}

/**
 * Helper function to update or create meta tags
 * @param {string} property - Meta tag property name
 * @param {string} content - Meta tag content
 */
function updateMetaTag(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  
  if (!meta) {
    // If meta tag doesn't exist, create it
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', content);
}

/**
 * Update canonical URL based on current state
 * @param {string} league - Current league
 * @param {string} team - Optional team filter
 */
export function updateCanonicalUrl(league, team = null) {
  let canonical = document.querySelector('link[rel="canonical"]');
  
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  
  const baseUrl = window.location.origin;
  const url = team 
    ? `${baseUrl}/?league=${league}&team=${encodeURIComponent(team)}`
    : `${baseUrl}/?league=${league}`;
    
  canonical.setAttribute('href', url);
}

/**
 * Initialize SEO utilities on page load
 */
export function initSEO() {
  // Add structured data for search engines
  addStructuredData();
}

/**
 * Add JSON-LD structured data for better SEO
 */
function addStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "name": "Efootball Georgia",
    "description": "Track UEFA Champions League, Europa League, and Conference League standings and matches",
    "url": window.location.origin,
    "sport": "Soccer",
    "logo": `${window.location.origin}/images/logos/champions-league-logo.webp`,
    "sameAs": [
      // Add social media links here when available
    ]
  };
  
  let script = document.querySelector('script[type="application/ld+json"]');
  
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  
  script.textContent = JSON.stringify(structured Data);
}

export default {
  updatePageTitle,
  updateOpenGraphTags,
  updateCanonicalUrl,
  initSEO
};
