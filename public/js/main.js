const slides = document.querySelectorAll('.slide');
let currentSlide = 0;
let slideTimer;

const authToken = localStorage.getItem('authToken');
const profileBtn = document.querySelector('.profile-btn');
const logoutBtn = document.querySelector('.logout-btn');
const accountBtn = document.querySelector('.account-btn');
const registerBtn = document.querySelector('.register-btn');

function setHidden(element, isHidden) {
  if (element) element.hidden = isHidden;
}

if (authToken) {
  setHidden(profileBtn, false);
  setHidden(logoutBtn, false);
  setHidden(accountBtn, true);
  setHidden(registerBtn, true);
} else {
  setHidden(profileBtn, true);
  setHidden(logoutBtn, true);
  setHidden(accountBtn, false);
  setHidden(registerBtn, false);
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', event => {
    event.preventDefault();
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
  });
}

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
const continueSection = document.getElementById('continueSection');

if (filterPanel) {
  filterPanel.addEventListener('mouseleave', () => {
    filterPanel.classList.remove('is-open');
  });
}

function fillSelect(select, placeholder, values) {
  if (!select) return;

  select.textContent = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

async function loadFilterOptions() {
  try {
    const response = await fetch('/content/options');
    if (!response.ok) return;

    const options = await response.json();

    fillSelect(modalGenre, 'Жанр', options.genres || []);
    fillSelect(modalYear, 'Год', options.years || []);
    fillSelect(modalType, 'Тип', options.types || []);
  } catch (error) {
    return;
  }
}

function getCatalogCards() {
  // filters should not touch continue watching section
  return document.querySelectorAll('.section:not(#continueSection) .card');
}

function hideContinueSection() {
  if (continueSection) continueSection.hidden = true;
}

function showContinueCardsByIds(ids) {
  const contentIds = ids.map(String);

  if (!continueSection || !contentIds.length) {
    hideContinueSection();
    return;
  }

  const watchedIds = new Set(contentIds);
  let visibleCount = 0;

  // db returns watched anime ids
  // html has all possible cards already so we leave only matching cards
  continueSection.querySelectorAll('.card').forEach(card => {
    const shouldShow = watchedIds.has(card.dataset.contentId);
    card.style.display = shouldShow ? 'block' : 'none';
    if (shouldShow) visibleCount += 1;
  });

  continueSection.hidden = visibleCount === 0;
}

async function loadContinueWatching() {
  if (!continueSection || !authToken) {
    // no token means this page has no user history
    hideContinueSection();
    return;
  }

  try {
    const response = await fetch('/history/continue', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      hideContinueSection();
      return;
    }

    const result = await response.json();
    showContinueCardsByIds(result.ids || []);
  } catch (error) {
    hideContinueSection();
  }
}

function showCardsByIds(ids) {
  const allowedIds = new Set(ids.map(String));

  // db returns only matching anime ids
  // cards are already in html so we compare data content id with this list
  getCatalogCards().forEach(card => {
    card.style.display = allowedIds.has(card.dataset.contentId) ? 'block' : 'none';
  });
}

async function applyDatabaseFilters() {
  try {
    const params = new URLSearchParams();

    // page sends selected filters
    // server answers only with anime ids from db
    if (modalGenre && modalGenre.value) params.set('genre', modalGenre.value);
    if (modalYear && modalYear.value) params.set('year', modalYear.value);
    if (modalType && modalType.value) params.set('type', modalType.value);

    const response = await fetch(`/content?${params.toString()}`);
    if (!response.ok) return;

    const result = await response.json();
    showCardsByIds(result.ids || []);
  } catch (error) {
    return;
  }
}

if (applyFilters) {
  applyFilters.addEventListener('click', () => {
    applyDatabaseFilters();
  });
}

if (clearFilters) {
  clearFilters.addEventListener('click', () => {
    [modalGenre, modalYear, modalType].forEach(select => {
      if (select) select.value = '';
    });

    getCatalogCards().forEach(card => {
      card.style.display = 'block';
    });
  });
}

if (modalGenre || modalYear || modalType) {
  loadFilterOptions();
}

if (continueSection) {
  loadContinueWatching();
}

if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.toLowerCase();
    getCatalogCards().forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? 'block' : 'none';
    });
  });
}

const profileStats = document.querySelectorAll('.profile-stat');

profileStats.forEach(stat => {
  stat.addEventListener('click', () => {
    profileStats.forEach(item => item.classList.remove('active'));
    stat.classList.add('active');
  });
});

const profileWatch = document.querySelector('.profile-watch');

if (profileWatch) {
  const progress = profileWatch.querySelector('.episode-progress');
  const label = profileWatch.querySelector('.episode-label');
  const prevBtn = document.getElementById('episodePrev');
  const nextBtn = document.getElementById('episodeNext');
  const totalEpisodes = Number(profileWatch.dataset.totalEpisodes || 12);
  let currentEpisode = Number(profileWatch.dataset.currentEpisode || 1);

  function updateEpisodes() {
    label.textContent = totalEpisodes === 1 ? 'Фильм • 100 минут' : `Серия ${currentEpisode} из ${totalEpisodes}`;

    progress.querySelectorAll('.episode-segment').forEach(segment => {
      const episode = Number(segment.dataset.episode);
      segment.classList.toggle('watched', episode <= currentEpisode);
      segment.classList.toggle('current', episode === currentEpisode);
    });
  }

  for (let episode = 1; episode <= totalEpisodes; episode += 1) {
    const segment = document.createElement('button');
    segment.type = 'button';
    segment.className = 'episode-segment';
    segment.dataset.episode = episode;
    segment.title = `Серия ${episode}`;
    segment.addEventListener('click', () => {
      currentEpisode = episode;
      updateEpisodes();
    });
    progress.appendChild(segment);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentEpisode = Math.max(1, currentEpisode - 1);
      updateEpisodes();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentEpisode = Math.min(totalEpisodes, currentEpisode + 1);
      updateEpisodes();
    });
  }

  updateEpisodes();
}

document.querySelectorAll('.ongoing-progress').forEach(progress => {
  const totalEpisodes = Number(progress.dataset.totalEpisodes || 12);
  const currentEpisode = Number(progress.dataset.currentEpisode || 1);

  progress.style.setProperty('--episodes-count', totalEpisodes);

  for (let episode = 1; episode <= totalEpisodes; episode += 1) {
    const segment = document.createElement('span');
    segment.className = 'episode-segment';
    segment.title = totalEpisodes === 1 ? 'Фильм' : `Серия ${episode}`;
    segment.classList.toggle('watched', episode <= currentEpisode);
    segment.classList.toggle('current', episode === currentEpisode);
    progress.appendChild(segment);
  }
});
