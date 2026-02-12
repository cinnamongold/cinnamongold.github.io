function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

document.getElementById('spotify-login').addEventListener('click', async function () {

    const codeVerifier = generateRandomString(64);
    localStorage.setItem('code_verifier', codeVerifier);
    sessionStorage.setItem('code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    const clientId = '3876dfbb34e04fbdb28027a22c38a557';
    const selected = document.querySelector('input[name="login-type"]:checked');
    const redirectUri = selected ? selected.value : null;
    localStorage.setItem('redirect_uri', redirectUri);
    sessionStorage.setItem('redirect_uri', redirectUri);
    const scope = 'user-read-playback-state user-read-currently-playing user-modify-playback-state';  // Separated by spaces if multiple scopes are needed
    const state = generateRandomString(16);
    localStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_state', state);

    const authUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${encodeURIComponent(state)}` +
        `&code_challenge_method=S256` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}`;

    window.location.href = authUrl;
})
