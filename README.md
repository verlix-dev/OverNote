# OVERNOTE

OVERNOTE is a private desktop notepad that floats above your other windows. It
uses Electron with plain HTML, CSS, and JavaScript. Notes are stored locally in
the operating system app-data directory; there are no accounts, cloud sync, or
network requests.

## Development

Requirements: Node.js 18 or newer.

```bash
npm install
npm start
```

Run the lightweight source checks with:

```bash
npm test
```

Build a Windows installer with `npm run dist` on a Windows build machine (or a
configured cross-build environment).

## Current controls

- `Ctrl+Shift+Space` — show or hide OVERNOTE
- `Ctrl+Shift+T` — toggle click-through mode
- `Ctrl+Shift+Up` / `Ctrl+Shift+Down` — raise or lower opacity
- `Ctrl+S` — save the active note

The custom title bar can be dragged, and the window can be resized from its
edges. Closing the window keeps OVERNOTE available in the system tray.

## Data location

OVERNOTE keeps its JSON note database and pasted image files in Electron's
standard `userData` directory. Use the Settings panel to open that folder.
