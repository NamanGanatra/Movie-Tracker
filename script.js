// Replace with your active OMDb API Key
const API_KEY = "f8a4d404";

// Application State
let users = {};
let activeUser = null;
let movies = [];

// Initialize Page Data
document.addEventListener("DOMContentLoaded", () => {
    loadUsersFromStorage();
    populateLoginDropdown();
});

// Load registered users directly from LocalStorage
function loadUsersFromStorage() {
    const saved = localStorage.getItem("app_users_db");
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = {}; // Empty startup
    }
}

// Clear all saved profiles & start completely fresh
function clearAllProfiles() {
    if (confirm("Kya aap saare saved profiles aur watchlists delete karke fresh start karna chahte hain?")) {
        localStorage.clear();
        users = {};
        movies = [];
        populateLoginDropdown();
        alert("Sare purane profiles aur data successfully delete ho gaye hain!");
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
        // Hide login inputs if no profiles exist
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
        
        loadUserWatchlist();
    } else {
        alert("Incorrect PIN! Please try again.");
    }
}

// Logout Functionality
function logout() {
    activeUser = null;
    movies = [];
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
    populateLoginDropdown();
}

// User Registration (New members add hone par automatically show honge)
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

    // Save user to memory & LocalStorage
    users[name] = { pin: pin };
    localStorage.setItem("app_users_db", JSON.stringify(users));
    
    populateLoginDropdown();
    closeModal("registerModal");
    document.getElementById("regNameInput").value = "";
    document.getElementById("regPinInput").value = "";
    alert(`Profile "${name}" created successfully! Dropdown me add ho gaya hai.`);
}

// Load Movies for Logged-In User
function loadUserWatchlist() {
    const saved = localStorage.getItem(`watchlist_${activeUser}`);
    movies = saved ? JSON.parse(saved) : [];
    renderGrid();
}

// Save Current Watchlist State
function saveAndRefresh() {
    localStorage.setItem(`watchlist_${activeUser}`, JSON.stringify(movies));
    renderGrid();
}

// Add Movie/Show with Filter Support
async function addMovie() {
    const titleInput = document.getElementById("movieInput").value.trim();
    const yearInput = document.getElementById("yearInput").value.trim();
    const typeInput = document.getElementById("typeInput").value;

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
            alert("Title not found! Try specifying year or exact name.");
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
            watched: false
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

// Support Enter key press
function handleKeyPress(event) {
    if (event.key === "Enter") {
        addMovie();
    }
}

// Render Grid Cards & Progress
function renderGrid() {
    const grid = document.getElementById("movieGrid");
    grid.innerHTML = "";

    let watchedCount = 0;

    movies.forEach((movie, index) => {
        if (movie.watched) watchedCount++;

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
                <div class="card-actions">
                    <label class="checkbox-label">
                        <input type="checkbox" ${movie.watched ? 'checked' : ''} onchange="toggleWatched(${index})">
                        Watched
                    </label>
                    <div class="action-buttons">
                        <button class="btn-about" onclick="openAbout(${index})">About</button>
                        <button class="btn-delete" onclick="deleteMovie(${index})">Delete</button>
                    </div>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    const totalMovies = movies.length;
    const progressPercent = totalMovies === 0 ? 0 : Math.round((watchedCount / totalMovies) * 100);

    document.getElementById("progressText").innerText = `${watchedCount} / ${totalMovies} Completed (${progressPercent}%)`;
    document.getElementById("progressBar").style.width = `${progressPercent}%`;
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

// About Modal Display
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

// Modal Helpers
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