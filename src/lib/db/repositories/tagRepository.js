import { getDb } from '../database.js';

export function search(query) {
  const db = getDb();
  return query
    ? db.prepare('SELECT id, name FROM tags WHERE name LIKE ? ORDER BY name').all(`%${query}%`)
    : db.prepare('SELECT id, name FROM tags ORDER BY name').all();
}

export function addToFolder(folderId, tagName) {
  const db = getDb();
  if (!db.prepare('SELECT id FROM folders WHERE id = ?').get(folderId)) throw new Error('Folder not found');
  let tag = db.prepare('SELECT id, name FROM tags WHERE name = ?').get(tagName);
  if (!tag) {
    const r = db.prepare('INSERT INTO tags (name) VALUES (?)').run(tagName);
    tag = { id: r.lastInsertRowid, name: tagName };
  }
  db.prepare('INSERT OR IGNORE INTO folder_tags (folder_id, tag_id) VALUES (?, ?)').run(folderId, tag.id);
  return tag;
}

export function removeFromFolder(folderId, tagName) {
  const db = getDb();
  const tag = db.prepare('SELECT id, name FROM tags WHERE name = ?').get(tagName);
  if (!tag) throw new Error('Tag not found');
  db.prepare('DELETE FROM folder_tags WHERE folder_id = ? AND tag_id = ?').run(folderId, tag.id);
  return tag;
}

export function getForFolder(folderId) {
  return getDb().prepare(`SELECT t.id, t.name FROM tags t JOIN folder_tags ft ON ft.tag_id = t.id WHERE ft.folder_id = ?`).all(folderId);
}

export function deleteUnmapped() {
  const db = getDb();
  const unmapped = db.prepare(`SELECT t.id FROM tags t LEFT JOIN folder_tags ft ON ft.tag_id = t.id WHERE ft.tag_id IS NULL`).all();
  const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
  for (const t of unmapped) stmt.run(t.id);
  return { detail: `Deleted ${unmapped.length} unmapped tags.` };
}
