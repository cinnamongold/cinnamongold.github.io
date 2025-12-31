let currentTimer = null;
let currentDurationMs = 0;

function stopTimer() {
    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
    }
}

function msToMmSs(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startProgressTimer(startMs, durationMs) {
    stopTimer();

    currentDurationMs = durationMs;
    let progressMs = startMs;

    document.querySelector('#song-progress span').textContent = msToMmSs(progressMs);
    document.getElementById('song-duration').textContent = msToMmSs(durationMs);

    currentTimer = setInterval(() => {
        progressMs += 1000;
        if (progressMs >= durationMs) {
            document.getElementById('song-progress').textContent = msToMmSs(durationMs);
            return;
        }

        document.querySelector('#song-progress span').textContent = msToMmSs(progressMs);
        document.getElementById('song-duration').textContent = msToMmSs(durationMs);
    }, 1000)
}