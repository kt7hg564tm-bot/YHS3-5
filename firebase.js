import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA03zVmXChlsJdsk7eHh_ayz5G4LH08pZA",
  authDomain: "yhs3-5.firebaseapp.com",
  projectId: "yhs3-5",
  storageBucket: "yhs3-5.firebasestorage.app",
  messagingSenderId: "462063573880",
  appId: "1:462063573880:web:e59429af12f5eef9d5068d"
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);

// Firestoreを初期化
const db = getFirestore(app);

// 他のJavaScriptファイルから使えるようにする
export { app, db };
