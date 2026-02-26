# Bugs Found & Fixed — SwimTrack Pro

## Integration Phase Bugs (caught during Phase 3)

### BUG-001 — Wrong table body ID
- **Found in**: Gemini-generated app.js
- **Issue**: `document.getElementById('lap-list')` — element doesn't exist
- **Fix**: Changed to `'lap-list-body'` matching the `<tbody id="lap-list-body">` in HTML
- **Severity**: Critical (lap recording would silently fail)

### BUG-002 — Jump result badge ID mismatch
- **Found in**: Gemini app.js vs Gemini index.html
- **Issue**: JS referenced `jump-false-start-badge`, HTML had `jump-result-badge`
- **Fix**: Unified to `jump-result-badge` and enhanced to show ratings (Excellent/Good/Average/Slow) not just false-start
- **Severity**: Critical (jump results never displayed)

### BUG-003 — Tab section selector broken
- **Found in**: Gemini app.js
- **Issue**: `document.querySelector('.tab-section[data-tab="..."]')` — sections had no `data-tab` attribute
- **Fix**: Added `data-tab="XXX"` attribute to all 6 `<section>` elements in HTML
- **Severity**: Critical (tab switching completely non-functional)

### BUG-004 — Add swimmer form ID missing
- **Found in**: Gemini app.js
- **Issue**: `document.getElementById('add-swimmer-form')` — HTML had no `id` on the form
- **Fix**: Added `id="add-swimmer-form"` to the form in `#section-swimmers`; also standardised `swimmer-name` / `swimmer-stroke` IDs
- **Severity**: Critical (adding swimmers broken)

### BUG-005 — Leaderboard tab selector wrong
- **Found in**: Gemini app.js
- **Issue**: `document.querySelectorAll('.leaderboard-tab')` — HTML buttons had no `leaderboard-tab` class
- **Fix**: Added `class="leaderboard-tab"` to all 5 leaderboard sub-tab buttons in HTML
- **Severity**: Major (leaderboard sub-tabs non-functional)

### BUG-006 — Duplicate jump ARM event listeners
- **Found in**: Gemini app.js
- **Issue**: `btnJumpArm` had click + touchstart + mousedown all doing the same action — triple-fires on mobile
- **Fix**: Kept only `click` event (browser synthesises this from touch correctly)
- **Severity**: Major (jump timer fires multiple times on touch devices)

### BUG-007 — CSV export uses data URI (Chrome 80+ limit)
- **Found in**: Gemini app.js
- **Issue**: `encodeURI("data:text/csv...")` — Chrome 80+ blocks navigation to data URIs; large exports silently fail
- **Fix**: Replaced with Blob + `URL.createObjectURL()` pattern with `revokeObjectURL` cleanup
- **Severity**: Major (CSV export broken in modern Chrome)

### BUG-008 — Settings tab inaccessible
- **Found in**: Gemini index.html + app.js
- **Issue**: Only 5 tabs in nav; settings section had no nav entry; settings gear icon referenced but not in HTML
- **Fix**: Added ⚙ gear button to `<header>` with `data-tab="settings"`; tab nav handles it via same showTab() logic
- **Severity**: Moderate (settings section unreachable)

### BUG-009 — No XSS protection on swimmer names
- **Found in**: Gemini app.js
- **Issue**: Swimmer names inserted directly via `innerHTML` without escaping
- **Fix**: Added `escHtml()` utility used everywhere user content is rendered
- **Severity**: Security — Medium (local app, but good practice)

## Known Limitations (not bugs)
- PWA install prompt requires HTTPS or localhost — won't show on plain `file://`
- Icons are all 225×225px `download.png`; Android may not show on home screen for some launchers (use ImageMagick to resize if needed)
- No data sync between devices (localStorage is per-device)
