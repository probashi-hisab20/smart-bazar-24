
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZax7oBZA9LHs9hlTUEstbX0NlbyC5Ae0",
  authDomain: "smart-bazar-24.firebaseapp.com",
  projectId: "smart-bazar-24",
  storageBucket: "smart-bazar-24.firebasestorage.app",
  messagingSenderId: "100684524932",
  appId: "1:100684524932:web:449afbb7e4d9f2ad2e81d1",
  measurementId: "G-RGHK2GV9BC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

