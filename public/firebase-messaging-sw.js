
// Import the Firebase app and messaging modules
// These imports work because the Firebase SDK uses a UMD build that can be imported this way in service workers.
// Ensure your bundler (Next.js/Webpack) doesn't try to tree-shake or process these differently for the SW context.
// If you face issues, you might need to use importScripts('https://www.gstatic.com/firebasejs/X.Y.Z/firebase-app.js') and .../firebase-messaging.js instead.
// However, modern Firebase SDKs often handle this better.

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

console.log('[firebase-messaging-sw.js] Service worker script loading.');

// Your web app's Firebase configuration - MUST match the one in your main app
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

try {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Customize notification here
    // The payload structure depends on what your server sends.
    // Standard FCM notifications have a `notification` field.
    // Data-only messages will have data in `payload.data`.
    const notificationTitle = payload.notification?.title || 'MotoVision Alert';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new update from MotoVision.',
      icon: '/icons/icon-192x192.png', // Ensure this icon exists in your public/icons folder
      badge: '/icons/icon-192x192.png', // Optional: A badge for the notification
      // You can add more options like actions, vibrate, etc.
      // actions: [
      //   { action: 'view_dashboard', title: 'View Dashboard' }
      // ]
    };

    // event.waitUntil is important to ensure the service worker stays alive
    // until the notification is shown.
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => console.log('[firebase-messaging-sw.js] Notification shown.'))
      .catch(err => console.error('[firebase-messaging-sw.js] Error showing notification:', err));
  });

  // Optional: Log successful SW registration or activation
  self.addEventListener('install', (event) => {
    console.log('[firebase-messaging-sw.js] Service worker installed.');
  });
  
  self.addEventListener('activate', (event) => {
    console.log('[firebase-messaging-sw.js] Service worker activated.');
    // It's good practice to claim clients here to ensure the SW controls pages immediately
    event.waitUntil(clients.claim());
  });

  // Optional: Handle notification clicks
  // self.addEventListener('notificationclick', (event) => {
  //   console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);
  //   event.notification.close(); // Close the notification
  
  //   // Example: Open the app or a specific page
  //   const urlToOpen = new URL('/', self.location.origin).href;
  
  //   event.waitUntil(
  //     clients.matchAll({
  //       type: 'window',
  //       includeUncontrolled: true
  //     }).then((windowClients) => {
  //       // Check if there is already a window/tab open with the target URL
  //       const existingClient = windowClients.find(client => client.url === urlToOpen && 'focus' in client);
  
  //       if (existingClient) {
  //         return existingClient.focus();
  //       } else {
  //         // If not, open a new window/tab
  //         if (clients.openWindow) {
  //           return clients.openWindow(urlToOpen);
  //         }
  //       }
  //     })
  //   );
  // });

} catch (error) {
  console.error('[firebase-messaging-sw.js] Error initializing Firebase Messaging in SW:', error);
}
