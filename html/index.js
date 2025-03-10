document.getElementById("hex-button").addEventListener("click", function() {
    let img = document.getElementById("hex-image");

    // Toggle between the two images
    if (img.src.includes("unselected-button.png")) {
        img.src = "selected-button.png";
    } else {
        img.src = "unselected-button.png";
    }
});
