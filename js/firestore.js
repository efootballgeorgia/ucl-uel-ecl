import { collection, doc, getDoc, deleteDoc, setDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { appState } from './state.js';
import { showFeedback } from './ui-feedback.js';
import { generateKnockoutStage } from './ui-knockout.js';
import { generateMatchDay, filterMatches, renderSkeletonMatches, updateUIFromConfig } from './ui-matches.js';
import { renderTable, updateTeamStats, subtractTeamStats, sortTable, renderSkeletonTable } from "./ui-table.js";
import { CSS } from "./constants.js";

function processLeagueChanges(snapshot) {
    const teamsToHighlight = new Set();

    snapshot.docChanges().forEach(change => {
        const docData = change.doc.data();
        const docId = change.doc.id;

        if (change.type === "added") {
            if (docData.homeScore === undefined) return;
            appState.currentLeagueMatches.push({ id: docId, ...docData });
            updateTeamStats(docData.homeTeam, docData.homeScore, docData.awayScore);
            updateTeamStats(docData.awayTeam, docData.awayScore, docData.homeScore);
            teamsToHighlight.add(docData.homeTeam).add(docData.awayTeam);
        }
        
        if (change.type === "modified") {
            if (docData.homeScore === undefined) return;
            const oldMatchIndex = appState.currentLeagueMatches.findIndex(m => m.id === docId);
            if (oldMatchIndex > -1) {
                const oldMatch = appState.currentLeagueMatches[oldMatchIndex];
                subtractTeamStats(oldMatch.homeTeam, oldMatch.homeScore, oldMatch.awayScore);
                subtractTeamStats(oldMatch.awayTeam, oldMatch.awayScore, oldMatch.homeScore);

                appState.currentLeagueMatches[oldMatchIndex] = { id: docId, ...docData };
                updateTeamStats(docData.homeTeam, docData.homeScore, docData.awayScore);
                updateTeamStats(docData.awayTeam, docData.awayScore, docData.homeScore);
                teamsToHighlight.add(docData.homeTeam).add(docData.awayTeam);
            }
        }
        
        if (change.type === "removed") {
             const removedMatchIndex = appState.currentLeagueMatches.findIndex(m => m.id === docId);
             if (removedMatchIndex > -1) {
                const removedMatch = appState.currentLeagueMatches[removedMatchIndex];
                subtractTeamStats(removedMatch.homeTeam, removedMatch.homeScore, removedMatch.awayScore);
                subtractTeamStats(removedMatch.awayTeam, removedMatch.awayScore, removedMatch.homeScore);
                appState.currentLeagueMatches.splice(removedMatchIndex, 1);
             }
        }
    });

    sortTable(teamsToHighlight);

    const rows = Array.from(document.querySelectorAll('#leagueTable tbody tr:not(.separator)'));
    appState.sortedTeams = rows.map(row => row.dataset.team);

    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
    filterMatches();
}

export async function switchLeague(league) {
    appState.currentLeague = league;
    if (appState.unsubscribe) appState.unsubscribe();
    if (appState.unsubscribeKnockout) appState.unsubscribeKnockout();

    document.body.className = `${league}-theme`;

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
        
        appState.currentLeagueMatches = [];

        updateUIFromConfig(appState.config[league]);
        renderTable(league);
        generateMatchDay(league);

        const matchesQuery = query(collection(appState.db, `${league}Matches`));
        
        appState.unsubscribe = onSnapshot(matchesQuery, processLeagueChanges);

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

export async function handleMatchSubmission(form, button) {
    if (!appState.isAdmin) return showFeedback('You do not have permission.', false);
    if (!button) return;

    const buttonText = button.querySelector('.btn-text');
    if (!buttonText) return;

    button.classList.add(CSS.IS_LOADING);
    button.disabled = true;

    const docId = form.dataset.docId;
    const homeScore = parseInt(form.querySelector('.score-home').value);
    const awayScore = parseInt(form.querySelector('.score-away').value);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        button.classList.remove(CSS.IS_LOADING);
        button.disabled = false;
        return;
    }

    if (!docId) {
        showFeedback('Cannot save match: Missing document ID.', false);
        button.classList.remove(CSS.IS_LOADING);
        button.disabled = false;
        return;
    }

    const matchData = { 
        homeTeam: form.dataset.home, 
        awayTeam: form.dataset.away, 
        homeScore, 
        awayScore, 
        timestamp: serverTimestamp() 
    };
    const collectionName = `${appState.currentLeague}Matches`;

    try {
        await setDoc(doc(appState.db, collectionName, docId), matchData, { merge: true });
        showFeedback('Match saved successfully!', true);
        form.closest('.match-card')?.classList.remove(CSS.IS_EDITING);
    } catch (error) {
        showFeedback(`Error saving match: ${error.message}.`, false);
        console.error(`Error saving match:`, error);
    } finally {
        button.classList.remove(CSS.IS_LOADING);
        button.disabled = false;
    }
}

// ADDED: New function to handle match deletion
export async function handleMatchDeletion(docId) {
    if (!appState.isAdmin) {
        return showFeedback('You do not have permission to delete matches.', false);
    }
    if (!docId) {
        return showFeedback('Cannot delete match: Missing document ID.', false);
    }

    const confirmed = window.confirm('Are you sure you want to delete this match result? This action cannot be undone.');

    if (!confirmed) {
        return;
    }

    try {
        const collectionName = `${appState.currentLeague}Matches`;
        await deleteDoc(doc(appState.db, collectionName, docId));
        showFeedback('Match result deleted successfully!', true);
    } catch (error) {
        console.error('Error deleting match:', error);
        showFeedback(`Failed to delete match: ${error.message}`, false);
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

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        showFeedback('Please enter valid, non-negative scores.', false);
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