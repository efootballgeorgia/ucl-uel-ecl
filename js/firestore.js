// js/firestore.js
import { collection, doc, getDoc, getDocs, addDoc, setDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { appState } from './state.js';
import { showFeedback } from './ui-feedback.js';
import { generateKnockoutStage } from './ui-knockout.js';
import { generateMatchDay, filterMatches, renderSkeletonMatches, updateUIFromConfig } from './ui-matches.js';
import { renderTable, updateTeamStats, subtractTeamStats, sortTable, renderSkeletonTable } from "./ui-table.js";

// This function processes real-time changes from Firestore.
function processLeagueChanges(snapshot) {
    // On the initial run, all existing documents will be in docChanges() with type 'added'.
    // For subsequent updates, only the modified/added/removed docs will be here.
    snapshot.docChanges().forEach(change => {
        const docData = change.doc.data();
        const docId = change.doc.id;
        const oldMatch = appState.currentLeagueMatches.find(m => m.id === docId);

        if (change.type === 'modified' || change.type === 'removed') {
            if (oldMatch) {
                subtractTeamStats(oldMatch.homeTeam, oldMatch.homeScore, oldMatch.awayScore);
                subtractTeamStats(oldMatch.awayTeam, oldMatch.awayScore, oldMatch.homeScore);
            }
        }
        
        if (change.type === 'added' || change.type === 'modified') {
            updateTeamStats(docData.homeTeam, docData.homeScore, docData.awayScore);
            updateTeamStats(docData.awayTeam, docData.awayScore, docData.homeScore);
        }
    });

    // Update global state and UI
    appState.currentLeagueMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sortTable();
    
    const rows = Array.from(document.querySelectorAll('#leagueTable tbody tr:not(.separator)'));
    appState.sortedTeams = rows.map(row => row.dataset.team);
    
    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
    filterMatches();
}

export async function switchLeague(league) {
    appState.currentLeague = league;
    if (appState.unsubscribe) appState.unsubscribe();
    if (appState.unsubscribeKnockout) appState.unsubscribeKnockout();

    renderSkeletonTable();
    renderSkeletonMatches();

    try {
        if (!appState.config[league]) {
            const configDocRef = doc(appState.db, 'leagues', league);
            const configDocSnap = await getDoc(configDocRef);
            if (configDocSnap.exists()) {
                appState.config[league] = configDocSnap.data();
            } else {
                 throw new Error(`No configuration found for league: ${league}`);
            }
        }

        updateUIFromConfig(appState.config[league]);
        renderTable(league); // Crucially, this resets the table to all zeros.
        generateMatchDay(league);

        // =================================================================================
        // --- THE FIX ---
        // We REMOVED the manual `getDocs()` call here. The `onSnapshot` listener below
        // is now responsible for BOTH the initial data load and all subsequent updates.
        // It fires once immediately with the full dataset, then again for any changes.
        // This prevents the data from being processed twice and fixing the bug.
        // =================================================================================

        const matchesQuery = query(collection(appState.db, `${league}Matches`), orderBy('timestamp', 'asc'));
        
        appState.unsubscribe = onSnapshot(matchesQuery, snapshot => {
             // hasPendingWrites is true if the update is from a local change not yet saved to the backend.
             // We only process updates confirmed by the server to avoid UI flashes.
            if (!snapshot.metadata.hasPendingWrites) {
                processLeagueChanges(snapshot);
            }
        });
        
        const knockoutMatchesRef = collection(appState.db, `${league}KnockoutMatches`);
        appState.unsubscribeKnockout = onSnapshot(knockoutMatchesRef, snapshot => {
            appState.currentLeagueKnockoutMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
        });

    } catch (error) {
        console.error(`Error loading data for ${league}:`, error);
        showFeedback(`Could not load data for ${league}.`, false);
    }
}

export async function handleMatchSubmission(form) {
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);

    const button = form.querySelector('button');
    button.textContent = 'Saving...';
    button.disabled = true;

    const docId = form.dataset.docId; 
    const homeTeam = form.dataset.home;
    const awayTeam = form.dataset.away;
    const homeScore = parseInt(form.querySelector('.score-home').value);
    const awayScore = parseInt(form.querySelector('.score-away').value);

    if (isNaN(homeScore) || isNaN(awayScore)) {
        showFeedback('Please fill all fields.', false);
        button.textContent = 'Save';
        button.disabled = false;
        return;
    }

    const matchData = { homeTeam, awayTeam, homeScore, awayScore, timestamp: serverTimestamp() };
    const collectionName = `${appState.currentLeague}Matches`;

    try {
        if (docId) {
            await setDoc(doc(appState.db, collectionName, docId), matchData, { merge: true }); 
            showFeedback('Match updated successfully!', true);
        } else {
            await addDoc(collection(appState.db, collectionName), matchData);
            showFeedback('Match added successfully!', true);
        }
    } catch (error) {
        showFeedback(`Error saving match: ${error.message}.`, false);
        console.error(`Error saving match:`, error);
    } finally {
        button.textContent = 'Save';
        button.disabled = false;
    }
}

export async function handleKnockoutMatchSubmission(e) {
    e.preventDefault();
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);
    
    const form = e.target;
    const button = form.querySelector('button');
    button.textContent = '...';
    button.disabled = true;

    const matchId = form.dataset.matchId;
    const homeScore = parseInt(form.querySelector(`#${matchId}-home`).value);
    const awayScore = parseInt(form.querySelector(`#${matchId}-away`).value);

    if (isNaN(homeScore) || isNaN(awayScore)) {
        showFeedback('Please enter valid scores.', false);
    } else {
        const matchData = {
            stage: form.dataset.stage,
            homeTeam: form.dataset.homeTeam,
            awayTeam: form.dataset.awayTeam,
            homeScore,
            awayScore
        };
        try {
            await setDoc(doc(appState.db, `${appState.currentLeague}KnockoutMatches`, matchId), matchData, { merge: true });
            showFeedback('Knockout result saved!', true);
        } catch (error) {
            showFeedback(`Error saving result: ${error.message}`, false);
        }
    }
    button.textContent = 'Save';
    button.disabled = false;
}