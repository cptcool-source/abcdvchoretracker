// ==========================================================================
// Firebase setup — fill this in after creating your Firebase project.
// See README.md for the full step-by-step.
// ==========================================================================

// Project settings → General → "Your apps" → SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "AIzaSyBoAE_ftrQiqdclYGDYdK0euvzcTzQrZn8",
  authDomain: "abcdvchoretracker.firebaseapp.com",
  databaseURL: "https://abcdvchoretracker-default-rtdb.firebaseio.com",
  projectId: "abcdvchoretracker",
  storageBucket: "abcdvchoretracker.firebasestorage.app",
  messagingSenderId: "897706879678",
  appId: "1:897706879678:web:28e80d9f124f662e8b0cef",
  measurementId: "G-4DL82KL3S4"
};

// These build the real Firebase Auth password behind the scenes from
// whatever 4-digit code your family types into the gate. They are not
// secret by themselves — the actual secret is the password you set on the
// one family user account in the Firebase console (README walks through
// this). No need to change these unless you want to.
export const FAMILY_EMAIL = "family@chore-squad.local";
export const PASSWORD_PREFIX = "famhub-";

// Cloudinary — free file hosting for the Memories page (photos + documents).
// Free plan at cloudinary.com gives 25 GB storage, no credit card needed.
// Setup: 1) Sign up at cloudinary.com  2) Copy your "Cloud name" from the Dashboard
//        3) Settings → Upload → Add upload preset → Signing Mode: Unsigned → copy preset name
export const CLOUDINARY_CLOUD_NAME    = "davihhyyt";
export const CLOUDINARY_UPLOAD_PRESET = "ldhu9tbp";
