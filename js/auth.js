// js/auth.js

import { supabase } from './config.js';
import { appState } from './state.js';
import { dom } from './dom.js';
import { showAuthFeedback, updateAuthUI, showFeedback } from './ui-feedback.js';
import { switchLeague } from "./supabase.js";

// This flag will live outside the listener to track if the app has loaded its initial data.
let hasInitialLoadCompleted = false;

export function initAuthListener() {
    supabase.auth.onAuthStateChange(async (_event, session) => {
        const wasAdmin = appState.isAdmin; // Store the admin state before we re-check it.
        
        appState.currentUser = session?.user || null;

        if (appState.currentUser) {
            const { data, error } = await supabase
                .from('admins')
                .select('id')
                .eq('id', appState.currentUser.id)
                .single();
            appState.isAdmin = !!data && !error;
        } else {
            appState.isAdmin = false;
        }

        // Always update the simple UI elements (e.g., "Logged in" text)
        updateAuthUI();

        // This is the core logic:
        // We render the main app content if:
        // 1. This is the very first time the listener has run (initial page load).
        // 2. The user's admin status has changed (e.g., they logged out of a normal account and into an admin one).
        if (!hasInitialLoadCompleted || appState.isAdmin !== wasAdmin) {
            console.log("Initial load or admin status change detected. Rendering UI...");

            const urlParams = new URLSearchParams(window.location.search);
            const initialLeague = urlParams.get('league') || appState.currentLeague;
            const initialDay = urlParams.get('day') || '1';
            
            appState.currentLeague = initialLeague;
            appState.currentDay = parseInt(initialDay, 10);
            
            // Kick off the main data loading and UI rendering process.
            switchLeague(appState.currentLeague);

            // Mark the initial load as complete so this block doesn't run again unnecessarily.
            hasInitialLoadCompleted = true;
        }
    });
}

function handleAuthError(error) {
    if (error.message.includes("Email not confirmed")) {
        return 'Please confirm your email address before logging in. Check your inbox for a confirmation link.';
    }
    if (error.message.includes("Invalid login credentials")) {
        return 'Invalid email or password.';
    }
    if (error.message.includes("User already registered")) {
        return 'An account with this email already exists.';
    }
    if (error.message.includes("Password should be at least 6 characters")) {
        return 'Password must be at least 6 characters long.';
    }
    console.error("Authentication Error:", error);
    return 'An unexpected error occurred. Please try again.';
}

export async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
        email: dom.authEmailInput.value,
        password: dom.authPasswordInput.value,
    });

    if (error) {
        showAuthFeedback(handleAuthError(error), false);
    } else {
        showAuthFeedback('Logged in successfully!', true);
        dom.authModal.classList.remove('show');
        dom.authForm.reset();
    }
}

export async function handleSignup(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
        email: dom.authEmailInput.value,
        password: dom.authPasswordInput.value,
    });

    if (error) {
        showAuthFeedback(handleAuthError(error), false);
    } else {
        showAuthFeedback('Account created! Please check your email to verify.', true);
        dom.authModal.classList.remove('show');
        dom.authForm.reset();
    }
}

export async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showFeedback(`Logout error: ${error.message}`, false);
    } else {
        showFeedback('Logged out successfully!', true);
    }
}