package com.sipc115.birthday.email.response;

public record EmailPreviewResponse(
        String invitationId,
        String invitationVersion,
        String recipientEmail,
        String subject,
        String textBody,
        String htmlBody,
        String previewHash,
        boolean emailEnabled) {}
