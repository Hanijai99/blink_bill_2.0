// Blink Bill — push notification setup
// Requires: firebase-messaging-sw.js registered, and a VAPID key from
// Firebase Console > Project Settings > Cloud Messaging > Web Push certificates

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsU2e8EPlOEwAE-jOXhwHbF7RXnX_MecI",
  authDomain: "blink-bill-version1.firebaseapp.com",
  projectId: "blink-bill-version1",
  storageBucket: "blink-bill-version1.firebasestorage.app",
  messagingSenderId: "699722725956",
  appId: "1:699722725956:web:4711ca2cf4f6eca4e59a11"
};

// TODO: paste your VAPID key here (Firebase Console > Cloud Messaging > Web Push certificates)
const VAPID_KEY = "BHA7I42rlSwoT-OMtEt28lNmWA85NtadKrxFSxQn5mjMBs6MtNmmC7Iin_ktg9reDZLBohP9UF_ivOuF3aEA4Ig";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function setupPushNotifications(ownerId) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.log("Push not supported on this device/browser");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission not granted");
      return;
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token && ownerId) {
      // Save token so a Cloud Function can send this device a notification later
      await setDoc(doc(db, "fcmTokens", ownerId), {
        token,
        updatedAt: new Date().toISOString(),
        platform: "web"
      });
      console.log("Push notification token saved");
    }

    // Foreground notifications (app open and in focus)
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "Blink Bill";
      const body = payload.notification?.body || "";
      new Notification(title, { body, icon: "/logo195.png" });
    });
  } catch (err) {
    console.log("Push notification setup failed:", err);
  }
}
