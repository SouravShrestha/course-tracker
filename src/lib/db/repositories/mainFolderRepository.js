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
  getDb().prepare('DELETE FROM main_folders WHERE id = ?').run(id);
}
