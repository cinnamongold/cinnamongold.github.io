// Follow cursor script
// Elements to move
const followers = document.querySelectorAll("section");

document.addEventListener("mousemove", (e) => {
    // e.clientX/Y represent cursor location in PX
    const x = e.clientX;
    const y = e.clientY;

    // Update CSS vars for EACH element
    followers.forEach(follower => {
        follower.style.setProperty("--x", x);
        follower.style.setProperty("--y", y);
    })
});

// For each follower, print mouse-enter and leave
followers.forEach(follower => {
    follower.addEventListener("mouseenter", (e) => {
        console.log("Mouse entered box with ID: " + follower.id);
    });

    follower.addEventListener("mouseleave", (e) => {
        console.log("Mouse left box with ID: " + follower.id);
    });
})