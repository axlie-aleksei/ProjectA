const db = require('../db');

// db has ids and slugs but profile needs page info too
// keep this map small until these fields move to db
const contentInfo = {
  1: {
    title: 'Человек-бензопила: История Резе',
    href: 'anime_ch_benzopila.html',
    image: 'https://kinotv.ru/upload/setka-editor/8b4/l5wt82a7e5n26x61dw9qfv1wm84vkqq3.jpg',
    totalEpisodes: 1,
    durationSeconds: 6000
  },
  2: {
    title: 'Атака Титанов',
    href: 'anime_attack_titans.html',
    image: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
    totalEpisodes: 25,
    durationSeconds: 1440
  },
  3: {
    title: 'Моя геройская академия: Два героя',
    href: 'my_hero.html',
    image: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
    totalEpisodes: 1,
    durationSeconds: 5760
  },
  4: {
    title: 'Кайдзю №8',
    href: 'anime_kaiju8.html',
    image: 'https://cdn.myanimelist.net/images/anime/1370/140362l.jpg',
    totalEpisodes: 12,
    durationSeconds: 1440
  },
  5: {
    title: 'Поднятие уровня в одиночку',
    href: 'solo_leveling.html',
    image: 'https://cdn.myanimelist.net/images/anime/1801/142390l.jpg',
    totalEpisodes: 12,
    durationSeconds: 1440
  }
};

function getInitials(username) {
  return String(username || 'AS')
    .slice(0, 2)
    .toUpperCase();
}

function formatProgress(seconds) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${String(restSeconds).padStart(2, '0')}`;
}

function getContentInfo(contentId, fallbackTitle) {
  return contentInfo[contentId] || {
    title: fallbackTitle,
    href: 'index.html',
    image: '',
    totalEpisodes: 1,
    durationSeconds: 1440
  };
}

function getProgressPercent(seconds, durationSeconds) {
  // profile bar needs percent not only saved seconds
  if (!durationSeconds) return 0;

  return Math.min(100, Math.round((seconds / durationSeconds) * 100));
}

module.exports = {
  async getProfile(userId) {
    const [users] = await db.query(
      'SELECT id, username FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!users.length) {
      throw new Error('User not found');
    }

    const user = users[0];

    // stats count only rows where user really started watching
    const [statsRows] = await db.query(
      `
        SELECT
          COUNT(*) AS watchedEpisodes,
          COUNT(DISTINCT e.content_id) AS inProgress
        FROM watch_history wh
        JOIN episodes e ON e.id = wh.episode_id
        WHERE wh.user_id = ?
          AND wh.progress_seconds > 0
      `,
      [userId]
    );

    // profile page needs last saved rows not only anime ids
    // this join gives anime data episode number and saved time
    const [continueRows] = await db.query(
      `
        SELECT
          mc.id AS contentId,
          mc.title AS dbTitle,
          t.name AS typeName,
          e.episode_number AS episodeNumber,
          wh.progress_seconds AS progressSeconds,
          wh.updated_at AS updatedAt
        FROM watch_history wh
        JOIN episodes e ON e.id = wh.episode_id
        JOIN media_content mc ON mc.id = e.content_id
        LEFT JOIN types t ON t.id = mc.type_id
        WHERE wh.user_id = ?
          AND wh.progress_seconds > 0
        ORDER BY wh.updated_at DESC
        LIMIT 6
      `,
      [userId]
    );

    const continueWatching = continueRows.map(row => {
      const item = getContentInfo(row.contentId, row.dbTitle);

      // db row becomes one card for profile page
      // title image and duration come from the page info map
      return {
        contentId: row.contentId,
        title: item.title,
        href: item.href,
        image: item.image,
        typeName: row.typeName || 'Аниме',
        episodeNumber: row.episodeNumber,
        totalEpisodes: item.totalEpisodes,
        durationSeconds: item.durationSeconds,
        progressSeconds: row.progressSeconds,
        progressPercent: getProgressPercent(row.progressSeconds, item.durationSeconds),
        progressLabel: formatProgress(row.progressSeconds),
        updatedAt: row.updatedAt
      };
    });

    return {
      user: {
        username: user.username,
        initials: getInitials(user.username)
      },
      stats: {
        watchedEpisodes: Number(statsRows[0].watchedEpisodes || 0),
        inProgress: Number(statsRows[0].inProgress || 0)
      },
      continueWatching
    };
  }
};
