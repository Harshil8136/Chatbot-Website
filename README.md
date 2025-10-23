# Aurora Boutique Hotel

A modern, offline-capable hotel website with a fully client-side smart concierge chatbot. No external APIs or LLMs.

## Features
- Elegant marketing site with responsive layout and rich visuals
- Floating concierge chatbot with:
  - Rule-based NLU (intents, slots: dates, guests, room type)
  - Knowledge base: spa, dining, amenities, policies, location, small talk
  - Price estimation with seasonal/weekend multipliers and occupancy add-ons
  - Availability simulation (deterministic, offline)
  - Booking slot-filling and localStorage persistence
  - Confirmation with optional contact capture (name/email)
- PWA: offline caching (service worker) and `manifest.webmanifest`

## Getting started
1. Serve the folder with any static server (no build step required).
   - Python: `python3 -m http.server 5173` then open `http://localhost:5173`
   - Node: `npx serve .`
2. Open the site and click the chat bubble, or press `/` to open the chat.

## Customize
- Content: edit `index.html` sections and copy.
- Styles: tweak `assets/css/styles.css` variables and tokens.
- Chatbot rules: update `assets/js/chatbot/nlu.js` and answers in `knowledge.js`.
- Pricing/inventory: edit `ROOM_INVENTORY` and logic in `engine.js`.

## Notes
- No backend, no API keys. All data stays in the browser.
- The availability model is simplified and deterministic, suitable for demos.
- Replace SVG placeholders in `assets/images` with real photos as desired.
