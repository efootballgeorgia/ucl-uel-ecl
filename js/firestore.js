// js/firestore.js
import { collection, doc, getDoc, addDoc, setDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { appState } from './state.js';
import { dom } from './dom.js';
import { showFeedback, updateUIFromConfig, generateMatchDay, filterMatches, generateKnockoutStage, renderTable, resetTableStats, updateTeamStats, sortTable, renderSkeletonTable, renderSkeletonMatches } from './ui.js';


// This function orchestrates the real-time table updates.
function updateLeagueData(allMatches, changedDocs) {
    const teamsToHighlight = new Set();
    changedDocs.forEach(change => {
        if (change.type === 'added') {
            const match = change.doc.data();
            teamsToHighlight.add(match.homeTeam);
            teamsToHighlight.add(match.awayTeam);
        }
    });

    resetTableStats();
    
    allMatches.forEach(match => {
        const homeShouldHighlight = teamsToHighlight.has(match.homeTeam);
        const awayShouldHighlight = teamsToHighlight.has(match.awayTeam);
        const isDraw = match.homeScore === match.awayScore;
        const homeWin = match.homeScore > match.awayScore;
        
        updateTeamStats(match.homeTeam, match.homeScore, match.awayScore, homeWin, isDraw, homeShouldHighlight);
        updateTeamStats(match.awayTeam, match.awayScore, match.homeScore, !homeWin, isDraw, awayShouldHighlight);
    });

    sortTable();
    
    const rows = Array.from(dom.leagueTableBody.querySelectorAll('tr:not(.separator)'));
    appState.sortedTeams = rows.map(row => row.dataset.team);
    
    generateKnockoutStage(appState.sortedTeams, appState.currentLeagueKnockoutMatches);
    filterMatches(allMatches);
}

export async function switchLeague(league) {
    appState.currentLeague = league;
    if (appState.unsubscribe) appState.unsubscribe();
    if (appState.unsubscribeKnockout) appState.unsubscribeKnockout();

    renderSkeletonTable();
    renderSkeletonMatches();

    try {
        const configDocRef = doc(appState.db, 'leagues', league);
        const configDocSnap = await getDoc(configDocRef);

        if (configDocSnap.exists()) {
            appState.config[league] = configDocSnap.data();
        } else {
             throw new Error(`No configuration found for league: ${league}`);
        }

        updateUIFromConfig(appState.config[league]);
        generateMatchDay(league);
        renderTable(league); 

        const leagueMatchesRef = collection(appState.db, `${league}Matches`);
        const qLeague = query(leagueMatchesRef, orderBy('timestamp', 'asc'));
        appState.unsubscribe = onSnapshot(qLeague, snapshot => {
            const allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // THE FIX: Update the global state with the latest match data.
            appState.currentLeagueMatches = allMatches;

            const changedDocs = snapshot.docChanges();
            updateLeagueData(allMatches, changedDocs);
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

    if (!homeTeam || !awayTeam || isNaN(homeScore) || isNaN(awayScore)) {
        showFeedback('Please fill all fields.', false);
        button.textContent = 'Save';
        button.disabled = false;
        return;
    }

    const matchData = {
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        timestamp: serverTimestamp()
    };

    try {
        const collectionName = `${appState.currentLeague}Matches`;
        if (docId) {
            const docRef = doc(appState.db, collectionName, docId);
            await setDoc(docRef, matchData, { merge: true }); 
            showFeedback('Match updated successfully!', true);
        } else {
            const collectionRef = collection(appState.db, collectionName);
            await addDoc(collectionRef, matchData);
            showFeedback('Match added successfully!', true);
        }
    } catch (error) {
        showFeedback(`Error saving match: ${error.message}.`, false);
        console.error(`Error saving match:`, error);
    }
}

export async function handleKnockoutMatchSubmission(e) {
    e.preventDefault();
    if (!appState.isAdmin) return;
    
    const form = e.target;
    const matchId = form.dataset.matchId;
    const homeScore = parseInt(form.querySelector(`#${matchId}-home`).value);
    const awayScore = parseInt(form.querySelector(`#${matchId}-away`).value);

    if (isNaN(homeScore) || isNaN(awayScore)) {
        return showFeedback('Please enter valid scores.', false);
    }
    
    const matchData = {
        stage: form.dataset.stage,
        homeTeam: form.dataset.homeTeam,
        awayTeam: form.dataset.awayTeam,
        homeScore,
        awayScore
    };

    try {
        const docRef = doc(appState.db, `${appState.currentLeague}KnockoutMatches`, matchId);
        await setDoc(docRef, matchData);
        showFeedback('Knockout result saved!', true);
    } catch (error) {
        showFeedback(`Error saving result: ${error.message}`, false);
    }
}