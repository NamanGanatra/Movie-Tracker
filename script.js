// Replace with your active OMDb API Key
const API_KEY = "f8a4d404";

// Application State
let users = {};
let activeUser = null;
let movies = [];
let playlists = ["All", "Unassigned"]; // Default filter options
let selectedFilter = "All"; // Active view filter

// Initialize Page Data
document.addEventListener("DOMContentLoaded", () => {
    loadUsersFromStorage();
    populateLoginDropdown();
});

// Load registered users directly from LocalStorage
function loadUsersFromStorage() {
    const saved = localStorage.getItem("app_users_db");
    users = saved ? JSON.parse(saved) : {};
}

// Clear all saved profiles & start fresh
function clearAllProfiles() {
    if (confirm("Kya aap saare saved profiles aur watchlists delete karna chahte hain?")) {
        localStorage.clear();
        users = {};
        movies = [];
        playlists = ["All", "Unassigned"];
        populateLoginDropdown();
        alert("Sare purane profiles delete ho gaye hain!");
    }
}

// Populate Login Select Dropdown
function populateLoginDropdown() {
    const select = document.getElementById("loginUserSelect");
    const loginFormContainer = document.getElementById("loginFormContainer");
    const noProfilesMsg = document.getElementById("noProfilesMsg");

    select.innerHTML = "";
    const usernameList = Object.keys(users);

    if (usernameList.length === 0) {
        loginFormContainer.style.display = "none";
        noProfilesMsg.style.display = "block";
    } else {
        loginFormContainer.style.display = "flex";
        noProfilesMsg.style.display = "none";

        usernameList.forEach(username => {
            const option = document.createElement("option");
            option.value = username;
            option.textContent = username;
            select.appendChild(option);
        });
    }
}

// User Authentication: Login
function login() {
    const username = document.getElementById("loginUserSelect").value;
    const pin = document.getElementById("loginPinInput").value.trim();

    if (!username || !pin) {
        alert("Please select a profile and enter PIN.");
        return;
    }

    if (users[username] && users[username].pin === pin) {
        activeUser = username;
        document.getElementById("authScreen").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        document.getElementById("activeUserLabel").innerHTML = `Logged in as: <strong>${activeUser}</strong>`;
        document.getElementById("welcomeTitle").innerText = `🎬 ${activeUser}'s Watchlist`;
        document.getElementById("loginPinInput").value = "";
        
        loadUserData();
    } else {
        alert("Incorrect PIN! Please try again.");
    }
}

// Logout Functionality
function logout() {
    activeUser = null;
    movies = [];
    playlists = ["All", "Unassigned"];
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
    populateLoginDropdown();
}

// User Registration
function registerUser() {
    const name = document.getElementById("regNameInput").value.trim();
    const pin = document.getElementById("regPinInput").value.trim();

    if (!name || pin.length !== 4) {
        alert("Please enter a valid profile name and a 4-digit PIN.");
        return;
    }

    if (users[name]) {
        alert("Profile name already exists!");
        return;
    }

    users[name] = { pin: pin };
    localStorage.setItem("app_users_db", JSON.stringify(users));
    
    populateLoginDropdown();
    closeModal("registerModal");
    document.getElementById("regNameInput").value = "";
    document.getElementById("regPinInput").value = "";
    alert(`Profile "${name}" created successfully!`);
}

// Load Movies & Playlists for Active User
function loadUserData() {
    const savedMovies = localStorage.getItem(`watchlist_${activeUser}`);
    movies = savedMovies ? JSON.parse(savedMovies) : [];

    const savedPlaylists = localStorage.getItem(`playlists_${activeUser}`);
    playlists = savedPlaylists ? JSON.parse(savedPlaylists) : ["Unassigned", "Comedy", "Action"];

    populatePlaylistDropdowns();
    renderGrid();
}

// Save State
function saveAndRefresh() {
    localStorage.setItem(`watchlist_${activeUser}`, JSON.stringify(movies));
    localStorage.setItem(`playlists_${activeUser}`, JSON.stringify(playlists));
    populatePlaylistDropdowns();
    renderGrid();
}

// Create New Playlist
function createPlaylist() {
    const playlistInput = document.getElementById("newPlaylistInput");
    const playlistName = playlistInput ? playlistInput.value.trim() : prompt("Nayi Playlist / Genre ka naam likho:");

    if (!playlistName) return;

    if (playlists.some(p => p.toLowerCase() === playlistName.toLowerCase())) {
        alert("Ye playlist pehle se bani hui hai!");
        return;
    }

    playlists.push(playlistName);
    if (playlistInput) playlistInput.value = "";
    saveAndRefresh();
    alert(`Playlist "${playlistName}" successfully create ho gayi!`);
}

// Populate Dropdowns for Filtering and Adding
function populatePlaylistDropdowns() {
    // 1. Top Filter Dropdown
    const filterSelect = document.getElementById("playlistFilterSelect");
    if (filterSelect) {
        filterSelect.innerHTML = `<option value="All">All Playlists</option>`;
        playlists.forEach(pl => {
            const opt = document.createElement("option");
            opt.value = pl;
            opt.textContent = pl;
            if (pl === selectedFilter) opt.selected = true;
            filterSelect.appendChild(opt);
        });
    }

    // 2. Add Movie Playlist Selection Dropdown
    const addSelect = document.getElementById("addPlaylistSelect");
    if (addSelect) {
        addSelect.innerHTML = "";
        playlists.forEach(pl => {
            const opt = document.createElement("option");
            opt.value = pl;
            opt.textContent = pl;
            addSelect.appendChild(opt);
        });
    }
}

// Change Filter View
function handleFilterChange() {
    const filterSelect = document.getElementById("playlistFilterSelect");
    if (filterSelect) {
        selectedFilter = filterSelect.value;
        renderGrid();
    }
}

// Add Movie/Show with Playlist Support
async function addMovie() {
    const titleInput = document.getElementById("movieInput").value.trim();
    const yearInput = document.getElementById("yearInput").value.trim();
    const typeInput = document.getElementById("typeInput").value;
    const playlistSelect = document.getElementById("addPlaylistSelect");
    const chosenPlaylist = playlistSelect ? playlistSelect.value : "Unassigned";

    if (!titleInput) {
        alert("Please enter a title to search.");
        return;
    }

    let apiUrl = `https://www.omdbapi.com/?t=${encodeURIComponent(titleInput)}&apikey=${API_KEY}`;
    if (yearInput) apiUrl += `&y=${encodeURIComponent(yearInput)}`;
    if (typeInput) apiUrl += `&type=${encodeURIComponent(typeInput)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.Response === "False") {
            alert("Title not found!");
            return;
        }

        const isDuplicate = movies.some(item => item.imdbID === data.imdbID);
        if (isDuplicate) {
            alert("This title is already in your watchlist!");
            return;
        }

        const movieData = {
            imdbID: data.imdbID,
            title: data.Title,
            poster: data.Poster !== "N/A" ? data.Poster : 'https://via.placeholder.com/300x450?text=No+Poster',
            releaseDate: data.Released,
            rating: data.imdbRating,
            genre: data.Genre,
            year: data.Year,
            plot: data.Plot,
            type: data.Type,
            playlist: chosenPlaylist,
            watched: false,
            addedAt: Date.now()
        };

        movies.unshift(movieData);
        saveAndRefresh();

        document.getElementById("movieInput").value = "";
        document.getElementById("yearInput").value = "";
        document.getElementById("typeInput").value = "";
    } catch (error) {
        alert("Network error fetching data.");
    }
}

// Handle Enter Key
function handleKeyPress(event) {
    if (event.key === "Enter") addMovie();
}

// Render Grid grouped by Playlists / Sections
function renderGrid() {
    const grid = document.getElementById("movieGrid");
    grid.innerHTML = "";

    // Sort movies: Unwatched pehle, Watched baad me
    movies.sort((a, b) => {
        if (a.watched === b.watched) {
            return (b.addedAt || 0) - (a.addedAt || 0);
        }
        return a.watched - b.watched;
    });

    let watchedCount = 0;
    movies.forEach(m => { if (m.watched) watchedCount++; });

    // Filter Logic
    let playlistsToDisplay = selectedFilter === "All" ? playlists : [selectedFilter];

    playlistsToDisplay.forEach(playlistName => {
        const playlistMovies = movies.filter(m => (m.playlist || "Unassigned") === playlistName);

        if (playlistMovies.length > 0 || selectedFilter !== "All") {
            // Create Playlist Section Header
            const sectionHeader = document.createElement("div");
            sectionHeader.className = "playlist-section-header";
            sectionHeader.style.cssText = "width: 100%; grid-column: 1 / -1; margin-top: 20px; border-bottom: 2px solid #e50914; padding-bottom: 5px;";
            sectionHeader.innerHTML = `<h2 style="color: #fff; display: flex; align-items: center; gap: 10px;">📁 ${playlistName} <span style="font-size: 14px; color: #8c8c8c;">(${playlistMovies.length} items)</span></h2>`;
            grid.appendChild(sectionHeader);

            playlistMovies.forEach((movie) => {
                const globalIndex = movies.findIndex(m => m.imdbID === movie.imdbID);

                const card = document.createElement("div");
                card.className = `movie-card ${movie.watched ? 'watched' : ''}`;

                card.innerHTML = `
                    <div class="poster-wrapper">
                        <img src="${movie.poster}" alt="${movie.title}">
                        <div class="imdb-tag">⭐ ${movie.rating}</div>
                    </div>
                    <div class="card-content">
                        <div>
                            <h3 class="movie-title">${movie.title}</h3>
                            <p class="release-date">Released: ${movie.releaseDate} (${movie.type.toUpperCase()})</p>
                        </div>
                        
                        <div style="margin: 8px 0;">
                            <label style="font-size: 12px; color: #bbb;">Playlist:</label>
                            <select onchange="changeMoviePlaylist(${globalIndex}, this.value)" style="background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px 5px; font-size: 12px; margin-left: 5px;">
                                ${playlists.map(pl => `<option value="${pl}" ${movie.playlist === pl ? 'selected' : ''}>${pl}</option>`).join('')}
                            </select>
                        </div>

                        <div class="card-actions">
                            <label class="checkbox-label">
                                <input type="checkbox" ${movie.watched ? 'checked' : ''} onchange="toggleWatched(${globalIndex})">
                                Watched
                            </label>
                            <div class="action-buttons">
                                <button class="btn-about" onclick="openAbout(${globalIndex})">About</button>
                                <button class="btn-delete" onclick="deleteMovie(${globalIndex})">Delete</button>
                            </div>
                        </div>
                    </div>
                `;

                grid.appendChild(card);
            });
        }
    });

    // Progress Bar Update
    const totalMovies = movies.length;
    const progressPercent = totalMovies === 0 ? 0 : Math.round((watchedCount / totalMovies) * 100);

    const progressText = document.getElementById("progressText");
    const progressBar = document.getElementById("progressBar");
    if (progressText) progressText.innerText = `${watchedCount} / ${totalMovies} Completed (${progressPercent}%)`;
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
}

// Change Playlist of an existing Movie
function changeMoviePlaylist(index, newPlaylist) {
    movies[index].playlist = newPlaylist;
    saveAndRefresh();
}

// Toggle watched status
function toggleWatched(index) {
    movies[index].watched = !movies[index].watched;
    saveAndRefresh();
}

// Delete item
function deleteMovie(index) {
    movies.splice(index, 1);
    saveAndRefresh();
}

// About Modal
function openAbout(index) {
    const movie = movies[index];
    document.getElementById("modalPoster").src = movie.poster;
    document.getElementById("modalTitle").innerText = movie.title;
    document.getElementById("modalYear").innerText = `Year: ${movie.year}`;
    document.getElementById("modalGenre").innerText = `• ${movie.genre}`;
    document.getElementById("modalRating").innerText = `⭐ ${movie.rating} IMDb`;
    document.getElementById("modalPlot").innerText = movie.plot;

    openModal("aboutModal");
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = "flex";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

window.onclick = function(event) {
    if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
    }
};
