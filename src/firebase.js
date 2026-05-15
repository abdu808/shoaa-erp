import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyB0gR99HC9IXcZ523BrWIBXjzvWpS1kB1M",
  authDomain: "alber-invoicing-system.firebaseapp.com",
  projectId: "alber-invoicing-system",
  storageBucket: "alber-invoicing-system.firebasestorage.app",
  messagingSenderId: "469204447680",
  appId: "1:469204447680:web:dd9fe85c358e875cbb5825"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
