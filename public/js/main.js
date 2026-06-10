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

const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');
const filterPanel = document.getElementById('filterPanel');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const modalGenre = document.getElementById('modalGenre');
const modalYear = document.getElementById('modalYear');
const modalType = document.getElementById('modalType');
const modalDub = document.getElementById('modalDub');

if (filterPanel) {
  filterPanel.addEventListener('mouseleave', () => {
    filterPanel.classList.remove('is-open');
  });
}

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
  });
}

if (clearFilters) {
  clearFilters.addEventListener('click', () => {
    [modalGenre, modalYear, modalType, modalDub].forEach(select => {
      if (select) select.value = '';
    });

    document.querySelectorAll('.card').forEach(card => {
      card.style.display = 'block';
    });
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
