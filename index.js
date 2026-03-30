#!/usr/bin/env node
// Sortino - Sort images in directories
// Rodrigo Lanas <rodrigo@contraculto.com>

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const express = require('express');
const open = require('open');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 300 }));

let settings = {};

const SETTINGS_FILE = 'settings';
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

// HTML templates

const htmlHead = `<html>
  <head>
    <title>Sortino - Image sorting</title>
  </head>
  <body>`;

const htmlFoot = `
    <style>
      body { margin: 10px; background: #fff; font-family: sans-serif; }
      #command { margin-bottom: 10px; padding: 10px 10px 0 10px; background: #192B43; }
      #command a { display: inline-block; margin: 0 20px 10px 0; text-decoration: none; color: #fff; }
      #command a:hover { text-decoration: underline; }
    </style>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
    <script>
      $("a").on("click", function() {
        const data = { img: $('#img').data('img'), dir: $(this).data('dir') };
        $.post("/move", data, function(res) {
          $("#img").replaceWith(res);
        });
      });
    </script>
  </body>
</html>`;

// Return only image files from a directory
function listImages(dir) {
  return fs.readdirSync(dir).filter(
    f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase())
  );
}

// Move an image file to a subdirectory of the destination
function moveFile(img, dir) {
  const src = path.join(settings.source, img);
  const dest = path.join(settings.dest, dir, img);
  fs.renameSync(src, dest);
}

// Build an <img> tag for the first image in source, or a "done" message
function nextImageTag() {
  const files = listImages(settings.source);
  if (files.length === 0) {
    return '<p>All images sorted!</p>';
  }
  const file = files[0];
  const mime = MIME_TYPES[path.extname(file).toLowerCase()] || 'image/jpeg';
  const data = fs.readFileSync(path.join(settings.source, file));
  return `<img id="img" data-img="${escapeHtml(file)}" src="data:${mime};base64,${data.toString('base64')}" alt="${escapeHtml(file)}" />`;
}

// Main page: display first image with folder navigation
app.get('/', (req, res) => {
  const files = listImages(settings.source);
  if (files.length === 0) {
    return res.send(htmlHead + '<p>No images found in source directory.</p>' + htmlFoot);
  }

  const folders = fs.readdirSync(settings.dest).filter(
    f => fs.lstatSync(path.join(settings.dest, f)).isDirectory()
  );

  let htmlControl = '<div id="command">';
  for (const folder of folders) {
    const label = escapeHtml(folder.replace(/_[0-9]+/, ''));
    htmlControl += `<a href="javascript:void(0);" data-dir="${escapeHtml(folder)}">${label}</a>`;
  }
  htmlControl += '</div>';

  res.send(htmlHead + htmlControl + nextImageTag() + htmlFoot);
});

// AJAX: move image to selected folder and return next image tag
app.post('/move', (req, res) => {
  const { img, dir } = req.body;
  if (!img || !dir) {
    return res.status(400).send('Missing parameters');
  }

  console.log(`  _ ${img} -> /${dir}`);

  const destDir = path.join(settings.dest, dir);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  moveFile(img, dir);
  console.log(`\n  _ Next image`);
  res.send(nextImageTag());
});

// Settings page
function renderSettings(req, res) {
  const content = `
    <style>
      body { margin: 10px; background: #fff; font-family: sans-serif; }
      input { border: 1px solid silver; padding: 5px; width: 300px; }
    </style>
    <form method="post">
      <h2>Sortino Settings</h2>
      <p>
        <label for="port">Port</label><br>
        <input type="text" name="port" id="port" value="${escapeHtml(settings.port || '')}">
      </p>
      <p>
        <label for="source">Source dir</label><br>
        <input type="text" name="source" id="source" value="${escapeHtml(settings.source || '')}">
      </p>
      <p>
        <label for="dest">Destination dir</label><br>
        <input type="text" name="dest" id="dest" value="${escapeHtml(settings.dest || '')}">
      </p>
      <p>
        <input type="submit" value="Save">
      </p>
    </form>`;
  res.send(htmlHead + content + htmlFoot);
}

app.route('/settings')
  .get(renderSettings)
  .post((req, res) => {
    const { port, source, dest } = req.body;
    if (port && source && dest) {
      fs.writeFileSync(SETTINGS_FILE, `${port}\n${source}\n${dest}`);
      settings.port = port;
      settings.source = source;
      settings.dest = dest;
      console.log('\n  _ Settings saved\n');
    }
    renderSettings(req, res);
  });

// Console menu
function menu() {
  rl.question('\n  [1] SORT  [2] Settings  [3] Help  [4] Exit\n      : ', (answer) => {
    switch (answer) {
      case '1':
        open(`http://localhost:${settings.port}`);
        break;
      case '2':
        open(`http://localhost:${settings.port}/settings`);
        break;
      case '3':
        open('https://github.com/Contraculto/sortino/blob/master/README.md');
        break;
      case '4':
        console.log('\n  Good bye!');
        rl.close();
        process.exit(0);
        return;
      default:
        console.log('\n  Invalid option');
    }
    menu();
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Banner
console.log();
console.log('  ██████  ▒█████   ██▀███  ▄▄▄█████▓ ██▓ ███▄    █  ▒█████  ');
console.log('▒██    ▒ ▒██▒  ██▒▓██ ▒ ██▒▓  ██▒ ▓▒▓██▒ ██ ▀█   █ ▒██▒  ██▒');
console.log('░ ▓██▄   ▒██░  ██▒▓██ ░▄█ ▒▒ ▓██░ ▒░▒██▒▓██  ▀█ ██▒▒██░  ██▒');
console.log('  ▒   ██▒▒██   ██░▒██▀▀█▄  ░ ▓██▓ ░ ░██░▓██▒  ▐▌██▒▒██   ██░');
console.log('▒██████▒▒░ ████▓▒░░██▓ ▒██▒  ▒██▒ ░ ░██░▒██░   ▓██░░ ████▓▒░');
console.log('▒ ▒▓▒ ▒ ░░ ▒░▒░▒░ ░ ▒▓ ░▒▓░  ▒ ░░   ░▓  ░ ▒░   ▒ ▒ ░ ▒░▒░▒░ ');
console.log('░ ░▒  ░ ░  ░ ▒ ▒░   ░▒ ░ ▒░    ░     ▒ ░░ ░░   ░ ▒░  ░ ▒ ▒░ ');
console.log('░  ░  ░  ░ ░ ░ ▒    ░░   ░   ░       ▒ ░   ░   ░ ░ ░ ░ ░ ▒  ');
console.log('      ░      ░ ░     ░               ░           ░     ░ ░  ');
console.log();
console.log();

// Load settings and start server
function startServer() {
  app.listen(settings.port, () => {
    console.log(`  Listening on http://localhost:${settings.port}`);
    console.log();
    menu();
  });
}

if (fs.existsSync(SETTINGS_FILE)) {
  const lines = fs.readFileSync(SETTINGS_FILE, 'utf8').trim().split('\n');
  settings.port = lines[0];
  settings.source = lines[1];
  settings.dest = lines[2];
  startServer();
} else {
  console.log('  Creating default settings file...');
  settings.port = '1234';
  settings.source = path.join(os.homedir(), 'Pictures', 'in');
  settings.dest = path.join(os.homedir(), 'Pictures', 'out');
  fs.writeFileSync(SETTINGS_FILE, `${settings.port}\n${settings.source}\n${settings.dest}`);
  console.log('  Settings file created, opening settings page');
  app.listen(settings.port, () => {
    open(`http://localhost:${settings.port}/settings`);
    menu();
  });
}

