# Session Changelog — Météo Express Pro

This document tracks all changes made during the development session.

---

## Table of Contents

1. [Email Alerts Removal](#1-email-alerts-removal)
2. [PDF Export (WeasyPrint)](#2-pdf-export-weasyprint)
3. [PDF Styling Fixes](#3-pdf-styling-fixes)
4. [CSS z-index Consolidation](#4-css-z-index-consolidation)
5. [Mobile CSS Merge](#5-mobile-css-merge)
6. [AI Recommendation Styling](#6-ai-recommendation-styling)
7. [Voice Search: Web Speech → Groq Whisper](#7-voice-search-web-speech--groq-whisper)
8. [Chatbot Mic Button](#8-chatbot-mic-button)
9. [Weather AI Assistant Redesign](#9-weather-ai-assistant-redesign)
10. [Chatbot Suggestion Click Fix](#10-chatbot-suggestion-click-fix)
11. [AI Recommendation Loading Fix](#11-ai-recommendation-loading-fix)
12. [AI Expand/Collapse Removal](#12-ai-expand-collapse-removal)
13. [Structured Clothing Categories](#13-structured-clothing-categories)
14. [AI Recommendation Streaming Fix](#14-ai-recommendation-streaming-fix)
15. [AI-Powered Weather Comparison Analysis](#15-ai-powered-weather-comparison-analysis)
16. [Light Mode Removal (Dark-Only Theme)](#16-light-mode-removal-dark-only-theme)
17. [Premium Motion Design System](#17-premium-motion-design-system)
18. [AI Recommendation Fallback Fix](#18-ai-recommendation-fallback-fix)

---

## 1. Email Alerts Removal

**Files modified:**
- `backend/templates/auth/profile.html` — Removed `email_alerts_enabled` checkbox
- `backend/routes/auth.py` — Removed `email_alerts_enabled` from onboarding/profile handling
- `backend/auth/models.py` — Removed `email_alerts_enabled` from DB schema and upsert
- `README.md` — Removed email alerts mention

**Description:** Completely removed the email alerts feature from the application. The database schema, profile form, and auth routes no longer reference `email_alerts_enabled`.

---

## 2. PDF Export (WeasyPrint)

**Files modified:**
- `backend/routes/weather.py` — Added `export_pdf()` route using WeasyPrint
- `backend/templates/report.html` — Self-contained PDF template with inline CSS
- `requirements.txt` — Added `weasyprint>=62.0`

**Description:** Replaced `window.print()` HTML export with server-generated PDF via WeasyPrint. The route returns `application/pdf` with `inline` Content-Disposition and proper error handling.

---

## 3. PDF Styling Fixes

**Files modified:**
- `backend/templates/report.html` — Removed `main.css` link, made template self-contained
- `backend/icon_map.py` — Added `size` parameter to `weather_icon()`, `sunrise_icon()`, `sunset_icon()` to inject explicit SVG `width`/`height` attributes

**Description:** Fixed garbled PDF output by:
1. Making `report.html` self-contained (no external CSS dependencies)
2. Switching Syne → DM Sans for headings (WeasyPrint can't render Syne at large sizes)
3. Adding explicit SVG size attributes (WeasyPrint ignores CSS sizing on inline SVGs)

---

## 4. CSS z-index Consolidation

**Files modified:**
- `backend/static/css/main.css` — Added z-index CSS variables (`--z-base` through `--z-toast`) and `--mobile-tabbar-h` to `:root`

**Description:** Replaced 13 raw z-index values with `var(--z-...)` for consistency. Added mobile tabbar height variable.

---

## 5. Mobile CSS Merge

**Files modified:**
- `backend/static/css/main.css` — Consolidated three `@media (max-width: 640px)` blocks into one with numbered sections

**Description:** Merged conflicting mobile CSS blocks, resolved `.wrap` padding conflict (90px dead code vs calc), added chatbot widget positioning using `var(--mobile-tabbar-h)`.

---

## 6. AI Recommendation Styling

**Files modified:**
- `backend/static/css/main.css` — Styled `.ai-section-title` (bigger, blue, bottom border)

**Description:** Made "Recommandations IA" section title bigger (1.2rem), blue (#5b7cfa), with blue bottom border (2px solid #5b7cfa).

---

## 7. Voice Search: Web Speech → Groq Whisper

**Files modified:**
- `backend/routes/weather.py` — Added `/api/transcribe` route using Groq Whisper
- `backend/static/js/search.js` — Replaced Web Speech API with MediaRecorder + fetch to `/api/transcribe`
- `README.md` — Updated voice search description

**Description:** Replaced browser-dependent Web Speech API with Groq Whisper (`whisper-large-v3`) for speech-to-text. Supports FR/EN with accent handling. Uses `MediaRecorder` API for audio capture.

---

## 8. Chatbot Mic Button

**Files modified:**
- `backend/templates/index.html` — Added `#wbMic` button in chatbot input row
- `backend/static/js/chatbot.js` — Added voice recording logic using same `/api/transcribe` endpoint

**Description:** Added microphone button to the Weather AI Assistant chatbot. Supports bilingual toasts and uses the same Groq Whisper transcription endpoint as the main search.

---

## 9. Weather AI Assistant Redesign

**Files modified:**
- `backend/templates/index.html` — Complete chatbot HTML redesign
- `backend/static/css/main.css` — New CSS for `.wb-btn`, `.wb-panel`, `.wb-suggestions`, `.wb-header-icon`, etc.
- `backend/static/js/chatbot.js` — Updated JavaScript for new chatbot structure
- `backend/static/js/i18n.js` — Chatbot translations (FR/EN)

**Description:** Complete chatbot redesign featuring:
- Gradient pill launcher with `ti ti-robot` icon
- Glassmorphism panel with header icon
- Suggested questions section
- All bilingual via i18n

---

## 10. Chatbot Suggestion Click Fix

**Files modified:**
- `backend/static/js/chatbot.js` — Fixed suggestion click handling

**Description:** Fixed issue where i18n `applyLanguage()` destroys `<span>` children inside buttons. Changed to use `btn.textContent` instead of `btn.querySelector('span').textContent`.

---

## 11. AI Recommendation Loading Fix

**Files modified:**
- `backend/services/weather_service.py` — Wrapped `get_ai_recommendations()` in try/except
- `backend/static/js/landing.js` — Added fallback message when `data.recommendations` is null
- `backend/templates/index.html` — Added 15s timeout for SSE stream

**Description:** Fixed issue where `get_ai_recommendations()` called Groq synchronously inside `/api/weather`, blocking the entire response. Now wrapped in try/except with fallback handling.

---

## 12. AI Expand/Collapse Removal

**Files modified:**
- `backend/templates/index.html` — Removed `ai-collapse-wrapper`, `ai-expand-btn`, `toggleAiFull()`, MutationObserver
- `backend/static/css/main.css` — Removed `.ai-collapse-wrapper`, `.ai-expand-btn` CSS
- `backend/static/js/quick-nav.js` — Removed MutationObserver and `toggleAiFull`

**Description:** Removed the expand/collapse functionality for AI recommendations. Recommendation now always shows full content.

---

## 13. Structured Clothing Categories

**Files modified:**
- `backend/services/ai_engine.py` — Updated Groq prompts to request structured clothing `{category, name, reason}`. Updated `clothing_rules` fallback. Fixed malformed JSON example.
- `backend/static/js/icon-map.js` — Updated `clothingIcon()` and `guessClothingIcon()` for structured objects
- `backend/templates/index.html` — Updated rendering to use `item.category` for icon selection
- `backend/static/js/landing.js` — Updated rendering to use `item.category`
- `backend/icon_map.py` — Added `CLOTHING_ICON_MAP` with 17 categories
- `tests/test_weather.py` — Updated clothing tests for structured objects

**Description:** Changed clothing recommendations from plain strings to structured objects with `category`, `name`, and `reason`. Frontend uses `item.category` for icon selection via `IconMap.clothingIcon()`, never guesses from name text. Fixed malformed JSON example that caused 502 errors.

---

## 14. AI Recommendation Streaming Fix

**Files modified:**
- `backend/services/ai_engine.py` — Increased `max_tokens` from 1024 to 2048. Fixed rate-limit detection (removed `"limit"` from match pattern). Stopped caching rule-based fallback results. Reconstructed `stream_recommendation()` body.
- `backend/templates/index.html` — Increased SSE timeout from 10s to 15s.

**Description:** Multiple fixes for AI recommendation streaming:
1. Increased `max_tokens` to 2048 (1024 was too low for structured clothing JSON)
2. Fixed rate-limit detection that falsely matched "max completion tokens" errors
3. Only Groq responses are cached (not fallbacks), so failed requests retry Groq next time
4. Reconstructed `stream_recommendation()` function body (was accidentally deleted)
5. Increased frontend timeout from 10s to 15s

---

## 15. AI-Powered Weather Comparison Analysis

**Files modified:**
- `backend/services/ai_engine.py` — Added `get_comparison_analysis()` function
- `backend/routes/weather.py` — Added `compare_data()` and `api_compare_analysis()` endpoints
- `backend/templates/compare.html` — Added AI comparison card with skeleton loading and AJAX fetch
- `backend/static/js/i18n.js` — Added 12 comparison analysis i18n keys
- `tests/test_weather.py` — Added 3 comparison analysis tests

**Description:** Added AI-powered comparison analysis between two cities. Features:
- Groq-powered analysis with rule-based fallback
- `GET /compare/data` endpoint for weather data
- `POST /api/compare-analysis` endpoint for AI analysis
- Skeleton loading animation
- FR/EN i18n support
- New test class `TestCompareAnalysis`

---

## 16. Light Mode Removal (Dark-Only Theme)

**Files modified:**
- `backend/static/css/main.css` — Removed all `[data-theme="light"]` CSS blocks
- `backend/templates/compare.html` — Removed theme toggle button and inline theme JS
- `backend/templates/auth/profile.html` — Forced `data-theme="dark"`
- `backend/templates/auth/signup.html` — Forced `data-theme="dark"`
- `backend/templates/auth/login.html` — Forced `data-theme="dark"`
- `backend/templates/auth/onboarding.html` — Forced `data-theme="dark"`
- `backend/static/js/theme.js` — Simplified to dark-only: `initTheme()` just sets `data-theme="dark"`
- `backend/static/js/init.js` — Removed `toggleTheme` import and `window.toggleTheme` export
- `backend/static/js/charts.js` — Removed `MutationObserver` for theme changes
- `backend/static/js/icon-map.js` — Removed `theme-light`/`theme-dark` aliases
- `backend/static/js/i18n.js` — Removed empty `"theme"` keys
- `README.md` — Updated "Mode sombre / clair (persistant)" → "Mode sombre"

**Description:** Completely removed light mode. All templates forced to `data-theme="dark"`. Theme toggle buttons removed. `prefers-color-scheme` detection removed. localStorage theme saving removed.

---

## 17. Premium Motion Design System

**Files modified:**
- `backend/static/css/main.css` — Added forecast card staggered entrance (`fadeUp` animation), AI recommendation content fade-in (`.ai-fade-in`/`.ai-visible`), location detection button feedback (`.locating` class), compare page animated stat bars (`.stat-bar`/`.stat-bar-fill`)
- `backend/templates/index.html` — Added forecast card `animation-delay` via Jinja `loop.index0 * 0.08s`, AI content fade-in wrapper, weather data number counting via `countUp()`
- `backend/static/js/utils.js` — Added `countUp(el, target, duration, suffix)` function with ease-out cubic and `prefers-reduced-motion` check
- `backend/static/js/search.js` — Added `.locating` class toggle during geolocation
- `backend/static/js/landing.js` — Added forecast card stagger with JS `animation-delay`
- `backend/templates/compare.html` — Added stat bars with `animation-delay` trigger

**Description:** Implemented 5 premium motion design features:
1. **Forecast card staggered entrance** — Cards animate in sequence with 80ms delay between each
2. **AI recommendation content fade-in** — Content fades in from below after streaming completes
3. **Weather data number counting** — Hero numbers count up from 0 with easing
4. **Location detection button feedback** — Spin animation during geolocation
5. **Compare page animated bars** — Stat bars animate from 0 to their value on page load

---

## 18. AI Recommendation Streaming Fix — EventSource Migration

**Files modified:**
- `backend/templates/index.html` — Replaced `fetch()` + `ReadableStream` manual parsing with native `EventSource` API for SSE consumption
- `SESSION_CHANGELOG.md` — This file

**Description:** The previous `fetch()` + `ReadableStream` approach manually parsed SSE data by splitting on `\n` and extracting `data:` lines. This approach had reliability issues across browsers because:
1. `ReadableStream.getReader()` could split chunks mid-SSE-event
2. `TextDecoder` streaming mode could mangle multi-byte UTF-8 characters across chunk boundaries
3. Manual SSE parsing duplicated what the browser already implements natively

Replaced with `EventSource` API — the browser's native SSE client that handles all protocol parsing, reconnection, and chunk boundaries automatically. The `onmessage` handler receives `e.data` (content after `data: `) directly, and `[DONE]` is detected to close the connection and render cards.

**Note:** The AI recommendation streaming works correctly from the server side (verified via curl and Python tests). If users still see the fallback after this fix, they should hard-refresh their browser (Ctrl+Shift+R) to clear cached JavaScript files.

---

## Summary of All Changed Files

### Backend
- `backend/routes/weather.py` — PDF export, transcribe endpoint, compare data, compare analysis
- `backend/routes/auth.py` — Removed email alerts
- `backend/services/ai_engine.py` — Structured clothing, streaming fixes, comparison analysis
- `backend/services/weather_service.py` — AI recommendation error handling
- `backend/auth/models.py` — Removed email alerts from DB schema
- `backend/icon_map.py` — PDF icon sizes, clothing icon map
- `requirements.txt` — Added weasyprint

### Frontend
- `backend/static/css/main.css` — z-index variables, mobile merge, AI styling, dark-only theme, motion design system
- `backend/static/js/search.js` — Groq Whisper voice search, location detection feedback
- `backend/static/js/chatbot.js` — Mic button, suggestion click fix
- `backend/static/js/landing.js` — AI null-fallback handling, structured clothing rendering, forecast stagger
- `backend/static/js/theme.js` — Simplified to dark-only
- `backend/static/js/init.js` — Removed theme toggle
- `backend/static/js/charts.js` — Removed theme MutationObserver
- `backend/static/js/icon-map.js` — Removed theme aliases, updated clothing icons
- `backend/static/js/i18n.js` — Chatbot translations, comparison analysis keys, removed theme keys
- `backend/static/js/utils.js` — Added `countUp()` function

### Templates
- `backend/templates/index.html` — SSE streaming, AI recommendations, chatbot, motion design, dark theme
- `backend/templates/compare.html` — AI comparison card, stat bars, dark theme
- `backend/templates/report.html` — Self-contained PDF template
- `backend/templates/auth/profile.html` — Removed email alerts, dark theme
- `backend/templates/auth/signup.html` — Dark theme
- `backend/templates/auth/login.html` — Dark theme
- `backend/templates/auth/onboarding.html` — Dark theme

### Tests
- `tests/test_weather.py` — 18 tests total: 10 original + 5 transcribe + 3 compare-analysis

### Documentation
- `README.md` — Updated feature descriptions, tech stack
- `SESSION_CHANGELOG.md` — This file
