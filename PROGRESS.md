# OVERNOTE Progress

## Checklist

- [x] 1. Scaffold the Electron project, package.json, run script, README
  - Added the Electron 31 project manifest, `npm start`/`npm test` scripts, lockfile, ignore rules, and initial usage docs.
  - Verified `npm install` and `npm test`; Electron binary was installed locally for runtime verification.
- [x] 2. Frameless transparent window with custom title bar and drag
  - BrowserWindow is frameless, transparent, resizable, and uses a custom draggable title bar.
- [x] 3. Always-on-top overlay behavior + not stealing focus
  - Uses screen-saver always-on-top, all-workspaces/fullscreen visibility, and `showInactive()`.
- [x] 4. Opacity slider + readable-text styling at low opacity
  - Panel opacity is adjustable from 20%–100%; the translucent blurred surface changes while text stays opaque.
- [x] 5. Global hotkey show/hide
  - Registers the configurable `Ctrl+Shift+Space` accelerator and toggles visibility without focus stealing.
- [x] 6. Click-through toggle + visual indicator
  - `Ctrl+Shift+T` uses Electron mouse ignoring with forwarding and updates the title-bar indicator.
- [x] 7. Editor with bold/bullets/checkboxes
  - Contenteditable editor supports bold, unordered lists, and interactive checklist items.
- [x] 8. Local storage layer (JSON notes + images folder) with autosave
  - Atomic JSON writes and debounced saves persist notes, settings, window state, and pasted image files.
- [x] 9. Clipboard image paste + image resize/enlarge
  - Clipboard screenshots are saved to app data, embedded in notes, constrained responsively, and click-to-enlarge.
- [x] 10. Multi-note sidebar: new, rename, delete, pin, search
  - Sidebar provides note creation, title editing, deletion, pin ordering, and full-text search.
- [x] 11. Tray icon + close-to-tray
  - PNG tray icon provides show/hide/quit actions; the window close button hides to tray.
- [x] 12. Persist window state and settings; settings panel for hotkeys
  - Settings panel covers opacity, theme, collapsed mode, hotkeys, and local data folder access.
- [x] 13. Markdown export
  - Export opens a save dialog, converts formatting to Markdown, and copies referenced images to an export folder.
- [x] 14. Collapse/pill mode + light/dark theme
  - Collapse hides the workspace to a compact pill; theme and collapsed state survive restart.
- [x] 15. Polish: icon, error handling, edge cases (empty state, huge images, multi-monitor), final README with usage and hotkeys
  - Added branded PNG/SVG/ICO assets, single-instance behavior, tray fallback, renderer crash reporting, empty-state handling, oversized-image limits, and off-screen window recovery.
  - Expanded README with complete usage, controls, privacy, data, and packaging instructions; `npm test` and a 12-second `npm start` smoke test pass without application errors.
- [x] 16. Package an installer (electron-builder) for Windows
  - Configured `appId`, product name `OVERNOTE`, branded `assets/overnote.ico`, NSIS target, and the `npm run dist` script.
  - The installer must be built on Windows with `npm install` followed by `npm run dist`; Linux requires Wine for the NSIS step, which is intentionally not installed here.

## Check log

Project initialized for a plain Electron + HTML/CSS/JS desktop notepad.
