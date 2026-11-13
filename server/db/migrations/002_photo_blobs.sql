CREATE TABLE photo_assets (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('thumb', 'medium', 'large', 'original')),
  mime_type TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (photo_id, variant)
);
CREATE INDEX idx_photo_assets_variant ON photo_assets(variant);