import { getDb } from '../database.js';
import path from 'path';

export function getAll() {
  return getDb().prepare('SELECT id, name, path FROM main_folders').all();
}

export function add(folderPath) {
  const db = getDb();
  const existing = db.prepare('SELECT id, name, path FROM main_folders WHERE LOWER(path) = LOWER(?)').get(folderPath);
  if (existing) return existing;
  const name = path.basename(folderPath);
  const result = db.prepare('INSERT INTO main_folders (name, path) VALUES (?, ?)').run(name, folderPath);
  return { id: result.lastInsertRowid, name, path: folderPath };
}

export function remove(id) {
  const db = getDb();
  db.transaction(() => {
    // Videos have two FK paths (subfolder_id and lesson_id), both with ON DELETE CASCADE.
    // SQLite raises SQLITE_CONSTRAINT_FOREIGNKEY when both paths cascade simultaneously,
    // so we delete manually in leaf-to-root order.

    const subfolderIds = db.prepare(`
      SELECT sf.id FROM subfolders sf
      JOIN folders f ON f.id = sf.folder_id
      WHERE f.main_folder_id = ?
    `).all(id).map(r => r.id);

    if (subfolderIds.length > 0) {
      const ph = subfolderIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM notes WHERE video_id IN (SELECT id FROM videos WHERE subfolder_id IN (${ph}))`).run(...subfolderIds);
      db.prepare(`DELETE FROM videos WHERE subfolder_id IN (${ph})`).run(...subfolderIds);
      db.prepare(`DELETE FROM lessons WHERE subfolder_id IN (${ph})`).run(...subfolderIds);
      db.prepare(`DELETE FROM subfolders WHERE id IN (${ph})`).run(...subfolderIds);
    }

    const folderIds = db.prepare('SELECT id FROM folders WHERE main_folder_id = ?').all(id).map(r => r.id);
    if (folderIds.length > 0) {
      const ph = folderIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM folder_last_played WHERE folder_id IN (${ph})`).run(...folderIds);
      db.prepare(`DELETE FROM folder_tags WHERE folder_id IN (${ph})`).run(...folderIds);
    }

    db.prepare('DELETE FROM folders WHERE main_folder_id = ?').run(id);
    db.prepare('DELETE FROM main_folders WHERE id = ?').run(id);
  })();
}

