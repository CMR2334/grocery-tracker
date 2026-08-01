# Grocery $ Tracker Helper

A single-file, mobile-first web app that reads grocery order screenshots (Instacart, store apps, paper receipts) and splits the cost between people — items, fees, tip, tax, and promos — producing one-tap copy rows for a Google Sheet.

- **Bring your own key**: screenshot parsing calls the Anthropic API directly from your browser with a key you enter in ⚙️ Settings. The key is stored only in your browser's localStorage and sent only to `api.anthropic.com`. No backend, no analytics, no other network calls.
- All split math runs deterministically on-device; the AI only extracts what's on the receipt.
- Trips are saved locally on your device.

Open `index.html` (or the GitHub Pages site) on your phone, add your key in Settings, and upload screenshots.
