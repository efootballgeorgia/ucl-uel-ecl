// Modal Control
function closeModal() {
    modal.classList.remove('show');
  }
  
  // Toggle Gallery Display
  function toggleGallery(logo) {
    const gallery = logo.nextElementSibling;
    if (gallery.classList.contains('show')) {
      gallery.classList.remove('show');
    } else {
      gallery.classList.add('show');
    }
  }

  // Open modal when any gallery image is clicked
images.forEach(image => {
    image.addEventListener('click', () => {
      modal.classList.add('show');
      modalImage.src = image.src;
    });
  });
  screens.forEach(screen => {
    screen.addEventListener('click', () => {
      modal.classList.add('show');
      modalImage.src = screen.src;
    });
  });
  
  // Close modal when clicking outside the modal image
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });