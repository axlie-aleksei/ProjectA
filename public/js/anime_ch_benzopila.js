(function () {
  const mediaButtons = document.querySelectorAll('[data-media-target]');
  const mediaPanels = document.querySelectorAll('.media-panel');
  const loadedProgressVideos = new WeakSet();
  const lastSavedSeconds = new WeakMap();

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
      episodeNumber: video.dataset.episodeNumber || 1
    };
  }

  function getProgressSeconds(video) {
    const seconds = Number(video.currentTime || 0);
    return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  }

  function setVideoTime(video, seconds) {
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

    if (!token || !videoData.contentId || loadedProgressVideos.has(video)) {
      return 0;
    }

    loadedProgressVideos.add(video);

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
        lastSavedSeconds.set(video, Math.floor(progressSeconds));
        return progressSeconds;
      }
    } catch (error) {
      return 0;
    }

    return 0;
  }

  async function saveWatchProgress(video, options = {}) {
    const token = getAuthToken();
    const videoData = getVideoData(video);

    if (!token || !videoData.contentId) return;

    const progressSeconds = getProgressSeconds(video);
    const lastSecond = lastSavedSeconds.get(video);

    if (options.force && lastSecond === progressSeconds) return;
    if (!options.force && lastSecond !== undefined && Math.abs(progressSeconds - lastSecond) < 10) return;

    lastSavedSeconds.set(video, progressSeconds);

    try {
      // video knows anime id from html
      // server updates one db row for this user and episode
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

  async function prepareHistory(video) {
    const progressSeconds = await loadSavedProgress(video);

    if (progressSeconds === 0) {
      // opening player means user started watching
      // this makes continue block appear without extra db rows
      saveWatchProgress(video, { force: true });
    }
  }

  function preparePanelHistory(panel) {
    panel.querySelectorAll('video[data-content-id]').forEach(video => {
      prepareHistory(video);
    });
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
    video.addEventListener('play', async () => {
      prepareVideo(video);
      await loadSavedProgress(video);
      saveWatchProgress(video, { force: true });
    });

    video.addEventListener('timeupdate', () => {
      saveWatchProgress(video);
    });

    video.addEventListener('pause', () => {
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
