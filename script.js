document.addEventListener('DOMContentLoaded', function () {
  const teams = [
    {
      name: 'Real Madrid',
      logo: 'images/real-madrid-logo.png',
      images: [
        'images/niko1.jpg'
      ]
    },
    {
      name: 'AC Milan',
      logo: 'images/ac-milan-logo.png',
      images: [
        'images/bacho1.jpg',
        'images/bacho2.jpg',
        'images/bacho3.jpg'
      ]
    },
    {
      name: 'napoli',
      logo: 'images/napoli-logo.png',
      images: [
      ]
    },
    {
      name: 'Barcelona',
      logo: 'images/barcelona-logo.png',
      images: [
        'images/luksona1.jpg'
      ]
    }
  ];

  const gallery = document.querySelector('.team-gallery');
  const modal = document.querySelector('.modal');
  const modalImage = document.getElementById('modal-image');
  const closeBtn = document.querySelector('.close');

  // Function to create and display team images in the gallery
  teams.forEach(team => {
    const teamDiv = document.createElement('div');
    teamDiv.classList.add('team');

    let imageGallery = '';
    if (team.images.length > 0) {
      // Add images if the team has any
      team.images.forEach(image => {
        imageGallery += `<img src="${image}" alt="${team.name}" class="team-image" data-team="${team.name}">`;
      });
    } else {
      // Display a message if no images exist for the team
      imageGallery = `<p>No images available for ${team.name}</p>`;
    }

    teamDiv.innerHTML = `
      <h3>${team.name}</h3>
      <div class="image-gallery">
        ${imageGallery}
      </div>
    `;

    gallery.appendChild(teamDiv);
  });

  // Open the modal when an image is clicked
  document.querySelectorAll('.team-image').forEach(image => {
    image.addEventListener('click', function () {
      modal.style.display = 'block';
      modalImage.src = this.src; // Display the clicked image in the modal
    });
  });

  // Close the modal when the close button is clicked
  closeBtn.addEventListener('click', function () {
    modal.style.display = 'none';
  });

  // Close the modal if clicked outside of the image
  window.addEventListener('click', function (event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});
