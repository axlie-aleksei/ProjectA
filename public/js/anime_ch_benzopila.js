(function () {
  const mediaButtons = document.querySelectorAll('[data-media-target]');
  const mediaPanels = document.querySelectorAll('.media-panel');
  const chainsawPlayer = document.getElementById('chainsaw-player');
  let playerAudioPrepared = false;

  function enablePlayerAudio() {
    if (!chainsawPlayer) return;

    chainsawPlayer.defaultMuted = false;
    chainsawPlayer.muted = false;

    if (!playerAudioPrepared || chainsawPlayer.volume === 0) {
      chainsawPlayer.volume = 1;
      playerAudioPrepared = true;
    }
  }

  function loadPlayer() {
    if (!chainsawPlayer || !chainsawPlayer.dataset.src) return;

    enablePlayerAudio();

    if (chainsawPlayer.getAttribute('src') !== chainsawPlayer.dataset.src) {
      chainsawPlayer.src = chainsawPlayer.dataset.src;
      chainsawPlayer.load();
    }
  }

  function pausePlayer() {
    if (chainsawPlayer) {
      chainsawPlayer.pause();
    }
  }

  mediaButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.mediaTarget;

      mediaButtons.forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });

      mediaPanels.forEach((panel) => {
        panel.hidden = panel.id !== targetId;
      });

      if (targetId === 'player-panel') {
        loadPlayer();
        return;
      }

      pausePlayer();
    });
  });

  if (chainsawPlayer) {
    chainsawPlayer.addEventListener('play', enablePlayerAudio);
  }
})();
