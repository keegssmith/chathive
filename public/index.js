import { auth } from "./app.js";
import * as firebaseAuth from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    // Get all the hive buttons
    const hexButtons = document.querySelectorAll('.hex-container');

    // Loop through all buttons and add hover event listeners
    hexButtons.forEach(button => {
        // Get the image inside each button
        const img = button.querySelector('.button-hive');

        // Change image on hover
        button.addEventListener('mouseover', function () {
            img.src = "selected-button.png";
        });

        // Change image back
        button.addEventListener('mouseout', function () {
            img.src = "unselected-button.png";
        });
    });

    // Toggle dropdown menu visibility
    document.getElementById("menu-button").addEventListener("click", function (event) {
        event.stopPropagation();
        const menuDropdown = document.getElementById("menu-dropdown");
        menuDropdown.classList.toggle("hidden");
    });

    // Close dropdown if clicked outside
    document.addEventListener("click", function (event) {
        const menuDropdown = document.getElementById("menu-dropdown");
        const menuButton = document.getElementById("menu-button");

        if (!menuButton.contains(event.target) && !menuDropdown.contains(event.target)) {
            menuDropdown.classList.add("hidden");
        }
    });
    

    // Logout button event listener
    document.getElementById("logout-button").addEventListener("click", function () {
        firebaseAuth.signOut(auth)
            .then(() => {
                console.log("User signed out");
                alert("Logged out successfully!");
            })
            .catch((error) => {
                console.error("Error signing out:", error.message);
                alert(error.message);
            });
    });
});