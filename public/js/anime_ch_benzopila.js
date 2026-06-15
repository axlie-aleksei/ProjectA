(function () {
  const mediaButtons = document.querySelectorAll('[data-media-target]');
  const mediaPanels = document.querySelectorAll('.media-panel');

  function prepareVideo(video) {
    if (!video) return;

    video.defaultMuted = false;
    video.muted = false;

    if (video.volume === 0) {
      video.volume = 1;
    }
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
      }
    });
  });

  document.querySelectorAll('video').forEach(video => {
    video.addEventListener('play', () => prepareVideo(video));
  });
})();
