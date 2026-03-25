// Init console
console.log("BEWARE OF CONSOLE SPAM");

// Init vars
const currentWindowLocation = window.location.pathname;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

// Follow cursor script
// Elements to move
const followers = document.querySelectorAll("section");

document.addEventListener("mousemove", (e) => {
    // e.clientX/Y represent cursor location in Pixels
    const x = e.clientX;
    const y = e.clientY;

    // Update CSS vars for EACH element
    followers.forEach(follower => {
        follower.style.setProperty("--x", x);
        follower.style.setProperty("--y", y);
    })
});

// This function checks for and updates the display name accordingly
function updateUsernameField() {
    const username = localStorage.getItem("username"); // Get username from localStorage
    const usernameElement = document.getElementById("username"); // Get user element from HTML

    if (username == null) {
        usernameElement.innerText = "user";
        return "no username exists yet"
    } else {
        usernameElement.innerText = username;
        return "username found!: " + username
    }
}

function changeUsername() {
    const newUsername = prompt("Please choose a name to display on the homepage... leave empty to cancel");

    if (!newUsername || newUsername.trim === "") {
        console.log("username was not updated");
        return "username was not updated"
    } else if (newUsername.length >= 40) {
        alert("username should be below 40 characters");
        console.log("username was not updated, too long");
        return "username was not updated, too long"
    } else {
        // Update in localStorage and display
        localStorage.setItem("username", newUsername);
        updateUsernameField();
        console.log("username updated to " + newUsername);
        return "username updated to " + newUsername
    }
}

// This function redirects mobile users to a cleaner UI for them
function checkForMobile() {
    if (isMobile && (currentWindowLocation == "/")) {
        window.location.href = "mobile";
        console.log("Screen too bebeh");
    } else if(isMobile === false && (currentWindowLocation == "/mobile/")) {
        window.location.href = "/";
        console.log("Desktop detected, switching to correct site...")
    } else {
        console.log("No change in site needed.");
    }
}

// Init functions

window.addEventListener('load', checkForMobile);
console.log("-- ", updateUsernameField());
console.log("Mobile Detected?: ", isMobile);