// Firebase Cloud Messaging — background notification handler
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDsU2e8EPlOEwAE-jOXhwHbF7RXnX_MecI",
  authDomain: "blink-bill-version1.firebaseapp.com",
  projectId: "blink-bill-version1",
  storageBucket: "blink-bill-version1.firebasestorage.app",
  messagingSenderId: "699722725956",
  appId: "1:699722725956:web:4711ca2cf4f6eca4e59a11"
});

const messaging = firebase.messaging();

// Shows a notification when a push arrives while the app is in the background/closed
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Blink Bill";
  const options = {
    body: payload.notification?.body || "",
    icon: "/logo195.png",
    badge: "/logo195.png",
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

// Open (or focus) the app when the notification is tapped
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/dashboard.html");
      }
    })
  );
});
