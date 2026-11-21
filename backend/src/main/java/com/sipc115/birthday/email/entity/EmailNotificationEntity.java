package com.sipc115.birthday.email.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class EmailNotificationEntity {
    private Long id;
    private Long batchId;
    private String composeMode = "LEGACY";
    private Long invitationId;
    private Long invitationVersion;
    private Integer sendNo;
    private String confirmationRequestId;
    private String confirmationRequestHash;
    private String confirmedBySub;
    private String confirmedByName;
    private LocalDateTime confirmedAt;
    private String environment;
    private String clientKey;
    private String invitationSnapshotJson;
    private String recipientEmail;
    private String subject;
    private String textBody;
    private String htmlBody;
    private String taskStatus;
    private String remoteMailId;
    private String remoteStatus;
    private Integer remoteAttempts;
    private LocalDateTime acceptedAt;
    private LocalDateTime sentAt;
    private Integer submitAttempts;
    private Integer pollFailures;
    private String lastErrorCode;
    private String lastErrorMessage;
    private LocalDateTime nextRunAt;
    private String leaseOwner;
    private String leaseToken;
    private LocalDateTime leaseUntil;
    private Long version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
