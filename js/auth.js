import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { firebaseConfig } from './config.js';
import { appState } from './state.js';
import { dom } from './dom.js';
import { showAuthFeedback, updateAuthUI, showFeedback } from './ui-feedback.js';
import { switchLeague } from "./firestore.js";


function handleAuthError(error) {
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters long.';
        default:
            console.error("Authentication Error:", error); // Log detailed error for developers
            return 'An unexpected error occurred. Please try again.'; // Generic message for user
    }
}

export async function handleLogin(e) {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(appState.auth, dom.authEmailInput.value, dom.authPasswordInput.value);
        showAuthFeedback('Logged in successfully!', true);
        dom.authModal.classList.remove('show');
        dom.authForm.reset();
    } catch (error) {
        showAuthFeedback(handleAuthError(error), false);
    }
}

export async function handleSignup(e) {
    e.preventDefault();
    if (dom.authPasswordInput.value.length < 6) {
        return showAuthFeedback('Password must be at least 6 characters long.', false);
    }
    try {
        await createUserWithEmailAndPassword(appState.auth, dom.authEmailInput.value, dom.authPasswordInput.value);
        showAuthFeedback('Account created and logged in!', true);
        dom.authModal.classList.remove('show');
        dom.authForm.reset();
    } catch (error) {
        showAuthFeedback(handleAuthError(error), false);
    }
}

export async function handleLogout() {
    try {
        await signOut(appState.auth);
        showFeedback('Logged out successfully!', true);
    } catch (error) {
        showFeedback(`Logout error: ${error.message}`, false);
    }
}

export function initFirebase() {
    const app = initializeApp(firebaseConfig);
    appState.db = getFirestore(app);
    appState.auth = getAuth(app);
    console.log("Firebase initialized");

    onAuthStateChanged(appState.auth, async user => {
        appState.currentUser = user;
        if (user) {
            const adminRef = doc(appState.db, 'admins', user.uid);
            const adminDoc = await getDoc(adminRef);
            appState.isAdmin = adminDoc.exists();
        } else {
            appState.isAdmin = false;
        }
        updateAuthUI();
        if (appState.currentLeague) {
            switchLeague(appState.currentLeague);
        }
    });
}