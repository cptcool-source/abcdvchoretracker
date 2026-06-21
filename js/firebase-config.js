// ==========================================================================
// Firebase setup — fill this in after creating your Firebase project.
// See README.md for the full step-by-step.
// ==========================================================================

// Project settings → General → "Your apps" → SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://PASTE_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// These build the real Firebase Auth password behind the scenes from
// whatever 4-digit code your family types into the gate. They are not
// secret by themselves — the actual secret is the password you set on the
// one family user account in the Firebase console (README walks through
// this). No need to change these unless you want to.
export const FAMILY_EMAIL = "family@chore-squad.local";
export const PASSWORD_PREFIX = "famhub-";
