package com.sipc115.birthday.email.response;

import com.sipc115.birthday.common.utils.ApiTime;
import com.sipc115.birthday.email.entity.EmailNotificationEntity;
import com.sipc115.birthday.email.enums.EmailTaskStatus;

public record EmailSendResponse(
        String id,
        String invitationId,
        String invitationVersion,
        int sendNo,
        String requestId,
        String recipientEmail,
        String subject,
        String textBody,
        String htmlBody,
        String emailNotifyStatus,
        String taskStatus,
        String remoteMailId,
        String remoteStatus,
        String confirmedBySub,
        String confirmedByName,
        String confirmedAt,
        String acceptedAt,
        String sentAt,
        int submitAttempts,
        Integer smtpAttempts,
        String nextCheckAt,
        String lastErrorCode,
        String lastErrorMessage,
        String createdAt,
        String updatedAt) {
    public static EmailSendResponse from(EmailNotificationEntity e) {
        return new EmailSendResponse(
                e.getId().toString(),
                e.getInvitationId().toString(),
                e.getInvitationVersion().toString(),
                e.getSendNo(),
                e.getConfirmationRequestId(),
                e.getRecipientEmail(),
                e.getSubject(),
                e.getTextBody(),
                e.getHtmlBody(),
                EmailTaskStatus.valueOf(e.getTaskStatus()).notifyStatus(),
                e.getTaskStatus(),
                e.getRemoteMailId(),
                e.getRemoteStatus(),
                e.getConfirmedBySub(),
                e.getConfirmedByName(),
                ApiTime.format(e.getConfirmedAt()),
                ApiTime.format(e.getAcceptedAt()),
                ApiTime.format(e.getSentAt()),
                e.getSubmitAttempts(),
                e.getRemoteAttempts(),
                ApiTime.format(e.getNextRunAt()),
                e.getLastErrorCode(),
                e.getLastErrorMessage(),
                ApiTime.format(e.getCreatedAt()),
                ApiTime.format(e.getUpdatedAt()));
    }
}
