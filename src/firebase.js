import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAecDSzQTpGhUjJLpHG2MXeaS52cXLXV-g",
  authDomain: "cms-preschool-attendance.firebaseapp.com",
  projectId: "cms-preschool-attendance",
  storageBucket: "cms-preschool-attendance.firebasestorage.app",
  messagingSenderId: "509383839613",
  appId: "1:509383839613:web:c179030927dccc30050614",
  measurementId: "G-0CJT6EK7Y6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
