const card = document.getElementById("now-playing-card");
const img = document.getElementById("album-cover");
const img2 = document.getElementById("album-cover-background");
const statusText = document.getElementById("status-text");

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getAverageColor(imgE1) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = canvas.width = imgE1.naturalWidth || imgE1.width;
    const height = canvas.height = imgE1.naturalHeight || imgE1.height;

    ctx.drawImage(imgE1, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < data.length; i += 4 * 10) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    return { r, g, b };
}

const albumImg = document.getElementById("album-cover");
const albumImg2 = document.getElementById("album-cover-background");
const bgDiv = document.getElementById("now-playing-card");
const bgDiv2 = document.getElementById("control-card");
const outerColor = 'rgba(255, 255, 255, 0.25)';

function normalizeCoverSources(albumCoverSources) {
    if (Array.isArray(albumCoverSources)) return albumCoverSources.filter(Boolean);
    if (typeof albumCoverSources === "string" && albumCoverSources.trim()) return [albumCoverSources];
    return [];
}

function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const preload = new Image();
        preload.crossOrigin = "anonymous";
        preload.onload = () => resolve(url);
        preload.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        preload.src = url;
    });
}

async function getFirstLoadableCoverUrl(sources, currentSrc) {
    for (const source of sources) {
        try {
            await preloadImage(source);
            return source;
        } catch (error) {
            // Try the next lower-priority source.
        }
    }

    return currentSrc || null;
}

function waitForNextPaint() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

function waitForElementImageLoad(element, expectedUrl) {
    return new Promise((resolve) => {
        if (!element) {
            resolve(false);
            return;
        }

        const completeWithUrl = element.complete && (!expectedUrl || element.currentSrc.includes(expectedUrl));
        if (completeWithUrl) {
            resolve(true);
            return;
        }

        const onLoad = () => {
            cleanup();
            resolve(true);
        };

        const onError = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            element.removeEventListener("load", onLoad);
            element.removeEventListener("error", onError);
        };

        element.addEventListener("load", onLoad, { once: true });
        element.addEventListener("error", onError, { once: true });
    });
}

function updateGradientFromImage() {
    const { r, g, b } = getAverageColor(albumImg);
    const centerColor = `rgb(${r},${g},${b})`;

    bgDiv.style.backgroundImage = `radial-gradient(circle at 50% 60%,
    ${centerColor} 0%,
    ${centerColor} 35%,
    ${outerColor} 90%)`;

    bgDiv2.style.backgroundImage = `radial-gradient(circle at 50% 60%,
    ${centerColor} 0%,
    ${centerColor} 35%,
    ${outerColor} 90%)`;
}

async function updateNowPlayingVisuals(name, artists, albumCoverSources, trackId, progressMs, durationMs) {
    const sources = normalizeCoverSources(albumCoverSources);
    const currentCoverUrl = img.currentSrc || img.src;

    if (trackId && trackId === lastTrackId) {
        document.getElementById('track-title').textContent = name;
        document.getElementById('track-artists').textContent = artists;
        return;
    }

    const chosenCoverUrl = await getFirstLoadableCoverUrl(sources, currentCoverUrl);
    if (!chosenCoverUrl) return;

    lastTrackId = trackId;

    statusText.style.opacity = '0';
    img.style.opacity = '0';
    img2.style.opacity = '0';

    document.getElementById('track-title').textContent = name;
    document.getElementById('track-artists').textContent = artists;
    img.src = chosenCoverUrl;
    img2.src = chosenCoverUrl;

    // Ensure the browser paints the hidden state before we reveal.
    await waitForNextPaint();

    const [foregroundLoaded, backgroundLoaded] = await Promise.all([
        waitForElementImageLoad(img, chosenCoverUrl),
        waitForElementImageLoad(img2, chosenCoverUrl)
    ]);

    if (!foregroundLoaded && !backgroundLoaded) {
        img.src = currentCoverUrl;
        img2.src = currentCoverUrl;
        statusText.style.opacity = '1';
        img.style.opacity = '1';
        img2.style.opacity = '1';
        return;
    }

    statusText.style.opacity = '1';
    img.style.opacity = '1';
    img2.style.opacity = '1';
    updateGradientFromImage();
}
