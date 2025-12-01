// ===== Global State =====
let songs = []; // Array to store all uploaded songs
let currentSongIndex = -1; // Index of currently playing song
let playlists = []; // Array to store playlists
let isPlaying = false;
let isDragging = false;

// ===== DOM Elements =====
const audioPlayer = document.getElementById('audioPlayer');
const navTabs = document.querySelectorAll('.nav-tab');
const pages = document.querySelectorAll('.page');
const songList = document.getElementById('songList');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const uploadStatus = document.getElementById('uploadStatus');
const uploadProgress = document.getElementById('uploadProgress');
const progressFillUpload = document.getElementById('progressFillUpload');
const progressText = document.getElementById('progressText');
const playPauseBtn = document.getElementById('playPauseBtn');
const stopBtn = document.getElementById('stopBtn');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressKnob = document.getElementById('progressKnob');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');
const currentSongTitle = document.getElementById('currentSongTitle');
const currentSongFilename = document.getElementById('currentSongFilename');
const startListeningBtn = document.getElementById('startListeningBtn');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const playlistNameInput = document.getElementById('playlistNameInput');
const playlistsContainer = document.getElementById('playlistsContainer');

// ===== Navigation =====
// Handle tab clicks to switch between pages
navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        switchPage(targetTab);
    });
});

// Function to switch between pages
function switchPage(pageId) {
    // Remove active class from all tabs and pages
    navTabs.forEach(t => t.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    
    // Add active class to selected tab and page
    document.querySelector(`[data-tab="${pageId}"]`).classList.add('active');
    document.getElementById(pageId).classList.add('active');
}

// Initialize: Set Home as active
switchPage('home');

// ===== File Upload Helper Functions =====
// Filter files to only include MP3 files
function filterMP3Files(files) {
    return Array.from(files).filter(file => {
        const fileName = file.name.toLowerCase();
        return fileName.endsWith('.mp3');
    });
}

// Process files efficiently using async/await
async function processFiles(files) {
    const mp3Files = filterMP3Files(files);
    
    if (mp3Files.length === 0) {
        uploadStatus.textContent = 'No MP3 files found. Please select MP3 files only.';
        uploadStatus.style.color = 'var(--text-light)';
        uploadProgress.style.display = 'none';
        return;
    }
    
    // Show progress bar
    uploadProgress.style.display = 'block';
    uploadStatus.textContent = `Processing ${mp3Files.length} MP3 file(s)...`;
    uploadStatus.style.color = 'var(--sage-green)';
    
    let processed = 0;
    const total = mp3Files.length;
    
    // Process files in batches to avoid blocking UI
    const batchSize = 10; // Process 10 files at a time
    
    for (let i = 0; i < mp3Files.length; i += batchSize) {
        const batch = mp3Files.slice(i, Math.min(i + batchSize, mp3Files.length));
        
        // Process batch
        batch.forEach(file => {
            try {
                // Create object URL for the file
                const url = URL.createObjectURL(file);
                
                // Add song to our songs array
                songs.push({
                    id: Date.now() + Math.random() + Math.random(), // Unique ID
                    name: file.name.replace(/\.mp3$/i, ''), // Remove .mp3 extension
                    filename: file.name,
                    url: url, // Object URL for playback
                    duration: 0 // Will be set when audio loads
                });
                
                processed++;
                
                // Update progress
                const percent = Math.round((processed / total) * 100);
                progressFillUpload.style.width = percent + '%';
                progressText.textContent = `${percent}% (${processed}/${total})`;
            } catch (error) {
                console.error('Error processing file:', file.name, error);
            }
        });
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Update UI
    uploadStatus.textContent = `✓ Successfully uploaded ${processed} MP3 file(s)`;
    uploadStatus.style.color = 'var(--sage-green)';
    
    // Update library display
    renderSongList();
    
    // Hide progress after a moment
    setTimeout(() => {
        uploadProgress.style.display = 'none';
        progressFillUpload.style.width = '0%';
        progressText.textContent = '0%';
        
        // Switch to library page
        switchPage('library');
    }, 1500);
}

// ===== File Upload =====
// Handle individual file selection
fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        await processFiles(files);
    }
    // Clear file input
    fileInput.value = '';
});

// Handle folder selection
folderInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        await processFiles(files);
    }
    // Clear folder input
    folderInput.value = '';
});

// ===== Render Song List =====
// Display all uploaded songs in the library
function renderSongList() {
    if (songs.length === 0) {
        songList.innerHTML = '<div class="empty-state">No songs uploaded yet. Go to Upload Songs to add music.</div>';
        return;
    }
    
    songList.innerHTML = songs.map((song, index) => `
        <div class="song-item" data-index="${index}">
            <button class="song-item-play" aria-label="Play ${song.name}">▶</button>
            <div class="song-item-info">
                <div class="song-item-name">${escapeHtml(song.name)}</div>
            </div>
            <div class="song-item-duration">${song.duration ? formatTime(song.duration) : '--:--'}</div>
        </div>
    `).join('');
    
    // Add click handlers to song items
    document.querySelectorAll('.song-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            playSong(index);
        });
    });
    
    // Add click handlers to play buttons
    document.querySelectorAll('.song-item-play').forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering parent click
            playSong(index);
        });
    });
}

// ===== Play Song =====
// Load and play a song by its index
function playSong(index) {
    if (index < 0 || index >= songs.length) return;
    
    currentSongIndex = index;
    const song = songs[index];
    
    // Set audio source
    audioPlayer.src = song.url;
    
    // Update UI
    currentSongTitle.textContent = song.name;
    currentSongFilename.textContent = song.filename;
    
    // Switch to Now Playing page
    switchPage('now-playing');
    
    // Load and play
    audioPlayer.load();
    audioPlayer.play().catch(error => {
        console.error('Playback error:', error);
    });
    
    // Get duration when metadata loads
    audioPlayer.addEventListener('loadedmetadata', function updateDuration() {
        song.duration = audioPlayer.duration;
        totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
        renderSongList(); // Update duration in library
        audioPlayer.removeEventListener('loadedmetadata', updateDuration);
    }, { once: true });
}

// ===== Playback Controls =====
// Play/Pause button
playPauseBtn.addEventListener('click', () => {
    if (currentSongIndex === -1 && songs.length > 0) {
        // If no song is selected, play first song
        playSong(0);
    } else if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
});

// Stop button - stops playback and resets to beginning
stopBtn.addEventListener('click', () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    isPlaying = false;
    playPauseBtn.textContent = '▶';
    updateProgress();
});

// Next button - play next song
nextBtn.addEventListener('click', () => {
    if (songs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % songs.length;
    playSong(nextIndex);
});

// Back button - play previous song
backBtn.addEventListener('click', () => {
    if (songs.length === 0) return;
    const prevIndex = currentSongIndex <= 0 ? songs.length - 1 : currentSongIndex - 1;
    playSong(prevIndex);
});

// Rewind button - go back 10 seconds
rewindBtn.addEventListener('click', () => {
    if (audioPlayer.duration) {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
        updateProgress();
    }
});

// Forward button - skip forward 10 seconds
forwardBtn.addEventListener('click', () => {
    if (audioPlayer.duration) {
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
        updateProgress();
    }
});

// ===== Progress Bar =====
// Update progress bar as song plays
function updateProgress() {
    if (audioPlayer.duration) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = percent + '%';
        progressKnob.style.left = percent + '%';
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    }
}

// Seek when clicking on progress bar
progressBar.addEventListener('click', (e) => {
    if (!audioPlayer.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    audioPlayer.currentTime = (percent / 100) * audioPlayer.duration;
    updateProgress();
});

// Drag progress knob
progressKnob.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (isDragging && audioPlayer.duration) {
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        audioPlayer.currentTime = (percent / 100) * audioPlayer.duration;
        updateProgress();
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// ===== Volume Control =====
volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    audioPlayer.volume = volume;
    volumeValue.textContent = e.target.value + '%';
});

// ===== Audio Events =====
// Update UI when audio plays
audioPlayer.addEventListener('play', () => {
    isPlaying = true;
    playPauseBtn.textContent = '⏸';
});

// Update UI when audio pauses
audioPlayer.addEventListener('pause', () => {
    isPlaying = false;
    playPauseBtn.textContent = '▶';
});

// Update progress as song plays
audioPlayer.addEventListener('timeupdate', updateProgress);

// Auto-play next song when current ends
audioPlayer.addEventListener('ended', () => {
    if (songs.length > 0) {
        const nextIndex = (currentSongIndex + 1) % songs.length;
        playSong(nextIndex);
    }
});

// ===== Start Listening Button =====
startListeningBtn.addEventListener('click', () => {
    if (songs.length > 0) {
        // Play first song if songs are available
        playSong(0);
    } else {
        // Switch to upload page if no songs
        switchPage('upload');
    }
});

// ===== Playlists =====
// Create new playlist
createPlaylistBtn.addEventListener('click', () => {
    const playlistName = playlistNameInput.value.trim();
    if (playlistName === '') {
        alert('Please enter a playlist name');
        return;
    }
    
    // Add playlist to array
    playlists.push({
        id: Date.now(),
        name: playlistName,
        songs: []
    });
    
    // Clear input
    playlistNameInput.value = '';
    
    // Update display
    renderPlaylists();
});

// Render all playlists
function renderPlaylists() {
    if (playlists.length === 0) {
        playlistsContainer.innerHTML = '<div class="empty-state">No playlists yet. Create one above.</div>';
        return;
    }
    
    playlistsContainer.innerHTML = playlists.map((playlist, playlistIndex) => `
        <div class="playlist-card">
            <div class="playlist-card-title">${escapeHtml(playlist.name)}</div>
            <ul class="playlist-songs">
                ${songs.map((song, songIndex) => `
                    <li class="playlist-song-item">
                        <span>${escapeHtml(song.name)}</span>
                        <button class="add-to-playlist-btn" 
                                data-playlist="${playlistIndex}" 
                                data-song="${songIndex}"
                                aria-label="Add ${song.name} to ${playlist.name}">+</button>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
    
    // Add click handlers to add buttons
    document.querySelectorAll('.add-to-playlist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const playlistIndex = parseInt(btn.dataset.playlist);
            const songIndex = parseInt(btn.dataset.song);
            
            // Add song to playlist if not already added
            const playlist = playlists[playlistIndex];
            if (!playlist.songs.includes(songIndex)) {
                playlist.songs.push(songIndex);
                btn.textContent = '✓';
                btn.style.color = 'var(--sage-green)';
            }
        });
    });
}

// Initialize playlists display
renderPlaylists();

// ===== Settings =====
// Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.style.background = 'var(--text-dark)';
        document.body.style.color = 'var(--card-white)';
    } else {
        document.body.style.background = 'var(--light-grey)';
        document.body.style.color = 'var(--text-dark)';
    }
});

// Animations toggle
const animationsToggle = document.getElementById('animationsToggle');
animationsToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.remove('no-animations');
    } else {
        document.body.classList.add('no-animations');
    }
});

// Rounded corners toggle
const roundedCornersToggle = document.getElementById('roundedCornersToggle');
roundedCornersToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.remove('no-rounded');
    } else {
        document.body.classList.add('no-rounded');
    }
});

// ===== Utility Functions =====
// Format time in MM:SS format
function formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize: Render song list on page load
renderSongList();
