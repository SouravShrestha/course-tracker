import { getDb } from '../database.js';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi'];

function nowIso() {
  return new Date().toISOString();
}


function getVideoDurationSync(videoPath) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffprobePath = require('ffprobe-static').path;
    const output = execFileSync(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ], { timeout: 10000 }).toString().trim();
    const totalSeconds = parseFloat(output);
    if (isNaN(totalSeconds)) return '00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return h > 0
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } catch {
    return '00:00';
  }
}

function containsVideos(folderPath) {
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && VIDEO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) return true;
      if (entry.isDirectory() && containsVideos(path.join(folderPath, entry.name))) return true;
    }
  } catch { /**/ }
  return false;
}

function cleanupMissing(db) {
  const mainFolders = db.prepare('SELECT id, path FROM main_folders').all();
  for (const mf of mainFolders) {
    if (!fs.existsSync(mf.path)) { db.prepare('DELETE FROM main_folders WHERE id = ?').run(mf.id); continue; }
    const folders = db.prepare('SELECT id, name FROM folders WHERE main_folder_id = ?').all(mf.id);
    for (const f of folders) {
      const fPath = path.join(mf.path, f.name);
      if (!fs.existsSync(fPath)) { db.prepare('DELETE FROM folders WHERE id = ?').run(f.id); continue; }
      const subs = db.prepare('SELECT id, name FROM subfolders WHERE folder_id = ?').all(f.id);
      for (const sf of subs) {
        const sfPath = path.join(fPath, sf.name);
        if (!fs.existsSync(sfPath)) { db.prepare('DELETE FROM subfolders WHERE id = ?').run(sf.id); continue; }
        const videos = db.prepare('SELECT id, path FROM videos WHERE subfolder_id = ?').all(sf.id);
        for (const v of videos) {
          if (!fs.existsSync(v.path)) db.prepare('DELETE FROM videos WHERE id = ?').run(v.id);
        }
      }
    }
  }
}

function buildFolderResponse(db, folder, mainFolder) {
  const lp = db.prepare('SELECT video_id, last_played_at FROM folder_last_played WHERE folder_id = ?').get(folder.id);
  let lastPlayedVideo = null;
  if (lp?.video_id) {
    const v = db.prepare('SELECT id, name, path, progress, duration FROM videos WHERE id = ?').get(lp.video_id);
    if (v) lastPlayedVideo = { ...v, notes: db.prepare('SELECT * FROM notes WHERE video_id = ?').all(v.id) };
  }
  const tags = db.prepare(`SELECT t.id, t.name FROM tags t JOIN folder_tags ft ON ft.tag_id = t.id WHERE ft.folder_id = ?`).all(folder.id);
  return {
    id: folder.id,
    name: folder.name,
    main_folder_name: mainFolder.name,
    path: path.join(mainFolder.path, folder.name),
    main_folder_path: mainFolder.path,
    tags,
    last_played_video: lastPlayedVideo,
    last_played_at: lp?.last_played_at ?? null,
  };
}

export function scanAllMainFolders() {
  const db = getDb();
  const mainFolders = db.prepare('SELECT id, name, path FROM main_folders').all();
  const result = [];
  for (const mf of mainFolders) {
    if (!fs.existsSync(mf.path)) continue;
    let entries;
    try { entries = fs.readdirSync(mf.path, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      let folder = db.prepare('SELECT id, name FROM folders WHERE main_folder_id = ? AND name = ?').get(mf.id, entry.name);
      if (!folder) {
        try {
          const r = db.prepare('INSERT OR IGNORE INTO folders (name, main_folder_id) VALUES (?, ?)').run(entry.name, mf.id);
          folder = { id: r.lastInsertRowid, name: entry.name };
        } catch { continue; }
      }
      if (!folder.id) continue;
      const tags = db.prepare(`SELECT t.id, t.name FROM tags t JOIN folder_tags ft ON ft.tag_id = t.id WHERE ft.folder_id = ?`).all(folder.id);
      result.push({ id: folder.id, name: folder.name, main_folder_id: mf.id, main_folder_name: mf.name, path: path.join(mf.path, folder.name), tags });
    }
  }
  cleanupMissing(db);
  return result;
}

export function scanFolder(folderPath) {
  const db = getDb();
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    throw new Error('Path does not exist or is not a directory');
  }
  const folderName = path.basename(folderPath);
  const mainFolderPath = path.dirname(folderPath);
  const mainFolder = db.prepare('SELECT id FROM main_folders WHERE path = ?').get(mainFolderPath);
  let folder = db.prepare('SELECT id, name FROM folders WHERE name = ? AND main_folder_id = ?').get(folderName, mainFolder?.id ?? null);
  if (!folder) {
    const r = db.prepare('INSERT OR IGNORE INTO folders (name, main_folder_id) VALUES (?, ?)').run(folderName, mainFolder?.id ?? null);
    folder = { id: r.lastInsertRowid, name: folderName };
  }

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sfPath = path.join(folderPath, entry.name);
    let sf = db.prepare('SELECT id FROM subfolders WHERE folder_id = ? AND name = ?').get(folder.id, entry.name);
    if (!sf) {
      const r = db.prepare('INSERT OR IGNORE INTO subfolders (name, folder_id) VALUES (?, ?)').run(entry.name, folder.id);
      sf = { id: r.lastInsertRowid };
    }
    const videoFiles = fs.readdirSync(sfPath, { withFileTypes: true })
      .filter(f => f.isFile() && VIDEO_EXTENSIONS.includes(path.extname(f.name).toLowerCase()));
    for (const vf of videoFiles) {
      const vPath = path.join(sfPath, vf.name);
      const existing = db.prepare('SELECT id FROM videos WHERE LOWER(path) = LOWER(?)').get(vPath);
      if (!existing) {
        const duration = getVideoDurationSync(vPath);
        db.prepare('INSERT OR IGNORE INTO videos (name, path, progress, duration, subfolder_id) VALUES (?, ?, 0.0, ?, ?)').run(vf.name, vPath, duration, sf.id);
      }
    }
  }

  const subfolders = db.prepare('SELECT id, name FROM subfolders WHERE folder_id = ?').all(folder.id)
    .map(sf => ({ ...sf, videos: db.prepare('SELECT id, name, path, progress, duration FROM videos WHERE subfolder_id = ?').all(sf.id) }));
  const lp = db.prepare('SELECT video_id, last_played_at FROM folder_last_played WHERE folder_id = ?').get(folder.id);
  let lastPlayedVideo = null;
  if (lp?.video_id) lastPlayedVideo = db.prepare('SELECT id, name, path, progress, duration FROM videos WHERE id = ?').get(lp.video_id);
  const tags = db.prepare(`SELECT t.id, t.name FROM tags t JOIN folder_tags ft ON ft.tag_id = t.id WHERE ft.folder_id = ?`).all(folder.id);
  return { id: folder.id, name: folder.name, path: folderPath, tags, last_played_video: lastPlayedVideo, last_played_at: lp?.last_played_at ?? null, subfolders };
}

export function getAll() {
  const db = getDb();
  return db.prepare('SELECT f.id, f.name, f.main_folder_id FROM folders f').all()
    .map(f => {
      const mf = db.prepare('SELECT id, name, path FROM main_folders WHERE id = ?').get(f.main_folder_id);
      return mf ? buildFolderResponse(db, f, mf) : null;
    }).filter(Boolean);
}

export function getById(id) {
  const db = getDb();
  const folder = db.prepare('SELECT id, name, main_folder_id FROM folders WHERE id = ?').get(id);
  if (!folder) return null;
  const mf = db.prepare('SELECT id, name, path FROM main_folders WHERE id = ?').get(folder.main_folder_id);
  return mf ? buildFolderResponse(db, folder, mf) : null;
}

export function search(query) {
  const db = getDb();
  const folders = query
    ? db.prepare(`SELECT f.id, f.name, mf.path FROM folders f JOIN main_folders mf ON mf.id = f.main_folder_id WHERE f.name LIKE ? ORDER BY f.name`).all(`%${query}%`)
    : db.prepare(`SELECT f.id, f.name, mf.path FROM folders f JOIN main_folders mf ON mf.id = f.main_folder_id ORDER BY f.name`).all();
  return folders.map(f => ({ id: f.id, name: f.name, path: path.join(f.path, f.name) }));
}

export function getSubfolders(folderId) {
  const db = getDb();
  return db.prepare('SELECT id, name FROM subfolders WHERE folder_id = ?').all(folderId)
    .map(sf => ({
      ...sf,
      videos: db.prepare('SELECT id, name, path, progress, duration FROM videos WHERE subfolder_id = ?').all(sf.id)
        .map(v => ({ ...v, notes: db.prepare('SELECT * FROM notes WHERE video_id = ?').all(v.id) })),
    }));
}

export function updateLastPlayed(folderId, videoId) {
  const db = getDb();
  const now = nowIso();
  const existing = db.prepare('SELECT id FROM folder_last_played WHERE folder_id = ?').get(folderId);
  if (existing) {
    db.prepare('UPDATE folder_last_played SET video_id = ?, last_played_at = ? WHERE folder_id = ?').run(videoId, now, folderId);
  } else {
    db.prepare('INSERT INTO folder_last_played (folder_id, video_id, last_played_at) VALUES (?, ?, ?)').run(folderId, videoId, now);
  }
  return { folder_id: folderId, video_id: videoId, last_played_at: now };
}

export function getLastPlayed(folderId) {
  return getDb().prepare('SELECT folder_id, video_id, last_played_at FROM folder_last_played WHERE folder_id = ?').get(folderId) ?? null;
}

export function getAllLastPlayed() {
  const rows = getDb().prepare('SELECT DISTINCT folder_id FROM folder_last_played').all();
  return { folder_ids: rows.map(r => r.folder_id) };
}

export function folderExists(folderPath) {
  return fs.existsSync(folderPath) && containsVideos(folderPath);
}
