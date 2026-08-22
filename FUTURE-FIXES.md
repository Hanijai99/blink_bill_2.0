# Blink Bill — Future Fixes & Risk Register
_Created: Aug 2026 · Review this before each major update_

---

## DECISION LOG (now vs later)

### 🔴 DO NOW — Password salt upgrade
**Status:** Passwords/PINs are ALREADY SHA-256 hashed (login.html `hashPass()`) — good.
Missing only: unique salt per user.

**Why now:** Small change (~30 min), zero user impact, and the longer we wait,
the more accounts exist with unsalted hashes.

**Plan:**
- Registration: generate random 16-byte salt (`crypto.getRandomValues`),
  store `salt` + `SHA-256(salt + password)` instead of bare hash.
- Login migration: on successful login, if account has no `salt`, create one,
  re-hash current password, save. Old users upgrade transparently.
- Same for PIN hash.

### 🟡 LATER (feature phase) — Push notifications / VAPID
**Why later:** Getting the VAPID key is easy (Firebase Console → Cloud Messaging →
Web Push certificates), but **sending** pushes needs a server side
(Cloud Functions / FCM HTTP v1 with service account) to read stored tokens and
trigger messages. No point enabling half of it now.

**Future checklist:**
1. Firebase Console → generate VAPID keypair → paste into `notifications.js`
2. Store FCM tokens in Firestore (`fcmTokens/{uid}` collection)
3. Add Cloud Function: on low-stock detection or daily-close → send push
4. Test on Android TWA (Chrome) — background pushes need the app closed, not killed

---

## RISK REGISTER — what will break in 3–6 months

| # | Risk | Symptom | Trigger | Fix plan |
|---|------|---------|---------|----------|
| 1 | **localStorage quota (≈5 MB)** | Save bill fails silently / `QuotaExceededError`; newest bills lost | Bills accumulate (~0.5–1 KB each); base64 QR images in `upiBanks` (100–500 KB per bank photo) | Auto-archive bills older than 6 months to exportable JSON/Excel; compress QR images before storing; move big blobs to IndexedDB |
| 2 | **Duplicate bill numbers** | Two different bills show same number | Owner clears site data / reinstalls → `lastBillNo` resets to 1000 | Derive next number from max existing bill number instead of trusting `lastBillNo` |
| 3 | **Chart.js unpinned CDN** | Dashboard chart crashes overnight with NO code change | `load-manager.js` loads bare `npm/chart.js`; v5 breaking release | Pin exact version: `chart.js@4.4.1` |
| 4 | **Stale cache after deploy** | Users see old UI after site update | Cache-first assets + forgetting sw.js version bump | Always bump `CACHE_NAME` on ANY js/css/html change (checklist item); consider build script |
| 5 | **Print popups blocked** | PRINT button does nothing | Future Chrome/TWA tightens `window.open` policy | Migrate print() to hidden-iframe printing fallback |
| 6 | **Firestore security rules** | Shop data readable/writable by strangers | Rules left in test mode after 30 days | Audit rules: only owner UID reads/writes own collections |
| 7 | **iOS Safari data wipe** | iPhone users lose ALL local data | Safari deletes localStorage after 7 days of non-use (ITP) | If iOS targeted: cloud-sync-on-every-bill becomes mandatory |
| 8 | **Multi-device conflict** | Phone & tablet show different bills; edits overwrite | localStorage is per-device | When scaling: move bills/inventory fully to Firestore with merge logic |
| 9 | **Midnight rollover** | Bill dated wrong day in reports | Billing exactly at midnight / device clock wrong | Use server timestamp for saved bills when online |
| 10 | **GST float drift** | Totals off by ₹0.01 occasionally | Float accumulation over thousands of rows | Round per-item GST at add-time, not display-time |

## Maintenance habits (every release)
- [ ] Bump `sw.js` CACHE_NAME
- [ ] Sync changed files to `blink_bill_updated`
- [ ] Test offline: airplane mode → open app → make bill → print
- [ ] Check console for errors on index + dashboard

## Nice-to-have features queue
- bills-list.html real implementation (currently stub)
- Full CDN precache for day-1 offline (deferred — decided Aug 2026)
- WhatsApp bill share button
- Daily sales report auto-push (needs push infra above)
