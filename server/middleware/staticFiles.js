const path = require('path');
const express = require('express');

const viewsDir = path.join(__dirname, '..', '..', 'views');
const pages = new Set([
  '404.html',
  'anime_attack_titans.html',
  'anime_ch_benzopila.html',
  'anime_kaiju8.html',
  'index.html',
  'login.html',
  'my_hero.html',
  'ongoings.html',
  'profile.html',
  'registr.html',
  'solo_leveling.html'
]);

function staticFiles(app) {
  // public files are mounted on one url
  // root folders stay closed for browser
  app.use('/public', express.static(path.join(__dirname, '..', '..', 'public'), {
    dotfiles: 'ignore',
    index: false
  }));

  app.get('/', (req, res) => {
    res.sendFile(path.join(viewsDir, 'index.html'));
  });

  // only known html pages can be opened here
  // random file names should not reach sendfile
  app.get('/:page', (req, res) => {
    const page = req.params.page;

    if (!pages.has(page)) return res.status(404).send('Page not found');

    const filePath = path.join(viewsDir, page);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).send('Page not found');
    });
  });
}

module.exports = staticFiles;
