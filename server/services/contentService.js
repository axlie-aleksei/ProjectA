const db = require('../db');

function cleanText(value) {
  // filters come from query string
  // keep them short before they go near sql
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new Error('Invalid filters');
  if (value.length > 60) throw new Error('Invalid filters');

  return value.trim();
}

function cleanSearch(value) {
  // search text stays small
  const search = cleanText(value);

  if (search.length > 80) {
    throw new Error('Invalid filters');
  }

  return search;
}

function cleanId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw new Error('Invalid content');
  }

  return id;
}

function cleanTotal(value) {
  const total = Number(value || 1);

  if (!Number.isInteger(total) || total < 1 || total > 200) {
    throw new Error('Invalid episode');
  }

  return total;
}

function getDocumentPrefix(contentId) {
  const prefixes = {
    5: 'Ore_dake_Level_Up_na_Ken_'
  };

  return prefixes[contentId] || '';
}

function getEpisodeNumberFromDocumentName(name) {
  const match = String(name || '').match(/\[(\d+)]/);

  return match ? Number(match[1]) : 0;
}

async function getDocumentVideoIds(contentId, total) {
  const prefix = getDocumentPrefix(contentId);

  if (!prefix) {
    return new Map();
  }

  const [documents] = await db.query(
    `
      SELECT id, name
      FROM \`document\`
      WHERE name LIKE ?
      ORDER BY id
    `,
    [`${prefix}%`]
  );

  const videoIds = new Map();

  documents.forEach(document => {
    const episodeNumber = getEpisodeNumberFromDocumentName(document.name);

    if (episodeNumber >= 1 && episodeNumber <= total && !videoIds.has(episodeNumber)) {
      videoIds.set(episodeNumber, document.id);
    }
  });

  return videoIds;
}

module.exports = {
  async getFilterOptions() {
    const [genres] = await db.query('SELECT name FROM genres ORDER BY name');
    const [types] = await db.query('SELECT name FROM types ORDER BY name');
    const [years] = await db.query(
      'SELECT DISTINCT release_year AS year FROM media_content ORDER BY release_year DESC'
    );

    return {
      genres: genres.map(item => item.name),
      types: types.map(item => item.name),
      years: years.map(item => item.year)
    };
  },

  async getFilteredContentIds(filters) {
    const values = [];
    const where = [];
    const genre = cleanText(filters.genre);
    const type = cleanText(filters.type);
    const year = cleanText(filters.year);
    const search = cleanSearch(filters.q);

    // build where only from selected filters
    // user values stay in values so we do not paste text into sql
    if (search) {
      where.push('mc.title LIKE ?');
      values.push(`%${search}%`);
    }

    if (genre) {
      where.push('g.name = ?');
      values.push(genre);
    }

    if (year) {
      const yearNumber = Number(year);
      // year is number only so random text cannot become sql condition
      if (!Number.isInteger(yearNumber) || yearNumber < 1900 || yearNumber > 2100) {
        throw new Error('Invalid filters');
      }

      where.push('mc.release_year = ?');
      values.push(yearNumber);
    }

    if (type) {
      where.push('t.name = ?');
      values.push(type);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
        SELECT DISTINCT mc.id
        FROM media_content mc
        LEFT JOIN types t ON t.id = mc.type_id
        LEFT JOIN content_genres cg ON cg.content_id = mc.id
        LEFT JOIN genres g ON g.id = cg.genre_id
        ${whereSql}
        ORDER BY mc.id
      `,
      values
    );

    return rows.map(item => item.id);
  },

  async getEpisodes(contentIdValue, totalValue) {
    const contentId = cleanId(contentIdValue);
    const total = cleanTotal(totalValue);

    const [existingRows] = await db.query(
      `
        SELECT episode_number
        FROM episodes
        WHERE content_id = ?
      `,
      [contentId]
    );

    const existingEpisodes = new Set(existingRows.map(row => Number(row.episode_number)));
    const missingRows = [];

    for (let episode = 1; episode <= total; episode += 1) {
      if (!existingEpisodes.has(episode)) {
        missingRows.push([contentId, episode]);
      }
    }

    // each button needs one real episode id
    if (missingRows.length) {
      await db.query(
        'INSERT INTO episodes (content_id, episode_number) VALUES ?',
        [missingRows]
      );
    }

    const documentVideoIds = await getDocumentVideoIds(contentId, total);
    const [rows] = await db.query(
      `
        SELECT
          id AS episodeId,
          episode_number AS episodeNumber,
          document_id AS videoId
        FROM episodes
        WHERE content_id = ?
          AND episode_number <= ?
        ORDER BY episode_number
      `,
      [contentId, total]
    );

    return rows.map(row => ({
      ...row,
      videoId: row.videoId || documentVideoIds.get(Number(row.episodeNumber)) || null
    }));
  }
};
