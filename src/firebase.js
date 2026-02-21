// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // We add this to use the Database

const firebaseConfig = {
  apiKey: "AIzaSyAqPwESS1hAcdEmkG0lsesgadeLDKgOQRw",
  authDomain: "konectapay-43d60.firebaseapp.com",
  projectId: "konectapay-43d60",
  storageBucket: "konectapay-43d60.firebasestorage.app",
  messagingSenderId: "291857733282",
  appId: "1:291857733282:web:bb1b3a3cca387f562fe9fb",
  measurementId: "G-VS6L9P0JKB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize Cloud Firestore and export it so App.jsx can use it
export const db = getFirestore(app);
