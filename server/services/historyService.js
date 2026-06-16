const db = require('../db');

module.exports = {
  async getContinueContentIds(userId) {
    // history stores episode id
    // page cards use anime id
    // this join turns watched episodes into anime ids for html cards
    const [rows] = await db.query(
      `
        SELECT e.content_id
        FROM watch_history wh
        JOIN episodes e ON e.id = wh.episode_id
        WHERE wh.user_id = ?
          AND wh.progress_seconds > 0
        GROUP BY e.content_id
        ORDER BY MAX(wh.updated_at) DESC
      `,
      [userId]
    );

    return rows.map(row => row.content_id);
  },

  async saveWatchProgress(userId, data) {
    const contentId = Number(data.contentId);
    const episodeNumber = Number(data.episodeNumber || 1);
    const episodeId = Number(data.episodeId || 0);
    const rawProgress = Number(data.progressSeconds || 0);
    const progressSeconds = Number.isFinite(rawProgress) ? Math.max(0, Math.floor(rawProgress)) : 0;

    if (!Number.isInteger(contentId) || contentId < 1) {
      throw new Error('Invalid content');
    }

    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      throw new Error('Invalid episode');
    }

    if (episodeId && (!Number.isInteger(episodeId) || episodeId < 1)) {
      throw new Error('Invalid episode');
    }

    const [content] = await db.query(
      'SELECT id FROM media_content WHERE id = ? LIMIT 1',
      [contentId]
    );

    if (!content.length) {
      throw new Error('Invalid content');
    }

    // zero progress is not useful history
    // it also stops old player clicks from wiping saved time
    if (progressSeconds < 1) {
      return {
        saved: false,
        contentId,
        episodeNumber,
        progressSeconds: 0
      };
    }

    let episodes;

    if (episodeId) {
      // episode id comes from db
      [episodes] = await db.query(
        `
          SELECT id, episode_number
          FROM episodes
          WHERE id = ? AND content_id = ?
          LIMIT 1
        `,
        [episodeId, contentId]
      );
    } else {
      // first we make sure this anime has episode row
      // after that history can point to one stable episode id
      await db.query(
        `
          INSERT IGNORE INTO episodes (content_id, episode_number)
          VALUES (?, ?)
        `,
        [contentId, episodeNumber]
      );

      [episodes] = await db.query(
        `
          SELECT id, episode_number
          FROM episodes
          WHERE content_id = ? AND episode_number = ?
          LIMIT 1
        `,
        [contentId, episodeNumber]
      );
    }

    if (!episodes.length) {
      throw new Error('Episode not found');
    }

    const savedEpisodeId = episodes[0].id;
    const savedEpisodeNumber = episodes[0].episode_number || episodeNumber;

    // one user can have only one row for one episode
    // if row already exists we update saved stop time
    const [result] = await db.query(
      `
        INSERT INTO watch_history (user_id, episode_id, progress_seconds)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          progress_seconds = VALUES(progress_seconds),
          updated_at = CURRENT_TIMESTAMP
      `,
      [userId, savedEpisodeId, progressSeconds]
    );

    return {
      id: result.insertId || null,
      saved: true,
      contentId,
      episodeId: savedEpisodeId,
      episodeNumber: savedEpisodeNumber,
      progressSeconds
    };
  },

  async getWatchProgress(userId, data) {
    const contentId = Number(data.contentId);
    const episodeNumber = Number(data.episodeNumber || 1);
    const episodeId = Number(data.episodeId || 0);

    if (!Number.isInteger(contentId) || contentId < 1) {
      throw new Error('Invalid content');
    }

    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      throw new Error('Invalid episode');
    }

    if (episodeId && (!Number.isInteger(episodeId) || episodeId < 1)) {
      throw new Error('Invalid episode');
    }

    let rows;

    if (episodeId) {
      // page can use real episode id
      [rows] = await db.query(
        `
          SELECT wh.progress_seconds
          FROM watch_history wh
          JOIN episodes e ON e.id = wh.episode_id
          WHERE wh.user_id = ?
            AND e.content_id = ?
            AND e.id = ?
          LIMIT 1
        `,
        [userId, contentId, episodeId]
      );
    } else {
      // progress is stored by episode id
      // page only knows anime id we join through episodes
      [rows] = await db.query(
        `
          SELECT wh.progress_seconds
          FROM watch_history wh
          JOIN episodes e ON e.id = wh.episode_id
          WHERE wh.user_id = ?
            AND e.content_id = ?
            AND e.episode_number = ?
          LIMIT 1
        `,
        [userId, contentId, episodeNumber]
      );
    }

    return {
      contentId,
      episodeId: episodeId || null,
      episodeNumber,
      progressSeconds: rows.length ? rows[0].progress_seconds : 0
    };
  }
};
