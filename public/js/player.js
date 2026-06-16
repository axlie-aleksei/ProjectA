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
      episodeId: video.dataset.episodeId || '',
      episodeNumber: video.dataset.episodeNumber || '1'
    };
  }

  function getVideoKey(video) {
    const data = getVideoData(video);
    return `${data.contentId}:${data.episodeId || data.episodeNumber}`;
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
          episodeId: videoData.episodeId,
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

  function setEpisode(video, episode) {
    const episodeData = typeof episode === 'number'
      ? { episodeId: '', episodeNumber: episode }
      : episode;
    const videoId = Number(episodeData.videoId || 0);

    // save old episode before we change episode number on video
    saveWatchProgress(video, { force: true });

    // pause fires during episode change
    // this flag stops saving old time into new episode
    switchingEpisodeVideos.add(video);
    video.pause();
    video.dataset.episodeId = String(episodeData.episodeId || '');
    video.dataset.episodeNumber = String(episodeData.episodeNumber);
    if (Number.isInteger(videoId) && videoId > 0) {
      video.dataset.src = `/video/${videoId}`;
      video.src = video.dataset.src;
      video.load();
    }
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

  async function loadEpisodes(video) {
    const totalEpisodes = Number(video.dataset.totalEpisodes || 1);
    const contentId = video.dataset.contentId;

    if (!contentId || totalEpisodes < 2) {
      return [];
    }

    try {
      const params = new URLSearchParams({ total: String(totalEpisodes) });
      const response = await fetch(`/content/${contentId}/episodes?${params.toString()}`);

      if (!response.ok) return [];

      const result = await response.json();
      return result.episodes || [];
    } catch (error) {
      return [];
    }
  }

  function getFallbackEpisodes(video) {
    const totalEpisodes = Number(video.dataset.totalEpisodes || 1);
    const videoStartId = Number(video.dataset.videoStartId || 0);
    const episodes = [];

    for (let episode = 1; episode <= totalEpisodes; episode += 1) {
      episodes.push({
        episodeId: '',
        episodeNumber: episode,
        videoId: videoStartId ? videoStartId + episode - 1 : ''
      });
    }

    return episodes;
  }

  function addFallbackVideoIds(video, episodes) {
    const videoStartId = Number(video.dataset.videoStartId || 0);

    if (!videoStartId) {
      return episodes;
    }

    return episodes.map(episode => ({
      ...episode,
      videoId: episode.videoId || videoStartId + Number(episode.episodeNumber) - 1
    }));
  }

  async function buildEpisodePickerWithIds(video) {
    const totalEpisodes = Number(video.dataset.totalEpisodes || 1);
    const section = video.closest('.anime-detail-section');
    const picker = section && section.querySelector('[data-episode-picker]');

    // films do not need episode buttons
    // series creates buttons from html episode count
    if (!picker || totalEpisodes < 2) return;

    picker.textContent = '';

    const episodes = await loadEpisodes(video);
    const pickerEpisodes = episodes.length ? addFallbackVideoIds(video, episodes) : getFallbackEpisodes(video);

    pickerEpisodes.forEach(episode => {
      const episodeNumber = Number(episode.episodeNumber);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'episode-choice';
      button.textContent = `Серия ${episodeNumber}`;
      button.dataset.episodeId = String(episode.episodeId || '');
      button.dataset.episodeNumber = String(episodeNumber);
      button.dataset.videoId = String(episode.videoId || '');

      if (episodeNumber === Number(video.dataset.episodeNumber || 1)) {
        button.classList.add('is-active');
        video.dataset.episodeId = String(episode.episodeId || '');
        if (episode.videoId) {
          video.dataset.src = `/video/${episode.videoId}`;
        }
      }

      button.addEventListener('click', () => {
        picker.querySelectorAll('.episode-choice').forEach(item => {
          item.classList.toggle('is-active', item === button);
        });

        setEpisode(video, episode);
      });

      picker.appendChild(button);
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
    buildEpisodePickerWithIds(video);

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
