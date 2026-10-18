const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, protocol, dialog, shell, Menu, Tray, net, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const APP_SCHEME = 'overnote-image';
const defaultSettings = {
  opacity: 0.7,
  theme: 'dark',
  clickThrough: false,
  collapsed: false,
  lastNoteId: null,
  hotkeys: {
    toggleVisibility: 'CommandOrControl+Shift+Space',
    clickThrough: 'CommandOrControl+Shift+T',
    increaseOpacity: 'CommandOrControl+Shift+Up',
    decreaseOpacity: 'CommandOrControl+Shift+Down'
  },
  window: { x: undefined, y: undefined, width: 980, height: 680 }
};

let mainWindow;
let tray;
let isQuitting = false;
let dataDir;
let notesFile;
let settingsFile;
let imagesDir;
let settings;
const hasSingleInstance = app.requestSingleInstanceLock();

if (!hasSingleInstance) app.quit();

function ensureDataFiles() {
  dataDir = app.getPath('userData');
  notesFile = path.join(dataDir, 'notes.json');
  settingsFile = path.join(dataDir, 'settings.json');
  imagesDir = path.join(dataDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(notesFile)) writeJson(notesFile, { notes: [] });
  if (!fs.existsSync(settingsFile)) writeJson(settingsFile, defaultSettings);
  settings = { ...defaultSettings, ...readJson(settingsFile, {}), hotkeys: { ...defaultSettings.hotkeys, ...(readJson(settingsFile, {}).hotkeys || {}) }, window: { ...defaultSettings.window, ...(readJson(settingsFile, {}).window || {}) } };
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(temporary, file);
}

function loadNotes() {
  const value = readJson(notesFile, { notes: [] });
  return Array.isArray(value.notes) ? value : { notes: [] };
}

function sendToRenderer(channel, value) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, value);
}

function applyWindowSettings() {
  if (!mainWindow) return;
  // Keep the actual window opaque so text stays crisp. The renderer applies the
  // opacity to its translucent panel, leaving text and controls readable.
  mainWindow.setOpacity(1);
  mainWindow.setIgnoreMouseEvents(Boolean(settings.clickThrough), { forward: true });
  sendToRenderer('click-through-changed', Boolean(settings.clickThrough));
  mainWindow.webContents.send('settings-changed', settings);
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const hotkeys = settings.hotkeys;
  const register = (accelerator, action) => {
    if (!accelerator) return;
    try {
      if (!globalShortcut.register(accelerator, action)) console.warn(`Could not register global hotkey: ${accelerator}`);
    } catch (error) {
      console.warn(`Invalid global hotkey ${accelerator}:`, error.message);
    }
  };
  register(hotkeys.toggleVisibility, toggleVisibility);
  register(hotkeys.clickThrough, toggleClickThrough);
  register(hotkeys.increaseOpacity, () => changeOpacity(0.05));
  register(hotkeys.decreaseOpacity, () => changeOpacity(-0.05));
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.showInactive();
}

function toggleVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) mainWindow.hide();
  else showWindow();
}

function toggleClickThrough() {
  settings.clickThrough = !settings.clickThrough;
  writeJson(settingsFile, settings);
  applyWindowSettings();
}

function changeOpacity(delta) {
  settings.opacity = Math.max(0.2, Math.min(1, Math.round((settings.opacity + delta) * 100) / 100));
  writeJson(settingsFile, settings);
  applyWindowSettings();
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  try {
    tray = new Tray(iconPath);
  } catch (error) {
    console.warn('System tray is unavailable:', error.message);
    return;
  }
  tray.setToolTip('OVERNOTE');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show OVERNOTE', click: showWindow },
    { label: 'Hide OVERNOTE', click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: 'Quit OVERNOTE', click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.on('double-click', showWindow);
}

function createWindow() {
  const saved = settings.window || defaultSettings.window;
  const displays = screen.getAllDisplays();
  const savedPositionIsVisible = Number.isFinite(saved.x) && Number.isFinite(saved.y) && displays.some(({ workArea }) => saved.x < workArea.x + workArea.width - 80 && saved.x + 80 > workArea.x && saved.y < workArea.y + workArea.height - 80 && saved.y + 80 > workArea.y);
  mainWindow = new BrowserWindow({
    x: savedPositionIsVisible ? saved.x : undefined,
    y: savedPositionIsVisible ? saved.y : undefined,
    width: saved.width || 980,
    height: saved.height || 680,
    minWidth: 420,
    minHeight: 300,
    frame: false,
    transparent: true,
    resizable: true,
    show: false,
    title: 'OVERNOTE',
    icon: path.join(__dirname, 'assets', 'overnote.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setSkipTaskbar(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      saveWindowState();
      mainWindow.hide();
    }
  });
  mainWindow.on('move', saveWindowState);
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('did-finish-load', () => {
    applyWindowSettings();
    sendToRenderer('initial-state', { notes: loadNotes().notes, settings });
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('OVERNOTE renderer stopped:', details.reason);
    if (!isQuitting) dialog.showErrorBox('OVERNOTE needs to restart its editor', 'The note window stopped unexpectedly. Please relaunch OVERNOTE.');
  });
  applyWindowSettings();
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.getBounds();
  settings.window = { ...settings.window, ...bounds };
  try { writeJson(settingsFile, settings); } catch (error) { console.warn('Unable to save window state:', error.message); }
}

function registerIpc() {
  ipcMain.handle('load-state', () => ({ notes: loadNotes().notes, settings, dataDir }));
  ipcMain.handle('save-notes', (_event, notes) => {
    if (!Array.isArray(notes)) throw new Error('Notes must be an array');
    writeJson(notesFile, { notes });
    return true;
  });
  ipcMain.handle('save-settings', (_event, incoming) => {
    settings = { ...settings, ...incoming, hotkeys: { ...settings.hotkeys, ...(incoming.hotkeys || {}) }, window: { ...settings.window, ...(incoming.window || {}) } };
    writeJson(settingsFile, settings);
    if (incoming.hotkeys) registerHotkeys();
    applyWindowSettings();
    return settings;
  });
  ipcMain.handle('set-opacity', (_event, value) => {
    settings.opacity = Math.max(0.2, Math.min(1, Number(value) || 0.7));
    writeJson(settingsFile, settings);
    applyWindowSettings();
    return settings.opacity;
  });
  ipcMain.handle('set-click-through', (_event, enabled) => {
    settings.clickThrough = Boolean(enabled);
    writeJson(settingsFile, settings);
    applyWindowSettings();
    return settings.clickThrough;
  });
  ipcMain.handle('save-clipboard-image', () => {
    const image = clipboard.readImage();
    if (image.isEmpty()) return null;
    const size = image.getSize();
    const largestSide = Math.max(size.width, size.height);
    const imageToSave = largestSide > 4096 ? image.resize({ width: Math.round(size.width * 4096 / largestSide) }) : image;
    const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
    const target = path.join(imagesDir, id);
    fs.writeFileSync(target, imageToSave.toPNG());
    return { filename: id, src: `${APP_SCHEME}://${encodeURIComponent(id)}` };
  });
  ipcMain.handle('open-data-folder', () => shell.openPath(dataDir));
  ipcMain.handle('export-note', async (_event, payload) => exportNote(payload));
  ipcMain.on('hide-window', () => mainWindow?.hide());
  ipcMain.on('quit-app', () => { isQuitting = true; app.quit(); });
}

function htmlToMarkdown(html) {
  return String(html || '')
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<li data-checkbox="checked">(.*?)<\/li>/gi, '- [x] $1\n')
    .replace(/<li data-checkbox="unchecked">(.*?)<\/li>/gi, '- [ ] $1\n')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<img[^>]*data-image-file="([^"]+)"[^>]*>/gi, '![]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

async function exportNote(payload) {
  if (!payload || !payload.title) throw new Error('Nothing to export');
  const choice = await dialog.showSaveDialog(mainWindow, {
    title: 'Export note as Markdown',
    defaultPath: `${payload.title.replace(/[^a-z0-9 _-]/gi, '').trim() || 'note'}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });
  if (choice.canceled || !choice.filePath) return { canceled: true };
  const exportDir = path.dirname(choice.filePath);
  const markdown = htmlToMarkdown(payload.content);
  const withImages = markdown.replace(/!\[\]\(([^)]+)\)/g, (_match, filename) => {
    const source = path.join(imagesDir, path.basename(filename));
    const imageFolder = path.join(exportDir, `${path.basename(choice.filePath, '.md')}-images`);
    fs.mkdirSync(imageFolder, { recursive: true });
    const destination = path.join(imageFolder, path.basename(filename));
    if (fs.existsSync(source)) fs.copyFileSync(source, destination);
    return `![](${path.basename(imageFolder)}/${path.basename(filename)})`;
  });
  fs.writeFileSync(choice.filePath, `# ${payload.title}\n\n${withImages}`, 'utf8');
  return { canceled: false, filePath: choice.filePath };
}

if (hasSingleInstance) app.whenReady().then(() => {
  protocol.handle(APP_SCHEME, async (request) => {
    const filename = decodeURIComponent(new URL(request.url).hostname || new URL(request.url).pathname.replace(/^\//, ''));
    const safeName = path.basename(filename);
    const target = path.join(imagesDir, safeName);
    if (!target.startsWith(imagesDir) || !fs.existsSync(target)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(target).toString());
  });
  ensureDataFiles();
  registerIpc();
  createWindow();
  createTray();
  registerHotkeys();
  showWindow();
});

if (hasSingleInstance) {
  app.on('second-instance', () => showWindow());
  app.on('window-all-closed', (event) => event.preventDefault());
}

app.on('will-quit', () => {
  saveWindowState();
  globalShortcut.unregisterAll();
});

app.on('activate', showWindow);
