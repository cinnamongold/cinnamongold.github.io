// SCRIPT NOTICES:
// Most of these scripts are not currently made by me. I am continuing to learn javascript and will eventually make my own scripts for this project.

// generate a PKCE "helper" code, get the user code,  and trade it for an actual auth token

const SPOTIFY_CLIENT_ID = "3876dfbb34e04fbdb28027a22c38a557";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";

const generateRandomString = (length) => {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789";
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values).map(x => possible[x % possible.length]).join('');
};

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input))).replace(/=/g, '').replace(/\//g, '_');
};

function toggleStyleSheet() {
    const link = document.getElementById('main-stylesheet');
    link.disabled = !link.disabled;
};

function getStoredItem(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function setStoredItem(key, value) {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
}

function removeStoredItem(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
}

function setStatusText(message, allowHtml = false) {
    const status = document.getElementById("status-text");
    if (!status) return;

    if (allowHtml) {
        status.innerHTML = message;
    } else {
        status.textContent = message;
    }
}

function getUserCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const userCode = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
        console.error("Spotify auth error:", error);
        setStatusText("Spotify login failed. Please sign in again.");
        return;
    }

    if (userCode) {
        console.log('User Code:', userCode);
        setStoredItem('spotify_code', userCode);
    } else {
        console.log("No user code found.")
    }
};

async function exchangeCodeForToken() {
    const code = getStoredItem('spotify_code');
    const codeVerifier = getStoredItem('code_verifier');
    const redirectUri = getStoredItem('redirect_uri');

    if (!code || !codeVerifier || !redirectUri) {
        console.error("Missing code or code verifier");
        setStatusText("Login context expired. Please sign in again.");
        return false;
    }

    const body = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    });

    const data = await response.json();
    console.log('Token response:', data);

    if (response.ok && data.access_token) {
        setStoredItem('access_token', data.access_token);
        if (data.refresh_token) {
            setStoredItem('refresh_token', data.refresh_token);
        }
        removeStoredItem('spotify_code');
        console.log("Access token retrieved and saved to local storage");
        return true;
    } else {
        console.error("Failed to get token", data);
        setStatusText("Unable to complete login. Please sign in again.");
        return false;
    }
}

async function refreshAccessToken() {
    const refreshToken = getStoredItem('refresh_token');

    if (!refreshToken) {
        console.warn("No refresh token available.");
        return false;
    }

    const body = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
        setStoredItem('access_token', data.access_token);
        if (data.refresh_token) {
            setStoredItem('refresh_token', data.refresh_token);
        }
        console.log("Access token refreshed.");
        return true;
    }

    console.error("Failed to refresh token", data);
    removeStoredItem('access_token');
    removeStoredItem('refresh_token');
    return false;
}

function hasCodeInUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.has('code');
}

function clearUrlParams() {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
}

getUserCode();

let lastTrackId = null;

async function getCurrentlyPlaying(retryOnAuthError = true) {
    const token = getStoredItem('access_token');
    if (!token) {
        if (retryOnAuthError && await refreshAccessToken()) {
            return getCurrentlyPlaying(false);
        }

        console.error("getCurrentlyPlaying: no access token is available.");
        setStatusText("Your session expired. Please sign in again.");
        return;
    }

    const response = await fetch(SPOTIFY_NOW_PLAYING_URL, {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 204) {
        setStatusText("Nothing is currently playing right now.");
        return;
    }

    if (response.status === 401) {
        if (retryOnAuthError && await refreshAccessToken()) {
            return getCurrentlyPlaying(false);
        }

        setStatusText(`Your session expired. Please <a href="../">sign in again</a>.`, true);
        return;
    }

    if (!response.ok) {
        console.error("Error from spotify:", response.status, await response.text());
        setStatusText("Could not load your currently playing track.");
        return;
    }

    const data = await response.json();
    console.log("Currently playing music. Display raw data:", data);

    if (!data || !data.item) {
        setStatusText("Nothing is currently playing right now.");
        return;
    }

    const item = data.item;
    const name = item.name;
    const artists = item.artists.map(a => a.name).join(', ');
    const albumCoverUrl = item.album.images[0].url;
    const trackId = item.id;
    const progressMs = data.progress_ms || 0;
    const durationMs = item.duration_ms;

    updateNowPlayingVisuals(name, artists, albumCoverUrl, trackId, progressMs, durationMs)
    startProgressTimer(progressMs, durationMs);
}

async function initializeNowPlaying() {
    if (hasCodeInUrl()) {
        await exchangeCodeForToken();
        clearUrlParams();
    } else {
        console.log('No new code in URL, not calling /api/token again');
    }

    if (getStoredItem('access_token') || getStoredItem('refresh_token')) {
        await getCurrentlyPlaying();
        setInterval(() => {
            getCurrentlyPlaying();
        }, 10000)
    } else {
        setStatusText(`No active session. Please <a href="../">sign in</a>.`, true);
    }
}

initializeNowPlaying();
