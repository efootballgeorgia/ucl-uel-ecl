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