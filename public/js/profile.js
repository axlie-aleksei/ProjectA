(function () {
  const token = localStorage.getItem('authToken');
  const avatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileMeta = document.getElementById('profileMeta');
  const watchedCount = document.getElementById('profileWatchedCount');
  const progressCount = document.getElementById('profileProgressCount');
  const continueSection = document.getElementById('profileContinueSection');
  const watchList = document.getElementById('profileWatchList');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text) {
      element.textContent = text;
    }

    return element;
  }

  function getWatchLabel(item) {
    // film and series show saved place in different words
    if (item.totalEpisodes === 1) {
      return `${item.typeName} • ${item.progressLabel}`;
    }

    return `${item.typeName} • серия ${item.episodeNumber} • ${item.progressLabel}`;
  }

  function createProgressBar(item) {
    const progress = createElement('div', 'watch-progress');
    const fill = createElement('span', 'watch-progress-fill');
    const percent = Number(item.progressPercent || 0);

    // db gives percent so css only draws the bar
    fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    progress.appendChild(fill);

    return progress;
  }

  function createWatchItem(item) {
    const wrap = createElement('div', 'profile-watch');
    const image = createElement('img');
    const info = createElement('div', 'profile-watch-info');
    const title = createElement('h4', '', item.title);
    const label = createElement('p', 'episode-label', getWatchLabel(item));
    const link = createElement('a', 'submit-btn', 'Смотреть');

    image.src = item.image;
    image.alt = item.title;
    link.href = item.href;

    info.appendChild(title);
    info.appendChild(label);
    info.appendChild(createProgressBar(item));

    wrap.appendChild(image);
    wrap.appendChild(info);
    wrap.appendChild(link);

    return wrap;
  }

  function renderContinue(items) {
    if (!continueSection || !watchList) return;

    watchList.textContent = '';

    if (!items.length) {
      continueSection.hidden = true;
      return;
    }

    // db returns only saved progress rows
    // if list is empty this section stays hidden
    items.forEach(item => {
      watchList.appendChild(createWatchItem(item));
    });

    continueSection.hidden = false;
  }

  function renderProfile(profile) {
    const username = profile.user.username;
    const stats = profile.stats;

    setText(avatar, profile.user.initials);
    setText(profileName, username);
    setText(profileMeta, `Смотрит ${stats.inProgress} аниме`);
    setText(watchedCount, stats.watchedEpisodes);
    setText(progressCount, stats.inProgress);

    renderContinue(profile.continueWatching || []);
  }

  async function loadProfile() {
    try {
      const response = await fetch('/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // bad token means user should login again
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
        return;
      }

      if (!response.ok) return;

      const profile = await response.json();
      renderProfile(profile);
    } catch (error) {
      return;
    }
  }

  loadProfile();
})();
