const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let notes = [];
const notesFilePath = path.join(app.getPath('userData'), 'notes.json');
const lastOpenedNotePath = path.join(app.getPath('userData'), 'lastOpenedNote.json');
const windowStatePath = path.join(app.getPath('userData'), 'windowState.json');

function createWindow(note = null) {
    let windowState = getWindowState();

    const win = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        frame: false,
        resizable: true,
        icon: 'fav.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');

    win.webContents.on('did-finish-load', () => {
        if (note) {
            win.webContents.send('load-note', note);
        } else {
            // Create a new empty note
            const newNote = { id: Date.now(), content: '' };
            notes.unshift(newNote);
            win.webContents.send('load-note', newNote);
            saveNotes();
            updateListWindows();
        }
    });

    win.on('close', async () => {
        saveWindowState(win);
        // Note saving is now handled by the 'save-note' IPC event
    });

    return win;
}

function createListWindow() {
    const listWin = new BrowserWindow({
        width: 300,
        height: 300,
        frame: false,
        resizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    listWin.loadFile('list.html');

    listWin.webContents.on('did-finish-load', () => {
        listWin.webContents.send('load-notes-list', notes);
    });

    return listWin;
}

function updateListWindows() {
    BrowserWindow.getAllWindows().forEach(win => {
        if (win.webContents.getURL().includes('list.html')) {
            win.webContents.send('load-notes-list', notes);
        }
    });
}

function saveNotes() {
    fs.writeFileSync(notesFilePath, JSON.stringify(notes, null, 2));
    console.log('Notes saved:', notes);
}

function loadNotes() {
    if (fs.existsSync(notesFilePath)) {
        const data = fs.readFileSync(notesFilePath, 'utf-8');
        notes = JSON.parse(data);
        console.log('Notes loaded:', notes);
    } else {
        console.log('No existing notes file found');
    }
}

function getWindowState() {
    let defaultState = {
        width: 300,
        height: 300,
        x: undefined,
        y: undefined
    };

    if (fs.existsSync(windowStatePath)) {
        try {
            const data = fs.readFileSync(windowStatePath, 'utf-8');
            const savedState = JSON.parse(data);
            return { ...defaultState, ...savedState };
        } catch (e) {
            console.error('Failed to parse window state file:', e);
        }
    }

    return defaultState;
}

function saveWindowState(win) {
    if (!win.isMaximized() && !win.isMinimized()) {
        const bounds = win.getBounds();
        fs.writeFileSync(windowStatePath, JSON.stringify(bounds));
    }
}

function saveLastOpenedNote(noteId) {
    fs.writeFileSync(lastOpenedNotePath, JSON.stringify({ lastOpenedNoteId: noteId }));
}

function getLastOpenedNote() {
    if (fs.existsSync(lastOpenedNotePath)) {
        const data = fs.readFileSync(lastOpenedNotePath, 'utf-8');
        const { lastOpenedNoteId } = JSON.parse(data);
        return notes.find(note => note.id === lastOpenedNoteId) || null;
    }
    return null;
}

app.whenReady().then(() => {
    loadNotes();
    const lastOpenedNote = getLastOpenedNote();
    if (lastOpenedNote) {
        createWindow(lastOpenedNote);
    } else if (notes.length > 0) {
        createWindow(notes[0]);
    } else {
        createWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const lastOpenedNote = getLastOpenedNote();
        if (lastOpenedNote) {
            createWindow(lastOpenedNote);
        } else if (notes.length > 0) {
            createWindow(notes[0]);
        } else {
            createWindow();
        }
    }
});

ipcMain.on('add-note', () => {
    const newNote = { id: Date.now(), content: '' };
    notes.unshift(newNote);
    createWindow(newNote);
    saveNotes();
    updateListWindows();
});

ipcMain.on('open-note', (event, noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        createWindow(note);
    }
});

ipcMain.on('open-list-window', () => {
    createListWindow();
});

ipcMain.on('delete-note', (event, noteId) => {
    notes = notes.filter(note => note.id !== noteId);
    saveNotes();
    updateListWindows();
});

ipcMain.on('save-note', (event, noteId, content) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.content = content;
    } else {
        const newNote = { id: noteId, content: content };
        notes.unshift(newNote);
    }
    saveNotes();
    updateListWindows();
});

Menu.setApplicationMenu(null);