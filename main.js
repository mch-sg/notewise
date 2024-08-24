const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let notes = [];
const notesFilePath = path.join(app.getPath('userData'), 'notes.json');
const lastOpenedNotePath = path.join(app.getPath('userData'), 'lastOpenedNote.json');
const windowStatePath = path.join(app.getPath('userData'), 'windowState.json');

// Function to save the position and size of the note
function saveNotePosition(noteId, x, y, width, height) {
    const filePath = path.join(app.getPath('userData'), 'notePositions.json');
    let positions = {};

    // Check if the file exists, if not, create it
    if (fs.existsSync(filePath)) {
        positions = JSON.parse(fs.readFileSync(filePath, 'utf-8') || '{}');
    }

    positions[noteId] = { x, y, width, height }; // Store position and size
    fs.writeFileSync(filePath, JSON.stringify(positions));
}

// Function to get the saved position and size of the note
function getNotePosition(noteId) {
    const filePath = path.join(app.getPath('userData'), 'notePositions.json');

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        const positions = JSON.parse(fs.readFileSync(filePath, 'utf-8') || '{}');
        return positions[noteId] || { x: 100, y: 100, width: 300, height: 300 }; // Default position and size
    }

    return { x: 100, y: 100, width: 300, height: 300 }; // Default position and size if file doesn't exist
}

function createWindow(note = null) {
    let windowState = getWindowState();
    let position = { x: windowState.x, y: windowState.y, width: windowState.width, height: windowState.height };

    if (note) {
        const notePosition = getNotePosition(note.id); // Get saved position and size for the note
        position = { x: notePosition.x, y: notePosition.y, width: notePosition.width, height: notePosition.height };
    }

    const win = new BrowserWindow({
        width: position.width,
        height: position.height,
        x: position.x,
        y: position.y,
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
        if (note) {
            const { x, y, width, height } = win.getBounds(); // Get current window position and size
            saveNotePosition(note.id, x, y, width, height); // Save position and size for the note
        }
    });

    return win;
}

function createListWindow() {
    const listWin = new BrowserWindow({
        width: 350,
        height: 500,
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
        width: 400,
        height: 600,
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