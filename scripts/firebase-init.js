const images = document.querySelectorAll('.image-gallery img');
const screens = document.querySelectorAll('.screen-gallery img');
const modal = document.getElementById('myModal');
const modalImage = document.getElementById('modalImage');
const matchForm = document.getElementById('matchForm');
let currentSortColumn = null;
let isAscending = true;

window.onload = () => {
  document.getElementById('loading').style.display = 'none';
  fetchMatches();
};

const firebaseConfig = {
    apiKey: "AIzaSyAQSPphqNP7BHzbRXLYDwrkUsPyIJpcALc",
    authDomain: "nekro-league-9e7bf.firebaseapp.com",
    projectId: "nekro-league-9e7bf",
    storageBucket: "nekro-league-9e7bf.appspot.com",
    messagingSenderId: "721371342919",
    appId: "1:721371342919:web:217f325dadb42db4a8e962",
    measurementId: "G-0NCFK58SMN"
  };
  
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const analytics = firebase.analytics(app);
  console.log("Firebase initialized:", app);

function addMatch(homeTeam, awayTeam, homeScore, awayScore) {
    db.collection('matches').add({
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      homeScore: homeScore,
      awayScore: awayScore,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log('Match added to Firestore');
    })
    .catch((error) => {
      console.error('Error adding match to Firestore: ', error);
    });
  }

  addMatch(homeTeam, awayTeam, homeScore, awayScore);
  const isDraw = homeScore === awayScore;
  
  updateTeamStats(
    homeTeam,
    homeScore,
    awayScore,
    homeScore > awayScore,
    isDraw
  );
  updateTeamStats(
    awayTeam,
    awayScore,
    homeScore,
    awayScore > homeScore,
    isDraw
  );
