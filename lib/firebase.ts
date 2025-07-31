import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"
// Remove direct analytics import and initialization
// Analytics will be initialized in a client-only effect

// Your Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// This will show us what values Firebase is actually seeing from your environment variables.
console.log("Firebase Config (from env):", firebaseConfig)

let appInstance: any = null
let dbInstance: any = null
let authInstance: any = null
let storageInstance: any = null
let analyticsInstance: any = null // Will be set in client-only effect
let isConfigured = false // Flag to track successful configuration

try {
  if (!getApps().length) {
    // Check if essential config is present before initializing
    if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId) {
      appInstance = initializeApp(firebaseConfig)
      isConfigured = true
    } else {
      console.error(
        "Firebase: Missing essential environment variables for initialization. Firebase will not be fully functional.",
      )
    }
  } else {
    appInstance = getApps()[0]
    isConfigured = true
  }

  if (isConfigured && appInstance) {
    dbInstance = getFirestore(appInstance)
    authInstance = getAuth(appInstance)
    storageInstance = getStorage(appInstance)

    // Analytics will be initialized in a client-only effect
    console.log("Firebase initialized successfully")
  } else {
    console.warn(
      "Firebase: App not initialized due to missing config or previous error. Some services may be unavailable.",
    )
  }
} catch (error) {
  console.error("Error initializing Firebase:", error)
  isConfigured = false // Ensure flag is false on error
}

export { dbInstance as db, authInstance as auth, storageInstance as storage }
export const getAnalyticsClient = () => {
  if (typeof window !== "undefined" && appInstance && firebaseConfig.measurementId) {
    // Dynamically import analytics only on client
    return import("firebase/analytics").then(mod => mod.getAnalytics(appInstance));
  }
  return null;
}
export const analytics = null; // For compatibility
export const isFirebaseConfigured = isConfigured
export default appInstance
