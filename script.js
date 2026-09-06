// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBE_9UuuWsiIPlxHLIFI0LegMxAzsrYeH0",
    authDomain: "movie-tracker-96549.firebaseapp.com",
    databaseURL: "https://movie-tracker-96549-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "movie-tracker-96549",
    storageBucket: "movie-tracker-96549.firebasestorage.app",
    messagingSenderId: "691062858006",
    appId: "1:691062858006:web:f3e207d973fe7aee64f037",
    measurementId: "G-C13XJBKGHV"
};

// API Keys configuration
const OMDB_API_KEY = "f8a4d404"; 
const WATCHMODE_API_KEY = "QE6qcae9K1XCNm9k3SvbDLcQDVZt4V30YvU5hk0Y";

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// State Variables
let users = {};
let activeUser = null;
let watchlist = [];
let userPlaylists = ["Default"];
let customModalResolver = null;

document.addEventListener("DOMContentLoaded", () => {
    loadUsersFromStorage();
});

// Custom Center Dialog Pop-Up System
function showCustomDialog({ title, desc, showInput = false, placeholder = "Enter PIN...", isPassword = true }) {
    return new Promise((resolve) => {
        customModalResolver = resolve;
        
        document.getElementById("customModalTitle").innerText = title;
        document.getElementById("customModalDesc").innerText = desc || "";
        
        const inputField = document.getElementById("customModalInput");
        const cancelBtn = document.getElementById("customModalCancelBtn");

        if (showInput) {
            inputField.style.display = "block";
            inputField.value = "";
            inputField.placeholder = placeholder;
            inputField.type = isPassword ? "password" : "text";
            cancelBtn.style.display = "inline-block";
            setTimeout(() => inputField.focus(), 100);
        } else {
            inputField.style.display = "none";
            cancelBtn.style.display = "none";
        }

        openModal("customModal");
    });
}

function closeCustomModal(confirmed) {
    const inputField = document.getElementById("customModalInput");
    const val = inputField.value.trim();
    closeModal("customModal");

    if (customModalResolver) {
        if (!confirmed) {
            customModalResolver(null);
        } else {
            customModalResolver(inputField.style.display !== "none" ? val : true);
        }
        customModalResolver = null;
    }
}

// Load Profiles from Database
function loadUsersFromStorage() {
    db.ref("users").on("value", (snapshot) => {
        users = snapshot.val() || {};
        populateLoginDropdown();
    });
}

function populateLoginDropdown() {
    const select = document.getElementById("loginUserSelect");
    const loginFormContainer = document.getElementById("loginFormContainer");
    const noProfilesMsg = document.getElementById("noProfilesMsg");

    if (!select) return;

    select.innerHTML = "";
    const usernameList = Object.keys(users);

    if (usernameList.length === 0) {
        if (loginFormContainer) loginFormContainer.style.display = "none";
        if (noProfilesMsg) noProfilesMsg.style.display = "block";
    } else {
        if (loginFormContainer) loginFormContainer.style.display = "flex";
        if (noProfilesMsg) noProfilesMsg.style.display = "none";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "-- Select Profile --";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        usernameList.forEach(username => {
            const option = document.createElement("option");
            option.value = username;
            option.textContent = username;
            select.appendChild(option);
        });
    }
}

// User Login Function
async function login() {
    const select = document.getElementById("loginUserSelect");
    const username = select ? select.value : null;
    const pinInput = document.getElementById("loginPinInput").value.trim();

    if (!username || !pinInput) {
        await showCustomDialog({ title: "Action Required", desc: "Please select a profile and enter your 4-digit PIN." });
        return;
    }

    if (users[username] && String(users[username].pin) === String(pinInput)) {
        activeUser = username;
        document.getElementById("authScreen").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        
        document.getElementById("activeUserLabel").innerText = `User: ${activeUser}`;
        document.getElementById("loginPinInput").value = "";
        
        updateWelcomeTitle();
        loadUserData();
    } else {
        await showCustomDialog({ title: "Access Denied", desc: "Incorrect PIN. Please try again." });
    }
}

// Register Profile
async function registerUser() {
    const nameInput = document.getElementById("regNameInput");
    const pinInput = document.getElementById("regPinInput");

    const name = nameInput.value.trim();
    const pin = pinInput.value.trim();

    if (!name || pin.length !== 4 || isNaN(pin)) {
        await showCustomDialog({ title: "Invalid Input", desc: "Please enter a valid name and 4-digit PIN." });
        return;
    }

    if (users[name]) {
        await showCustomDialog({ title: "Error", desc: "Profile already exists!" });
        return;
    }

    db.ref("users/" + name).set({ pin: String(pin), playlists: ["Default"] })
        .then(async () => {
            closeModal("registerModal");
            nameInput.value = "";
            pinInput.value = "";
            await showCustomDialog({ title: "Success", desc: `Profile "${name}" created successfully!` });
        })
        .catch(async (error) => {
            await showCustomDialog({ title: "Firebase Error", desc: error.message });
        });
}

// Change PIN
async function handleChangePinModal() {
    if (!activeUser) return;

    const currentPin = await showCustomDialog({
        title: "Verify Current PIN",
        desc: "Enter your current 4-Digit PIN to continue:",
        showInput: true,
        placeholder: "Current PIN"
    });

    if (currentPin === null) return;

    if (String(users[activeUser].pin) !== String(currentPin.trim())) {
        await showCustomDialog({ title: "Error", desc: "Current PIN is incorrect!" });
        return;
    }

    const newPin = await showCustomDialog({
        title: "Set New PIN",
        desc: "Enter your NEW 4-Digit PIN:",
        showInput: true,
        placeholder: "New 4-Digit PIN"
    });

    if (newPin === null) return;

    if (newPin.length !== 4 || isNaN(newPin)) {
        await showCustomDialog({ title: "Error", desc: "PIN must be a 4-digit number!" });
        return;
    }

    db.ref("users/" + activeUser + "/pin").set(String(newPin))
        .then(async () => {
            await showCustomDialog({ title: "Success", desc: "Your PIN has been updated!" });
        })
        .catch(async (error) => {
            await showCustomDialog({ title: "Error", desc: error.message });
        });
}

// Delete Profile
async function handleDeleteProfile() {
    const select = document.getElementById("loginUserSelect");
    const username = select ? select.value : null;

    if (!username) {
        await showCustomDialog({ title: "Select Profile", desc: "Please select a profile to delete." });
        return;
    }

    const confirmPin = await showCustomDialog({
        title: "Delete Profile",
        desc: `Enter PIN for "${username}" to delete:`,
        showInput: true,
        placeholder: "4-Digit PIN"
    });

    if (confirmPin === null) return;

    if (String(users[username].pin) === String(confirmPin.trim())) {
        db.ref("users/" + username).remove();
        db.ref("watchlists/" + username).remove();
        await showCustomDialog({ title: "Deleted", desc: `Profile "${username}" removed.` });
    } else {
        await showCustomDialog({ title: "Error", desc: "Incorrect PIN." });
    }
}

// Reset Database Data
async function handleClearAllProfiles() {
    const confirmation = await showCustomDialog({
        title: "Danger Zone",
        desc: "Type 'RESET' to wipe all profiles:",
        showInput: true,
        placeholder: "Type RESET",
        isPassword: false
    });

    if (confirmation === "RESET") {
        db.ref().remove()
            .then(async () => await showCustomDialog({ title: "Wiped", desc: "All data cleared successfully." }))
            .catch(async (err) => await showCustomDialog({ title: "Error", desc: err.message }));
    }
}

// Watchlist & Playlist Load
function loadUserData() {
    if (!activeUser) return;

    // Load User Playlists
    db.ref("users/" + activeUser + "/playlists").on("value", (snapshot) => {
        userPlaylists = snapshot.val() || ["Default"];
        updatePlaylistDropdowns();
    });

    // Load Watchlist Data
    db.ref("watchlists/" + activeUser).on("value", (snapshot) => {
        watchlist = snapshot.val() || [];
        updateWelcomeTitle();
        renderWatchlist();
    });
}

// Update Header Title with Active User Profile
function updateWelcomeTitle() {
    const welcomeTitle = document.getElementById("welcomeTitle");
    if (!welcomeTitle) return;

    if (activeUser) {
        welcomeTitle.innerText = `${activeUser.toUpperCase()}'S WATCHLIST`;
    } else {
        welcomeTitle.innerText = "MOVIE WATCHLIST";
    }
}

// Populate Playlists Dropdowns
function updatePlaylistDropdowns() {
    const addSelect = document.getElementById("addPlaylistSelect");
    const filterSelect = document.getElementById("playlistFilterSelect");

    if (addSelect) {
        addSelect.innerHTML = "";
        userPlaylists.forEach(pl => {
            const opt = document.createElement("option");
            opt.value = pl;
            opt.textContent = pl;
            addSelect.appendChild(opt);
        });
    }

    if (filterSelect) {
        const currentFilter = filterSelect.value || "All";
        filterSelect.innerHTML = `<option value="All">All Playlists</option>`;
        userPlaylists.forEach(pl => {
            const opt = document.createElement("option");
            opt.value = pl;
            opt.textContent = pl;
            filterSelect.appendChild(opt);
        });
        filterSelect.value = currentFilter;
    }
}

// Create New Playlist Function
async function createPlaylist() {
    if (!activeUser) return;

    const playlistName = await showCustomDialog({
        title: "New Playlist",
        desc: "Enter a name for your new playlist:",
        showInput: true,
        placeholder: "e.g. Action Movies",
        isPassword: false
    });

    if (!playlistName || !playlistName.trim()) return;

    const trimmedName = playlistName.trim();
    if (userPlaylists.includes(trimmedName)) {
        await showCustomDialog({ title: "Error", desc: "Playlist with this name already exists!" });
        return;
    }

    userPlaylists.push(trimmedName);
    db.ref("users/" + activeUser + "/playlists").set(userPlaylists)
        .then(async () => {
            await showCustomDialog({ title: "Success", desc: `Playlist "${trimmedName}" created!` });
        })
        .catch(async (err) => {
            await showCustomDialog({ title: "Error", desc: err.message });
        });
}

// Delete Active/Selected Playlist Function
async function deletePlaylist() {
    if (!activeUser) return;

    const filterSelect = document.getElementById("playlistFilterSelect");
    const currentFilter = filterSelect ? filterSelect.value : "All";

    if (currentFilter === "All" || currentFilter === "Default") {
        await showCustomDialog({ title: "Action Denied", desc: "You cannot delete 'All' or 'Default' playlist." });
        return;
    }

    const confirmDelete = await showCustomDialog({
        title: "Delete Playlist",
        desc: `Are you sure you want to delete "${currentFilter}"? Movies in this playlist will move to 'Default'. Type DELETE to confirm:`,
        showInput: true,
        placeholder: "Type DELETE",
        isPassword: false
    });

    if (confirmDelete !== "DELETE") return;

    watchlist = watchlist.map(item => {
        if (item.playlist === currentFilter) {
            return { ...item, playlist: "Default" };
        }
        return item;
    });

    userPlaylists = userPlaylists.filter(pl => pl !== currentFilter);

    db.ref("users/" + activeUser + "/playlists").set(userPlaylists);
    db.ref("watchlists/" + activeUser).set(watchlist)
        .then(async () => {
            filterSelect.value = "All";
            renderWatchlist();
            await showCustomDialog({ title: "Deleted", desc: `Playlist "${currentFilter}" removed successfully.` });
        })
        .catch(async (err) => {
            await showCustomDialog({ title: "Error", desc: err.message });
        });
}

// Filter View Change Event
function handleFilterChange() {
    renderWatchlist();
}

// Change Movie Playlist Function
function changeMoviePlaylist(originalIndex, newPlaylist) {
    if (!activeUser) return;
    watchlist[originalIndex].playlist = newPlaylist;
    db.ref("watchlists/" + activeUser).set(watchlist);
}

// OMDb API Fetch Function (Uses IMDb ID direct query if available for maximum accuracy)
async function fetchFromOMDb(title, year = "", type = "") {
    try {
        let url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}`;
        if (year) url += `&y=${year}`;
        if (type) url += `&type=${type}`;

        const res = await fetch(url);
        const data = await res.json();
        
        if (data.Response === "True") {
            // Fetch detailed response by ID to get totalSeasons reliably
            if (data.imdbID) {
                const detailedRes = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${data.imdbID}`);
                const detailedData = await detailedRes.json();
                if (detailedData.Response === "True") return detailedData;
            }
            return data;
        }
        return null;
    } catch (err) {
        console.error("OMDb API Fetch Error:", err);
        return null;
    }
}

// Fast and Precise Total Series Calculation
async function getSeriesTotalRuntime(imdbID, totalSeasons, avgEpRuntime) {
    const seasons = parseInt(totalSeasons, 10);
    const epMins = getRuntimeInMinutes(avgEpRuntime) || 50; // Standard TV ep duration fallback

    if (!imdbID || isNaN(seasons) || seasons <= 0) {
        return avgEpRuntime || "N/A";
    }

    try {
        let seasonPromises = [];
        for (let s = 1; s <= seasons; s++) {
            seasonPromises.push(
                fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}&Season=${s}`).then(r => r.json())
            );
        }

        const seasonResults = await Promise.all(seasonPromises);
        let totalEpisodes = 0;

        seasonResults.forEach(sData => {
            if (sData && sData.Response === "True" && Array.isArray(sData.Episodes)) {
                totalEpisodes += sData.Episodes.length;
            }
        });

        if (totalEpisodes > 0) {
            const calculatedTotalMins = totalEpisodes * epMins;
            return `${calculatedTotalMins} min (${totalEpisodes} eps)`;
        }
    } catch (err) {
        console.error("Error fetching season episodes:", err);
    }

    return avgEpRuntime || "N/A";
}

// Watchmode API Fetch Function
async function fetchStreamingSources(imdbID) {
    if (!imdbID || imdbID === "N/A" || !WATCHMODE_API_KEY) {
        return [];
    }

    try {
        const url = `https://api.watchmode.com/v1/title/${imdbID}/sources/?apiKey=${WATCHMODE_API_KEY}`;
        const res = await fetch(url);
        const sources = await res.json();
        return Array.isArray(sources) ? sources : [];
    } catch (err) {
        console.error("Watchmode API Fetch Error:", err);
        return [];
    }
}

// Helper function to extract numeric runtime in minutes
function getRuntimeInMinutes(runtimeStr) {
    if (!runtimeStr || runtimeStr === "N/A") return 0;
    const match = runtimeStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

// Add Movie with Duplicate Check
async function addMovie() {
    const input = document.getElementById("movieInput");
    const yearInput = document.getElementById("yearInput");
    const typeInput = document.getElementById("typeInput");
    const playlistSelect = document.getElementById("addPlaylistSelect");

    if (!input || !input.value.trim()) return;

    const title = input.value.trim();
    const year = yearInput ? yearInput.value.trim() : "";
    const type = typeInput ? typeInput.value : "";
    const playlist = playlistSelect ? playlistSelect.value : "Default";

    const isAlreadyAdded = watchlist.some(movie => 
        movie.Title.toLowerCase() === title.toLowerCase()
    );

    if (isAlreadyAdded) {
        await showCustomDialog({ 
            title: "Already Added!", 
            desc: `"${title}" is already in your watchlist.` 
        });
        input.value = "";
        if (yearInput) yearInput.value = "";
        return;
    }

    let omdbData = await fetchFromOMDb(title, year, type);

    if (omdbData) {
        const isOfficialTitleAdded = watchlist.some(movie => 
            movie.Title.toLowerCase() === omdbData.Title.toLowerCase() || 
            (movie.imdbID !== "N/A" && movie.imdbID === omdbData.imdbID)
        );

        if (isOfficialTitleAdded) {
            await showCustomDialog({ 
                title: "Already Added!", 
                desc: `"${omdbData.Title}" is already present in your watchlist.` 
            });
            input.value = "";
            if (yearInput) yearInput.value = "";
            return;
        }
    }

    let newMovie = {
        Title: title,
        Year: year || "N/A",
        Released: "N/A",
        Type: type || "movie",
        Poster: "https://via.placeholder.com/300x450?text=" + encodeURIComponent(title),
        imdbRating: "N/A",
        imdbID: "N/A",
        Runtime: "N/A",
        streamingSources: [],
        watched: false,
        playlist: playlist
    };

    if (omdbData) {
        newMovie.Title = omdbData.Title;
        newMovie.Year = omdbData.Year;
        newMovie.Released = omdbData.Released || omdbData.Year || "N/A";
        newMovie.Type = omdbData.Type;
        newMovie.Poster = omdbData.Poster !== "N/A" ? omdbData.Poster : newMovie.Poster;
        newMovie.imdbRating = omdbData.imdbRating;
        newMovie.imdbID = omdbData.imdbID;

        if (omdbData.Type === "series" && omdbData.totalSeasons) {
            newMovie.Runtime = await getSeriesTotalRuntime(omdbData.imdbID, omdbData.totalSeasons, omdbData.Runtime);
        } else {
            newMovie.Runtime = omdbData.Runtime || "N/A";
        }

        if (omdbData.imdbID) {
            newMovie.streamingSources = await fetchStreamingSources(omdbData.imdbID);
        }
    }

    watchlist.push(newMovie);
    db.ref("watchlists/" + activeUser).set(watchlist);

    input.value = "";
    if (yearInput) yearInput.value = "";
}

// Render HTML Movie Card Element
function renderMovieCard(item) {
    let playlistOptions = userPlaylists.map(pl => 
        `<option value="${pl}" ${(item.playlist || "Default") === pl ? 'selected' : ''}>${pl}</option>`
    ).join("");

    let streamingUI = "";
    if (item.streamingSources && item.streamingSources.length > 0) {
        const topSources = item.streamingSources.slice(0, 2);
        streamingUI = `<div class="streaming-info">
            <small>Available on: ${topSources.map(s => `<a href="${s.web_url}" target="_blank" style="color: #00d2ff;">${s.name}</a>`).join(", ")}</small>
        </div>`;
    }

    const runtimeDisplay = item.Runtime && item.Runtime !== "N/A" ? item.Runtime : "Runtime: N/A";
    const releaseDateDisplay = (item.Released && item.Released !== "N/A") ? item.Released : (item.Year || "N/A");

    const card = document.createElement("div");
    card.className = `movie-card ${item.watched ? 'watched' : ''}`;
    card.innerHTML = `
        <div class="poster-wrapper">
            <img src="${item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${item.Title}">
            <span class="imdb-tag">⭐ ${item.imdbRating || 'N/A'}</span>
        </div>
        <div class="card-content">
            <h3 class="movie-title">${item.Title}</h3>
            <span class="release-date">${releaseDateDisplay} | ${item.Type || 'movie'}</span>
            <span class="runtime-info">⏱️ ${runtimeDisplay}</span>
            
            ${streamingUI}

            <div class="playlist-selector">
                <span>Playlist:</span>
                <select onchange="changeMoviePlaylist(${item.originalIndex}, this.value)">
                    ${playlistOptions}
                </select>
            </div>

            <div class="card-actions">
                <label class="checkbox-label">
                    <input type="checkbox" ${item.watched ? 'checked' : ''} onchange="toggleWatched(${item.originalIndex})"> Watched
                </label>
                <button class="btn-delete" onclick="removeFromWatchlist(${item.originalIndex})">Remove</button>
            </div>
        </div>
    `;
    return card;
}

// Render Watchlist with Grouped View in 'All'
function renderWatchlist() {
    const grid = document.getElementById("movieGrid");
    const filterSelect = document.getElementById("playlistFilterSelect");
    const sectionTitle = document.getElementById("playlistSectionTitle");
    const selectedFilter = filterSelect ? filterSelect.value : "All";

    if (!grid) return;

    if (sectionTitle) {
        if (selectedFilter === "All") {
            sectionTitle.innerText = "ALL MOVIES";
        } else {
            sectionTitle.innerText = selectedFilter.toUpperCase();
        }
    }

    grid.innerHTML = "";

    let mappedList = watchlist.map((item, index) => ({ ...item, originalIndex: index }));

    if (mappedList.length === 0) {
        grid.innerHTML = `<p style="color: #a3a3a3; text-align: center; grid-column: 1/-1; padding: 20px;">No movies found in your watchlist.</p>`;
        updateProgressBar(0, 0, 0);
        return;
    }

    let totalWatched = 0;
    let totalItems = 0;
    let totalMinutesWatched = 0;

    if (selectedFilter === "All") {
        userPlaylists.forEach(pl => {
            let plMovies = mappedList.filter(item => (item.playlist || "Default") === pl);
            if (plMovies.length > 0) {
                const groupHeader = document.createElement("div");
                groupHeader.style.gridColumn = "1 / -1";
                groupHeader.style.margin = "20px 0 10px 0";
                groupHeader.style.paddingBottom = "5px";
                groupHeader.style.borderBottom = "2px solid #334155";
                groupHeader.style.color = "#38bdf8";
                groupHeader.style.fontSize = "1.2rem";
                groupHeader.innerText = `${pl.toUpperCase()} (${plMovies.length})`;
                grid.appendChild(groupHeader);

                plMovies.sort((a, b) => Number(a.watched) - Number(b.watched));

                plMovies.forEach(item => {
                    if (item.watched) {
                        totalWatched++;
                        totalMinutesWatched += getRuntimeInMinutes(item.Runtime);
                    }
                    totalItems++;
                    grid.appendChild(renderMovieCard(item));
                });
            }
        });
    } else {
        let filteredWatchlist = mappedList.filter(item => (item.playlist || "Default") === selectedFilter);

        if (filteredWatchlist.length === 0) {
            grid.innerHTML = `<p style="color: #a3a3a3; text-align: center; grid-column: 1/-1; padding: 20px;">No movies found in this playlist.</p>`;
            updateProgressBar(0, 0, 0);
            return;
        }

        filteredWatchlist.sort((a, b) => Number(a.watched) - Number(b.watched));

        filteredWatchlist.forEach((item) => {
            if (item.watched) {
                totalWatched++;
                totalMinutesWatched += getRuntimeInMinutes(item.Runtime);
            }
            totalItems++;
            grid.appendChild(renderMovieCard(item));
        });
    }

    updateProgressBar(totalWatched, totalItems, totalMinutesWatched);
}

function toggleWatched(originalIndex) {
    if (!activeUser) return;
    watchlist[originalIndex].watched = !watchlist[originalIndex].watched;
    db.ref("watchlists/" + activeUser).set(watchlist);
}

function updateProgressBar(watched, total, totalMinutes) {
    const totalTitlesEl = document.getElementById("statTotalTitles");
    const watchedTitlesEl = document.getElementById("statWatchedTitles");
    const watchTimeEl = document.getElementById("statWatchTime");
    const progressPercentageEl = document.getElementById("progressPercentage");
    const bar = document.getElementById("progressBar");

    const hours = (totalMinutes / 60).toFixed(1);
    const percentage = total > 0 ? Math.round((watched / total) * 100) : 0;

    if (totalTitlesEl) totalTitlesEl.innerText = total;
    if (watchedTitlesEl) watchedTitlesEl.innerText = watched;
    if (watchTimeEl) watchTimeEl.innerText = hours;
    if (progressPercentageEl) progressPercentageEl.innerText = `${percentage}%`;
    if (bar) bar.style.width = `${percentage}%`;
}

function removeFromWatchlist(originalIndex) {
    if (!activeUser) return;
    watchlist.splice(originalIndex, 1);
    db.ref("watchlists/" + activeUser).set(watchlist);
}

function handleKeyPress(e) {
    if (e.key === 'Enter') addMovie();
}

function logout() {
    if (activeUser) {
        db.ref("watchlists/" + activeUser).off();
        db.ref("users/" + activeUser + "/playlists").off();
    }
    activeUser = null;
    watchlist = [];
    userPlaylists = ["Default"];
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "flex";
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}
