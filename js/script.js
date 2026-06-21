/* ==========================================================================
   Family Hub — shared site script
   Loaded on every page. Keep this file for chrome-level behavior only
   (nav, shared widgets). Page-specific app logic lives in its own JS file.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  // Highlight whichever nav link matches the current page, so adding a new
  // page never requires manually editing the "active" class on old pages.
  var path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === path) {
      link.classList.add("active");
    }
  });
});
