(function () {
  const mediaButtons = document.querySelectorAll('[data-media-target]');
  const mediaPanels = document.querySelectorAll('.media-panel');

  // one video element can change episode
  // key keeps saved time separated by episode
  const loadedProgressKeys = new Set();
  const lastSavedSeconds = new Map();
  const switchingEpisodeVideos = new WeakSet();

  function prepareVideo(video) {
    if (!video) return;

    video.defaultMuted = false;
    video.muted = false;

    if (video.volume === 0) {
      video.volume = 1;
    }
  }

  function getAuthToken() {
    return localStorage.getItem('authToken');
  }

  function getVideoData(video) {
    return {
      contentId: video.dataset.contentId,
      episodeNumber: video.dataset.episodeNumber || '1'
    };
  }

  function getVideoKey(video) {
    const data = getVideoData(video);
    return `${data.contentId}:${data.episodeNumber}`;
  }

  function getProgressSeconds(video) {
    const seconds = Number(video.currentTime || 0);
    return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  }

  function setVideoTime(video, seconds) {
    // metadata is needed before browser accepts safe current time
    const setTime = () => {
      if (Number.isFinite(video.duration) && video.duration > 1) {
        video.currentTime = Math.min(seconds, video.duration - 1);
        return;
      }

      video.currentTime = seconds;
    };

    if (video.readyState >= 1) {
      setTime();
      return;
    }

    video.addEventListener('loadedmetadata', setTime, { once: true });
  }

  function loadPanelVideos(panel) {
    panel.querySelectorAll('video[data-src]').forEach(video => {
      prepareVideo(video);

      if (video.getAttribute('src') !== video.dataset.src) {
        video.src = video.dataset.src;
        video.load();
      }
    });
  }

  function pauseVideos() {
    document.querySelectorAll('video').forEach(video => video.pause());
  }

  async function loadSavedProgress(video) {
    const token = getAuthToken();
    const videoData = getVideoData(video);
    const videoKey = getVideoKey(video);

    // player button only reads saved time
    // it never writes zero progress to db
    if (!token || !videoData.contentId) {
      return 0;
    }

    if (loadedProgressKeys.has(videoKey)) {
      const savedSeconds = lastSavedSeconds.get(videoKey) || 0;
      setVideoTime(video, savedSeconds);
      return savedSeconds;
    }

    loadedProgressKeys.add(videoKey);

    try {
      const params = new URLSearchParams(videoData);
      const response = await fetch(`/history/progress?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) return 0;

      const result = await response.json();
      const progressSeconds = Number(result.item && result.item.progressSeconds);

      if (Number.isFinite(progressSeconds) && progressSeconds > 0) {
        setVideoTime(video, progressSeconds);
        lastSavedSeconds.set(videoKey, Math.floor(progressSeconds));
        return progressSeconds;
      }
    } catch (error) {
      return 0;
    }

    setVideoTime(video, 0);
    return 0;
  }

  async function saveWatchProgress(video, options = {}) {
    const token = getAuthToken();
    const videoData = getVideoData(video);
    const videoKey = getVideoKey(video);

    if (!token || !videoData.contentId) return;

    const progressSeconds = getProgressSeconds(video);
    if (progressSeconds < 1) return;

    const lastSecond = lastSavedSeconds.get(videoKey);

    // timeupdate fires a lot
    // save only when time moved enough to keep db cleaner
    if (options.force && lastSecond === progressSeconds) return;
    if (!options.force && lastSecond !== undefined && Math.abs(progressSeconds - lastSecond) < 10) return;

    lastSavedSeconds.set(videoKey, progressSeconds);

    try {
      // video knows anime id and episode number from html
      // server updates one db row for this user episode
      await fetch('/history/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          contentId: videoData.contentId,
          episodeNumber: videoData.episodeNumber,
          progressSeconds
        }),
        keepalive: options.keepalive === true
      });
    } catch (error) {
      return;
    }
  }

  function preparePanelHistory(panel) {
    panel.querySelectorAll('video[data-content-id]').forEach(video => {
      loadSavedProgress(video);
    });
  }

  function setEpisode(video, episodeNumber) {
    // save old episode before we change episode number on video
    saveWatchProgress(video, { force: true });

    // pause fires during episode change
    // this flag stops saving old time into new episode
    switchingEpisodeVideos.add(video);
    video.pause();
    video.dataset.episodeNumber = String(episodeNumber);
    setVideoTime(video, 0);
    loadSavedProgress(video);

    setTimeout(() => {
      switchingEpisodeVideos.delete(video);
    }, 0);
  }

  function buildEpisodePicker(video) {
    const totalEpisodes = Number(video.dataset.totalEpisodes || 1);
    const section = video.closest('.anime-detail-section');
    const picker = section && section.querySelector('[data-episode-picker]');

    // films do not need episode buttons
    // series creates buttons from html episode count
    if (!picker || totalEpisodes < 2) return;

    picker.textContent = '';

    for (let episode = 1; episode <= totalEpisodes; episode += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'episode-choice';
      button.textContent = `Серия ${episode}`;
      button.dataset.episodeNumber = String(episode);

      if (episode === Number(video.dataset.episodeNumber || 1)) {
        button.classList.add('is-active');
      }

      button.addEventListener('click', () => {
        picker.querySelectorAll('.episode-choice').forEach(item => {
          item.classList.toggle('is-active', item === button);
        });

        setEpisode(video, episode);
      });

      picker.appendChild(button);
    }
  }

  mediaButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.mediaTarget;
      const targetPanel = document.getElementById(targetId);

      mediaButtons.forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });

      mediaPanels.forEach((panel) => {
        panel.hidden = panel.id !== targetId;
      });

      pauseVideos();

      if (targetPanel) {
        loadPanelVideos(targetPanel);
        preparePanelHistory(targetPanel);
      }
    });
  });

  document.querySelectorAll('video').forEach(video => {
    buildEpisodePicker(video);

    video.addEventListener('play', async () => {
      prepareVideo(video);
      await loadSavedProgress(video);
      saveWatchProgress(video, { force: true });
    });

    video.addEventListener('timeupdate', () => {
      saveWatchProgress(video);
    });

    video.addEventListener('pause', () => {
      if (switchingEpisodeVideos.has(video)) return;
      saveWatchProgress(video, { force: true });
    });

    video.addEventListener('ended', () => {
      saveWatchProgress(video, { force: true });
    });
  });

  window.addEventListener('pagehide', () => {
    document.querySelectorAll('video[data-content-id]').forEach(video => {
      saveWatchProgress(video, { force: true, keepalive: true });
    });
  });
})();
