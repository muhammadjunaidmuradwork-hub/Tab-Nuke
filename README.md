# TabNuke 🚀

> **Nuke your duplicate tabs instantly. Clean browser, clear mind.**

TabNuke is a Chrome Manifest V3 extension that helps you detect, organize, and remove duplicate browser tabs. It runs quietly in the background while providing real-time duplicate detection, cleanup tools, automation controls, and memory-saving statistics.

---

## ✨ Features

### 🔍 Smart Duplicate Detection

* Detects **exact duplicate tabs** with identical URLs.
* Finds **same-site duplicate tabs** where multiple pages from the same domain are open.
* Groups duplicate tabs into easy-to-review sections.

### 🧹 One-Click Cleanup

* Close all exact duplicates instantly.
* Close individual duplicate tabs manually.
* Keep the most recently active tab while removing extra tabs from the same website.

### ⚡ Automatic Cleanup Modes

Choose how TabNuke handles duplicates:

* **Auto-close duplicates**

  * Automatically closes newly opened duplicate tabs.
  * Keeps the original tab active.

* **Auto-close older duplicates**

  * Keeps the newest tab.
  * Removes older duplicate instances automatically.

### 📊 Browser Optimization

* Live duplicate counter badge.
* Tracks estimated memory saved from closed tabs.
* Sends system notifications after cleanup actions.

### 🎨 Modern UI

* Premium dark-themed interface.
* Compact popup layout.
* Smooth animations and clean tab cards.
* Built with Inter typography and custom styling.

---

## 📁 Project Structure

```text
TabNuke/
├── manifest.json       # Chrome extension configuration
├── background.js       # Background service worker and tab management logic
├── popup.html          # Extension popup interface
├── popup.css           # Popup styling and theme
├── popup.js            # Popup UI controller and interactions
├── utils.js            # Shared helper functions
└── icons/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🛠️ Installation

### Load Extension Locally

1. Clone this repository:

```bash
git clone <repository-url>
```

2. Open Google Chrome.

3. Navigate to:

```text
chrome://extensions/
```

4. Enable **Developer mode**.

5. Click **Load unpacked**.

6. Select the project folder.

7. TabNuke will now appear in your Chrome extensions toolbar.

---

## 🚀 Usage

### Manual Cleanup

1. Click the TabNuke extension icon.
2. Review:

   * Duplicate tabs
   * Same-site tabs
   * Estimated memory saved
3. Use:

   * **Kill Duplicates** to remove exact duplicates.
   * Individual close buttons to remove selected tabs.
   * **Keep 1** to keep one active tab per website.

---

## ⚙️ Settings

Open the settings panel using the gear icon.

Available options:

| Setting                     | Description                                       |
| --------------------------- | ------------------------------------------------- |
| Auto-close duplicates       | Closes newly opened duplicate tabs automatically  |
| Auto-close older duplicates | Removes older duplicates and keeps the newest tab |
| Show badge count            | Displays duplicate count on the extension icon    |

---

## 🧩 How It Works

TabNuke uses Chrome's Tabs API to monitor browser activity.

The extension:

1. Scans open tabs.
2. Groups tabs by:

   * Full URL for exact duplicates.
   * Domain for same-site duplicates.
3. Displays cleanup options.
4. Removes selected duplicate tabs.
5. Updates statistics and notifications.

---

## 🔐 Permissions

TabNuke requires:

| Permission      | Purpose                             |
| --------------- | ----------------------------------- |
| `tabs`          | Read and manage browser tabs        |
| `storage`       | Save user settings and statistics   |
| `windows`       | Focus browser windows after cleanup |
| `notifications` | Display cleanup alerts              |

---

## 🧑‍💻 Development

### Technologies

* JavaScript (ES Modules)
* HTML5
* CSS3
* Chrome Extension Manifest V3

### Main Components

* **background.js**

  * Handles duplicate scanning.
  * Manages tab events.
  * Performs cleanup actions.

* **popup.js**

  * Controls the popup UI.
  * Handles user interactions.
  * Communicates with the background service worker.

* **utils.js**

  * Provides reusable helpers:

    * Domain extraction
    * URL grouping
    * Memory formatting
    * Text formatting

---

## 📌 Future Improvements

Possible enhancements:

* Memory usage estimation using browser performance APIs.
* Duplicate tab history tracking.
* Custom cleanup rules.
* Sync settings across devices.
* More browser support.

---

## 📄 License

Add your preferred license here.

---

## ⭐ Support

If you find TabNuke useful, consider starring the repository and sharing feedback.
