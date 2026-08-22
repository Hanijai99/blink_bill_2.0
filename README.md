# Blink Bill

Fast billing + inventory + UPI payments app for Indian shops. Works as a PWA (installable) and as a Play Store TWA app. All business data stays on the device (localStorage); seller accounts are managed via Firebase Firestore.

## Pages

| File | Purpose |
|------|---------|
| `login.html` | Seller login / register / recover (Firebase) |
| `index.html` | Main billing screen (cart, scan, save, WhatsApp, print, UPI) |
| `stock.html` | Stock management + barcode scanning |
| `qr-generation.html` | Add product & generate QR/barcode labels |
| `history.html` | Customer bill history with search |
| `dashboard.html` | Stats, charts, predictions, insights |
| `expenses.html` | Daily expense tracking |
| `upi.html` | Customer-facing UPI payment QR screen |
| `upi_manage.html` | Manage multiple UPI bank accounts |
| `bill-settings.html` | Shop details used on printed bills |
| `privacy-policy.html` | In-app privacy policy |
| `offline.html` | Shown when offline |

## Key JS files

- `script.js` — billing logic, cart, GST, backup/restore, WhatsApp/print
- `utils.js` — shared helpers (`esc()` XSS protection, `showToast()` notifications)
- `load-manager.js` — lazy-loads heavy libraries on demand (scanner, Chart.js, jsPDF)
- `analytics.js` — stock prediction & customer analysis heuristics
- `sw.js` — service worker (offline app shell cache)
- `firebase-messaging-sw.js` / `notifications.js` — push notifications

## Development

No build step. Serve the folder over HTTP(S) and open `login.html`:

```
npx serve .
# or
python -m http.server 8080
```

Note: service worker and Firebase require HTTPS (or localhost).

## Deploy notes

- Host at domain root — `manifest.json` uses `scope: "/"`.
- After any code change, bump `CACHE_NAME` in `sw.js` so clients get updates.
- `assetlinks.json` must stay under `.well-known/` for the Android TWA.
