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

// API Keys
const OMDB_API_KEY = "f8a4d404";
const WATCHMODE_API_KEY = "QE6qcae9K1XCNm9k3SvbDLcQDVZt4V30YvU5hk0Y";

// App State
let users = {};
let activeUser = null;
let watchlist = [];

// DOM Initializer
document.addEventListener("DOMContentLoaded", () => {
    loadUsersFromStorage();
});

// Load All Profiles Real-time from Firebase
function loadUsersFromStorage() {
    db.ref("users").on("value", (snapshot) => {
        users = snapshot.val() || {};
        populateLoginDropdown();
    });
}

// Populate Profile Selection Dropdown
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

// Login Function
function login() {
    const select = document.getElementById("loginUserSelect");
    const username = select ? select.value : null;
    const pinInput = document.getElementById("loginPinInput").value.trim();

    if (!username || !pinInput) {
        alert("Please select a profile and enter your 4-digit PIN.");
        return;
    }

    if (users[username] && String(users[username].pin) === String(pinInput)) {
        activeUser = username;
        document.getElementById("authScreen").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        
        const activeUserLabel = document.getElementById("activeUserLabel");
        if (activeUserLabel) activeUserLabel.innerText = `User: ${activeUser}`;
        
        const welcomeTitle = document.getElementById("welcomeTitle");
        if (welcomeTitle) welcomeTitle.innerText = `🎬 ${activeUser}'s Watchlist`;

        document.getElementById("loginPinInput").value = "";
        
        loadUserData();
    } else {
        alert("Incorrect PIN. Please try again.");
    }
}

// Register New User
function registerUser() {
    const nameInput = document.getElementById("regNameInput");
    const pinInput = document.getElementById("regPinInput");

    if (!nameInput || !pinInput) return;

    const name = nameInput.value.trim();
    const pin = pinInput.value.trim();

    if (!name || pin.length !== 4 || isNaN(pin)) {
        alert("Please enter a valid profile name and a 4-digit PIN.");
        return;
    }

    if (users[name]) {
        alert("A profile with this name already exists!");
        return;
    }

    db.ref("users/" + name).set({
        pin: String(pin)
    }).then(() => {
        closeModal("registerModal");
        nameInput.value = "";
        pinInput.value = "";
        alert(`Profile "${name}" created successfully!`);
    }).catch((error) => {
        console.error("Firebase write error:", error);
        alert("Firebase error: " + error.message);
    });
}

// Change PIN Functionality
function changePin() {
    if (!activeUser) {
        alert("No active session found. Please login first.");
        return;
    }

    const currentPinInput = prompt("Enter your current 4-Digit PIN:");
    if (currentPinInput === null) return;

    if (String(users[activeUser].pin) !== String(currentPinInput.trim())) {
        alert("Current PIN is incorrect!");
        return;
    }

    const newPinInput = prompt("Enter your NEW 4-Digit PIN:");
    if (newPinInput === null) return;

    const newPin = newPinInput.trim();
    if (newPin.length !== 4 || isNaN(newPin)) {
        alert("PIN must be a 4-digit number!");
        return;
    }

    db.ref("users/" + activeUser + "/pin").set(String(newPin))
        .then(() => {
            alert("PIN updated successfully!");
        })
        .catch((error) => {
            console.error("Error updating PIN:", error);
            alert("Failed to update PIN: " + error.message);
        });
}

// Delete Single Profile
function deleteProfile() {
    const select = document.getElementById("loginUserSelect");
    const username = select ? select.value : null;

    if (!username) {
        alert("Please select a profile to delete.");
        return;
    }

    const confirmPin = prompt(`Enter PIN for "${username}" to confirm deletion:`);
    if (!confirmPin) return;

    if (String(users[username].pin) === String(confirmPin.trim())) {
        if (confirm(`Are you sure you want to delete profile "${username}" and all its watchlist data?`)) {
            db.ref("users/" + username).remove();
            db.ref("watchlists/" + username).remove();
            alert(`Profile "${username}" deleted.`);
        }
    } else {
        alert("Incorrect PIN. Deletion cancelled.");
    }
}

// Reset All Database Data
function clearAllProfiles() {
    const masterConfirmation = prompt("Type 'RESET' to delete all profiles and watchlists permanently:");
    if (masterConfirmation === "RESET") {
        db.ref().remove()
            .then(() => alert("All application data has been wiped."))
            .catch((err) => alert("Failed to reset: " + err.message));
    }
}

// Load Active User's Watchlist
function loadUserData() {
    if (!activeUser) return;

    db.ref("watchlists/" + activeUser).on("value", (snapshot) => {
        watchlist = snapshot.val() || [];
        renderWatchlist();
    });
}

// Render Watchlist Grid UI
function renderWatchlist() {
    const grid = document.getElementById("movieGrid");
    if (!grid) return;

    grid.innerHTML = "";

    if (watchlist.length === 0) {
        grid.innerHTML = `<p style="color: #bbb; text-align: center; grid-column: 1/-1;">Your watchlist is empty. Search and add movies/series above!</p>`;
        updateProgressBar(0, 0);
        return;
    }

    let watchedCount = 0;

    watchlist.forEach((item, index) => {
        if (item.watched) watchedCount++;

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
                <div class="card-actions">
                    <label class="checkbox-label">
                        <input type="checkbox" ${item.watched ? 'checked' : ''} onchange="toggleWatched(${index})"> Watched
                    </label>
                    <div class="action-buttons">
                        <button class="btn-delete" onclick="removeFromWatchlist(${index})">Remove</button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    updateProgressBar(watchedCount, watchlist.length);
}

// Toggle Watched Status
function toggleWatched(index) {
    if (!activeUser) return;
    watchlist[index].watched = !watchlist[index].watched;
    db.ref("watchlists/" + activeUser).set(watchlist);
}

// Update Watch Progress Bar
function updateProgressBar(watched, total) {
    const text = document.getElementById("progressText");
    const bar = document.getElementById("progressBar");
    if (!text || !bar) return;

    const percentage = total > 0 ? Math.round((watched / total) * 100) : 0;
    text.innerText = `${watched} / ${total} Completed (${percentage}%)`;
    bar.style.width = `${percentage}%`;
}

// Remove Item from Watchlist
function removeFromWatchlist(index) {
    if (!activeUser) return;
    watchlist.splice(index, 1);
    db.ref("watchlists/" + activeUser).set(watchlist);
}

// Key Press Helper
function handleKeyPress(e) {
    if (e.key === 'Enter') addMovie();
}

// Placeholder for Search & Add Integration
function addMovie() {
    const input = document.getElementById("movieInput");
    if (!input || !input.value.trim()) return;
    alert(`Searching for ${input.value}... Connect OMDB API handler if separate.`);
}

function handleFilterChange() {}
function createPlaylist() {}

// Logout User
function logout() {
    if (activeUser) {
        db.ref("watchlists/" + activeUser).off();
    }
    activeUser = null;
    watchlist = [];
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
}

// Modal Helpers
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "flex";
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}
