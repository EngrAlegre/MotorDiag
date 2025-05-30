
// public/firebase-messaging-sw.js
// This service worker script is essential for receiving web push notifications.

// Scripts for Firebase products
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// Pass in the messagingSenderId.
// IMPORTANT: Replace with your actual Firebase project configuration:
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


// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'MotoVision Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: payload.notification?.icon || '/motovision-icon-192.png', // Default icon
    image: payload.data?.image, // Optional: if you send an image URL in the data payload
    badge: '/motovision-badge-72.png', // Optional: for Android
    vibrate: [200, 100, 200], // Optional: vibration pattern
    data: {
      url: payload.data?.url || '/', // URL to open when notification is clicked
      // Add any other data you want to pass to the click event
    },
    actions: payload.data?.actions ? JSON.parse(payload.data.actions) : [], // E.g. [{ action: 'explore', title: 'Explore now' }]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Close the notification

  const urlToOpen = event.notification.data?.url || '/';

  // This looks to see if the current is already open and focuses it.
  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
