
// public/firebase-messaging-sw.js

// IMPORTANT: Import the Firebase SDKs using importScripts (for service workers)
// Use the "compat" versions of the Firebase SDKs for this method.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration (ensure this matches your app's config)
const firebaseConfig = {
  apiKey: "AIzaSyCTMt2Ou_5y7eiw9-XoCCf28ZdRgBDjfvg",
  authDomain: "motor-42313.firebaseapp.com",
  projectId: "motor-42313",
  storageBucket: "motor-42313.firebasestorage.app",
  messagingSenderId: "375727641154",
  appId: "1:375727641154:web:542ab93a8ae989ed8e93db",
  measurementId: "G-91V0B6C2MD",
  databaseURL: "https://motor-42313-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New MotoVision Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update from MotoVision.',
    icon: payload.notification?.icon || '/icons/icon-192x192.png', // A default icon
    badge: '/icons/badge-72x72.png', // Optional: for Android notification drawer
    data: payload.data // Pass along any data from the FCM message
  };

  // Check if self.registration is available
  if (self.registration && self.registration.showNotification) {
    self.registration.showNotification(notificationTitle, notificationOptions);
  } else {
    console.error('[firebase-messaging-sw.js] self.registration.showNotification is not available.');
  }
});

// Optional: Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Close the notification

  const notificationData = event.notification.data;
  console.log('[firebase-messaging-sw.js] Notification click received. Data:', notificationData);

  // The URL to open when the notification is clicked
  // Use click_action from FCM data if available, otherwise a default path
  const targetUrl = notificationData?.click_action || event.notification.data?.FCM_MSG?.data?.click_action || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window hosting the PWA is already open and matches the target URL, focus it
      for (const client of clientList) {
        // Check if client.url matches the base of targetUrl or the full targetUrl
        const clientBaseUrl = new URL(client.url).origin + new URL(client.url).pathname;
        const targetBaseUrl = new URL(targetUrl, self.location.origin).origin + new URL(targetUrl, self.location.origin).pathname;
        
        if (clientBaseUrl === targetBaseUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open or matches, open a new one
      if (clients.openWindow) {
        return clients.openWindow(new URL(targetUrl, self.location.origin).href);
      }
    })
  );
});

// This is important to ensure the service worker activates quickly.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
