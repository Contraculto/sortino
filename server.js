// Sortino - Express server module
// Shared by the CLI (index.js) and Electron (electron-main.js) entry points

import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 300 }));

let settings = {};

const SETTINGS_DIR = path.join(os.homedir(), '.sortino');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// Escape special HTML characters to prevent XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Validate that a filename component contains no path separators, null bytes, or traversal sequences
function isSafeFilename(name) {
  return typeof name === 'string' &&
    name.length > 0 &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.includes('\0') &&
    name !== '.' &&
    name !== '..';
}

// Validate that a resolved child path is strictly within a parent directory (cross-platform safe)
function isPathWithin(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

// Return only image files from a directory
async function listImages(dir) {
  const files = await fs.promises.readdir(dir);
  return files.filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
}

// Fetch next image data from source directory
async function getNextImageData() {
  const files = await listImages(settings.source);
  if (files.length === 0) return { done: true, count: 0, filename: '', src: '', safeFilename: '' };
  const file = files[0];
  const mime = MIME_TYPES[path.extname(file).toLowerCase()] || 'image/jpeg';
  const data = await fs.promises.readFile(path.join(settings.source, file));
  return {
    done: false,
    count: files.length,
    filename: file,
    safeFilename: escapeHtml(file),
    src: `data:${mime};base64,${data.toString('base64')}`,
  };
}

// Shared CSS injected on every page
const sharedCSS = `
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --sidebar-bg:     #0d1b2a;
    --sidebar-accent: #1b2f47;
    --sidebar-hover:  #243d5c;
    --brand:          #4f8ef7;
    --brand-dark:     #1a3560;
    --text-primary:   #e8eaf6;
    --text-secondary: #8b9ec9;
    --surface:        #f0f2f8;
    --card:           #ffffff;
    --border:         #dde1f0;
    --shadow:         0 2px 16px rgba(0,0,0,0.10);
  }
  html, body { height: 100%; overflow: hidden; }
  body {
    display: flex;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    background: var(--surface);
    color: #2d3748;
  }
  /* ── Sidebar ── */
  #sidebar {
    width: 230px;
    min-width: 230px;
    background: var(--sidebar-bg);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
    flex-shrink: 0;
  }
  #sidebar-header {
    padding: 22px 18px 16px;
    border-bottom: 1px solid var(--sidebar-accent);
  }
  #sidebar-logo {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--brand);
  }
  #sidebar-tagline {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 3px;
    letter-spacing: 0.5px;
  }
  #folder-section-label {
    padding: 14px 18px 6px;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 600;
  }
  #folder-list { padding: 4px 10px 12px; flex: 1; }
  .folder-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 9px 10px;
    margin-bottom: 3px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 7px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 13.5px;
    font-family: inherit;
    text-align: left;
    transition: background 0.15s ease, border-color 0.15s ease;
    gap: 9px;
  }
  .folder-btn:hover { background: var(--sidebar-hover); border-color: var(--brand); }
  .folder-btn:active { transform: scale(0.98); }
  .folder-btn.active { background: var(--brand-dark); border-color: var(--brand); }
  .folder-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .shortcut-badge {
    margin-left: auto;
    background: rgba(255,255,255,0.08);
    color: var(--text-secondary);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', Consolas, monospace;
    flex-shrink: 0;
  }
  #sidebar-footer {
    padding: 12px 10px;
    border-top: 1px solid var(--sidebar-accent);
  }
  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 13px;
    padding: 8px 10px;
    border-radius: 7px;
    transition: background 0.15s, color 0.15s;
  }
  .sidebar-link:hover { background: var(--sidebar-accent); color: var(--text-primary); }
  /* ── Main area ── */
  #main {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    min-width: 0;
  }
  #topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow);
    z-index: 10;
  }
  #image-counter { font-size: 13px; font-weight: 600; color: #4a5568; }
  #image-filename {
    font-size: 11px;
    color: #a0aec0;
    font-family: 'SF Mono', Consolas, monospace;
    max-width: 340px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #progress-wrap { height: 3px; background: var(--border); position: relative; }
  #progress-bar {
    height: 100%;
    background: var(--brand);
    transition: width 0.4s ease;
    position: absolute; top: 0; left: 0;
  }
  #image-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 24px;
    background: var(--surface);
  }
  #img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.14);
    transition: opacity 0.18s ease, transform 0.18s ease;
    display: block;
  }
  #img.fading { opacity: 0; transform: scale(0.97); }
  .done-card {
    text-align: center;
    background: var(--card);
    padding: 48px 40px;
    border-radius: 16px;
    box-shadow: var(--shadow);
    max-width: 360px;
  }
  .done-card .done-emoji { font-size: 56px; margin-bottom: 16px; }
  .done-card h2 { font-size: 22px; font-weight: 700; color: #2d3748; margin-bottom: 8px; }
  .done-card p { font-size: 14px; color: #718096; line-height: 1.6; }
  #hint-bar {
    padding: 7px 20px;
    background: var(--card);
    border-top: 1px solid var(--border);
    font-size: 11.5px;
    color: #a0aec0;
  }
  kbd {
    background: #edf2f7;
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    padding: 1px 5px;
    font-family: 'SF Mono', Consolas, monospace;
    font-size: 10px;
    color: #4a5568;
  }
</style>`;

// Build the sidebar HTML fragment
function buildSidebar(folders) {
  let items = '';
  folders.forEach((folder, i) => {
    const label = escapeHtml(folder.replace(/_[0-9]+/, ''));
    const n = i < 9 ? i + 1 : null;
    const badge = n ? `<span class="shortcut-badge">${n}</span>` : '';
    items += `<button class="folder-btn" data-dir="${escapeHtml(folder)}" data-shortcut="${n || ''}">
        <span>📁</span><span class="folder-label">${label}</span>${badge}
      </button>`;
  });
  const folderSection = folders.length
    ? `<div id="folder-section-label">Destination folders</div><div id="folder-list">${items}</div>`
    : '<div id="folder-list"></div>';
  return `<div id="sidebar">
    <div id="sidebar-header">
      <div id="sidebar-logo">Sortino</div>
      <div id="sidebar-tagline">Image sorting tool</div>
    </div>
    ${folderSection}
    <div id="sidebar-footer">
      <a href="/" class="sidebar-link">🖼&nbsp; Sort images</a>
      <a href="/settings" class="sidebar-link">⚙&nbsp; Settings</a>
    </div>
  </div>`;
}

// Build the image area HTML and return metadata
function buildImageFragment(imageData) {
  if (imageData.done) {
    return {
      imgHtml: `<div class="done-card">
        <div class="done-emoji">✅</div>
        <h2>All sorted!</h2>
        <p>No more images in the source folder.<br>Great work!</p>
      </div>`,
      count: 0,
      filename: '',
    };
  }
  return {
    imgHtml: `<img id="img" data-img="${imageData.safeFilename}" src="${imageData.src}" alt="${imageData.safeFilename}">`,
    count: imageData.count,
    filename: imageData.filename,
  };
}

// Main page: display first image with folder navigation
app.get('/', async (req, res) => {
  try {
    const entries = await fs.promises.readdir(settings.dest, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name);

    const imageData = await getNextImageData();
    const { imgHtml, count, filename } = buildImageFragment(imageData);
    const counterText = count > 0
      ? `${count} image${count === 1 ? '' : 's'} remaining`
      : 'All sorted!';

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sortino</title>
  ${sharedCSS}
</head>
<body>
  ${buildSidebar(folders)}
  <div id="main">
    <div id="topbar">
      <span id="image-counter">${escapeHtml(counterText)}</span>
      <span id="image-filename">${escapeHtml(filename)}</span>
    </div>
    <div id="progress-wrap"><div id="progress-bar" style="width:0%"></div></div>
    <div id="image-area">${imgHtml}</div>
    <div id="hint-bar">Press <kbd>1</kbd>&ndash;<kbd>9</kbd> to sort &nbsp;&middot;&nbsp; or click a folder in the sidebar</div>
  </div>
  <script>
    const totalAtLoad = ${count};

    function updateUI(count, filename) {
      const counter = document.getElementById('image-counter');
      const fname   = document.getElementById('image-filename');
      const bar     = document.getElementById('progress-bar');
      if (counter) counter.textContent = count > 0
        ? count + ' image' + (count === 1 ? '' : 's') + ' remaining'
        : 'All sorted!';
      if (fname) fname.textContent = filename || '';
      if (bar && totalAtLoad > 0) {
        const pct = ((totalAtLoad - count) / totalAtLoad) * 100;
        bar.style.width = pct + '%';
      }
    }

    function doMove(dir) {
      const imgEl = document.getElementById('img');
      if (!imgEl) return;
      imgEl.classList.add('fading');
      const params = new URLSearchParams({ img: imgEl.dataset.img, dir });
      setTimeout(() => {
        fetch('/move', { method: 'POST', body: params })
          .then(res => res.json())
          .then(data => {
            document.getElementById('image-area').innerHTML = data.imgHtml;
            updateUI(data.count, data.filename);
          })
          .catch(err => console.error('Move failed:', err));
      }, 160);
    }

    document.querySelectorAll('.folder-btn').forEach(btn => {
      btn.addEventListener('click', () => doMove(btn.dataset.dir));
    });

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) {
        const btn = document.querySelector('.folder-btn[data-shortcut="' + n + '"]');
        if (btn) {
          btn.classList.add('active');
          setTimeout(() => btn.classList.remove('active'), 300);
          doMove(btn.dataset.dir);
        }
      }
    });
  </script>
</body>
</html>`;
    res.send(page);
  } catch (err) {
    console.error('Error serving main page:', err);
    res.status(500).send('<p>Error loading page. Check that source and destination directories exist.</p>');
  }
});

// AJAX: move image to folder and return next image as JSON
app.post('/move', async (req, res) => {
  const { img, dir } = req.body;
  if (!img || !dir) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  if (!isSafeFilename(img) || !isSafeFilename(dir)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const imgPath    = path.resolve(settings.source, img);
  const destDirPath = path.resolve(settings.dest, dir);

  if (!isPathWithin(settings.source, imgPath) || !isPathWithin(settings.dest, destDirPath)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  console.log(`  _ ${img} -> /${dir}`);

  try {
    await fs.promises.mkdir(destDirPath, { recursive: true });
    await fs.promises.rename(imgPath, path.join(destDirPath, img));
    console.log(`\n  _ Next image`);
    const imageData = await getNextImageData();
    const fragment  = buildImageFragment(imageData);
    res.json(fragment);
  } catch (err) {
    console.error('Error moving file:', err);
    res.status(500).json({ error: 'Error moving file' });
  }
});

// Settings page
const settingsCSS = `
<style>
  #settings-wrap {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 20px;
    overflow-y: auto;
    height: 100vh;
    background: var(--surface);
  }
  .settings-card {
    background: var(--card);
    border-radius: 14px;
    box-shadow: var(--shadow);
    padding: 36px 40px;
    width: 100%;
    max-width: 480px;
    margin-top: 20px;
  }
  .settings-card h2 { font-size: 20px; font-weight: 700; color: #1a202c; margin-bottom: 4px; }
  .settings-subtitle { font-size: 13px; color: #718096; margin-bottom: 28px; }
  .field { margin-bottom: 20px; }
  .field label { display: block; font-size: 13px; font-weight: 600; color: #4a5568; margin-bottom: 6px; }
  .field input[type="text"],
  .field input[type="number"] {
    width: 100%;
    padding: 10px 13px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: #2d3748;
    background: #f8fafc;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }
  .field input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px rgba(79,142,247,0.15);
    background: #fff;
  }
  .field .hint { font-size: 11.5px; color: #a0aec0; margin-top: 4px; }
  .save-btn {
    width: 100%;
    padding: 11px;
    background: var(--brand);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    margin-top: 8px;
    transition: background 0.15s, transform 0.1s;
  }
  .save-btn:hover { background: #3a7de8; }
  .save-btn:active { transform: scale(0.99); }
</style>`;

function renderSettings(req, res) {
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sortino – Settings</title>
  ${sharedCSS}
  ${settingsCSS}
</head>
<body>
  ${buildSidebar([])}
  <div id="settings-wrap">
    <div class="settings-card">
      <h2>Settings</h2>
      <p class="settings-subtitle">Configure source and destination directories</p>
      <form method="post">
        <div class="field">
          <label for="port">Port</label>
          <input type="number" name="port" id="port" min="1" max="65535" step="1"
            value="${escapeHtml(settings.port || '')}" autocomplete="off">
          <div class="hint">Local port Sortino listens on (default: 1234)</div>
        </div>
        <div class="field">
          <label for="source">Source directory</label>
          <input type="text" name="source" id="source"
            value="${escapeHtml(settings.source || '')}" autocomplete="off">
          <div class="hint">Folder containing the images to sort</div>
        </div>
        <div class="field">
          <label for="dest">Destination directory</label>
          <input type="text" name="dest" id="dest"
            value="${escapeHtml(settings.dest || '')}" autocomplete="off">
          <div class="hint">Parent folder whose sub-folders are the sort targets</div>
        </div>
        <button type="submit" class="save-btn">Save settings</button>
      </form>
    </div>
  </div>
</body>
</html>`;
  res.send(page);
}

app.route('/settings')
  .get(renderSettings)
  .post(async (req, res) => {
    const { port, source, dest } = req.body;
    const portNum = parseInt(port, 10);
    if (port && source && dest && portNum >= 1 && portNum <= 65535) {
      try {
        await fs.promises.mkdir(SETTINGS_DIR, { recursive: true });
        await fs.promises.writeFile(SETTINGS_FILE, `${portNum}\n${source}\n${dest}`);
        settings.port = String(portNum);
        settings.source = source;
        settings.dest = dest;
        console.log('\n  _ Settings saved\n');
      } catch (err) {
        console.error('Error saving settings:', err);
      }
    }
    renderSettings(req, res);
  });

// Load settings and start the Express server.
// Returns a Promise that resolves to { port, isFirstRun } when the server is listening.
export async function startServer() {
  let isFirstRun = false;

  try {
    await fs.promises.access(SETTINGS_FILE);
    const content = await fs.promises.readFile(SETTINGS_FILE, 'utf8');
    const lines = content.trim().split('\n');
    settings.port = lines[0];
    settings.source = lines[1];
    settings.dest = lines[2];
  } catch {
    isFirstRun = true;
    settings.port = '1234';
    settings.source = path.join(os.homedir(), 'Pictures', 'in');
    settings.dest = path.join(os.homedir(), 'Pictures', 'out');
    await fs.promises.mkdir(SETTINGS_DIR, { recursive: true });
    await fs.promises.writeFile(SETTINGS_FILE, `${settings.port}\n${settings.source}\n${settings.dest}`);
    console.log('  Creating default settings file...');
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(settings.port, () => {
      console.log(`  Listening on http://localhost:${settings.port}`);
      resolve({ port: settings.port, isFirstRun, server });
    });
    server.on('error', reject);
  });
}
