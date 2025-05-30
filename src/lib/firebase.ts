
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging"; // Added Firebase Messaging

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getDatabase(app);
const auth = getAuth(app);
let messagingInstance = null;

// Initialize Firebase Messaging if supported by the browser
// This is a client-side check.
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messagingInstance = getMessaging(app);
      console.log("Firebase Messaging initialized.");
      // IMPORTANT: You need to add your VAPID key here for web push notifications.
      // Generate this key in your Firebase project settings:
      // Project settings > Cloud Messaging > Web configuration (at the bottom) > Generate key pair
      // Example: getToken(messagingInstance, { vapidKey: "YOUR_VAPID_KEY_HERE" });
      // We will handle getting the token in useNotificationPermission.ts
    } else {
      console.log("Firebase Messaging is not supported in this browser.");
    }
  }).catch(err => {
    console.error("Error checking messaging support or initializing messaging:", err);
  });
}


// Export messagingInstance directly. The hook will use it.
export { app, db, auth, messagingInstance };
