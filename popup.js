/**
 * TabNuke - Popup Interface Controller (ES Module)
 * Handles UI rendering, settings state, messaging communication with background service worker,
 * and user action interactions.
 */

import { groupByUrl, groupByDomain, formatMemory, truncateText, extractDomain } from './utils.js';

// DOM Element References
const elements = {
  exactCount: document.getElementById('exact-count'),
  nearCount: document.getElementById('near-count'),
  memorySaved: document.getElementById('memory-saved'),
  killAllBtn: document.getElementById('kill-all-btn'),
  exactBadge: document.getElementById('exact-badge'),
  nearBadge: document.getElementById('near-badge'),
  exactList: document.getElementById('exact-list'),
  nearList: document.getElementById('near-list'),
  settingsToggle: document.getElementById('settings-toggle'),
  footerSettingsLink: document.getElementById('footer-settings-link'),
  settingsPanel: document.getElementById('settings-panel'),
  autoCloseToggle: document.getElementById('auto-close-toggle'),
  autoClosePreviousToggle: document.getElementById('auto-close-previous-toggle'),
  badgeToggle: document.getElementById('badge-toggle')
};

// State tracker
let state = {
  exactDupes: [],
  nearDupes: [],
  totalMemorySaved: 0,
  isKilling: false
};

const STORAGE_KEYS = {
  autoClose: 'autoClose',
  autoClosePrevious: 'autoClosePrevious',
  showBadge: 'showBadge',
  settingsPanelOpen: 'settingsPanelOpen'
};

/**
 * Initializes the popup. Loads settings, registers event listeners, and fetches initial data.
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    registerEventListeners();
    await loadSettings();
    await fetchAndRenderData();
  } catch (error) {
    console.error('Initialization error in popup:', error);
  }
});

/**
 * Registers click, toggle, and key event listeners.
 */
function registerEventListeners() {
  // Settings panels toggle
  elements.settingsToggle.addEventListener('click', toggleSettingsPanel);
  elements.footerSettingsLink.addEventListener('click', toggleSettingsPanel);

  // Settings inputs
  elements.autoCloseToggle.addEventListener('change', handleAutoCloseToggle);
  elements.autoClosePreviousToggle.addEventListener('change', handleAutoClosePreviousToggle);
  elements.badgeToggle.addEventListener('change', handleBadgeToggle);

  // Kill all duplicates button
  elements.killAllBtn.addEventListener('click', handleKillAll);
}

/**
 * Toggles the settings drawer panel visibility.
 */
function toggleSettingsPanel() {
  const willOpen = elements.settingsPanel.classList.contains('hidden');
  elements.settingsPanel.classList.toggle('hidden');
  // Persist user preference for drawer state so it doesn't reset when popup closes.
  chrome.storage.local.set({ [STORAGE_KEYS.settingsPanelOpen]: willOpen }).catch((err) => {
    console.error('Error saving settings panel state:', err);
  });
}

/**
 * Loads user settings from local storage and updates checkboxes.
 */
async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get([
      STORAGE_KEYS.autoClose,
      STORAGE_KEYS.autoClosePrevious,
      STORAGE_KEYS.showBadge,
      STORAGE_KEYS.settingsPanelOpen
    ]);

    elements.autoCloseToggle.checked = settings[STORAGE_KEYS.autoClose] === true;
    elements.autoClosePreviousToggle.checked = settings[STORAGE_KEYS.autoClosePrevious] === true;
    elements.badgeToggle.checked = settings[STORAGE_KEYS.showBadge] !== false; // Default to true

    // Restore drawer visibility to the last user-selected state.
    const panelOpen = settings[STORAGE_KEYS.settingsPanelOpen] === true;
    elements.settingsPanel.classList.toggle('hidden', !panelOpen);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Saves the "Auto-Close" setting to local storage.
 */
async function handleAutoCloseToggle(event) {
  try {
    const autoClose = event.target.checked;
    const updates = { autoClose };

    if (autoClose) {
      // Mutual exclusion: if autoClose is active, disable autoClosePrevious
      updates.autoClosePrevious = false;
      elements.autoClosePreviousToggle.checked = false;
    }

    await chrome.storage.local.set(updates);
    // Trigger update in background context
    await chrome.runtime.sendMessage({ action: 'GET_DUPLICATES' });
  } catch (error) {
    console.error('Error saving autoClose setting:', error);
  }
}

/**
 * Saves the "Auto-Close Previous" setting to local storage.
 */
async function handleAutoClosePreviousToggle(event) {
  try {
    const autoClosePrevious = event.target.checked;
    const updates = { autoClosePrevious };

    if (autoClosePrevious) {
      // Mutual exclusion: if autoClosePrevious is active, disable autoClose
      updates.autoClose = false;
      elements.autoCloseToggle.checked = false;
    }

    await chrome.storage.local.set(updates);
    // Trigger update in background context
    await chrome.runtime.sendMessage({ action: 'GET_DUPLICATES' });
  } catch (error) {
    console.error('Error saving autoClosePrevious setting:', error);
  }
}

/**
 * Saves the "Show Badge Count" setting and refreshes duplicates.
 */
async function handleBadgeToggle(event) {
  try {
    const showBadge = event.target.checked;
    await chrome.storage.local.set({ showBadge });
    // Send a command to refresh duplicates which recalculates badge in background worker
    await chrome.runtime.sendMessage({ action: 'GET_DUPLICATES' });
  } catch (error) {
    console.error('Error saving showBadge setting:', error);
  }
}

/**
 * Queries duplicate tab data from the background service worker and renders the UI.
 */
async function fetchAndRenderData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_DUPLICATES' });
    if (response && response.success && response.data) {
      const { exactDupes, nearDupes, totalMemorySaved } = response.data;
      state.exactDupes = exactDupes || [];
      state.nearDupes = nearDupes || [];
      state.totalMemorySaved = totalMemorySaved || 0;
      
      renderUI();
    } else {
      console.error('Failed to get duplicates from background worker:', response?.error);
    }
  } catch (error) {
    console.error('Error fetching duplicates:', error);
  }
}

/**
 * Main UI rendering driver. Updates cards, badges, buttons, and scroll sections.
 */
function renderUI() {
  // 1. Group exact duplicate tabs
  const urlGroups = groupByUrl(state.exactDupes);
  
  // Calculate redundant/closable count: total tabs in groups minus the original (1 per group)
  let redundantExactCount = 0;
  for (const url in urlGroups) {
    redundantExactCount += (urlGroups[url].length - 1);
  }

  // 2. Group near duplicate tabs
  const domainGroups = groupByDomain(state.nearDupes);
  let redundantNearCount = 0;
  for (const domain in domainGroups) {
    // We keep 1 tab per domain, the rest are redundant
    redundantNearCount += (domainGroups[domain].length - 1);
  }

  // 3. Update stat counters
  elements.exactCount.textContent = redundantExactCount;
  elements.nearCount.textContent = redundantNearCount;
  elements.memorySaved.textContent = formatMemory(state.totalMemorySaved);

  // 4. Update section title badges
  updateSectionBadges(redundantExactCount, redundantNearCount);

  // 5. Render lists
  renderExactList(urlGroups);
  renderNearList(domainGroups);

  // 6. Manage Kill All duplicates button status
  if (!state.isKilling) {
    updateKillButtonState(redundantExactCount);
  }
}

/**
 * Updates section headers badge count tags.
 */
function updateSectionBadges(exactCount, nearCount) {
  if (exactCount > 0) {
    elements.exactBadge.textContent = `${exactCount} extra`;
    elements.exactBadge.classList.add('highlight');
    elements.exactBadge.classList.remove('hidden');
  } else {
    elements.exactBadge.classList.add('hidden');
  }

  if (nearCount > 0) {
    elements.nearBadge.textContent = `${nearCount} extra`;
    elements.nearBadge.classList.remove('hidden');
  } else {
    elements.nearBadge.classList.add('hidden');
  }
}

/**
 * Renders the exact duplicates container view list.
 * @param {Object} urlGroups - Grouped tabs: { [url]: Tab[] }
 */
function renderExactList(urlGroups) {
  elements.exactList.innerHTML = '';
  const urls = Object.keys(urlGroups);

  if (urls.length === 0) {
    renderEmptyState(elements.exactList, 'No exact duplicate tabs active.');
    return;
  }

  urls.forEach(url => {
    const group = urlGroups[url];
    const originalTab = group[0]; // Reference for details
    const domain = extractDomain(url);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=16`;

    // Create main card
    const card = document.createElement('div');
    card.className = 'dupe-group-card';

    // Header structure
    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
      <div class="group-info">
        <img class="favicon" src="${faviconUrl}" onerror="this.src='icons/icon16.png'; this.onerror=null;" alt="" />
        <div class="meta-details">
          <span class="tab-title" title="${escapeHtml(originalTab.title || 'Tab')}">${escapeHtml(truncateText(originalTab.title || 'Tab', 40))}</span>
          <span class="tab-url" title="${escapeHtml(url)}">${escapeHtml(truncateText(url, 35))}</span>
        </div>
      </div>
      <span class="group-badge">x${group.length} dupes</span>
    `;
    card.appendChild(header);

    // List of redundant items to close
    const list = document.createElement('div');
    list.className = 'child-tabs-list';

    // We only show items from index 1 onwards because index 0 is kept as the original/original
    const duplicateTabs = group.slice(1);
    duplicateTabs.forEach(tab => {
      const item = document.createElement('div');
      item.className = 'tab-item';
      
      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-item-title';
      titleSpan.textContent = `Duplicate Tab (ID: ${tab.id})`;
      titleSpan.title = `Tab in Window ${tab.windowId}`;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Close this duplicate tab';
      
      closeBtn.addEventListener('click', async () => {
        closeBtn.disabled = true;
        closeBtn.innerHTML = '...';
        await handleCloseSingle(tab.id);
      });

      item.appendChild(titleSpan);
      item.appendChild(closeBtn);
      list.appendChild(item);
    });

    card.appendChild(list);
    elements.exactList.appendChild(card);
  });
}

/**
 * Renders the same-site domain near duplicates container view list.
 * @param {Object} domainGroups - Grouped tabs: { [domain]: Tab[] }
 */
function renderNearList(domainGroups) {
  elements.nearList.innerHTML = '';
  const domains = Object.keys(domainGroups);

  // Filter only domains that have near-duplicates (at least 2 different URLs)
  const nearDuplicateDomains = domains.filter(domain => {
    const group = domainGroups[domain];
    const uniqueUrls = new Set(group.map(tab => tab.url));
    return uniqueUrls.size >= 2;
  });

  if (nearDuplicateDomains.length === 0) {
    renderEmptyState(elements.nearList, 'No near-duplicate domains found.');
    return;
  }

  nearDuplicateDomains.forEach(domain => {
    const group = domainGroups[domain];

    const card = document.createElement('div');
    card.className = 'domain-card';

    const info = document.createElement('div');
    info.className = 'domain-info';
    info.innerHTML = `
      <span class="domain-name" title="${escapeHtml(domain)}">${escapeHtml(domain)}</span>
      <span class="domain-count">${group.length} tabs open</span>
    `;

    const keepBtn = document.createElement('button');
    keepBtn.className = 'action-badge-btn';
    keepBtn.textContent = 'Keep 1';
    keepBtn.title = `Keep the most recently active tab of ${domain} and close the other ${group.length - 1}`;
    
    keepBtn.addEventListener('click', async () => {
      keepBtn.disabled = true;
      keepBtn.textContent = 'Closing...';
      await handleCloseNearDomain(domain);
    });

    card.appendChild(info);
    card.appendChild(keepBtn);
    elements.nearList.appendChild(card);
  });
}

/**
 * Helper to display empty state message within list container.
 */
function renderEmptyState(container, message) {
  container.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">✓</span>
      <span class="empty-text">${escapeHtml(message)}</span>
    </div>
  `;
}

/**
 * Triggers exact duplicate cleanup action.
 */
async function handleKillAll() {
  if (state.isKilling) return;
  state.isKilling = true;

  try {
    elements.killAllBtn.disabled = true;
    elements.killAllBtn.textContent = 'Killing...';

    const response = await chrome.runtime.sendMessage({ action: 'CLOSE_EXACT_DUPES' });
    
    if (response && response.success) {
      // Re-update state with results
      const { exactDupes, nearDupes, totalMemorySaved } = response.data;
      state.exactDupes = exactDupes || [];
      state.nearDupes = nearDupes || [];
      state.totalMemorySaved = totalMemorySaved || 0;

      // Render updated details
      renderUI();

      // Trigger satisfying clean summary system notification
      try {
        chrome.notifications.create(Date.now().toString(), {
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'TabNuke Cleaned',
          message: `Killed ${response.closedCount} duplicate tabs. Saved ${formatMemory(response.closedCount * 50)}.`,
          priority: 1
        });
      } catch (notifErr) {
        console.error('Failed to show clean summary notification:', notifErr);
      }

      // Trigger temporary success state feedback on the button
      elements.killAllBtn.textContent = `Killed ${response.closedCount} Duplicates! ✓`;
      elements.killAllBtn.classList.add('success');

      setTimeout(() => {
        elements.killAllBtn.classList.remove('success');
        state.isKilling = false;
        renderUI(); // Resets button configuration based on new totals
      }, 1500);
    } else {
      console.error('Error performing Kill All:', response?.error);
      state.isKilling = false;
      renderUI();
    }
  } catch (error) {
    console.error('Error killing all duplicates:', error);
    state.isKilling = false;
    renderUI();
  }
}

/**
 * Requests closing a single duplicate tab.
 * @param {number} tabId - The ID of the tab to close.
 */
async function handleCloseSingle(tabId) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'CLOSE_SINGLE_TAB', tabId });
    if (response && response.success) {
      const { exactDupes, nearDupes, totalMemorySaved } = response.data;
      state.exactDupes = exactDupes || [];
      state.nearDupes = nearDupes || [];
      state.totalMemorySaved = totalMemorySaved || 0;
      
      renderUI();
    }
  } catch (error) {
    console.error(`Error closing single tab ${tabId}:`, error);
  }
}

/**
 * Requests closing near duplicate same-site tabs for a domain, keeping the most active.
 * @param {string} domain - The target domain string.
 */
async function handleCloseNearDomain(domain) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'CLOSE_NEAR_DUPES_DOMAIN', domain });
    if (response && response.success) {
      const { exactDupes, nearDupes, totalMemorySaved } = response.data;
      state.exactDupes = exactDupes || [];
      state.nearDupes = nearDupes || [];
      state.totalMemorySaved = totalMemorySaved || 0;
      
      renderUI();
    }
  } catch (error) {
    console.error(`Error closing same site tabs for domain ${domain}:`, error);
  }
}

/**
 * Manages the layout configuration for the main Clean Action button.
 * @param {number} redundantCount - The count of redundant exact duplicates.
 */
function updateKillButtonState(redundantCount) {
  if (redundantCount > 0) {
    elements.killAllBtn.disabled = false;
    elements.killAllBtn.textContent = `Kill ${redundantCount} Duplicates`;
  } else {
    elements.killAllBtn.disabled = true;
    elements.killAllBtn.textContent = 'No Duplicates Found ✓';
  }
}

/**
 * Escapes characters to prevent HTML Injection vulnerabilities.
 * @param {string} text - Input text.
 * @returns {string} Safe escaped HTML text.
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
