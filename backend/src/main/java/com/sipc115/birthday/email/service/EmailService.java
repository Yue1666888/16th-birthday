package com.sipc115.birthday.email.service;

import com.sipc115.birthday.audit.enums.AdminOperationCode;
import com.sipc115.birthday.audit.service.AuditLogService;
import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.*;
import com.sipc115.birthday.email.entity.EmailNotificationEntity;
import com.sipc115.birthday.email.mapper.EmailNotificationMapper;
import com.sipc115.birthday.email.request.EmailConfirmRequest;
import com.sipc115.birthday.email.response.*;
import com.sipc115.birthday.idempotency.service.IdempotencyService;
import com.sipc115.birthday.invitation.mapper.InvitationMapper;
import com.sipc115.birthday.security.CurrentUserProvider;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class EmailService {
    private final InvitationMapper invitations;
    private final EmailNotificationMapper mapper;
    private final MailTemplateRenderer renderer;
    private final IdempotencyService idempotency;
    private final AuditLogService audit;
    private final CurrentUserProvider users;
    private final RequestFingerprint fingerprints;
    private final JsonMapper json;
    private final Clock clock;
    private final String environment;

    public EmailService(
            InvitationMapper invitations,
            EmailNotificationMapper mapper,
            MailTemplateRenderer renderer,
            IdempotencyService idempotency,
            AuditLogService audit,
            CurrentUserProvider users,
            JsonMapper json,
            RequestFingerprint fingerprints,
            Clock clock,
            @Value("${APP_ENV:development}") String environment) {
        if (!environment.matches("[a-z][a-z0-9-]{0,15}"))
            throw new IllegalArgumentException("APP_ENV must be 1..16 lowercase ASCII characters");
        this.invitations = invitations;
        this.mapper = mapper;
        this.renderer = renderer;
        this.idempotency = idempotency;
        this.audit = audit;
        this.users = users;
        this.json = json;
        this.fingerprints = fingerprints;
        this.clock = clock;
        this.environment = environment;
    }

    public EmailPreviewResponse preview(long id) {
        var i = invitations.summary(id);
        if (i == null) throw new BusinessException(ErrorCode.INVITATION_NOT_FOUND);
        return renderer.render(i);
    }

    @Transactional
    public CommandResult<EmailSendResponse> confirm(long id, EmailConfirmRequest request) {
        long expected = RequestValues.version(request.expectedVersion());
        return idempotency.execute(
                AdminOperationCode.EMAIL_CONFIRM,
                request.requestId(),
                Map.of(
                        "invitationId",
                        Long.toString(id),
                        "expectedVersion",
                        request.expectedVersion(),
                        "previewHash",
                        request.previewHash()),
                EmailSendResponse.class,
                () -> {
                    var i = invitations.findByIdForUpdate(id);
                    if (i == null) throw new BusinessException(ErrorCode.INVITATION_NOT_FOUND);
                    if (i.getVersion() != expected)
                        throw new BusinessException(ErrorCode.VERSION_CONFLICT);
                    var preview = renderer.render(i);
                    if (!preview.previewHash().equals(request.previewHash()))
                        throw new BusinessException(ErrorCode.EMAIL_PREVIEW_CHANGED);
                    var active = mapper.active(id, expected);
                    if (active != null) {
                        var snapshot = json.readTree(active.getInvitationSnapshotJson());
                        if (!request.previewHash()
                                .equals(snapshot.path("mailPreviewHash").asString()))
                            throw new BusinessException(ErrorCode.EMAIL_SEND_IN_PROGRESS);
                        return new CommandResult<>(
                                BusinessCode.EMAIL_SEND_REUSED,
                                EmailSendResponse.from(active),
                                false);
                    }
                    var now = ApiTime.now(clock);
                    var user = users.required();
                    var e = new EmailNotificationEntity();
                    e.setInvitationId(id);
                    e.setInvitationVersion(expected);
                    e.setSendNo(mapper.nextSendNo(id, expected));
                    e.setConfirmationRequestId(request.requestId());
                    e.setConfirmationRequestHash(
                            fingerprints.hash(
                                    Map.of(
                                            "invitationId",
                                            Long.toString(id),
                                            "expectedVersion",
                                            request.expectedVersion(),
                                            "previewHash",
                                            request.previewHash())));
                    e.setConfirmedBySub(user.sub());
                    e.setConfirmedByName(user.name());
                    e.setConfirmedAt(now);
                    e.setEnvironment(environment);
                    e.setClientKey(
                            "birthday16:"
                                    + environment
                                    + ":inv:"
                                    + id
                                    + ":v:"
                                    + expected
                                    + ":send:"
                                    + e.getSendNo());
                    Map<String, Object> snapshot = new LinkedHashMap<>();
                    snapshot.put("id", Long.toString(id));
                    snapshot.put("version", Long.toString(expected));
                    snapshot.put("name", i.getName());
                    snapshot.put("phone", i.getPhone());
                    snapshot.put("email", i.getEmail());
                    snapshot.put("attendance", i.getAttendance());
                    snapshot.put("giftChoice", i.getGiftChoice());
                    snapshot.put("mailingAddress", i.getMailingAddress());
                    snapshot.put("mailTemplateVersion", MailTemplateRenderer.TEMPLATE_VERSION);
                    snapshot.put("mailPreviewHash", request.previewHash());
                    e.setInvitationSnapshotJson(json.writeValueAsString(snapshot));
                    e.setRecipientEmail(preview.recipientEmail());
                    e.setSubject(preview.subject());
                    e.setTextBody(preview.textBody());
                    e.setHtmlBody(preview.htmlBody());
                    e.setTaskStatus(preview.emailEnabled() ? "READY" : "DISABLED");
                    e.setSubmitAttempts(0);
                    e.setPollFailures(0);
                    e.setNextRunAt(preview.emailEnabled() ? now : null);
                    e.setVersion(1L);
                    e.setCreatedAt(now);
                    e.setUpdatedAt(now);
                    mapper.insert(e);
                    audit.record(
                            AdminOperationCode.EMAIL_CONFIRM,
                            "EMAIL_NOTIFICATION",
                            e.getId().toString(),
                            request.requestId(),
                            Map.of(
                                    "invitationId",
                                    Long.toString(id),
                                    "invitationVersion",
                                    Long.toString(expected),
                                    "sendNo",
                                    e.getSendNo()));
                    return new CommandResult<>(
                            preview.emailEnabled()
                                    ? BusinessCode.EMAIL_SEND_CONFIRMED
                                    : BusinessCode.EMAIL_SEND_DISABLED,
                            EmailSendResponse.from(e),
                            false);
                });
    }

    @Transactional(readOnly = true)
    public PageResponse<EmailSendResponse> history(long id, String version, int page, int size) {
        RequestValues.page(page, size, 100);
        Long filter = null;
        if (version != null) {
            try {
                filter = RequestValues.version(version);
            } catch (BusinessException ex) {
                throw BusinessException.field("invitationVersion", "请输入有效正整数版本");
            }
        }
        if (invitations.summary(id) == null)
            throw new BusinessException(ErrorCode.INVITATION_NOT_FOUND);
        long total = mapper.count(id, filter);
        return PageResponse.of(
                mapper.history(id, filter, ((long) page - 1) * size, size).stream()
                        .map(EmailSendResponse::from)
                        .toList(),
                page,
                size,
                total);
    }
}
