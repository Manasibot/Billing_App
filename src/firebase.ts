// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache,
  Timestamp,
  FieldValue
} from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEz18fNkoFJDPjn1rX4ghJekymtl7HGb4",
  authDomain: "stock-app-94298.firebaseapp.com",
  projectId: "stock-app-94298",
  storageBucket: "stock-app-94298.appspot.com",
  messagingSenderId: "241365161034",
  appId: "1:241365161034:web:702a5f29a61c57a58dc2b3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = initializeFirestore(app, {});

export { Timestamp, FieldValue };
