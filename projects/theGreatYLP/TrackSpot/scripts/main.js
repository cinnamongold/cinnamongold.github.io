// SCRIPT NOTICES:
// Most of these scripts are not currently made by me. I am continuing to learn javascript and will eventually make my own scripts for this project.

// generate a PKCE "helper" code, get the user code,  and trade it for an actual auth token

const SPOTIFY_CLIENT_ID = "3876dfbb34e04fbdb28027a22c38a557";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";
const CURRENTLY_PLAYING_POLL_INTERVAL_MS = 5000;
const TODAY_STATS_KEY = "trackspot_today_stats";
const TRACK_COUNT_THRESHOLD_MS = 30000;

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

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDefaultTodayStats() {
    return {
        dateKey: getLocalDateKey(),
        totalMsStreamed: 0,
        tracksStreamed: 0,
        uniqueArtistIds: [],
        artistPlayCounts: {},
        artistNamesById: {},
        lastTrackId: null,
        lastProgressMs: 0,
        currentTrackAccumulatedMs: 0,
        currentTrackQualified: false
    };
}

function normalizeTodayStats(rawStats) {
    const defaults = getDefaultTodayStats();
    if (!rawStats || typeof rawStats !== "object") return defaults;

    return {
        dateKey: typeof rawStats.dateKey === "string" ? rawStats.dateKey : defaults.dateKey,
        totalMsStreamed: Number.isFinite(Number(rawStats.totalMsStreamed)) ? Math.max(0, Number(rawStats.totalMsStreamed)) : 0,
        tracksStreamed: Number.isFinite(Number(rawStats.tracksStreamed)) ? Math.max(0, Math.floor(Number(rawStats.tracksStreamed))) : 0,
        uniqueArtistIds: Array.isArray(rawStats.uniqueArtistIds) ? rawStats.uniqueArtistIds.filter(Boolean) : [],
        artistPlayCounts: rawStats.artistPlayCounts && typeof rawStats.artistPlayCounts === "object" ? rawStats.artistPlayCounts : {},
        artistNamesById: rawStats.artistNamesById && typeof rawStats.artistNamesById === "object" ? rawStats.artistNamesById : {},
        lastTrackId: typeof rawStats.lastTrackId === "string" ? rawStats.lastTrackId : null,
        lastProgressMs: Number.isFinite(Number(rawStats.lastProgressMs)) ? Math.max(0, Number(rawStats.lastProgressMs)) : 0,
        currentTrackAccumulatedMs: Number.isFinite(Number(rawStats.currentTrackAccumulatedMs)) ? Math.max(0, Number(rawStats.currentTrackAccumulatedMs)) : 0,
        currentTrackQualified: rawStats.currentTrackQualified === true
    };
}

function getTopArtistLabel(stats) {
    const playCounts = stats?.artistPlayCounts || {};
    const artistNames = stats?.artistNamesById || {};

    let topArtistId = null;
    let topCount = 0;

    Object.entries(playCounts).forEach(([artistId, rawCount]) => {
        const count = Number(rawCount) || 0;
        if (count > topCount) {
            topArtistId = artistId;
            topCount = count;
        }
    });

    if (!topArtistId || topCount <= 0) return "-";
    return artistNames[topArtistId] || "Unknown artist";
}

function loadTodayStats() {
    const todayKey = getLocalDateKey();
    const raw = localStorage.getItem(TODAY_STATS_KEY);
    let stats = getDefaultTodayStats();
    let needsResetPersist = false;

    if (raw) {
        try {
            stats = normalizeTodayStats(JSON.parse(raw));
        } catch (error) {
            stats = getDefaultTodayStats();
            needsResetPersist = true;
        }
    } else {
        needsResetPersist = true;
    }

    if (stats.dateKey !== todayKey) {
        stats = getDefaultTodayStats();
        needsResetPersist = true;
    }

    if (needsResetPersist) {
        saveTodayStats(stats);
    }

    return stats;
}

function saveTodayStats(stats) {
    const normalized = normalizeTodayStats(stats);
    localStorage.setItem(TODAY_STATS_KEY, JSON.stringify(normalized));

    const minutes = Math.floor(normalized.totalMsStreamed / 60000);
    localStorage.setItem("minutesStreamedToday", String(minutes));
    localStorage.setItem("tracksStreamedToday", String(normalized.tracksStreamed));
    localStorage.setItem("uniqueArtistsToday", String(normalized.uniqueArtistIds.length));
    localStorage.setItem("topArtistToday", getTopArtistLabel(normalized));
}

function getLocalStorageNumber(key, fallback = 0) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function animateStatNumber(element, nextNumber) {
    if (!element) return;

    const prev = element.dataset.prevValue ?? String(nextNumber);
    const next = String(nextNumber);
    const hasRenderedDigits = element.children.length > 0;

    // Prevent duplicate render passes from wiping an in-progress animation.
    if (hasRenderedDigits && prev === next) return;

    const maxLen = Math.max(prev.length, next.length);
    const prevPadded = prev.padStart(maxLen, " ");
    const nextPadded = next.padStart(maxLen, " ");

    element.innerHTML = "";

    for (let i=0; i<maxLen; i++) {
        const oldCh = prevPadded[i];
        const newCh = nextPadded[i];

        const slot = document.createElement("span");
        slot.className = "stat-digit-slot";

        if (oldCh === newCh) {
            const stable = document.createElement("span");
            stable.className = "stat-digit current";
            stable.textContent = newCh;
            slot.appendChild(stable);
        } else {
            const current = document.createElement("span");
            current.className = "stat-digit current";
            current.textContent = oldCh;

            const nextEl = document.createElement("span");
            nextEl.className = "stat-digit next";
            nextEl.textContent = newCh;

            slot.appendChild(current);
            slot.appendChild(nextEl);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    slot.classList.add("animate");
                });
            });
        }

        element.appendChild(slot);
    }

    element.dataset.prevValue = next;
}

function renderTodayStats() {
    const stats = loadTodayStats();
    const minutesFallback = Math.floor(stats.totalMsStreamed / 60000);
    const minutes = Math.max(0, Math.floor(getLocalStorageNumber("minutesStreamedToday", minutesFallback)));
    const tracks = Math.max(0, Math.floor(getLocalStorageNumber("tracksStreamedToday", stats.tracksStreamed)));
    const uniqueArtists = Math.max(0, Math.floor(getLocalStorageNumber("uniqueArtistsToday", stats.uniqueArtistIds.length)));
    const topArtist = localStorage.getItem("topArtistToday") || getTopArtistLabel(stats);

    const minutesElement = document.getElementById("minutesStreamedToday");
    const tracksElement = document.getElementById("tracksStreamedToday");
    const uniqueArtistsElement = document.getElementById("uniqueArtistsToday");
    const topArtistElement = document.getElementById("topArtistToday");

    if (minutesElement) animateStatNumber(minutesElement, minutes);
    if (tracksElement) animateStatNumber(tracksElement, tracks);
    if (uniqueArtistsElement) animateStatNumber(uniqueArtistsElement, uniqueArtists);
    if (topArtistElement) topArtistElement.textContent = topArtist;
}

function updateTodayStatsFromPlayback(data) {
    if (!data || !data.item) return;

    const stats = loadTodayStats();
    const trackId = data.item.id || null;
    const progressMs = Number.isFinite(Number(data.progress_ms)) ? Number(data.progress_ms) : 0;
    const isPlaying = data.is_playing === true;

    const artistsWithIds = (data.item.artists || [])
        .map(artist => ({ id: artist.id, name: artist.name }))
        .filter(artist => !!artist.id);

    artistsWithIds.forEach(artist => {
        stats.artistNamesById[artist.id] = artist.name || stats.artistNamesById[artist.id] || "Unknown artist";
    });

    let shouldCountTrack = false;
    if (trackId) {
        if (stats.lastTrackId !== trackId) {
            stats.lastTrackId = trackId;
            stats.lastProgressMs = progressMs;
            stats.currentTrackAccumulatedMs = 0;
            stats.currentTrackQualified = false;
        } else if (isPlaying) {
            const deltaMs = progressMs - (stats.lastProgressMs || 0);
            if (deltaMs > 0 && deltaMs < 120000) {
                stats.totalMsStreamed += deltaMs;
                stats.currentTrackAccumulatedMs += deltaMs;
            }
            stats.lastProgressMs = progressMs;

            if (!stats.currentTrackQualified && stats.currentTrackAccumulatedMs >= TRACK_COUNT_THRESHOLD_MS) {
                stats.currentTrackQualified = true;
                stats.tracksStreamed += 1;
                shouldCountTrack = true;
            }
        }
    }

    if (shouldCountTrack) {
        artistsWithIds.forEach(artist => {
            const currentCount = Number(stats.artistPlayCounts[artist.id]) || 0;
            stats.artistPlayCounts[artist.id] = currentCount + 1;
        });
    }

    const artistIds = artistsWithIds.map(artist => artist.id);

    if (artistIds.length) {
        const uniqueSet = new Set(stats.uniqueArtistIds);
        artistIds.forEach(id => uniqueSet.add(id));
        stats.uniqueArtistIds = Array.from(uniqueSet);
    }

    saveTodayStats(stats);
    renderTodayStats();
}

function setStatusText(message, allowHtml = false) {
    const title = document.getElementById("track-title");
    const artists = document.getElementById("track-artists");
    const divider = document.querySelector("#status-text .artist-hr");
    if (!title || !artists) return;

    if (allowHtml) {
        title.innerHTML = message;
    } else {
        title.textContent = message;
    }

    artists.textContent = "";
    if (divider) divider.style.display = "none";
    hideLastSeenNote();
}

function resetStatusTextLayout() {
    const divider = document.querySelector("#status-text .artist-hr");
    if (divider) divider.style.display = "";
}

function formatLastSeenTimestamp(timestampMs) {
    if (!timestampMs) return "";

    const date = new Date(timestampMs);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatDurationFromMs(ms) {
    const totalSeconds = Math.floor((ms || 0) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

let lastSeenHideTimeout = null;

function hideLastSeenNote(clearMessage = true) {
    const note = document.getElementById("last-seen-note");
    if (!note) return;

    if (lastSeenHideTimeout) clearTimeout(lastSeenHideTimeout);

    note.classList.remove("note-visible");
    note.classList.add("note-fadeout");

    lastSeenHideTimeout = setTimeout(() => {
        note.classList.remove("note-fadeout");
        if (clearMessage) {
            note.textContent = "";
            delete note.dataset.mode;
            delete note.dataset.absoluteText;
            delete note.dataset.lastSeenAt;
        }
    }, 420);
}

function formatRelativeTimeFromNow(timestampMs) {
    if (!timestampMs) return "just now";

    const seconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? "" : "s"} ago`;
}

function showLastSeenNote(absoluteMessage, lastSeenAt) {
    const note = document.getElementById("last-seen-note");
    if (!note) return;

    if (lastSeenHideTimeout) clearTimeout(lastSeenHideTimeout);

    note.classList.remove("note-fadeout");
    note.textContent = absoluteMessage;
    note.dataset.mode = "absolute";
    note.dataset.absoluteText = absoluteMessage;
    if (lastSeenAt) note.dataset.lastSeenAt = String(lastSeenAt);
    note.classList.add("note-visible");
}

function initializeLastSeenNoteInteractions() {
    const note = document.getElementById("last-seen-note");
    if (!note) return;

    note.addEventListener("click", () => {
        const absoluteText = note.dataset.absoluteText;
        const lastSeenAt = Number(note.dataset.lastSeenAt || 0);
        if (!absoluteText || !lastSeenAt) return;

        if (note.dataset.mode === "relative") {
            note.textContent = absoluteText;
            note.dataset.mode = "absolute";
            return;
        }

        note.textContent = `Last seen ${formatRelativeTimeFromNow(lastSeenAt)}`;
        note.dataset.mode = "relative";
    });
}

function getLastSeenTrack() {
    const raw = getStoredItem("last_seen_track");
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.name || !parsed.artists || !parsed.albumCoverUrl) return null;
        return parsed;
    } catch (error) {
        console.warn("Invalid last_seen_track cache", error);
        return null;
    }
}

function persistLastSeenTrack(track) {
    const payload = {
        name: track.name,
        artists: track.artists,
        albumCoverUrl: track.albumCoverUrl,
        trackId: track.trackId,
        durationMs: track.durationMs || 0,
        lastSeenAt: Date.now()
    };

    setStoredItem("last_seen_track", JSON.stringify(payload));
}

function renderLastSeenTrackOrEmpty() {
    const cachedTrack = getLastSeenTrack();
    if (!cachedTrack) {
        setStatusText("Nothing is currently playing right now.");
        return;
    }

    const lastSeenText = formatLastSeenTimestamp(cachedTrack.lastSeenAt);
    const trackTitle = document.getElementById("track-title");
    const trackArtists = document.getElementById("track-artists");

    resetStatusTextLayout();
    if (trackTitle) trackTitle.textContent = cachedTrack.name;
    const seenLabel = lastSeenText ? `Last seen ${lastSeenText}` : "Last seen recently";
    if (trackArtists) {
        trackArtists.textContent = cachedTrack.artists;
    }
    showLastSeenNote(seenLabel, cachedTrack.lastSeenAt);

    if (typeof updateNowPlayingVisuals === "function") {
        updateNowPlayingVisuals(
            cachedTrack.name,
            trackArtists ? trackArtists.textContent : cachedTrack.artists,
            [cachedTrack.albumCoverUrl],
            cachedTrack.trackId || `last-seen-${cachedTrack.lastSeenAt || Date.now()}`,
            0,
            cachedTrack.durationMs || 0
        );
    }

    if (typeof stopTimer === "function") stopTimer();
    const progressText = document.querySelector("#song-progress span");
    const durationText = document.getElementById("song-duration");
    if (progressText) progressText.textContent = "00:00";
    if (durationText) durationText.textContent = formatDurationFromMs(cachedTrack.durationMs || 0);
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
initializeLastSeenNoteInteractions();
renderTodayStats();

window.addEventListener("storage", (event) => {
    if (!event.key) return;
    if (event.key === TODAY_STATS_KEY || event.key === "minutesStreamedToday" || event.key === "tracksStreamedToday" || event.key === "uniqueArtistsToday" || event.key === "topArtistToday") {
        renderTodayStats();
    }
});

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
        if (typeof stopTimer === "function") stopTimer();
        renderLastSeenTrackOrEmpty();
        return;
    }

    if (response.status === 401) {
        if (retryOnAuthError && await refreshAccessToken()) {
            return getCurrentlyPlaying(false);
        }

        if (typeof stopTimer === "function") stopTimer();
        setStatusText(`Your session expired. Please <a href="../">sign in again</a>.`, true);
        return;
    }

    if (!response.ok) {
        console.error("Error from spotify:", response.status, await response.text());
        if (typeof stopTimer === "function") stopTimer();
        setStatusText("Could not load your currently playing track.");
        return;
    }

    const data = await response.json();
    console.log("Currently playing music. Display raw data:", data);

    if (!data || !data.item) {
        if (typeof stopTimer === "function") stopTimer();
        renderLastSeenTrackOrEmpty();
        renderTodayStats();
        return;
    }

    updateTodayStatsFromPlayback(data);

    const item = data.item;
    const name = item.name;
    const artists = item.artists.map(a => a.name).join(', ');
    const albumCoverUrls = (item.album.images || []).map(image => image.url).filter(Boolean);
    const albumCoverUrl = albumCoverUrls[0] || item.album.images?.[0]?.url || "";
    const trackId = item.id;
    const isPlaying = data.is_playing === true;
    const progressMs = data.progress_ms || 0;
    const durationMs = item.duration_ms;

    if (!isPlaying) {
        persistLastSeenTrack({ name, artists, albumCoverUrl, trackId, durationMs });
        renderLastSeenTrackOrEmpty();
        renderTodayStats();
        return;
    }

    persistLastSeenTrack({ name, artists, albumCoverUrl, trackId, durationMs });
    hideLastSeenNote();
    resetStatusTextLayout();
    updateNowPlayingVisuals(name, artists, albumCoverUrls.length ? albumCoverUrls : [albumCoverUrl], trackId, progressMs, durationMs)
    startProgressTimer(progressMs, durationMs);
    renderTodayStats();
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
        }, CURRENTLY_PLAYING_POLL_INTERVAL_MS)
    } else {
        setStatusText(`No active session. Please <a href="../">sign in</a>.`, true);
    }
}

initializeNowPlaying();

// Function to delete access_token on login
function signOutUser() {
    const signOutButton = document.querySelector(".sign-out");
    if (signOutButton) {
        signOutButton.innerHTML = `<strong>signing you out...</strong>`;
        signOutButton.disabled = true;
    }

    removeStoredItem('access_token');
    removeStoredItem('refresh_token');
    removeStoredItem('spotify_code');
    removeStoredItem('code_verifier');
    removeStoredItem('redirect_uri');
    removeStoredItem('oauth_state');
    removeStoredItem('last_seen_track');

    console.log("Successfully removed auth session.");
    window.location.replace('../');
    
}
