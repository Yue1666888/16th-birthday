-- Existing project databases only; run once after verifying DATABASE(). Fresh databases use the full schema.
ALTER TABLE memories
  ADD COLUMN version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN updated_at DATETIME(3) NULL DEFAULT NULL,
  ADD COLUMN deleted_at DATETIME(3) NULL DEFAULT NULL,
  ADD COLUMN created_by_sub VARCHAR(128) NULL DEFAULT NULL,
  ADD COLUMN updated_by_sub VARCHAR(128) NULL DEFAULT NULL;
UPDATE memories SET updated_at=published_at WHERE updated_at IS NULL;
ALTER TABLE memories
  MODIFY COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD CONSTRAINT ck_memory_version CHECK (version >= 1),
  ADD KEY ix_memory_visible (deleted_at,published_at,id);
