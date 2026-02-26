document.addEventListener("DOMContentLoaded", function () {
    // Checks if user is logged in...

    let isLoggedIn = false;  
  
    function showPage(pageId) {
      const pages = document.querySelectorAll(".page");
      pages.forEach(page => page.classList.remove("active"));
      document.getElementById(pageId).classList.add("active");
    }
  
    function requireLogin(targetPage) {
      if (!isLoggedIn) {
        alert("Please login or sign up before continuing.");
        showPage("login");
        return false;
      }
      showPage(targetPage);
      return true;
    }
  
    // Navigation to the homepage through the "Giggly" logo...
  
    document.getElementById("homeLogo")
      .addEventListener("click", () => showPage("landing"));
  
    document.getElementById("loginBtn")
      .addEventListener("click", () => showPage("login"));
  
    document.getElementById("signupBtn")
      .addEventListener("click", () => showPage("login"));
  
    // Gig & Bands button functionality...
  
    document.getElementById("hireBandBtn")
      .addEventListener("click", () => {
        if (requireLogin("bands")) {
          generateBands();
        }
      });
  
    document.getElementById("findGigBtn")
      .addEventListener("click", () => {
        if (requireLogin("gigs")) {
          generateGigs();
        }
      });
  
    // Login pop-up page...
  
    document.getElementById("loginBandBtn")
      .addEventListener("click", () => {
        isLoggedIn = true;
        showPage("profile");
      });
  
    document.getElementById("loginVenueBtn")
      .addEventListener("click", () => {
        isLoggedIn = true;
        showPage("dashboard");
      });
  
    // Card Generators...
  
    function generateBands() {
      const grid = document.querySelector("#bands .card-grid");
      grid.innerHTML = "";
  
      for (let i = 1; i <= 12; i++) {
        const card = document.createElement("div");
        card.classList.add("card");
        card.textContent = "Band " + i;
        grid.appendChild(card);
      }
    }
  
    function generateGigs() {
      const grid = document.querySelector("#gigs .card-grid");
      grid.innerHTML = "";
  
      for (let i = 1; i <= 12; i++) {
        const card = document.createElement("div");
        card.classList.add("card");
        card.textContent = "Gig " + i;
        grid.appendChild(card);
      }
    }
  
  });
