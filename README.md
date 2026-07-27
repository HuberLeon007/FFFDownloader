# HarvestDL

A cross-browser (Firefox + Chromium) Manifest V3 WebExtension that harvests download
links from pages **you** configure, groups them into semantic sections, and hands them
to your existing download manager.

HarvestDL is **not** a download manager. It is a scraper and a smart download trigger.

## Features

- **User-defined site profiles** — no hardcoded domains. You supply match domains,
  include/exclude patterns, content selectors, reveal selectors and grouping rules.
- **Hidden content reveal** — force-opens collapsed spoilers, `details` elements and
  `display:none` containers before scraping.
- **Semantic grouping** — ordered, user-editable rules split links into required and
  optional sections (languages, bonus content, whatever you define).
- **Multi-strategy download trigger** — browser native (IDM, AB Download Manager, ...),
  JDownloader 2 (FlashGot), aria2 (JSON-RPC), or any custom endpoint. Automatic fallback
  to the browser when a local service is unreachable.
- **Library** — per-page history with download progress, favorites and notes.
- **Polished dark UI** — 500x700 popup, Framer Motion throughout, honors
  `prefers-reduced-motion`.

## Tech stack

Plasmo · React 19 · TypeScript 5.7 (strict) · Tailwind CSS 4 · Framer Motion 12 ·
lucide-react · vitest

## Getting started

```bash
npm install
npm run dev:firefox     # or: npm run dev  (Chromium)
```

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Pick `build/firefox-mv3-dev/manifest.json`

Temporary add-ons are removed when Firefox restarts. For a persistent install, run
`npm run build:firefox` and load the generated zip from `build/`
(unsigned zips require Firefox Developer Edition / Nightly with
`xpinstall.signatures.required = false` in `about:config`).

### Load in Chrome / Edge / Brave / Opera / Vivaldi

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → `build/chrome-mv3-dev`

## Configuring a site profile

Open the popup → gear icon → **Site profiles** → **New**, then fill in:

| Field | Meaning |
| --- | --- |
| Match domains | One hostname per line. Subdomains match automatically. |
| Include patterns | A link must match at least one. Empty = allow everything. |
| Exclude patterns | A link matching any of these is dropped. |
| Content selectors | CSS selectors of the containers to scrape. |
| Reveal selectors | Collapsed/hidden containers to force open first. |
| Reveal keywords | Lowercase text of "click to expand" style triggers. |
| Group rules | Ordered classifiers, first match wins. |
| Label strip prefixes | Removed when deriving a `{clean}` label. |

Finally flip the toggle to enable the profile.

### Pattern syntax

Every pattern field accepts either a **plain substring** (case-insensitive) or a
**regex** wrapped in slashes:

```
soundtrack              # substring
/\.(rar|zip|7z)$/i      # regex
```

### Group rule labels

Labels support placeholders:

| Placeholder | Resolves to |
| --- | --- |
| `{match}` | The full matched text |
| `{1}` … `{9}` | Regex capture groups |
| `{clean}` | Filename/fragment with prefixes, part suffixes and extensions stripped |

Example: pattern `/(german|french|polish)/i` with label `Optional Language: {1}`
produces `Optional Language: German`.

## Download managers

| Strategy | How it works |
| --- | --- |
| Browser Native | `downloads.download()`. IDM, AB Download Manager etc. hook into this. |
| JDownloader 2 | `POST http://host:9666/flashgot`, falls back to browser on failure. |
| aria2 | `aria2.addUri` JSON-RPC on `http://host:6800/jsonrpc`, optional secret token. |
| Custom | Any GET endpoint using `{url}` and `{filename}` placeholders. |

Use **Test connection** in settings to verify a local service is reachable.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Enter` | Scan the active page |
| `Escape` | Clear the filter |
| `Ctrl`/`Cmd` + `A` | Select all links |

## Scripts

```bash
npm run dev             # Chromium dev build with HMR
npm run dev:firefox     # Firefox dev build with HMR
npm run build:firefox   # Production zip for Firefox
npm run build:chrome    # Production zip for Chromium
npm run typecheck       # tsc --noEmit
npm test                # vitest
```

## A note on permissions

Because target domains are configured at runtime, the content script is registered for
`<all_urls>` but is **inert on every page that does not match an enabled profile** — it
bails out before touching the DOM. If you prefer narrow permissions, hardcode your
domains in the `matches` array of `src/contents/harvest.ts` and drop `host_permissions`
from `package.json`.

Only use this on sites whose terms allow automated access, and only for content you have
the right to download.

## License

MIT
