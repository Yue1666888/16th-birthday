package com.sipc115.birthday.mail.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MailBatchEntity {
    private Long id;
    private String previewId, actorSub, requestId, mode;
    private Integer recipientCount;
    private LocalDateTime confirmedAt;
}
