// Blink Bill — Shared Utilities
// esc()  : HTML-escape user data before putting it into innerHTML (XSS protection)
// showToast() : professional toast notification (replacement for alert)

function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message, isError = false, duration = 2600) {
  let wrap = document.getElementById("toastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toastWrap";
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }

  const toast = document.createElement("div");
  toast.className = "toast" + (isError ? " err" : "");
  toast.textContent = message;
  wrap.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------- Premium theme (light / dark) ----------
// Every page that loads utils.js gets theme support automatically.
function syncModeBtn(isDark) {
  const btn = document.getElementById("modeBtn");
  if (!btn) return;
  btn.innerHTML = isDark
    ? '<i class="fa-solid fa-sun"></i><span>Light Mode</span>'
    : '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>';
}

function applyTheme() {
  const saved = localStorage.getItem("dark");
  const isDark = saved === null
    ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
    : saved === "true";
  document.body.classList.toggle("dark", isDark);
  syncModeBtn(isDark);
}

function toggleTheme() {
  const isDark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("dark", isDark);
  syncModeBtn(isDark);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyTheme);
} else {
  applyTheme();
}

// Scan success feedback: short beep generated on-device.
// Mobile browsers create AudioContext in a "suspended" state unless unlocked
// by a user gesture, so we share ONE context, resume it on every use, and
// pre-unlock it when the SCAN button is tapped (see unlockAudio).
let _beepCtx = null;

function getBeepCtx() {
  if (!_beepCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error("Web Audio unsupported");
    _beepCtx = new AC();
  }
  if (_beepCtx.state === "suspended") _beepCtx.resume().catch(() => {});
  return _beepCtx;
}

// Call inside a click/tap handler (e.g., SCAN button) to unlock audio early
function unlockAudio() {
  try { getBeepCtx(); } catch (e) {}
}

function playBeep() {
  try {
    const ctx = getBeepCtx();
    if (ctx.state !== "running") return; // still locked — vibration covers feedback

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1250;
    // Quick attack/decay envelope so the beep is crisp and audible
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (e) { /* audio unavailable — vibration still fires */ }
}

// ArchiveDB — IndexedDB storage for archived bills (2+ months old).
// Lives OUTSIDE localStorage, so archives never hit the ~5MB quota limit.
const ArchiveDB = (() => {
  const DB_NAME = "blinkbill-archive";
  const STORE = "bills";
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) {
            req.result.createObjectStore(STORE, { keyPath: "id" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  return {
    async addMany(billList) {
      if (!billList || !billList.length) return;
      const db = await open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        billList.forEach((b) => {
          // Guarantee an id (keyPath requirement) for legacy bills
          const bill = b && b.id ? b : Object.assign({}, b, { id: "arch-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) });
          store.put(bill);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    },

    async getAll() {
      try {
        const db = await open();
        return await new Promise((resolve, reject) => {
          const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        return []; // archive unavailable (private mode etc.) — app still works
      }
    },

    async clear() {
      try {
        const db = await open();
        await new Promise((resolve) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) { /* archive optional */ }
    }
  };
})();
