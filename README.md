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

## Use OVERNOTE

OVERNOTE opens as a compact floating workspace and stays above normal windows,
including other virtual desktops and fullscreen windows where the operating
system permits. Drag the title bar to move it, or drag any window edge to
resize it. Showing and hiding uses `showInactive`, so the hotkey does not take
focus away from the application you are using.

### Global hotkeys

- `Ctrl+Shift+Space` — show or hide OVERNOTE
- `Ctrl+Shift+T` — toggle click-through mode
- `Ctrl+Shift+Up` / `Ctrl+Shift+Down` — raise or lower opacity
- `Ctrl+S` — save the active note

The global shortcuts can be changed in **Settings**. Electron accelerator names
are accepted there, so `CommandOrControl+Shift+Space` is portable across
Windows, Linux, and macOS.

### Notes and images

- Use **+** to create notes; click a title to edit it, and use the star to pin.
- Search looks through titles and note text. The trash button deletes the
  active note after confirmation.
- The editor supports bold, bullet lists, and interactive checkboxes.
- Paste a screenshot directly into the editor or use **Image**. Images are
  saved as PNG files in the local app-data `images` folder. Click an image to
  open it larger; oversized clipboard images are capped at 4096px on their
  longest side to keep notes manageable.
- **Export** converts the active note to Markdown and copies its referenced
  images into a sibling `*-images` folder.

### Window, theme, and tray

- **Click-through** makes the mouse pass through OVERNOTE to the window below;
  the title bar shows the current mode. Use the global hotkey to turn it off.
- **Settings** controls panel opacity (20%–100%), light/dark theme, startup
  collapsed mode, and hotkeys. Text remains opaque and readable when the panel
  is transparent.
- The collapse button turns OVERNOTE into a small title-bar pill. The close
  button hides to the tray rather than exiting. The tray menu can show, hide,
  or quit OVERNOTE.

## Data location

OVERNOTE keeps its JSON note database and pasted image files in Electron's
standard `userData` directory. Use the Settings panel to open that folder.

## Packaging

The Windows NSIS configuration is included in `package.json`:

```bash
npm run dist
```

This creates `OVERNOTE-<version>-Setup.exe` in `dist/`. Build on Windows for
the most reliable Windows signing and installer behavior.

## Privacy

OVERNOTE has no account system, cloud sync, telemetry, or network calls. All
note content and images stay in the local Electron app-data directory.
