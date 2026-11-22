-- Run once on existing project databases; fresh databases use the full schema.
ALTER TABLE media_images
  ADD COLUMN thumbnail_url VARCHAR(3000) NULL DEFAULT NULL,
  ADD COLUMN upload_request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  ADD COLUMN upload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  ADD UNIQUE KEY uq_media_user_request (uploader_sub, upload_request_id),
  ADD UNIQUE KEY uq_media_session_request (upload_owner_hash, upload_request_id);
