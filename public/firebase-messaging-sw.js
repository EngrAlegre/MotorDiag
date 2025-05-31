
// public/firebase-messaging-sw.js
// Use latest v10 compat scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// IMPORTANT: This configuration MUST MATCH the one in your src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyCTMt2Ou_5y7eiw9-XoCCf28ZdRgBDjfvg",
  authDomain: "motor-42313.firebaseapp.com",
  projectId: "motor-42313",
  storageBucket: "motor-42313.firebasestorage.app",
  messagingSenderId: "375727641154", // This ID is crucial for FCM
  appId: "1:375727641154:web:542ab93a8ae989ed8e93db",
  measurementId: "G-91V0B6C2MD", // Included for consistency
  databaseURL: "https://motor-42313-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase App if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // Use the already initialized app
}

const messaging = firebase.messaging();

// Optional: Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);

  let notificationTitle = 'New Message';
  let notificationOptions = {
    body: 'You have a new notification.',
    icon: '/icons/icon-192x192.png', // Default icon
    // Optionally add data for click_action if your backend sends it
    // data: { click_action: payload.data?.click_action || '/' } 
  };

  if (payload.notification) {
    notificationTitle = payload.notification.title || notificationTitle;
    notificationOptions.body = payload.notification.body || notificationOptions.body;
    notificationOptions.icon = payload.notification.icon || notificationOptions.icon;
  } else if (payload.data) { // If no 'notification' payload, try to use 'data' from data message
    notificationTitle = payload.data.title || notificationTitle;
    notificationOptions.body = payload.data.body || notificationOptions.body;
    notificationOptions.icon = payload.data.icon || notificationOptions.icon;
    // if (payload.data.click_action) {
    //   notificationOptions.data = { click_action: payload.data.click_action };
    // }
  }
  
  // Ensure self.registration is available and showNotification is a function
  if (self.registration && typeof self.registration.showNotification === 'function') {
    self.registration.showNotification(notificationTitle, notificationOptions);
  } else {
    console.error('[firebase-messaging-sw.js] self.registration.showNotification is not available or not a function.');
  }
});
