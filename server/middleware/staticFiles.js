const path = require('path');
const express = require('express');

function staticFiles(app) {
  // files from public go through this path
  app.use('/public', express.static(path.join(__dirname, '..', '..', 'public')));

  // main page for root url
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'views', 'index.html'));
  });

  // only html pages from views can be opened here
  app.get('/:page', (req, res) => {
    const page = req.params.page;

    // this keeps other random paths from being used as files
    if (!page.endsWith('.html')) return res.status(404).send('Page not found');

    const filePath = path.join(__dirname, '..', '..', 'views', page);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).send('Page not found');
    });
  });
}

module.exports = staticFiles;
