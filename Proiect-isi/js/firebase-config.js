// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    GeoPoint,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB3BhK1KxpHEZkBR4f3_qj0nccCIbYQulU",
    authDomain: "glowme-project.firebaseapp.com",
    projectId: "glowme-project",
    storageBucket: "glowme-project.firebasestorage.app",
    messagingSenderId: "580122866148",
    appId: "1:580122866148:web:6f4e12b182dbe7575717f1",
    measurementId: "G-BM1TMBL1DH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Export
export {
    app, db, auth, storage, googleProvider,
    collection, getDocs, addDoc, doc, getDoc, setDoc, query, where, orderBy, onSnapshot, GeoPoint, Timestamp,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, updateProfile,
    ref, uploadBytes, getDownloadURL
};

console.log("✅ Firebase initialized!");
