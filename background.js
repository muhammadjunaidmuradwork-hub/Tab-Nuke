/**
 * TabNuke - Background Service Worker (Manifest V3)
 * Handles real-time tab detection, duplicate grouping, badge updates,
 * memory tracking, settings, message listeners, and auto-closing duplicates.
 */

import { extractDomain, groupByUrl, groupByDomain } from './utils.js';

// Default configuration settings
const DEFAULT_SETTINGS = {
  totalMemorySaved: 0,
  autoClose: false,
  autoClosePrevious: false,
  showBadge: true,
  settingsPanelOpen: false,
  settingsInitialized: true
};

/**
 * Initialize storage with default values on extension installation.
 */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const storage = await chrome.storage.local.get(null);
    const updates = {};

    if (storage.totalMemorySaved === undefined) {
      updates.totalMemorySaved = DEFAULT_SETTINGS.totalMemorySaved;
    }
    if (storage.autoClose === undefined) {
      updates.autoClose = DEFAULT_SETTINGS.autoClose;
    }
    if (storage.autoClosePrevious === undefined) {
      updates.autoClosePrevious = DEFAULT_SETTINGS.autoClosePrevious;
    }
    if (storage.showBadge === undefined) {
      updates.showBadge = DEFAULT_SETTINGS.showBadge;
    }
    if (storage.settingsPanelOpen === undefined) {
      updates.settingsPanelOpen = DEFAULT_SETTINGS.settingsPanelOpen;
    }
    if (storage.settingsInitialized === undefined) {
      updates.settingsInitialized = DEFAULT_SETTINGS.settingsInitialized;
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }

    // Run initial duplicate scan
    await findDuplicates();
  } catch (error) {
    console.error('Error in onInstalled listener:', error);
  }
});

/**
 * Scans all open tabs across all windows, calculates exact and near duplicates,
 * saves results to local storage, and updates the action badge.
 * @returns {Promise<Object>} The compiled duplicate statistics and lists.
 */
async function findDuplicates() {
  try {
    // Query all tabs across all windows
    const allTabs = await chrome.tabs.query({});
    
    // Group exact duplicates (same URL)
    const exactGroups = groupByUrl(allTabs);
    const exactDupes = [];
    let redundantExactCount = 0;

    for (const url in exactGroups) {
      const group = exactGroups[url];
      exactDupes.push(...group);
      // Redundant exact count is total tabs in group minus the original (first) tab
      redundantExactCount += (group.length - 1);
    }

    // Group tabs by domain to find near-duplicates (same domain, different URLs)
    const domainGroups = groupByDomain(allTabs);
    const nearDupes = [];

    for (const domain in domainGroups) {
      const group = domainGroups[domain];
      
      // Determine if there are at least two different URLs in this domain group
      const uniqueUrls = new Set(group.map(tab => tab.url));
      if (uniqueUrls.size >= 2) {
        nearDupes.push(...group);
      }
    }

    // Load total memory saved from storage
    const storage = await chrome.storage.local.get('totalMemorySaved');
    const totalMemorySaved = storage.totalMemorySaved || 0;

    // Build the results payload
    const results = {
      exactDupes,
      nearDupes,
      lastUpdated: Date.now(),
      totalMemorySaved
    };

    // Save to storage
    await chrome.storage.local.set(results);

    // Update Action Badge
    await updateBadge(redundantExactCount);

    return results;
  } catch (error) {
    console.error('Error in findDuplicates:', error);
    return {
      exactDupes: [],
      nearDupes: [],
      lastUpdated: Date.now(),
      totalMemorySaved: 0
    };
  }
}

/**
 * Updates the extension badge with the count of redundant duplicate tabs.
 * @param {number} count - The count of exact duplicate tabs to highlight.
 */
async function updateBadge(count) {
  try {
    const settings = await chrome.storage.local.get('showBadge');
    const showBadge = settings.showBadge !== false; // Default to true

    if (showBadge && count > 0) {
      await chrome.action.setBadgeText({ text: count.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

/**
 * Increments the memory saved counter in local storage based on closed tabs.
 * @param {number} closedCount - The number of tabs successfully closed.
 */
async function incrementMemorySaved(closedCount) {
  if (closedCount <= 0) return;
  try {
    const memoryIncrement = closedCount * 50; // 50MB per tab
    const storage = await chrome.storage.local.get('totalMemorySaved');
    const currentTotal = storage.totalMemorySaved || 0;
    const newTotal = currentTotal + memoryIncrement;
    await chrome.storage.local.set({ totalMemorySaved: newTotal });
  } catch (error) {
    console.error('Error incrementing memory saved:', error);
  }
}

/**
 * Helper to safely close a list of tab IDs.
 * Skips tabs that might have already been closed.
 * @param {number[]} tabIds - Array of tab IDs to close.
 * @returns {Promise<number>} Number of tabs actually closed.
 */
async function safeCloseTabs(tabIds) {
  let closedCount = 0;
  for (const id of tabIds) {
    try {
      // Check if tab still exists before trying to remove
      await chrome.tabs.get(id);
      await chrome.tabs.remove(id);
      closedCount++;
    } catch (error) {
      // Tab might have already been closed by the user or another action
      console.warn(`Tab ${id} could not be closed:`, error.message);
    }
  }
  return closedCount;
}

/**
 * Handle Auto-Close checking for a specific tab ID and URL.
 * @param {number} tabId - The ID of the newly created or updated tab.
 * @param {string} url - The URL of the tab.
 */
async function handleAutoCloseCheck(tabId, url) {
  if (!url) return;
  
  const urlLower = url.toLowerCase();
  if (urlLower.startsWith('chrome://') || 
      urlLower.startsWith('edge://') || 
      urlLower.startsWith('chrome-extension://') || 
      urlLower.startsWith('about:')) {
    return;
  }

  try {
    const settings = await chrome.storage.local.get(['autoClose', 'autoClosePrevious']);
    if (!settings.autoClose && !settings.autoClosePrevious) return;

    const allTabs = await chrome.tabs.query({});
    
    // Find matching tabs with the exact same URL that are NOT this tab itself
    const matches = allTabs.filter(t => t.id !== tabId && t.url === url);
    
    if (matches.length > 0) {
      const domain = extractDomain(url);

      if (settings.autoClose) {
        // Option A: Keep original/older tab, close the new tab
        const originalTab = matches[0];

        // Close the new duplicate tab
        await chrome.tabs.remove(tabId);

        // Focus the original tab and its window
        await chrome.tabs.update(originalTab.id, { active: true });
        if (originalTab.windowId) {
          await chrome.windows.update(originalTab.windowId, { focused: true });
        }

        // Record memory savings
        await incrementMemorySaved(1);

        // Show small system alert notification at top right/bottom right
        try {
          chrome.notifications.create(Date.now().toString(), {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'TabNuke Autoclose',
            message: `Closed duplicate tab for ${domain} and focused the original.`,
            priority: 1
          });
        } catch (notifErr) {
          console.error('Failed to display autoclose notification:', notifErr);
        }

      } else if (settings.autoClosePrevious) {
        // Option B: Keep the new tab, close the previous/older tab(s)
        const tabIdsToClose = matches.map(t => t.id).filter(id => id !== undefined);
        const closedCount = await safeCloseTabs(tabIdsToClose);

        // Record memory savings
        await incrementMemorySaved(closedCount);

        // Show small system alert notification at top right/bottom right
        try {
          chrome.notifications.create(Date.now().toString(), {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'TabNuke Auto-Replace',
            message: `Closed ${closedCount} older duplicate tab(s) for ${domain}.`,
            priority: 1
          });
        } catch (notifErr) {
          console.error('Failed to display auto-replace notification:', notifErr);
        }
      }

      // Re-evaluate duplicates lists and badges
      await findDuplicates();
    }
  } catch (error) {
    console.error('Error in handleAutoCloseCheck:', error);
  }
}

// ==========================================
// REAL-TIME TAB EVENT LISTENERS
// ==========================================

chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    // If a tab is created with an existing URL, check auto-close
    if (tab.url) {
      await handleAutoCloseCheck(tab.id, tab.url);
    }
    await findDuplicates();
  } catch (error) {
    console.error('Error in onCreated listener:', error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // Run auto-close if the URL changed or was initialized
    if (changeInfo.url) {
      await handleAutoCloseCheck(tabId, changeInfo.url);
    }
    
    // Trigger finding duplicates for any significant updates
    if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.pinned !== undefined) {
      await findDuplicates();
    }
  } catch (error) {
    console.error('Error in onUpdated listener:', error);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    await findDuplicates();
  } catch (error) {
    console.error('Error in onRemoved listener:', error);
  }
});

// ==========================================
// MESSAGE PASSING INTERACTION HANDLERS
// ==========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Return true to indicate we will respond asynchronously
  const isAsync = true;

  (async () => {
    try {
      switch (message.action) {
        case 'GET_DUPLICATES': {
          const results = await findDuplicates();
          sendResponse({ success: true, data: results });
          break;
        }

        case 'CLOSE_EXACT_DUPES': {
          const allTabs = await chrome.tabs.query({});
          const exactGroups = groupByUrl(allTabs);
          const tabIdsToClose = [];

          for (const url in exactGroups) {
            const group = exactGroups[url];
            // Keep the first tab (index 0) and prepare to close the remaining duplicates
            const duplicates = group.slice(1);
            duplicates.forEach(tab => {
              if (tab.id) tabIdsToClose.push(tab.id);
            });
          }

          const closedCount = await safeCloseTabs(tabIdsToClose);
          await incrementMemorySaved(closedCount);
          const updatedResults = await findDuplicates();

          sendResponse({ success: true, closedCount, data: updatedResults });
          break;
        }

        case 'CLOSE_SINGLE_TAB': {
          const { tabId } = message;
          if (!tabId) {
            sendResponse({ success: false, error: 'No tab ID specified' });
            return;
          }

          const closedCount = await safeCloseTabs([tabId]);
          await incrementMemorySaved(closedCount);
          const updatedResults = await findDuplicates();

          sendResponse({ success: true, closedCount, data: updatedResults });
          break;
        }

        case 'CLOSE_NEAR_DUPES_DOMAIN': {
          const { domain } = message;
          if (!domain) {
            sendResponse({ success: false, error: 'No domain specified' });
            return;
          }

          const allTabs = await chrome.tabs.query({});
          // Filter tabs matching the specified domain (checking lower case matching)
          const domainTabs = allTabs.filter(tab => {
            if (!tab.url) return false;
            const tabDomain = extractDomain(tab.url);
            return tabDomain.toLowerCase() === domain.toLowerCase();
          });

          if (domainTabs.length <= 1) {
            sendResponse({ success: true, closedCount: 0, data: await findDuplicates() });
            return;
          }

          // Sort by lastAccessed (descending) to find the most recently active one.
          // Fall back to id if lastAccessed is not populated.
          domainTabs.sort((a, b) => {
            const aTime = a.lastAccessed || 0;
            const bTime = b.lastAccessed || 0;
            return bTime - aTime;
          });

          // Keep the first one (most recently active)
          const tabsToClose = domainTabs.slice(1).map(tab => tab.id).filter(id => id !== undefined);

          const closedCount = await safeCloseTabs(tabsToClose);
          await incrementMemorySaved(closedCount);
          const updatedResults = await findDuplicates();

          sendResponse({ success: true, closedCount, data: updatedResults });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown action: ' + message.action });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', message, error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return isAsync;
});
