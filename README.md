# MamaFirst.AI (SMU COR2221 prototype)

A simple static website that hosts the MamaFirst.AI chatbot via Google's CX Agent Studio Web Widget.
The site does not run any chatbot logic itself, and it does not store conversations.

## Pages and files

| URL       | File               | What's on it                                   |
|-----------|--------------------|------------------------------------------------|
| `/`       | `index.html`       | Home: hero and "How it helps"                  |
| `/chat/`  | `chat/index.html`  | The chat (with mic), plus the two Google snippets |
| `/about/` | `about/index.html` | Why mums trust it, and how voice input works   |
| `/help/`  | `help/index.html`  | Emergency (995) and mindline (1771) numbers    |

Shared by every page: `styles.css` (theme and layout) and `script.js` (menu, urgent-help pop-up, chat and mic).
The top bar, footer and urgent-help button are copied into each page, so edit all four if you change them.

**Mic / voice input:** uses the browser's built-in speech-to-text (Web Speech API). Works in Chrome, Edge and Safari;
in Firefox the mic button is hidden. It needs `https://` or `http://localhost` (GitHub Pages is https).
Speech becomes text in the box; the user presses send.

## 1. Add the Google embed snippets

Open `chat/index.html` and search for `GOOGLE SNIPPET`.

1. **Snippet 1 (in `<head>`):** paste the `<script ... chat-messenger.js>` tag and the two `<link rel="stylesheet">` theme tags.
2. **Snippet 2 (end of `<body>`):** paste the `<script>` that calls `chatSdk.registerContext(...)` and the whole `<chat-messenger> ... </chat-messenger>` element.

Tip: change `color-scheme="dark"` to `color-scheme="light"` so the widget matches the theme.

## 2. Test locally

Run a local server (needed for the `/chat/`-style links, the Google widget and the mic):

```
python -m http.server 8000
```

Then open http://localhost:8000.

## 3. Deploy to GitHub Pages

1. Create a new **public** repository on GitHub (e.g. `preggo-ai`).
2. Upload `index.html`, `styles.css`, `script.js`, the `chat/`, `about/` and `help/` folders (and this README) to the repo root.
3. Go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then click **Save**.
4. After a minute your site is live at `https://<your-username>.github.io/preggo-ai/`.
5. In Google CX Agent Studio, add that GitHub Pages origin (`https://<your-username>.github.io`) to the widget's allowed domains, if your deployment requires it.
