package com.sipc115.birthday.mail.model;

import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.email.response.EmailSendResponse;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.List;
import java.util.Map;

public final class MailModels {
    private MailModels() {}

    public record Filter(
            String attendance, String giftChoice, String keyword, String emailNotifyStatus) {}

    public record SelectionRequest(
            String attendance, String giftChoice, String keyword, String emailNotifyStatus) {}

    public record SelectionResponse(
            String id, int recipientCount, String expiresAt, List<String> recipientIds) {}

    public record Recipient(
            String invitationId,
            String expectedVersion,
            String name,
            String recipientEmail,
            String attendance,
            String giftChoice) {}

    public record PreviewRequest(
            @NotBlank String mode,
            @NotBlank String subject,
            @NotBlank String textBody,
            List<String> recipientIds,
            String selectionId) {}

    public record Message(Recipient recipient, String subject, String textBody) {}

    public record PreviewResponse(
            String id,
            String mode,
            String previewHash,
            String expiresAt,
            boolean emailEnabled,
            int recipientCount,
            List<Message> messages) {}

    public record ConfirmRequest(
            @Pattern(regexp = RequestValues.UUID_V4) String requestId,
            @Pattern(regexp = RequestValues.UUID_V4) String previewId,
            @NotBlank @Pattern(regexp = "[0-9a-f]{64}") String previewHash) {}

    public record BatchResponse(
            String id,
            String mode,
            int recipientCount,
            Map<String, Long> counts,
            String confirmedAt) {}

    public record HistoryItem(
            EmailSendResponse notification, String recipientName, String mode, String batchId) {}
}
