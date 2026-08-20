/**
 * TabNuke - Helper Utilities
 * Stateless helper functions shared by popup and background scripts.
 */

/**
 * Extracts the hostname/domain from a URL string, stripping 'www.' if present.
 * @param {string} urlStr - The full URL string to parse.
 * @returns {string} The domain/hostname, or an empty string if invalid.
 */
export function extractDomain(urlStr) {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    let hostname = url.hostname;
    // Strip leading 'www.' for a cleaner same-site representation
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (error) {
    console.error('Error extracting domain from:', urlStr, error);
    return '';
  }
}

/**
 * Formats a memory size in MB to a human-readable string.
 * @param {number} mb - The memory size in megabytes.
 * @returns {string} Formatted memory string (e.g. "150 MB" or "1.2 GB").
 */
export function formatMemory(mb) {
  if (typeof mb !== 'number' || isNaN(mb)) {
    return '0 MB';
  }
  if (mb < 1000) {
    return `${mb} MB`;
  }
  const gb = mb / 1000;
  return `${gb.toFixed(1)} GB`;
}

/**
 * Truncates text to a specified maximum length and appends an ellipsis.
 * @param {string} text - The input string.
 * @param {number} maxLength - The maximum character count.
 * @returns {string} Truncated text.
 */
export function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

/**
 * Groups an array of tab objects by their full URL (exact match).
 * Only returns groups that contain 2 or more tabs.
 * @param {Array} tabs - Array of chrome.tabs.Tab objects.
 * @returns {Object} Grouped tabs: { [url]: Tab[] }
 */
export function groupByUrl(tabs) {
  const groups = {};
  
  if (!Array.isArray(tabs)) return groups;

  tabs.forEach(tab => {
    // Skip empty or invalid URLs, and internal browser/extension pages (chrome://, chrome-extension://, edge://, about:)
    if (!tab.url) return;
    const urlLower = tab.url.toLowerCase();
    if (urlLower.startsWith('chrome://') || 
        urlLower.startsWith('edge://') || 
        urlLower.startsWith('chrome-extension://') || 
        urlLower.startsWith('about:')) {
      return;
    }

    if (!groups[tab.url]) {
      groups[tab.url] = [];
    }
    groups[tab.url].push(tab);
  });

  // Filter out groups with only 1 tab
  const duplicateGroups = {};
  for (const url in groups) {
    if (groups[url].length >= 2) {
      duplicateGroups[url] = groups[url];
    }
  }

  return duplicateGroups;
}

/**
 * Groups an array of tab objects by their domain/hostname using extractDomain().
 * Only returns groups that contain 2 or more tabs.
 * Note: Near duplicates are tabs with the same domain but DIFFERENT URLs.
 * @param {Array} tabs - Array of chrome.tabs.Tab objects.
 * @returns {Object} Grouped tabs: { [domain]: Tab[] }
 */
export function groupByDomain(tabs) {
  const groups = {};
  
  if (!Array.isArray(tabs)) return groups;

  tabs.forEach(tab => {
    // Skip empty or invalid URLs, and internal browser/extension pages
    if (!tab.url) return;
    const urlLower = tab.url.toLowerCase();
    if (urlLower.startsWith('chrome://') || 
        urlLower.startsWith('edge://') || 
        urlLower.startsWith('chrome-extension://') || 
        urlLower.startsWith('about:')) {
      return;
    }

    const domain = extractDomain(tab.url);
    if (!domain) return;

    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(tab);
  });

  // Filter out domains that don't have multiple tabs
  const duplicateDomains = {};
  for (const domain in groups) {
    if (groups[domain].length >= 2) {
      duplicateDomains[domain] = groups[domain];
    }
  }

  return duplicateDomains;
}
