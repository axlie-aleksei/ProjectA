const { Readable } = require('stream');

const videoServerUrl = (process.env.VIDEO_SERVER_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const forwardedHeaders = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'content-disposition'
];

function copyHeaders(from, to) {
  forwardedHeaders.forEach(header => {
    const value = from.headers.get(header);

    if (value) {
      to.setHeader(header, value);
    }
  });
}

module.exports = {
  async streamVideo(req, res) {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId) || videoId < 1) {
      return res.status(400).json({ error: 'Invalid video' });
    }

    try {
      const headers = {};

      // browser sends range when user seeks video
      // spring needs this header to return only needed chunk
      if (req.headers.range) {
        headers.Range = req.headers.range;
      }

      // browser asks our site for video
      // node quietly asks spring on the same server
      const upstream = await fetch(`${videoServerUrl}/video/${videoId}`, { headers });

      res.status(upstream.status);
      copyHeaders(upstream, res);

      if (!upstream.body) {
        return res.end();
      }

      Readable.fromWeb(upstream.body)
        .on('error', () => {
          res.destroy();
        })
        .pipe(res);
    } catch (error) {
      console.error('Error loading video:', error);
      return res.status(503).json({ error: 'Video server is unavailable' });
    }
  }
};
