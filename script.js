// Preggo.AI — page interactions only.
// The chatbot itself is provided entirely by Google's CX Agent Studio widget.
// This script does not read, save or send any conversation data.

document.addEventListener("DOMContentLoaded", () => {
  // Mobile menu toggle
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Close the menu after choosing a link
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  }

  // Briefly highlight the chat hint when a "Chat" link is used
  const hint = document.querySelector(".chat-hint");
  document.querySelectorAll('a[href="#chat"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (!hint) return;
      hint.classList.remove("is-highlighted");
      void hint.offsetWidth; // restart the animation
      hint.classList.add("is-highlighted");
    });
  });

  // Footer year
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
