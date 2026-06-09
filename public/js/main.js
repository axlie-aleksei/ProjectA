const slides = document.querySelectorAll('.slide');
let currentSlide = 0;
let slideTimer;

function showSlide(index) {
  if (!slides.length) return;

  currentSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === currentSlide);
  });
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function previousSlide() {
  showSlide(currentSlide - 1);
}

function startSlideTimer() {
  clearInterval(slideTimer);
  slideTimer = setInterval(nextSlide, 5000);
}

const arrowLeft = document.getElementById('arrowLeft');
const arrowRight = document.getElementById('arrowRight');

if (arrowLeft && arrowRight && slides.length) {
  showSlide(0);
  startSlideTimer();

  arrowLeft.addEventListener('click', () => {
    previousSlide();
    startSlideTimer();
  });

  arrowRight.addEventListener('click', () => {
    nextSlide();
    startSlideTimer();
  });
}

function toggleModal(modalId, show) {
  const modal = document.getElementById(modalId);

  if (modal) {
    modal.style.display = show ? 'flex' : 'none';
  }
}

const loginBtn = document.getElementById('loginBtn');
const closeLogin = document.getElementById('closeLogin');
const registerBtn = document.getElementById('registerBtn');
const closeRegister = document.getElementById('closeRegister');
const filterBtn = document.getElementById('filterBtn');
const closeFilter = document.getElementById('closeFilter');
const applyFilters = document.getElementById('applyFilters');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const modalGenre = document.getElementById('modalGenre');
const modalYear = document.getElementById('modalYear');
const modalType = document.getElementById('modalType');
const modalDub = document.getElementById('modalDub');

if (loginBtn) {
  loginBtn.addEventListener('click', () => toggleModal('loginModal', true));
}

if (closeLogin) {
  closeLogin.addEventListener('click', () => toggleModal('loginModal', false));
}

if (registerBtn) {
  registerBtn.addEventListener('click', () => toggleModal('registerModal', true));
}

if (closeRegister) {
  closeRegister.addEventListener('click', () => toggleModal('registerModal', false));
}

if (filterBtn) {
  filterBtn.addEventListener('click', () => toggleModal('filterModal', true));
}

if (closeFilter) {
  closeFilter.addEventListener('click', () => toggleModal('filterModal', false));
}

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }
});

if (applyFilters) {
  applyFilters.addEventListener('click', () => {
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
  });
}

if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', () => {
  const q = searchInput.value.toLowerCase();
  document.querySelectorAll('.card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) ? 'block' : 'none';
  });
  });
}
