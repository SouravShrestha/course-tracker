import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

function getDbPath() {
  const dataDir = path.join(os.homedir(), 'Library', 'Application Support', 'CourseTracker');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'player_db.db');
}

// Use a global singleton to survive Next.js HMR reloads in dev
const globalForDb = globalThis;

if (!globalForDb._db) {
  globalForDb._db = new Database(getDbPath());
  globalForDb._db.pragma('journal_mode = WAL');
  globalForDb._db.pragma('foreign_keys = ON');
}

export function getDb() {
  return globalForDb._db;
}
