(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const editor = $('#editor');
  const noteTitle = $('#noteTitle');
  const noteList = $('#noteList');
  const saveStatus = $('#saveStatus');
  let notes = [];
  let settings = { opacity: 0.7, theme: 'dark', collapsed: false, clickThrough: false, lastNoteId: null, hotkeys: {} };
  let activeId = null;
  let saveTimer;
  let titleTimer;

  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const activeNote = () => notes.find((note) => note.id === activeId);
  const plainText = (html) => { const temporary = document.createElement('div'); temporary.innerHTML = html || ''; return temporary.innerText || temporary.textContent || ''; };

  function showSaving(state) {
    saveStatus.className = state === 'saving' ? 'saving' : state === 'error' ? 'error' : '';
    saveStatus.title = state === 'saving' ? 'Saving…' : state === 'error' ? 'Save failed' : 'Saved locally';
  }

  function scheduleSave() {
    showSaving('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 550);
  }

  async function saveNow() {
    const note = activeNote();
    if (!note) return;
    note.title = noteTitle.value.trim() || 'Untitled note';
    note.content = editor.innerHTML;
    note.updatedAt = new Date().toISOString();
    try { await window.overnote.saveNotes(notes); showSaving('saved'); renderNotes(); updateWordCount(); }
    catch (error) { console.error(error); showSaving('error'); }
  }

  function renderNotes() {
    const query = $('#searchInput').value.trim().toLowerCase();
    const visible = notes.filter((note) => !query || `${note.title} ${plainText(note.content)}`.toLowerCase().includes(query)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    noteList.innerHTML = visible.length ? visible.map((note) => `<article class="note-card ${note.id === activeId ? 'active' : ''}" data-id="${escapeHtml(note.id)}"><h3>${escapeHtml(note.title || 'Untitled note')}</h3><p>${escapeHtml(plainText(note.content).replace(/\s+/g, ' ').trim() || 'Empty note')}</p>${note.pinned ? '<span class="pin">★</span>' : ''}</article>`).join('') : '<div class="empty-notes">No notes match this search.<br><br>Use <strong>+</strong> to start a new one.</div>';
    $('#noteCount').textContent = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;
  }

  function selectNote(id) {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    activeId = id; settings.lastNoteId = id;
    noteTitle.value = note.title || 'Untitled note'; editor.innerHTML = note.content || '';
    $('#pinButton').classList.toggle('pinned', Boolean(note.pinned)); $('#pinButton').textContent = note.pinned ? '★' : '☆';
    renderNotes(); updateWordCount();
    window.overnote.saveSettings({ lastNoteId: id }).catch(console.error);
  }

  function newNote() {
    const note = { id: makeId(), title: 'Untitled note', content: '', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    notes.unshift(note); selectNote(note.id); renderNotes(); noteTitle.focus(); noteTitle.select(); scheduleSave();
  }

  async function deleteNote() {
    const note = activeNote(); if (!note) return;
    if (notes.length > 1 && !window.confirm(`Delete “${note.title}”?`)) return;
    notes = notes.filter((item) => item.id !== note.id);
    if (!notes.length) { newNote(); return; }
    selectNote(notes[0].id); await saveNow();
  }

  function updateWordCount() { const count = plainText(editor.innerHTML).trim().split(/\s+/).filter(Boolean).length; $('#wordCount').textContent = `${count} ${count === 1 ? 'word' : 'words'}`; }

  function toggleCheckbox(target) {
    const item = target.closest('li[data-checkbox]'); if (!item) return;
    const checked = item.dataset.checkbox === 'checked'; item.dataset.checkbox = checked ? 'unchecked' : 'checked'; target.textContent = checked ? '' : '✓'; scheduleSave();
  }

  async function pasteImage() {
    try {
      const image = await window.overnote.saveClipboardImage();
      if (!image) { alert('There is no image in the clipboard.'); return; }
      editor.focus(); document.execCommand('insertHTML', false, `<img src="${image.src}" data-image-file="${escapeHtml(image.filename)}" alt="Pasted screenshot" />`); scheduleSave();
    } catch (error) { console.error(error); alert('Could not save the clipboard image.'); }
  }

  function applySettings() {
    document.body.classList.toggle('light', settings.theme === 'light'); document.body.classList.toggle('collapsed', Boolean(settings.collapsed));
    document.documentElement.style.setProperty('--panel-opacity', settings.opacity);
    $('#opacityRange').value = Math.round((settings.opacity || .7) * 100); $('#opacityValue').textContent = `${Math.round((settings.opacity || .7) * 100)}%`;
    $('#themeToggle').checked = settings.theme === 'light'; $('#collapsedToggle').checked = Boolean(settings.collapsed);
    Object.entries(settings.hotkeys || {}).forEach(([name, value]) => { const field = document.querySelector(`[data-hotkey="${name}"]`); if (field) field.value = value.replace('CommandOrControl', 'Ctrl'); });
    setClickThroughIndicator(settings.clickThrough);
  }

  function setClickThroughIndicator(enabled) { settings.clickThrough = enabled; $('#modeIndicator').textContent = enabled ? 'Click-through' : 'Interactive'; $('#modeIndicator').classList.toggle('click-through', enabled); }

  async function saveSettings(patch) { settings = { ...settings, ...patch }; await window.overnote.saveSettings(patch); applySettings(); }

  function bindEvents() {
    $('#newNoteButton').addEventListener('click', newNote); $('#deleteButton').addEventListener('click', deleteNote);
    $('#searchInput').addEventListener('input', renderNotes);
    noteList.addEventListener('click', (event) => { const card = event.target.closest('.note-card'); if (card) selectNote(card.dataset.id); });
    noteTitle.addEventListener('input', () => { clearTimeout(titleTimer); titleTimer = setTimeout(scheduleSave, 200); });
    editor.addEventListener('input', () => { updateWordCount(); scheduleSave(); });
    editor.addEventListener('click', (event) => { if (event.target.classList.contains('checkbox')) toggleCheckbox(event.target); if (event.target.tagName === 'IMG') { $('#lightboxImage').src = event.target.src; $('#imageLightbox').classList.add('open'); } });
    editor.addEventListener('paste', (event) => { if ([...event.clipboardData.items].some((item) => item.type.startsWith('image/'))) { event.preventDefault(); pasteImage(); } });
    document.querySelectorAll('[data-command]').forEach((button) => button.addEventListener('click', () => { editor.focus(); document.execCommand(button.dataset.command); scheduleSave(); }));
    $('#checkboxButton').addEventListener('click', () => { editor.focus(); document.execCommand('insertHTML', false, '<ul><li data-checkbox="unchecked"><span class="checkbox" contenteditable="false"></span>Task</li></ul>'); scheduleSave(); });
    $('#imageButton').addEventListener('click', pasteImage);
    $('#pinButton').addEventListener('click', () => { const note = activeNote(); if (!note) return; note.pinned = !note.pinned; selectNote(note.id); scheduleSave(); });
    $('#exportButton').addEventListener('click', async () => { const note = activeNote(); if (!note) return; try { const result = await window.overnote.exportNote(note); if (!result.canceled) showSaving('saved'); } catch (error) { console.error(error); alert(`Export failed: ${error.message}`); } });
    $('#settingsButton').addEventListener('click', () => { $('#settingsPanel').classList.add('open'); $('#settingsPanel').setAttribute('aria-hidden', 'false'); });
    $('#closeSettingsButton').addEventListener('click', () => { $('#settingsPanel').classList.remove('open'); $('#settingsPanel').setAttribute('aria-hidden', 'true'); });
    $('#closeButton').addEventListener('click', () => window.overnote.hideWindow());
    $('#collapseButton').addEventListener('click', () => saveSettings({ collapsed: !settings.collapsed }));
    $('#opacityRange').addEventListener('input', (event) => { const value = Number(event.target.value) / 100; settings.opacity = value; $('#opacityValue').textContent = `${event.target.value}%`; window.overnote.setOpacity(value).catch(console.error); });
    $('#themeToggle').addEventListener('change', (event) => saveSettings({ theme: event.target.checked ? 'light' : 'dark' }));
    $('#collapsedToggle').addEventListener('change', (event) => saveSettings({ collapsed: event.target.checked }));
    document.querySelectorAll('[data-hotkey]').forEach((field) => field.addEventListener('change', () => { const hotkeys = {}; document.querySelectorAll('[data-hotkey]').forEach((item) => { hotkeys[item.dataset.hotkey] = item.value.replace(/^Ctrl/, 'CommandOrControl'); }); saveSettings({ hotkeys }).catch(console.error); }));
    $('#openDataButton').addEventListener('click', () => window.overnote.openDataFolder());
    $('#closeLightbox').addEventListener('click', () => $('#imageLightbox').classList.remove('open')); $('#imageLightbox').addEventListener('click', (event) => { if (event.target.id === 'imageLightbox') event.currentTarget.classList.remove('open'); });
    document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); clearTimeout(saveTimer); saveNow(); } });
  }

  window.overnote.onInitialState((state) => { notes = state.notes || []; settings = { ...settings, ...(state.settings || {}), hotkeys: { ...settings.hotkeys, ...(state.settings?.hotkeys || {}) } }; if (!notes.length) { newNote(); } else selectNote(settings.lastNoteId && notes.some((note) => note.id === settings.lastNoteId) ? settings.lastNoteId : notes[0].id); applySettings(); renderNotes(); });
  window.overnote.onSettingsChanged((incoming) => { settings = { ...settings, ...incoming }; applySettings(); });
  window.overnote.onClickThroughChanged(setClickThroughIndicator);
  bindEvents();
})();
