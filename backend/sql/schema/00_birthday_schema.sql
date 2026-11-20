SET NAMES utf8mb4;

SET time_zone = '+00:00';

CREATE TABLE invitations (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `phone` CHAR(11) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `attendance` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `gift_choice` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `mailing_address` VARCHAR(500) NULL DEFAULT NULL,
  `version` BIGINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_inv_phone (phone),
  KEY ix_inv_updated (updated_at, id),
  KEY ix_inv_attendance (attendance, updated_at, id),
  KEY ix_inv_gift (gift_choice, updated_at, id),
  CONSTRAINT ck_inv_name CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  CONSTRAINT ck_inv_phone CHECK (REGEXP_LIKE(phone, '^1[3-9][0-9]{9}$', 'c')),
  CONSTRAINT ck_inv_attendance CHECK (attendance IN ('ATTENDING','NOT_ATTENDING')),
  CONSTRAINT ck_inv_gift CHECK (gift_choice IN ('NONE','PICKUP','MAIL')),
  CONSTRAINT ck_inv_pickup CHECK (gift_choice <> 'PICKUP' OR attendance = 'ATTENDING'),
  CONSTRAINT ck_inv_address CHECK ((gift_choice = 'MAIL' AND mailing_address IS NOT NULL AND CHAR_LENGTH(TRIM(mailing_address)) > 0) OR (gift_choice <> 'MAIL' AND mailing_address IS NULL)),
  CONSTRAINT ck_inv_version CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE email_notifications (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `invitation_id` BIGINT NOT NULL,
  `invitation_version` BIGINT NOT NULL,
  `send_no` INT UNSIGNED NOT NULL,
  `confirmation_request_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `confirmation_request_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `confirmed_by_sub` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `confirmed_by_name` VARCHAR(150) NULL DEFAULT NULL,
  `confirmed_at` DATETIME(3) NOT NULL,
  `environment` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `client_key` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `invitation_snapshot` JSON NOT NULL,
  `recipient_email` VARCHAR(254) NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `text_body` MEDIUMTEXT NOT NULL,
  `html_body` MEDIUMTEXT NULL,
  `task_status` VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'READY',
  `remote_mail_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `remote_status` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `remote_attempts` INT UNSIGNED NULL DEFAULT NULL,
  `accepted_at` DATETIME(3) NULL DEFAULT NULL,
  `sent_at` DATETIME(3) NULL DEFAULT NULL,
  `submit_attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `poll_failures` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_error_code` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `last_error_message` VARCHAR(2000) NULL DEFAULT NULL,
  `next_run_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lease_owner` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `lease_token` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `lease_until` DATETIME(3) NULL DEFAULT NULL,
  `version` BIGINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `active_marker` TINYINT GENERATED ALWAYS AS (CASE WHEN task_status IN ('READY','SUBMITTING','SUBMIT_RETRY','SUBMIT_UNKNOWN','POLLING') THEN 1 ELSE NULL END) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_batch (invitation_id, invitation_version, send_no),
  UNIQUE KEY uq_email_confirmation (confirmed_by_sub, confirmation_request_id),
  UNIQUE KEY uq_email_client (client_key),
  UNIQUE KEY uq_email_remote (remote_mail_id),
  UNIQUE KEY uq_email_active (invitation_id, invitation_version, active_marker),
  KEY ix_email_schedule (task_status, next_run_at, lease_until, id),
  CONSTRAINT fk_email_invitation FOREIGN KEY (invitation_id) REFERENCES invitations (id),
  CONSTRAINT ck_email_version CHECK (invitation_version >= 1 AND version >= 1 AND send_no >= 1),
  CONSTRAINT ck_email_task CHECK (task_status IN ('READY','SUBMITTING','SUBMIT_RETRY','SUBMIT_UNKNOWN','POLLING','SUCCEEDED','FAILED','CANCELLED','DISABLED')),
  CONSTRAINT ck_email_remote CHECK (remote_status IS NULL OR remote_status IN ('queued','sending','sent','failed')),
  CONSTRAINT ck_email_snapshot CHECK (JSON_TYPE(invitation_snapshot) = 'OBJECT'),
  CONSTRAINT ck_email_body CHECK (CHAR_LENGTH(TRIM(subject)) > 0 AND CHAR_LENGTH(TRIM(text_body)) > 0),
  CONSTRAINT ck_email_lease CHECK ((lease_owner IS NULL AND lease_token IS NULL AND lease_until IS NULL) OR (lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_until IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE media_images (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `url` VARCHAR(2048) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `uploaded_name` VARCHAR(255) NULL DEFAULT NULL,
  `source_mime_type` VARCHAR(50) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source_size_bytes` INT UNSIGNED NOT NULL,
  `stored_size_bytes` INT UNSIGNED NULL DEFAULT NULL,
  `width` INT UNSIGNED NULL DEFAULT NULL,
  `height` INT UNSIGNED NULL DEFAULT NULL,
  `uploader_sub` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `upload_owner_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_media_created (created_at, id),
  KEY ix_media_uploader (uploader_sub, created_at),
  KEY ix_media_owner (upload_owner_hash),
  CONSTRAINT ck_media_size CHECK (source_size_bytes > 0 AND source_size_bytes <= 10485760),
  CONSTRAINT ck_media_mime CHECK (source_mime_type IN ('image/jpeg','image/png','image/webp','image/gif')),
  CONSTRAINT ck_media_dimensions CHECK ((width IS NULL AND height IS NULL) OR (width IS NOT NULL AND height IS NOT NULL AND width > 0 AND height > 0)),
  CONSTRAINT ck_media_owner CHECK (uploader_sub IS NOT NULL OR upload_owner_hash IS NOT NULL),
  CONSTRAINT ck_media_url CHECK (CHAR_LENGTH(TRIM(url)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE memories (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `submission_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `display_name` VARCHAR(50) NULL DEFAULT NULL,
  `title` VARCHAR(100) NULL DEFAULT NULL,
  `content` TEXT NULL,
  `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_memory_submission (submission_id),
  KEY ix_memory_published (published_at, id),
  CONSTRAINT ck_memory_name CHECK (display_name IS NULL OR CHAR_LENGTH(TRIM(display_name)) > 0),
  CONSTRAINT ck_memory_title CHECK (title IS NULL OR CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT ck_memory_content CHECK (content IS NULL OR (CHAR_LENGTH(TRIM(content)) > 0 AND CHAR_LENGTH(content) <= 5000))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE memory_images (
  `memory_id` BIGINT NOT NULL,
  `image_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (memory_id, image_id),
  UNIQUE KEY uq_memory_image_position (memory_id, position),
  UNIQUE KEY uq_memory_image_claim (image_id),
  CONSTRAINT fk_memory_image_memory FOREIGN KEY (memory_id) REFERENCES memories (id),
  CONSTRAINT fk_memory_image_media FOREIGN KEY (image_id) REFERENCES media_images (id),
  CONSTRAINT ck_memory_image_position CHECK (position BETWEEN 1 AND 9)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE honor_entries (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL,
  `people` VARCHAR(200) NOT NULL,
  `version` BIGINT NOT NULL DEFAULT 1,
  `created_by_sub` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `updated_by_sub` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY ix_honor_public (deleted_at, created_at, id),
  KEY ix_honor_admin (deleted_at, updated_at, id),
  CONSTRAINT ck_honor_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT ck_honor_version CHECK (version >= 1),
  CONSTRAINT ck_honor_people CHECK (CHAR_LENGTH(TRIM(people)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE honor_images (
  `honor_id` BIGINT NOT NULL,
  `image_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `position` TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (honor_id, image_id),
  UNIQUE KEY uq_honor_image_position (honor_id, position),
  KEY ix_honor_image_reverse (image_id),
  CONSTRAINT fk_honor_images_honor FOREIGN KEY (honor_id) REFERENCES honor_entries (id),
  CONSTRAINT fk_honor_images_media FOREIGN KEY (image_id) REFERENCES media_images (id),
  CONSTRAINT ck_honor_image_position CHECK (position BETWEEN 1 AND 9)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE admin_operation_logs (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `actor_sub` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_name` VARCHAR(150) NULL DEFAULT NULL,
  `action` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `entity_type` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `entity_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `trace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `operation_request_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `changes` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_audit_entity (entity_type, entity_id, created_at, id),
  KEY ix_audit_actor (actor_sub, created_at, id),
  KEY ix_audit_trace (trace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE idempotency_requests (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `operation_code` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_sub` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `state` VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'PROCESSING',
  `resource_type` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `resource_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
  `response_status` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `response_body` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` DATETIME(3) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_idem_command (operation_code, actor_sub, request_id),
  KEY ix_idem_created (created_at, id),
  CONSTRAINT ck_idem_state CHECK (state IN ('PROCESSING','COMPLETED')),
  CONSTRAINT ck_idem_response CHECK ((state = 'PROCESSING' AND completed_at IS NULL) OR (state = 'COMPLETED' AND completed_at IS NOT NULL AND response_status IS NOT NULL AND response_body IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
