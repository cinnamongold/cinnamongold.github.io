// SCRIPT NOTICES:
// Most of these scripts are not currently made by me. I am continuing to learn javascript and will eventually make my own scripts for this project.

// generate a PKCE "helper" code, get the user code,  and trade it for an actual auth token
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

function getUserCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const userCode = urlParams.get('code');
    const error = urlParams.get('error');

    if (userCode) {
        console.log('User Code:', userCode);
        if (userCode) localStorage.setItem('spotify_code', userCode);
    } else {
        console.log("No user code found.")
    }
};

async function exchangeCodeForToken() {
    const code = localStorage.getItem('spotify_code');
    const codeVerifier = localStorage.getItem('code_verifier');
    const redirectUri = localStorage.getItem('redirect_uri');

    if (!code || !codeVerifier) {
        console.error("Missing code or code verifier");
        return
    }

    const tokenUrl = "https://accounts.spotify.com/api/token";

    const body = new URLSearchParams({
        client_id: "3876dfbb34e04fbdb28027a22c38a557",
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    });

    const data = await response.json();
    console.log('Token response:', data);

    if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token || '');
        localStorage.removeItem('spotify_code');
        console.log("Access token retrieved and saved to local storage");
    } else {
        console.error("Failed to get token", data);
    }
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

async function getCurrentlyPlaying() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.error("getCurrentlyPlaying: Error. No access token is available in local storage.");
        return;
    }

    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status == 204) {
        console.log("Nothing is currently playing.");
        document.getElementById("status-text").innerHTML = "You are not playing music right now."
        return;
    }

    if (!response.ok) {
        console.error("Error from spotify:", response.status, await response.text());
        return;
    }

    const data = await response.json();
    console.log("Currently playing music. Display raw data:", data);

    // Update actual HTML and stuff based on now playing

    const item = data.item;
    const name = data.item.name;
    const artists = item.artists.map(a => a.name).join(', ');
    const albumCoverUrl = item.album.images[0].url;

    // SHOW SONG TITLE AND ALBUM COVER IF PLAYING
    const isPlaying = data.is_playing;
    if (!isPlaying || !item) {
        document.getElementById("status-text").innerHTML = "You are not playing music right now.";
    } else {
        document.getElementById("status-text").innerHTML = `${name}<hr class="artist-hr">${artists}`;
        document.getElementById("album-cover").src = albumCoverUrl;
    }

    if(albumCoverUrl) {
        albumImg.src = albumCoverUrl;
    }
}

if (hasCodeInUrl()) {
    exchangeCodeForToken().then(() => {
        clearUrlParams();
    });
} else {
    console.log('No new code in URL, not calling /api/token again');
}

if (localStorage.getItem('access_token')) {
    getCurrentlyPlaying();

    setInterval(() => {
        getCurrentlyPlaying();
    }, 10000)
}