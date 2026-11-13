CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_photo_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  captured_at TEXT,
  location TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
  camera TEXT,
  lens TEXT,
  aperture REAL,
  shutter TEXT,
  iso INTEGER,
  focal_length REAL,
  original_format TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_photos_category ON photos(category_id);
CREATE INDEX idx_photos_collection ON photos(collection_id);
CREATE INDEX idx_photos_date ON photos(captured_at);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
INSERT INTO categories (slug, name, position) VALUES
  ('urban', 'Urban', 1),
  ('street-photography', 'Street Photography', 2),
  ('architecture', 'Architecture', 3),
  ('automotive', 'Automotive', 4),
  ('nature', 'Nature', 5),
  ('portraits', 'Portraits', 6),
  ('experimental', 'Experimental', 7),
  ('other', 'Other', 8);
