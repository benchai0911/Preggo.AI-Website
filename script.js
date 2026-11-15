// ============================================================
// MamaFirst.AI — page interactions (shared by every page)
//
// The chatbot's "brain" is still Google's CX Agent Studio widget
// (the two Google snippets in chat/index.html). This file only:
//   - runs the page (menu, pop-up, fade-ins, image slots), and
//   - on the chat page, shows the conversation in our own phone-style
//     card, passing each message to the Google widget and showing its reply,
//   - and lets her speak instead of type (the mic button).
// Each part only runs if its elements are on the current page.
// Nothing here saves or stores what she types or says.
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  // Tell the CSS that JavaScript is running (used for the fade-in effect)
  document.documentElement.classList.add("js");

  // True if she has "reduce motion" switched on in her device settings
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollStyle = reducedMotion ? "auto" : "smooth";


  // ----------------------------------------------------------
  // 1. MOBILE MENU: the menu button opens and closes the links
  // ----------------------------------------------------------
  const menuButton = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  function setMenuOpen(open) {
    if (!nav || !menuButton) return;
    nav.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });
  }


  // ----------------------------------------------------------
  // 2. THE CHAT (chat page only)
  // ----------------------------------------------------------
  const phone = document.getElementById("phone");
  if (phone) setUpChat();

  function setUpChat() {
    const messages      = document.getElementById("messages");
    const starters      = document.getElementById("starters");
    const composer      = document.getElementById("composer");
    const input         = document.getElementById("chat-input");
    const sendButton    = document.getElementById("send");
    const newChatButton = document.getElementById("new-chat");
    const finishButton  = document.getElementById("finish-chat");
    const micButton     = document.getElementById("mic");
    const micStatus     = document.getElementById("mic-status");

    // The (hidden) Google widget. We send messages through it.
    const widget = document.querySelector("chat-messenger");

    const GREETING = "Hi, I'm MamaFirst. What's on your mind? Tap a suggestion below, type your own question, or tap the mic to speak.";
    const ERROR_TEXT = "Sorry, I couldn't reply just now. Please try again in a moment. If this is urgent, call 995.";
    const FINISH_TEXT = "I'm done chatting for today."; // sent by the "Finish chat" button
    const INPUT_MAX_HEIGHT = 220; // px: the box grows up to this, then scrolls
    const STARTER_MESSAGE_LIMIT = 2; // starter buttons hide after she has sent this many messages

    let waitingForReply = false;  // true while the bot is "typing"
    let typingBubble = null;      // the three-dots bubble, when it is showing
    let replyTimer = null;        // gives up waiting after a while
    let userMessageCount = 0;     // how many messages she has sent in this chat

    // --- Turn the bot's text into safe HTML -------------------
    // The bot writes simple formatting (**bold**, bullet lists, links).
    // First we make the text safe, then turn that formatting into HTML.
    function escapeHtml(text) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function formatInline(text) {
      // Links are set aside first (as numbered placeholders) so the bold and
      // italic rules can never change a web address, then put back at the end.
      const links = [];
      function keepLink(label, href) {
        links.push('<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + label + "</a>");
        return "\u0000" + (links.length - 1) + "\u0000";
      }

      return escapeHtml(text)
        // [words](https://link) becomes a link (only web, phone and email links allowed)
        .replace(/\[([^\]]+)\]\(((?:https?:|tel:|mailto:)[^)\s]+)\)/g,
                 (match, label, href) => keepLink(label, href))
        // A plain https:// address on its own also becomes a link (e.g. a PDF download)
        .replace(/https?:\/\/(?:(?!&quot;|&gt;)[^\s<])*(?:(?!&quot;|&gt;)[^\s<.,;:!?)'"])/g,
                 (href) => keepLink(href, href))
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")   // **bold**
        .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>") // *italic*
        .replace(/\u0000(\d+)\u0000/g, (match, index) => links[index]);
    }

    function formatBotText(text) {
      let html = "";
      let listType = null; // "ul" or "ol" while we are inside a list

      function closeList() {
        if (listType) { html += "</" + listType + ">"; listType = null; }
      }

      text.split("\n").forEach((rawLine) => {
        const line = rawLine.trim();
        const bullet   = line.match(/^[-*•]\s+(.*)/);     // "- item"
        const numbered = line.match(/^\d+[.)]\s+(.*)/);   // "1. item"
        const heading  = line.match(/^#{1,6}\s+(.*)/);    // "## Heading"

        if (bullet || numbered) {
          const type = bullet ? "ul" : "ol";
          if (listType !== type) { closeList(); html += "<" + type + ">"; listType = type; }
          html += "<li>" + formatInline((bullet || numbered)[1]) + "</li>";
        } else if (line === "") {
          closeList();
        } else {
          closeList();
          html += heading
            ? "<p><strong>" + formatInline(heading[1]) + "</strong></p>"
            : "<p>" + formatInline(line) + "</p>";
        }
      });
      closeList();
      return html;
    }

    // --- Small helpers ----------------------------------------
    function scrollToNewest() {
      messages.scrollTo({ top: messages.scrollHeight, behavior: scrollStyle });
    }

    // Add one chat bubble. who is "user" (her) or "bot" (MamaFirst).
    function addBubble(text, who) {
      const bubble = document.createElement("div");
      bubble.className = "bubble bubble-" + who;
      if (who === "bot") {
        bubble.innerHTML = formatBotText(text);
      } else {
        bubble.textContent = text; // her own words are shown exactly as typed
      }
      messages.appendChild(bubble);
      scrollToNewest();
    }

    // The send button is off when the box is empty (or while the bot is replying).
    // "Finish chat" is off until she has said something, and while the bot is replying.
    function updateSendButton() {
      sendButton.disabled = input.value.trim() === "" || waitingForReply;
      if (finishButton) finishButton.disabled = userMessageCount === 0 || waitingForReply;
    }

    // Starter buttons: full size when the chat is new, one compact row after her
    // first message, then hidden once she is chatting properly.
    function updateStarters() {
      starters.classList.toggle("is-compact", userMessageCount > 0);
      starters.hidden = userMessageCount >= STARTER_MESSAGE_LIMIT;
    }

    // Let the message box grow as she types more lines (never smaller than its 3 rows)
    function resizeInput() {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight + 3, INPUT_MAX_HEIGHT) + "px";
    }

    // --- Typing indicator (three dots) ------------------------
    function showTyping() {
      waitingForReply = true;
      typingBubble = document.createElement("div");
      typingBubble.className = "bubble bubble-bot typing";
      typingBubble.setAttribute("aria-label", "MamaFirst is typing");
      typingBubble.innerHTML = "<span></span><span></span><span></span>";
      messages.appendChild(typingBubble);
      scrollToNewest();

      starters.querySelectorAll("button").forEach((b) => { b.disabled = true; });
      updateSendButton();

      // If no reply comes within 45 seconds, stop waiting and say sorry
      replyTimer = setTimeout(() => showError(), 45000);
    }

    function hideTyping() {
      waitingForReply = false;
      clearTimeout(replyTimer);
      if (typingBubble) { typingBubble.remove(); typingBubble = null; }
      starters.querySelectorAll("button").forEach((b) => { b.disabled = false; });
      updateSendButton();
    }

    function showError() {
      if (!waitingForReply) return;
      hideTyping();
      addBubble(ERROR_TEXT, "bot");
    }

    // --- Send a message ---------------------------------------
    // Used by the send button, the Enter key and the starter buttons.
    function sendMessage(text) {
      text = text.trim();
      if (text === "" || waitingForReply) return;

      stopListening(); // if the mic is on, turn it off first

      addBubble(text, "user");
      input.value = "";
      resizeInput();
      userMessageCount++;
      updateStarters();
      showTyping();

      // Hand the message to the Google widget, which sends it to the agent
      try {
        Promise.resolve(widget.sendQuery(text)).catch(showError);
      } catch (error) {
        showError(); // the widget has not loaded (for example, no internet)
      }
    }

    // --- Receive the bot's reply ------------------------------
    // The Google widget announces each reply with this event.
    window.addEventListener("chat-messenger-response-received", (event) => {
      const replies = (event.detail && event.detail.messages) || [];
      const texts = replies
        .filter((message) => message.type === "text" && message.text)
        .map((message) => message.text);

      if (texts.length === 0) return; // nothing to show yet; keep waiting
      hideTyping();
      texts.forEach((text) => addBubble(text, "bot"));
    }, true);

    // The widget announces problems (like a lost connection) with this event
    window.addEventListener("chat-messenger-error", showError, true);

    // --- Start (or restart) the conversation ------------------
    function startNewChat() {
      stopListening();
      hideTyping();
      messages.innerHTML = "";
      userMessageCount = 0;
      updateStarters();
      updateSendButton();
      addBubble(GREETING, "bot");
      // Ask the Google widget to forget the old conversation too
      try { widget.startNewSession(); } catch (error) { /* widget not ready yet: nothing to forget */ }
    }

    // Refreshing the page clears the chat on screen, so start the agent fresh
    // too. That way a new visit never continues someone else's conversation.
    window.addEventListener("chat-messenger-loaded", () => {
      try { widget.startNewSession(); } catch (error) { /* ignore */ }
    });

    // --- Wire up the chat controls ----------------------------
    composer.addEventListener("submit", (event) => {
      event.preventDefault(); // stop the page from reloading
      sendMessage(input.value);
    });

    // Enter sends. Shift+Enter makes a new line.
    // (isComposing = she is still choosing a Chinese/Japanese character; don't send yet.)
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        sendMessage(input.value);
      }
    });

    input.addEventListener("input", () => {
      updateSendButton();
      resizeInput();
    });

    // While she is typing, move the urgent-help button out of the keyboard's way
    input.addEventListener("focus", () => document.body.classList.add("is-typing"));
    input.addEventListener("blur",  () => document.body.classList.remove("is-typing"));

    starters.querySelectorAll("[data-starter]").forEach((button) => {
      button.addEventListener("click", () => sendMessage(button.dataset.starter));
    });

    newChatButton.addEventListener("click", startNewChat);

    // "Finish chat" sends a normal message. The agent replies and offers the
    // optional PDF summary; she answers in the chat as usual. Nothing is cleared,
    // and sendMessage ignores extra taps while the bot is still replying.
    if (finishButton) {
      finishButton.addEventListener("click", () => sendMessage(FINISH_TEXT));
    }


    // ----------------------------------------------------------
    // 2b. THE MIC: speak instead of type
    //     Uses the browser's built-in speech-to-text (Web Speech API).
    //     Works in Chrome, Edge and Safari. Firefox doesn't support it,
    //     so there the mic button simply stays hidden.
    //     What she says goes into the message box; she checks it and
    //     presses send herself, so nothing is sent by accident.
    // ----------------------------------------------------------
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognizer = null;
    let listening = false;
    let textBeforeSpeaking = ""; // whatever was already in the box when she tapped the mic

    function setMicStatus(text) {
      micStatus.textContent = text;
    }

    function stopListening() {
      if (recognizer && listening) recognizer.stop();
    }

    if (SpeechRecognition && micButton) {
      micButton.hidden = false;

      recognizer = new SpeechRecognition();
      recognizer.lang = "en-SG";          // Singapore English
      recognizer.interimResults = true;   // show words as she speaks
      recognizer.continuous = false;      // stop by itself when she pauses

      recognizer.addEventListener("start", () => {
        listening = true;
        micButton.classList.add("is-listening");
        micButton.setAttribute("aria-pressed", "true");
        micButton.setAttribute("aria-label", "Stop listening");
        setMicStatus("Listening… speak now. Tap the mic again to stop.");
      });

      recognizer.addEventListener("result", (event) => {
        let spoken = "";
        for (let i = 0; i < event.results.length; i++) {
          spoken += event.results[i][0].transcript;
        }
        const joiner = textBeforeSpeaking && !/\s$/.test(textBeforeSpeaking) ? " " : "";
        input.value = textBeforeSpeaking + joiner + spoken;
        resizeInput();
        updateSendButton();
      });

      recognizer.addEventListener("end", () => {
        listening = false;
        micButton.classList.remove("is-listening");
        micButton.setAttribute("aria-pressed", "false");
        micButton.setAttribute("aria-label", "Speak your message");
        if (micStatus.textContent.startsWith("Listening")) {
          setMicStatus(input.value.trim() ? "Check your message, then press send." : "");
        }
        input.focus();
      });

      recognizer.addEventListener("error", (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicStatus("Microphone access is blocked. Allow the mic in your browser settings, or type instead.");
        } else if (event.error === "no-speech") {
          setMicStatus("I didn't hear anything. Tap the mic and try again.");
        } else if (event.error === "network") {
          setMicStatus("Voice input needs an internet connection. Please type instead.");
        } else if (event.error !== "aborted") {
          setMicStatus("Voice input didn't work just now. Please try again or type instead.");
        }
      });

      micButton.addEventListener("click", () => {
        if (listening) {
          recognizer.stop();
          return;
        }
        textBeforeSpeaking = input.value;
        setMicStatus("");
        try {
          recognizer.start();
        } catch (error) {
          setMicStatus("Voice input didn't start. Please try again.");
        }
      });
    }

    // Show the greeting when the page first loads
    addBubble(GREETING, "bot");
    updateSendButton();
    resizeInput();
  }


  // ----------------------------------------------------------
  // 3. "NEED URGENT HELP?" BUTTON AND POP-UP
  // ----------------------------------------------------------
  const urgent       = document.getElementById("urgent");
  const urgentButton = document.getElementById("urgent-button");
  const urgentPanel  = document.getElementById("urgent-panel");
  const urgentClose  = document.getElementById("urgent-close");

  function setUrgentOpen(open) {
    if (!urgentPanel) return;
    urgentPanel.hidden = !open;
    urgentButton.setAttribute("aria-expanded", String(open));
  }

  if (urgent) {
    urgentButton.addEventListener("click", () => setUrgentOpen(urgentPanel.hidden));
    urgentClose.addEventListener("click", () => {
      setUrgentOpen(false);
      urgentButton.focus();
    });

    // Tapping anywhere outside the pop-up closes it
    document.addEventListener("click", (event) => {
      if (!urgent.contains(event.target)) setUrgentOpen(false);
    });
  }

  // The Escape key closes the pop-up and the mobile menu
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setUrgentOpen(false);
      setMenuOpen(false);
    }
  });


  // ----------------------------------------------------------
  // 4. FADE SECTIONS IN AS SHE SCROLLS
  // ----------------------------------------------------------
  const revealItems = document.querySelectorAll(".reveal");

  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // only animate once
        }
      });
    }, { threshold: 0.15 });

    revealItems.forEach((item) => observer.observe(item));
  }


  // ----------------------------------------------------------
  // 5. IMAGE SLOTS
  //    Each slot shows a drawn placeholder until your own picture
  //    (images/logo.png, images/mum.png, images/mascot.png) exists.
  // ----------------------------------------------------------
  document.querySelectorAll(".image-slot").forEach((slot) => {
    const picture = slot.querySelector(".slot-img");
    if (!picture) return;

    function usePicture() {
      picture.hidden = false;
      slot.classList.add("has-image"); // CSS hides the placeholder drawing
    }

    if (picture.complete && picture.naturalWidth > 0) {
      usePicture();
    } else {
      picture.addEventListener("load", usePicture);
    }
  });


  // ----------------------------------------------------------
  // 6. FOOTER YEAR
  // ----------------------------------------------------------
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
