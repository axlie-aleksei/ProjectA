const db = require('../db');

function cleanText(value) {
  // filters come from query string
  // keep them short before they go near sql
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new Error('Invalid filters');
  if (value.length > 60) throw new Error('Invalid filters');

  return value.trim();
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

    // build where only from selected filters
    // user values stay in values so we do not paste text into sql
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
  }
};
