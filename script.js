// Active API Keys
const API_KEY = "f8a4d404"; // Replace with your OMDb API Key
const WATCHMODE_API_KEY = "QE6qcae9K1XCNm9k3SvbDLcQDVZt4V30YvU5hk0Y"; // Replace with your Watchmode API Key
const REGION = "IN"; // Country code: 'IN' for India, 'US' for United States

// Application State Variables
let users = {};
let activeUser = null;
let movies = [];
let playlists = ["Unassigned"];
let selectedFilter = "All";

// Initial Setup Event Listener
document.addEventListener("DOMContentLoaded", () => {
    loadUsersFromStorage();
    populateLoginDropdown();
});

// Load Users from LocalStorage
function loadUsersFromStorage() {
    const savedUsers = localStorage.getItem("app_users_db");
    users = savedUsers ? JSON.parse(savedUsers) : {};
}

// Clear All Stored App Profiles and Data
function clearAllProfiles() {
    if (confirm("Are you sure you want to delete all saved profiles and watchlists? This action cannot be undone.")) {
        localStorage.clear();
        users = {};
        movies = [];
        playlists = ["Unassigned"];
        populateLoginDropdown();
        alert("All profiles and stored data have been reset.");
    }
}

// Populate Login Dropdown List
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
    const select = document.getElementById("loginUserSelect");
    const username = select ? select.value : null;
    const pin = document.getElementById("loginPinInput").value.trim();

    if (!username || !pin) {
        alert("Please select a profile and enter your 4-digit PIN.");
        return;
    }

    if (users[username] && users[username].pin === pin) {
        activeUser = username;
        document.getElementById("authScreen").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        document.getElementById("activeUserLabel").innerText = `User: ${activeUser}`;
        document.getElementById("welcomeTitle").innerText = `🎬 ${activeUser}'s Watchlist`;
        document.getElementById("loginPinInput").value = "";
        
        loadUserData();
    } else {
        alert("Incorrect PIN. Please try again.");
    }
}

// User Authentication: Delete Profile
function deleteSelectedProfile() {
    const select = document.getElementById("loginUserSelect");
    const selectedUsername = select ? select.value : null;

    if (!selectedUsername) {
        alert("No profile selected to delete.");
        return;
    }

    if (confirm(`Are you sure you want to delete the profile "${selectedUsername}" and all its saved movies/playlists?`)) {
        delete users[selectedUsername];
        localStorage.setItem("app_users_db", JSON.stringify(users));

        localStorage.removeItem(`watchlist_${selectedUsername}`);
        localStorage.removeItem(`playlists_${selectedUsername}`);

        populateLoginDropdown();
        alert(`Profile "${selectedUsername}" has been deleted.`);
    }
}

// Logout Action
function logout() {
    activeUser = null;
    movies = [];
    playlists = ["Unassigned"];
    selectedFilter = "All";
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
    populateLoginDropdown();
}

// Create New Profile
function registerUser() {
    const name = document.getElementById("regNameInput").value.trim();
    const pin = document.getElementById("regPinInput").value.trim();

    if (!name || pin.length !== 4 || isNaN(pin)) {
        alert("Please enter a valid profile name and a 4-digit numerical PIN.");
        return;
    }

    if (users[name]) {
        alert("A profile with this name already exists.");
        return;
    }

    users[name] = { pin: pin };
    localStorage.setItem("app_users_db", JSON.stringify(users));
    
    populateLoginDropdown();
    closeModal("registerModal");
    document.getElementById("regNameInput").value = "";
    document.getElementById("regPinInput").value = "";
    alert(`Profile "${name}" created successfully.`);
}

// Load Active User Movies and Playlists
function loadUserData() {
    const savedMovies = localStorage.getItem(`watchlist_${activeUser}`);
    movies = savedMovies ? JSON.parse(savedMovies) : [];

    const savedPlaylists = localStorage.getItem(`playlists_${activeUser}`);
    playlists = savedPlaylists ? JSON.parse(savedPlaylists) : ["Unassigned", "Comedy", "Action"];

    populatePlaylistDropdowns();
    renderGrid();
}

// Save State to LocalStorage
function saveAndRefresh() {
    localStorage.setItem(`watchlist_${activeUser}`, JSON.stringify(movies));
    localStorage.setItem(`playlists_${activeUser}`, JSON.stringify(playlists));
    populatePlaylistDropdowns();
    renderGrid();
}

// Create a Custom Playlist
function createPlaylist() {
    const playlistName = prompt("Enter new playlist/genre name:");
    if (!playlistName || !playlistName.trim()) return;

    const trimmedName = playlistName.trim();
    if (playlists.some(p => p.toLowerCase() === trimmedName.toLowerCase())) {
        alert("This playlist already exists.");
        return;
    }

    playlists.push(trimmedName);
    saveAndRefresh();
    alert(`Playlist "${trimmedName}" created successfully.`);
}

// Delete a Playlist
function deletePlaylist(playlistToDelete) {
    if (playlistToDelete === "Unassigned") {
        alert("The default 'Unassigned' playlist cannot be deleted.");
        return;
    }

    if (confirm(`Are you sure you want to delete the playlist "${playlistToDelete}"? Movies inside will be moved to 'Unassigned'.`)) {
        // Move assigned movies to 'Unassigned'
        movies.forEach(movie => {
            if (movie.playlist === playlistToDelete) {
                movie.playlist = "Unassigned";
            }
        });

        // Remove playlist from list
        playlists = playlists.filter(p => p !== playlistToDelete);

        if (selectedFilter === playlistToDelete) {
            selectedFilter = "All";
        }

        saveAndRefresh();
        alert(`Playlist "${playlistToDelete}" has been deleted.`);
    }
}

// Populate Playlist Dropdowns
function populatePlaylistDropdowns() {
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

// Handle Filter Selection Change
function handleFilterChange() {
    const filterSelect = document.getElementById("playlistFilterSelect");
    if (filterSelect) {
        selectedFilter = filterSelect.value;
        renderGrid();
    }
}

// Fetch Streaming Availability from Watchmode API
async function fetchStreamingProviders(imdbId) {
    if (!WATCHMODE_API_KEY || WATCHMODE_API_KEY === "YOUR_WATCHMODE_API_KEY") {
        return [];
    }

    try {
        const url = `https://api.watchmode.com/v1/title/${imdbId}/sources/?apiKey=${WATCHMODE_API_KEY}&regions=${REGION}`;
        const response = await fetch(url);
        const sources = await response.json();

        if (!Array.isArray(sources)) return [];

        const uniqueProviders = [];
        const seenNames = new Set();

        sources.forEach(source => {
            if ((source.type === "sub" || source.type === "free") && !seenNames.has(source.name)) {
                seenNames.add(source.name);
                uniqueProviders.push(source.name);
            }
        });

        return uniqueProviders;
    } catch (error) {
        console.error("Error fetching Watchmode data:", error);
        return [];
    }
}

// Add Movie to Watchlist via OMDb and Watchmode APIs
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
            alert("Title not found in the database. Try refining your query.");
            return;
        }

        const isDuplicate = movies.some(item => item.imdbID === data.imdbID);
        if (isDuplicate) {
            alert("This title is already in your watchlist.");
            return;
        }

        // Secondary Fetch for Streaming Providers
        const streamingProviders = await fetchStreamingProviders(data.imdbID);

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
            ottProviders: streamingProviders,
            watched: false,
            addedAt: Date.now()
        };

        movies.unshift(movieData);
        saveAndRefresh();

        document.getElementById("movieInput").value = "";
        document.getElementById("yearInput").value = "";
        document.getElementById("typeInput").value = "";
    } catch (error) {
        alert("Network error. Unable to fetch movie details.");
    }
}

// Keypress Listener for Enter
function handleKeyPress(event) {
    if (event.key === "Enter") addMovie();
}

// Render Dashboard Grid Items with Playlist Header Controls & OTT Badges
function renderGrid() {
    const grid = document.getElementById("movieGrid");
    grid.innerHTML = "";

    // Sort: Unwatched movies first (false), Watched movies last (true)
    movies.sort((a, b) => {
        if (a.watched === b.watched) {
            return (b.addedAt || 0) - (a.addedAt || 0);
        }
        return a.watched - b.watched;
    });

    let watchedCount = 0;
    movies.forEach(m => { if (m.watched) watchedCount++; });

    let playlistsToDisplay = selectedFilter === "All" ? playlists : [selectedFilter];

    playlistsToDisplay.forEach(playlistName => {
        const playlistMovies = movies.filter(m => (m.playlist || "Unassigned") === playlistName);

        if (playlistMovies.length > 0 || selectedFilter !== "All") {
            const sectionHeader = document.createElement("div");
            sectionHeader.className = "playlist-section-header";
            
            const isDeletable = playlistName !== "Unassigned";
            const deleteButtonHtml = isDeletable 
                ? `<button class="btn-delete" style="padding: 2px 8px; font-size: 11px;" onclick="deletePlaylist('${playlistName}')">Delete Playlist</button>` 
                : '';

            sectionHeader.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>📁 ${playlistName} <span class="playlist-count">(${playlistMovies.length} items)</span></h2>
                    ${deleteButtonHtml}
                </div>
            `;
            grid.appendChild(sectionHeader);

            playlistMovies.forEach((movie) => {
                const globalIndex = movies.findIndex(m => m.imdbID === movie.imdbID);

                const ottBadges = (movie.ottProviders && movie.ottProviders.length > 0)
                    ? movie.ottProviders.map(provider => `<span class="ott-badge">${provider}</span>`).join(" ")
                    : `<span class="ott-badge-none">Not Streaming</span>`;

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
                            <div class="ott-container">
                                <small>Available on:</small>
                                <div class="ott-badges-wrapper">${ottBadges}</div>
                            </div>
                        </div>
                        
                        <div class="playlist-selector">
                            <label>Playlist:</label>
                            <select onchange="changeMoviePlaylist(${globalIndex}, this.value)">
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

    // Update Progress Indicator
    const totalMovies = movies.length;
    const progressPercent = totalMovies === 0 ? 0 : Math.round((watchedCount / totalMovies) * 100);

    const progressText = document.getElementById("progressText");
    const progressBar = document.getElementById("progressBar");
    if (progressText) progressText.innerText = `${watchedCount} / ${totalMovies} Completed (${progressPercent}%)`;
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
}

// Re-assign Movie Playlist
function changeMoviePlaylist(index, newPlaylist) {
    movies[index].playlist = newPlaylist;
    saveAndRefresh();
}

// Toggle Watched Status
function toggleWatched(index) {
    movies[index].watched = !movies[index].watched;
    saveAndRefresh();
}

// Remove Item from Watchlist
function deleteMovie(index) {
    movies.splice(index, 1);
    saveAndRefresh();
}

// Display Movie Information Modal
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

// Modal Handlers
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
