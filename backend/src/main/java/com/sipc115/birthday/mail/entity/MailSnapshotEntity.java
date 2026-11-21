package com.sipc115.birthday.mail.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MailSnapshotEntity {
    private String id, actorSub, previewHash, payloadJson;
    private LocalDateTime expiresAt, createdAt;
}
