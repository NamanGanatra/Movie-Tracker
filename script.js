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

// Initialize Firebase App and Database Instance
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Application State Management
let users = {};
let activeUser = null;
let watchlist = [];
let customModalResolver = null;

// Initialize Event Listener
document.addEventListener("DOMContentLoaded", () => {
    loadUsersFromStorage();
});

// Real-time Custom Dialog Promise System
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

// Fetch Profiles Real-time from Firebase
function loadUsersFromStorage() {
    db.ref("users").on("value", (snapshot) => {
        users = snapshot.val() || {};
        populateLoginDropdown();
    }, (error) => {
        console.error("Firebase Read Error:", error);
    });
}

// Populate User Selection Dropdown
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

// Authenticate User Login
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

// Register New User Profile
async function registerUser() {
    const nameInput = document.getElementById("regNameInput");
    const pinInput = document.getElementById("regPinInput");

    const name = nameInput.value.trim();
    const pin = pinInput.value.trim();

    if (!name || pin.length !== 4 || isNaN(pin)) {
        await showCustomDialog({ title: "Invalid Data", desc: "Please enter a valid name and a 4-digit numeric PIN." });
        return;
    }

    if (users[name]) {
        await showCustomDialog({ title: "Error", desc: "A profile with this name already exists!" });
        return;
    }

    db.ref("users/" + name).set({ pin: String(pin) })
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

// Change Profile PIN
async function openChangePinModal() {
    if (!activeUser) return;

    const currentPin = await showCustomDialog({
        title: "🔑 Change PIN",
        desc: "Enter your current 4-Digit PIN to verify identity:",
        showInput: true,
        placeholder: "Current PIN"
    });

    if (currentPin === null) return;

    if (String(users[activeUser].pin) !== String(currentPin.trim())) {
        await showCustomDialog({ title: "Error", desc: "Current PIN is incorrect!" });
        return;
    }

    const newPin = await showCustomDialog({
        title: "🔑 New PIN",
        desc: "Enter your NEW 4-Digit PIN:",
        showInput: true,
        placeholder: "New PIN"
    });

    if (newPin === null) return;

    if (newPin.length !== 4 || isNaN(newPin)) {
        await showCustomDialog({ title: "Error", desc: "PIN must be a 4-digit number!" });
        return;
    }

    db.ref("users/" + activeUser + "/pin").set(String(newPin))
        .then(async () => {
            await showCustomDialog({ title: "Updated!", desc: "Your PIN was updated successfully!" });
        })
        .catch(async (error) => {
            await showCustomDialog({ title: "Error", desc: error.message });
        });
}

// Delete Selected Profile
async function deleteProfile() {
    const select = document.getElementById("loginUserSelect");
    const username = select ? select.value : null;

    if (!username) {
        await showCustomDialog({ title: "Selection Required", desc: "Please select a profile to delete." });
        return;
    }

    const confirmPin = await showCustomDialog({
        title: "🗑️ Confirm Deletion",
        desc: `Enter PIN for "${username}" to confirm profile removal:`,
        showInput: true,
        placeholder: "4-Digit PIN"
    });

    if (confirmPin === null) return;

    if (String(users[username].pin) === String(confirmPin.trim())) {
        db.ref("users/" + username).remove();
        db.ref("watchlists/" + username).remove();
        await showCustomDialog({ title: "Deleted", desc: `Profile "${username}" and its data have been removed.` });
    } else {
        await showCustomDialog({ title: "Error", desc: "Incorrect PIN. Deletion cancelled." });
    }
}

// Clear Database Reset
async function clearAllProfiles() {
    const masterConfirmation = await showCustomDialog({
        title: "⚠️ Danger Zone",
        desc: "Type 'RESET' to delete all profiles and watchlists permanently:",
        showInput: true,
        placeholder: "Type RESET",
        isPassword: false
    });

    if (masterConfirmation === "RESET") {
        db.ref().remove()
            .then(async () => await showCustomDialog({ title: "Wiped", desc: "All application data has been wiped." }))
            .catch(async (err) => await showCustomDialog({ title: "Error", desc: err.message }));
    }
}

// Load Active User Watchlist
function loadUserData() {
    if (!activeUser) return;

    db.ref("watchlists/" + activeUser).on("value", (snapshot) => {
        const data = snapshot.val();
        if (Array.isArray(data)) {
            watchlist = data;
        } else if (data && typeof data === 'object') {
            watchlist = Object.values(data);
        } else {
            watchlist = [];
        }
        renderWatchlist();
    });
}

// Render Watchlist User Interface
function renderWatchlist() {
    const grid = document.getElementById("movieGrid");
    if (!grid) return;

    grid.innerHTML = "";

    if (watchlist.length === 0) {
        grid.innerHTML = `<p style="color: #aaa; text-align: center; grid-column: 1/-1;">Your watchlist is empty. Add movies/series above!</p>`;
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
                <img src="${item.Poster && item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${item.Title || 'Movie'}">
                <span class="imdb-tag">⭐ ${item.imdbRating || 'N/A'}</span>
            </div>
            <div class="card-content">
                <h3 class="movie-title">${item.Title || 'Untitled'}</h3>
                <span class="release-date">${item.Year || ''} | ${item.Type || 'movie'}</span>
                <div class="card-actions">
                    <label class="checkbox-label">
                        <input type="checkbox" ${item.watched ? 'checked' : ''} onchange="toggleWatched(${index})"> Watched
                    </label>
                    <button class="btn-delete" onclick="removeFromWatchlist(${index})">Remove</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    updateProgressBar(watchedCount, watchlist.length);
}

// Toggle Item Watched Status
function toggleWatched(index) {
    if (!activeUser) return;
    watchlist[index].watched = !watchlist[index].watched;
    db.ref("watchlists/" + activeUser).set(watchlist);
}

// Update Watchlist Progress Indicator
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

// Key Press Event Handler
function handleKeyPress(e) {
    if (e.key === 'Enter') addMovie();
}

async function addMovie() {
    const input = document.getElementById("movieInput");
    if (!input || !input.value.trim()) return;
    await showCustomDialog({ title: "Search Feature", desc: `Searching for "${input.value}"... API integration ready.` });
}

// Terminate Active User Session
function logout() {
    if (activeUser) {
        db.ref("watchlists/" + activeUser).off();
    }
    activeUser = null;
    watchlist = [];
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
}

// UI Modal Management
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "flex";
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}
