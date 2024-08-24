const { ipcRenderer } = require('electron');

let currentNote = null;

document.getElementById('add-note').addEventListener('click', () => {
    ipcRenderer.send('add-note');
});

document.getElementById('list-notes').addEventListener('click', () => {
    ipcRenderer.send('open-list-window');
});

document.getElementById('exit').addEventListener('click', () => {
    window.close();
});

const noteContent = document.getElementById('note-content');
let currentNoteId = null;

ipcRenderer.on('load-note', (event, note) => {
    noteContent.value = note.content;
    currentNoteId = note.id;
});

noteContent.addEventListener('input', () => {
    if (currentNoteId) {
        ipcRenderer.send('save-note', currentNoteId, noteContent.value);
    } else {
        currentNoteId = Date.now();
        ipcRenderer.send('save-note', currentNoteId, noteContent.value);
    }
});