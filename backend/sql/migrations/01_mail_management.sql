CREATE TABLE mail_recipient_selections (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 actor_sub VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload JSON NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 created_at DATETIME(3) NOT NULL,
 KEY ix_mail_selection_expiry(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mail_previews (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 actor_sub VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 preview_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload JSON NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 created_at DATETIME(3) NOT NULL,
 KEY ix_mail_preview_expiry(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mail_batches (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 preview_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_sub VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 mode VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recipient_count INT NOT NULL,
 confirmed_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_mail_batch_preview(preview_id),
 UNIQUE KEY uq_mail_batch_request(actor_sub,request_id),
 CONSTRAINT ck_mail_batch_mode CHECK(mode IN ('SINGLE','BULK')),
 CONSTRAINT ck_mail_batch_count CHECK(recipient_count BETWEEN 1 AND 500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE email_notifications
 DROP INDEX uq_email_active,
 ADD COLUMN batch_id BIGINT NULL,
 ADD COLUMN compose_mode VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'LEGACY',
 ADD KEY ix_email_batch_history(batch_id,confirmed_at,id),
 ADD CONSTRAINT fk_email_batch FOREIGN KEY(batch_id) REFERENCES mail_batches(id),
 ADD CONSTRAINT ck_email_compose_mode CHECK(compose_mode IN ('LEGACY','SINGLE','BULK'));
