const slides = document.querySelectorAll('.slide');
let currentSlide = 0;

function showSlide(index) {
  slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
}

document.getElementById('arrowLeft').addEventListener('click', () => {
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  showSlide(currentSlide);
});

document.getElementById('arrowRight').addEventListener('click', () => {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
});

function toggleModal(modalId, show) {
  document.getElementById(modalId).style.display = show ? 'flex' : 'none';
}

loginBtn.onclick = () => toggleModal('loginModal', true);
closeLogin.onclick = () => toggleModal('loginModal', false);

registerBtn.onclick = () => toggleModal('registerModal', true);
closeRegister.onclick = () => toggleModal('registerModal', false);

filterBtn.onclick = () => toggleModal('filterModal', true);
closeFilter.onclick = () => toggleModal('filterModal', false);

applyFilters.onclick = () => {
  const genre = modalGenre.value;
  const year = modalYear.value;
  const type = modalType.value;
  const dub = modalDub.value;

  document.querySelectorAll('.card').forEach(card => {
    const ok =
      (!genre || card.dataset.genre === genre) &&
      (!year || card.dataset.year === year) &&
      (!type || card.dataset.type === type) &&
      (!dub || card.dataset.dub === dub);
    card.style.display = ok ? 'block' : 'none';
  });

  toggleModal('filterModal', false);
};

searchBtn.onclick = () => {
  const q = searchInput.value.toLowerCase();
  document.querySelectorAll('.card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) ? 'block' : 'none';
  });
};
