# TabNuke Chrome Extension

TabNuke is a Manifest V3 Chrome extension designed to nuke your duplicate tabs instantly. Clean browser, clear mind. It operates silently in the background while offering real-time cleanup operations, memory tracking, and configurable automation modes.

---

## Key Features

- **Duplicate Detection**: Categorizes tabs into Exact duplicates (identical URL matches) and Same Site tabs (matching domain but different URLs).
- **Manual Cleanup**: Kill all duplicates instantly with a single button, or close specific tabs individually.
- **Auto-Close duplicates**: Automatically closes newly opened duplicate tabs and shifts focus to the existing original tab.
- **Auto-Close Older duplicates**: Automatically closes older duplicate tabs in the background, keeping the newest instance active.
- **Visual Badge Counter**: Updates the extension badge in real time to show the count of duplicate tabs.
- **System Notifications**: Alerts the user of background actions and manual cleanups through native operating system notifications.
- **Memory Savings Tracker**: Displays estimated memory reclaimed from closed duplicate tabs (calculated at 50MB per tab).
- **Premium Dark Design**: Features a styled, dark-themed user interface utilizing Inter typography, custom thin scrollbars, clear layout cards, and subtle hover animations.

---

## File Structure

```text
dupekill/
├── manifest.json       # Extension metadata and permission definitions
├── background.js       # Background service worker handling events and tab removal
├── utils.js            # Shared utility functions (grouping, domain parsing, memory formatting)
├── popup.html          # HTML structure for the extension popup interface
├── popup.css           # Custom dark theme styles
├── popup.js            # Controller handling DOM interaction and message passing
└── icons/              # Directory holding extension icon assets
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Installation Instructions

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` by typing it into the URL bar.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file picker dialog, select the `dupekill/` root workspace directory.
6. The extension is now loaded and active.

---

## How to Use

### Manual Cleanup
1. Click the **TabNuke** icon in the extensions toolbar to open the popup.
2. View the current count of duplicates, near-duplicates, and estimated memory saved in the stats bar.
3. Click the primary **Kill Duplicates** button to close all exact duplicates at once, or click the individual close cross button (`×`) on a specific tab card.
4. Click **Keep 1** on a same-site card to close all other tabs matching that domain, keeping the most recently active one.

### Automation Toggles
1. Open the popup and click the settings gear icon (`⚙️`) in the top-right corner.
2. Toggle on **Auto-close duplicates** to immediately close new duplicate tabs and focus the existing original tab.
3. Alternatively, toggle on **Auto-close older duplicates** to keep your newest tab open and close the older background instances automatically.
4. Adjust the **Show badge count** switch to show or hide the duplicate count badge on the extension icon.
