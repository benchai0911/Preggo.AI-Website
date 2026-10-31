# Preggo.AI (SMU COR2221 prototype)

A simple static website that hosts the Preggo.AI chatbot via Google's CX Agent Studio Web Widget.
The site does not run any chatbot logic itself, and it does not store conversations.

## Files

| File         | Purpose                                     |
|--------------|---------------------------------------------|
| `index.html` | Page content and the two Google snippet slots |
| `styles.css` | Pastel pink & cream theme and responsive layout |
| `script.js`  | Mobile menu and small page interactions     |

## 1. Add the Google embed snippets

Open `index.html` and search for `GOOGLE SNIPPET`.

1. **Snippet 1 (in `<head>`):** paste the `<script ... chat-messenger.js>` tag and the two `<link rel="stylesheet">` theme tags.
2. **Snippet 2 (end of `<body>`):** paste the `<script>` that calls `chatSdk.registerContext(...)` and the whole `<chat-messenger> ... </chat-messenger>` element.

Tip: change `color-scheme="dark"` to `color-scheme="light"` so the widget matches the theme.

## 2. Test locally

Double-click `index.html`, or (better, because some widgets need `http://`) run:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## 3. Deploy to GitHub Pages

1. Create a new **public** repository on GitHub (e.g. `preggo-ai`).
2. Upload `index.html`, `styles.css`, `script.js` (and this README) to the repo root.
3. Go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then click **Save**.
4. After a minute your site is live at `https://<your-username>.github.io/preggo-ai/`.
5. In Google CX Agent Studio, add that GitHub Pages origin (`https://<your-username>.github.io`) to the widget's allowed domains, if your deployment requires it.
