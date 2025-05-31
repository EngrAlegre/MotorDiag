
// Scripts for Firebase products will be imported here
// Ensure you have the VAPID_KEY set correctly below.
// This key is obtained from your Firebase project settings:
// Project settings > Cloud Messaging > Web configuration (bottom) > Web Push certificates.

self.FIREBASE_APP_ID_VAR = '1:375727641154:web:542ab93a8ae989ed8e93db'; // Your Firebase App ID

// IMPORTANT: REPLACE WITH YOUR ACTUAL VAPID KEY
const VAPID_KEY = "BAvhUFbdb7XCE-loO_Xn9XekWZ0wEaeIzgj-yy8RcqR458ZXuSVHBML8KPa9NBOuKEYqWialsc-xBlIaFc2tv3o";


// Import and initialize the Firebase SDK
// These are the "compat" libraries suitable for service workers using importScripts
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

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

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: payload.notification?.icon || '/icons/icon-192x192.png', // Default icon
    data: payload.data // Pass along any data for click actions
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification.data);

  const clickAction = event.notification.data?.click_action || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Check if the client is already open and focused
        if (client.url === self.location.origin + clickAction && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

// Optional: console log to confirm SW is active (for debugging)
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated.');
  // If using clients.claim() it's good practice but ensure you understand its implications
  // event.waitUntil(self.clients.claim());
});
