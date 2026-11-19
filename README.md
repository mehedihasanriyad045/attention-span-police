# Attention Span Police

*Your attention span has been reported missing.*

A free browser extension for Chrome, Edge, Brave and Firefox. You start a focus mission and list the sites that distract you. If you open one of those sites during the mission, the extension brings you to an interrogation page instead. You give a reason, then choose to go back to work or go to the site anyway. Everything is stored locally.

## Develop

```
npm install
npm run dev            # Chromium (Chrome / Edge / Brave)
npm run dev:firefox
npm run build          # .output/chrome-mv3   → load unpacked in chrome://extensions, edge://extensions, brave://extensions
npm run build:firefox  # .output/firefox-mv2  → about:debugging → Load Temporary Add-on → manifest.json
npm run zip            # store-ready zips
```

End-to-end test (real navigation in Chromium via Playwright):

```
ASP_E2E=1 npx wxt build && node scripts/e2e.mjs
```

## How interception works

| | Chromium (MV3) | Firefox (MV2) |
|---|---|---|
| Restricted site | `declarativeNetRequest` dynamic redirect rules | blocking `webRequest.onBeforeRequest` |
| "Go anyway" | session `allow` rule scoped to that tab and domain, 10 min | in-memory per-tab bypass, 10 min |
| Path rules in single-page apps (`youtube.com/shorts`) | `tabs.onUpdated` URL check → redirect | same |

The extension asks for host access only to the sites you list, and only when you start a case. Timers are based on stored timestamps, and completion uses `alarms`, so the timer survives popup close, a suspended service worker and a browser restart.
