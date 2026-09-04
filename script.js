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

// Load Profiles
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

// Login
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
        document.getElementById("welcomeTitle").innerText = `🎬 ${activeUser}'s Watchlist`;

        document.getElementById("loginPinInput").value = "";
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
            await showCustomDialog({ title: "Success 🎉", desc: `Profile "${name}" created successfully!` });
        })
        .catch(async (error) => {
            await showCustomDialog({ title: "Firebase Error", desc: error.message });
        });
}

// Change PIN
async function handleChangePinModal() {
    if (!activeUser) return;

    const currentPin = await showCustomDialog({
        title: "🔑 Verify Current PIN",
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
        title: "🔑 Set New PIN",
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
        title: "🗑️ Delete Profile",
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
        title: "⚠️ Danger Zone",
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
        renderWatchlist();
    });
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
        title: "📁 New Playlist",
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
            await showCustomDialog({ title: "Success 🎉", desc: `Playlist "${trimmedName}" created!` });
        })
        .catch(async (err) => {
            await showCustomDialog({ title: "Error", desc: err.message });
        });
}

// Filter View Change
function handleFilterChange() {
    renderWatchlist();
}

// Change Movie Playlist Function
function changeMoviePlaylist(index, newPlaylist) {
    if (!activeUser) return;
    watchlist[index].playlist = newPlaylist;
    db.ref("watchlists/" + activeUser).set(watchlist);
}

// Add Movie with Playlist Support
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

    // Dummy Movie Object (OMDb/API integrate karte waqt poster aur imdbRating update kar sakte ho)
    const newMovie = {
        Title: title,
        Year: year || "N/A",
        Type: type || "movie",
        Poster: "https://via.placeholder.com/300x450?text=" + encodeURIComponent(title),
        imdbRating: "N/A",
        watched: false,
        playlist: playlist
    };

    watchlist.push(newMovie);
    db.ref("watchlists/" + activeUser).set(watchlist);

    input.value = "";
    if (yearInput) yearInput.value = "";
}

// Render Watchlist with Filtering
function renderWatchlist() {
    const grid = document.getElementById("movieGrid");
    const filterSelect = document.getElementById("playlistFilterSelect");
    const selectedFilter = filterSelect ? filterSelect.value : "All";

    if (!grid) return;

    grid.innerHTML = "";

    const filteredWatchlist = watchlist.filter(item => {
        if (selectedFilter === "All") return true;
        return (item.playlist || "Default") === selectedFilter;
    });

    if (filteredWatchlist.length === 0) {
        grid.innerHTML = `<p style="color: #a3a3a3; text-align: center; grid-column: 1/-1;">No movies found in this playlist.</p>`;
        updateProgressBar(0, 0);
        return;
    }

    let watchedCount = 0;

    watchlist.forEach((item, originalIndex) => {
        const itemPlaylist = item.playlist || "Default";
        if (selectedFilter !== "All" && itemPlaylist !== selectedFilter) return;

        if (item.watched) watchedCount++;

        // Generate Playlist Dropdown Options for Cards
        let playlistOptions = userPlaylists.map(pl => 
            `<option value="${pl}" ${itemPlaylist === pl ? 'selected' : ''}>${pl}</option>`
        ).join("");

        const card = document.createElement("div");
        card.className = `movie-card ${item.watched ? 'watched' : ''}`;
        card.innerHTML = `
            <div class="poster-wrapper">
                <img src="${item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${item.Title}">
                <span class="imdb-tag">⭐ ${item.imdbRating || 'N/A'}</span>
            </div>
            <div class="card-content">
                <h3 class="movie-title">${item.Title}</h3>
                <span class="release-date">${item.Year} | ${item.Type || 'movie'}</span>
                
                <div class="playlist-selector">
                    <span>Playlist:</span>
                    <select onchange="changeMoviePlaylist(${originalIndex}, this.value)">
                        ${playlistOptions}
                    </select>
                </div>

                <div class="card-actions">
                    <label class="checkbox-label">
                        <input type="checkbox" ${item.watched ? 'checked' : ''} onchange="toggleWatched(${originalIndex})"> Watched
                    </label>
                    <button class="btn-delete" onclick="removeFromWatchlist(${originalIndex})">Remove</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    updateProgressBar(watchedCount, filteredWatchlist.length);
}

function toggleWatched(index) {
    if (!activeUser) return;
    watchlist[index].watched = !watchlist[index].watched;
    db.ref("watchlists/" + activeUser).set(watchlist);
}

function updateProgressBar(watched, total) {
    const text = document.getElementById("progressText");
    const bar = document.getElementById("progressBar");
    if (!text || !bar) return;

    const percentage = total > 0 ? Math.round((watched / total) * 100) : 0;
    text.innerText = `${watched} / ${total} Completed (${percentage}%)`;
    bar.style.width = `${percentage}%`;
}

function removeFromWatchlist(index) {
    if (!activeUser) return;
    watchlist.splice(index, 1);
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
