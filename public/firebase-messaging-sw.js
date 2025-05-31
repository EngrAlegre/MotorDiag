
// Give the service worker access to Firebase Messaging.
// Import the Firebase app and messaging modules using the compat libraries
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTMt2Ou_5y7eiw9-XoCCf28ZdRgBDjfvg",
  authDomain: "motor-42313.firebaseapp.com",
  projectId: "motor-42313",
  storageBucket: "motor-42313.firebasestorage.app",
  messagingSenderId: "375727641154", // Ensure this is correct
  appId: "1:375727641154:web:542ab93a8ae989ed8e93db",
  databaseURL: "https://motor-42313-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
if (!firebase.apps.length) {
  console.log('[firebase-messaging-sw.js] Initializing Firebase app...');
  firebase.initializeApp(firebaseConfig);
  console.log('[firebase-messaging-sw.js] Firebase app initialized.');
} else {
  firebase.app(); // if already initialized, use that one
  console.log('[firebase-messaging-sw.js] Firebase app already initialized.');
}

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();
console.log('[firebase-messaging-sw.js] Firebase Messaging instance retrieved.');

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);

  const notificationTitle = payload.notification?.title || 'New MotoVision Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update from MotoVision.',
    icon: payload.notification?.icon || '/icons/icon-192x192.png',
    data: payload.data || { click_action: '/' } // Ensure there's always a click_action
  };

  // Ensure clients.matchAll is available before calling it
  if (self.clients && typeof self.clients.matchAll === 'function') {
    // Optional: Check if the app is already in the foreground
    // event.waitUntil(
    //   self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    //     let BROWSER_TAB_IS_ALREADY_OPEN = false;
    //     for (let i = 0; i < windowClients.length; i++) {
    //       const windowClient = windowClients[i];
    //       if (windowClient.url === self.location.origin + '/') { // Adjust URL if needed
    //         BROWSER_TAB_IS_ALREADY_OPEN = true;
    //         break;
    //       }
    //     }
    //     if (BROWSER_TAB_IS_ALREADY_OPEN) {
    //       console.log('[firebase-messaging-sw.js] Application tab is already open.');
    //       // Optionally, do not show notification or handle differently
    //     } else {
          return self.registration.showNotification(notificationTitle, notificationOptions);
    //     }
    //   })
    // );
  } else {
      console.log('[firebase-messaging-sw.js] clients.matchAll not supported, showing notification directly.');
      return self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification.data);
  event.notification.close();

  const clickAction = event.notification.data?.click_action || '/';

  // Ensure clients.openWindow is available before calling it
  if (self.clients && typeof self.clients.openWindow === 'function') {
    event.waitUntil(
      self.clients.openWindow(clickAction)
    );
  } else {
     console.warn('[firebase-messaging-sw.js] clients.openWindow is not supported.');
  }
});

self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing...');
  // event.waitUntil(self.skipWaiting()); // Optional: activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated.');
  // event.waitUntil(self.clients.claim()); // Optional: take control of open clients
});
