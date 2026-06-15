const db = require('../db');

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

    // build where only from selected filters
    // user values stay in values so we do not paste text into sql
    if (filters.genre) {
      where.push('g.name = ?');
      values.push(filters.genre);
    }

    if (filters.year) {
      where.push('mc.release_year = ?');
      values.push(Number(filters.year));
    }

    if (filters.type) {
      where.push('t.name = ?');
      values.push(filters.type);
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
