export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS main_folders (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS folders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      main_folder_id INTEGER REFERENCES main_folders(id) ON DELETE CASCADE,
      UNIQUE(main_folder_id, name)
    );

    CREATE TABLE IF NOT EXISTS folder_tags (
      folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
      tag_id    INTEGER REFERENCES tags(id)    ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subfolders (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
      UNIQUE(folder_id, name)
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      subfolder_id INTEGER REFERENCES subfolders(id) ON DELETE CASCADE,
      UNIQUE(subfolder_id, name)
    );

    CREATE TABLE IF NOT EXISTS videos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      path         TEXT NOT NULL UNIQUE,
      progress     REAL DEFAULT 0.0,
      duration     TEXT,
      subfolder_id INTEGER REFERENCES subfolders(id) ON DELETE CASCADE,
      lesson_id    INTEGER REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folder_last_played (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id      INTEGER NOT NULL UNIQUE REFERENCES folders(id) ON DELETE CASCADE,
      video_id       INTEGER REFERENCES videos(id) ON DELETE SET NULL,
      last_played_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id   INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Incremental migrations for existing databases
  const alterations = [
    `ALTER TABLE videos ADD COLUMN lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE`,
  ];
  for (const sql of alterations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}
