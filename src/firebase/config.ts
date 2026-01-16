// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8oFq2FeOBvJsA7q7p4cBUAHZL7COKAoY",
  authDomain: "pawme-bc0a0.firebaseapp.com",
  databaseURL: "https://pawme-bc0a0-default-rtdb.firebaseio.com",
  projectId: "pawme-bc0a0",
  storageBucket: "pawme-bc0a0.appspot.com",
  messagingSenderId: "609473314845",
  appId: "1:609473314845:web:7d88a08affcbfa5e4686f4",
  measurementId: "G-G1M8W2RRG6"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
