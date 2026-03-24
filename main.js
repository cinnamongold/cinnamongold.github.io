// Init console
console.log("BEWARE OF CONSOLE SPAM");

// Init vars

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

// Change username 
// First, alert() asking for name, store as const var username
// Save and update to local storage
// On page load, and on update, update #username display

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
    } else {
        // Update in localStorage and display
        localStorage.setItem("username", newUsername);
        updateUsernameField()
        console.log("username updated to " + newUsername);
        return "username updated to " + newUsername
    }
}

console.log(updateUsernameField());