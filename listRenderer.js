const { ipcRenderer } = require('electron');

document.getElementById('exit').addEventListener('click', () => {
    window.close();
});

ipcRenderer.on('load-notes-list', (event, notes) => {
    console.log('Received notes in list window:', notes);
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '';
    if (notes.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = 'No notes yet. Create a new note to get started!';
        notesList.appendChild(emptyMessage);
    } else {
        notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            
            const noteContent = document.createElement('span');
            noteContent.className = 'note-content';
            
            // Extract the first line of the note
            const firstLine = note.content.replace(/<[^>]*>/g, '').split('\n')[0].trim();
            noteContent.textContent = firstLine || 'Empty Note';
            
            noteContent.addEventListener('click', () => {
                ipcRenderer.send('open-note', note.id);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i data-lucide="x"></i>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this note?')) {
                    ipcRenderer.send('delete-note', note.id);
                }
            });
            
            noteItem.appendChild(noteContent);
            noteItem.appendChild(deleteBtn);
            notesList.appendChild(noteItem);
        });
        lucide.createIcons({
            attrs: {
                width: '18px',
                height: '18px',
                stroke: '#e0e0e0'
            }
        });
    }
});