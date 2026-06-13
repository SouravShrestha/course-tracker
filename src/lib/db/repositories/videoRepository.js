import { getDb } from '../database.js';

function nowIso() {
  return new Date().toISOString();
}

export function updateProgress(videoId, progress) {
  const db = getDb();
  const video = db.prepare('SELECT id, subfolder_id FROM videos WHERE id = ?').get(videoId);
  if (!video) throw new Error('Video not found');
  db.prepare('UPDATE videos SET progress = ? WHERE id = ?').run(progress, videoId);
  const subfolder = db.prepare('SELECT folder_id FROM subfolders WHERE id = ?').get(video.subfolder_id);
  if (subfolder) {
    const now = nowIso();
    const existing = db.prepare('SELECT id FROM folder_last_played WHERE folder_id = ?').get(subfolder.folder_id);
    if (existing) {
      db.prepare('UPDATE folder_last_played SET video_id = ?, last_played_at = ? WHERE folder_id = ?').run(videoId, now, subfolder.folder_id);
    } else {
      db.prepare('INSERT INTO folder_last_played (folder_id, video_id, last_played_at) VALUES (?, ?, ?)').run(subfolder.folder_id, videoId, now);
    }
  }
  return { message: 'Video updated successfully.', video: db.prepare('SELECT id, progress FROM videos WHERE id = ?').get(videoId) };
}

export function search(query) {
  const db = getDb();
  const rows = query
    ? db.prepare(`SELECT v.id, v.name, sf.folder_id FROM videos v JOIN subfolders sf ON sf.id = v.subfolder_id WHERE v.name LIKE ? ORDER BY v.name`).all(`%${query}%`)
    : db.prepare(`SELECT v.id, v.name, sf.folder_id FROM videos v JOIN subfolders sf ON sf.id = v.subfolder_id ORDER BY v.name`).all();
  return rows.map(r => ({ id: r.id, name: r.name, folder_id: r.folder_id }));
}
