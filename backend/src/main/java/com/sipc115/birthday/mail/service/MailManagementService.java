package com.sipc115.birthday.mail.service;

import com.sipc115.birthday.audit.enums.AdminOperationCode;
import com.sipc115.birthday.audit.service.AuditLogService;
import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.*;
import com.sipc115.birthday.email.entity.EmailNotificationEntity;
import com.sipc115.birthday.email.enums.EmailTaskStatus;
import com.sipc115.birthday.email.mapper.EmailNotificationMapper;
import com.sipc115.birthday.email.response.EmailSendResponse;
import com.sipc115.birthday.idempotency.service.IdempotencyService;
import com.sipc115.birthday.invitation.entity.InvitationEntity;
import com.sipc115.birthday.invitation.mapper.InvitationMapper;
import com.sipc115.birthday.invitation.service.InvitationFilters;
import com.sipc115.birthday.mail.entity.*;
import com.sipc115.birthday.mail.mapper.*;
import com.sipc115.birthday.mail.model.MailModels.*;
import com.sipc115.birthday.security.CurrentUserProvider;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.util.*;

@Service
public class MailManagementService {
    private final MailManagementMapper mapper;
    private final InvitationMapper invitations;
    private final EmailNotificationMapper notifications;
    private final CurrentUserProvider users;
    private final JsonMapper json;
    private final Clock clock;
    private final MailTemplateVariables templates;
    private final RequestFingerprint fingerprints;
    private final IdempotencyService idempotency;
    private final AuditLogService audit;
    private final boolean enabled;
    private final String environment;

    public MailManagementService(
            MailManagementMapper mapper,
            InvitationMapper invitations,
            EmailNotificationMapper notifications,
            CurrentUserProvider users,
            JsonMapper json,
            Clock clock,
            MailTemplateVariables templates,
            RequestFingerprint fingerprints,
            IdempotencyService idempotency,
            AuditLogService audit,
            @Value("${EMAIL_ENABLED:true}") boolean enabled,
            @Value("${APP_ENV:development}") String environment) {
        this.mapper = mapper;
        this.invitations = invitations;
        this.notifications = notifications;
        this.users = users;
        this.json = json;
        this.clock = clock;
        this.templates = templates;
        this.fingerprints = fingerprints;
        this.idempotency = idempotency;
        this.audit = audit;
        this.enabled = enabled;
        this.environment = environment;
    }

    private Recipient recipient(InvitationEntity r) {
        return new Recipient(
                r.getId().toString(),
                r.getVersion().toString(),
                r.getName(),
                r.getEmail(),
                r.getAttendance(),
                r.getGiftChoice());
    }

    private MailSnapshotEntity snapshot(Object payload) {
        var e = new MailSnapshotEntity();
        e.setId(UUID.randomUUID().toString());
        e.setActorSub(users.required().sub());
        e.setCreatedAt(ApiTime.now(clock));
        e.setExpiresAt(e.getCreatedAt().plusMinutes(10));
        e.setPayloadJson(json.writeValueAsString(payload));
        return e;
    }

    @Transactional
    public SelectionResponse select(SelectionRequest request) {
        var filter =
                InvitationFilters.of(
                        request.attendance(),
                        request.giftChoice(),
                        request.keyword(),
                        request.emailNotifyStatus());
        var rows = invitations.recipients(filter, 501);
        if (rows.size() > 500) throw new BusinessException(ErrorCode.MAIL_RECIPIENT_LIMIT);
        if (rows.isEmpty()) throw BusinessException.field("selection", "没有匹配的报名者");
        var e = snapshot(rows.stream().map(this::recipient).toList());
        mapper.insertSelection(e);
        return new SelectionResponse(
                e.getId(),
                rows.size(),
                ApiTime.format(e.getExpiresAt()),
                rows.stream().map(row -> row.getId().toString()).toList());
    }

    private void owned(MailSnapshotEntity e, ErrorCode notFound, ErrorCode expired) {
        if (e == null || !users.required().sub().equals(e.getActorSub()))
            throw new BusinessException(notFound);
        if (!e.getExpiresAt().isAfter(ApiTime.now(clock))) throw new BusinessException(expired);
    }

    private List<Recipient> resolve(PreviewRequest request) {
        boolean byIds = request.recipientIds() != null, bySelection = request.selectionId() != null;
        if (byIds == bySelection)
            throw BusinessException.field("recipientIds", "请在收件人编号和筛选快照中选择一种");
        if (bySelection) {
            RequestValues.uuid(request.selectionId(), "selectionId");
            var e = mapper.selection(request.selectionId());
            owned(e, ErrorCode.MAIL_SELECTION_NOT_FOUND, ErrorCode.MAIL_SELECTION_EXPIRED);
            return List.of(json.readValue(e.getPayloadJson(), Recipient[].class));
        }
        var ids = request.recipientIds();
        if (ids.isEmpty()) throw BusinessException.field("recipientIds", "请选择至少一位报名者");
        if (ids.size() > 500) throw new BusinessException(ErrorCode.MAIL_RECIPIENT_LIMIT);
        var seen = new HashSet<Long>();
        var result = new ArrayList<Recipient>();
        for (String id : ids) {
            long value;
            try {
                value = RequestValues.id(id);
            } catch (BusinessException ex) {
                throw BusinessException.field("recipientIds", "收件人编号不合法");
            }
            if (!seen.add(value)) throw BusinessException.field("recipientIds", "收件人不能重复");
            var row = invitations.summary(value);
            if (row == null) throw new BusinessException(ErrorCode.INVITATION_NOT_FOUND);
            result.add(recipient(row));
        }
        result.sort(Comparator.comparing(r -> Long.valueOf(r.invitationId())));
        return result;
    }

    @Transactional
    public PreviewResponse preview(PreviewRequest request) {
        if (!Set.of("SINGLE", "BULK").contains(request.mode()))
            throw BusinessException.field("mode", "请选择SINGLE或BULK");
        String subject = RequestValues.text(request.subject(), 200, "subject", true),
                body = RequestValues.text(request.textBody(), 10000, "textBody", true);
        var recipients = resolve(request);
        if ("SINGLE".equals(request.mode()) && recipients.size() != 1)
            throw BusinessException.field("recipientIds", "单发模式只能选择一位报名者");
        var messages = new ArrayList<Message>();
        for (var target : recipients) {
            // A selection is a frozen set, but stale details must be explicitly reselected.
            var current = invitations.summary(Long.parseLong(target.invitationId()));
            if (current == null
                    || !current.getVersion().toString().equals(target.expectedVersion()))
                throw new BusinessException(ErrorCode.VERSION_CONFLICT);
            String s =
                    "BULK".equals(request.mode())
                            ? templates.render(subject, target, "subject")
                            : subject;
            String b =
                    "BULK".equals(request.mode())
                            ? templates.render(body, target, "textBody")
                            : body;
            RequestValues.text(s, 200, "subject", true);
            if (s.chars().anyMatch(c -> c < 32 || c == 127))
                throw BusinessException.field("subject", "邮件主题不能包含换行或控制字符");
            RequestValues.text(b, 10000, "textBody", true);
            messages.add(new Message(target, s, b));
        }
        var e = snapshot(messages);
        String hash =
                fingerprints.hash(
                        Map.of("id", e.getId(), "mode", request.mode(), "messages", messages));
        e.setPreviewHash(hash);
        var response =
                new PreviewResponse(
                        e.getId(),
                        request.mode(),
                        hash,
                        ApiTime.format(e.getExpiresAt()),
                        enabled,
                        messages.size(),
                        List.copyOf(messages));
        e.setPayloadJson(json.writeValueAsString(response));
        mapper.insertPreview(e);
        return response;
    }

    @Transactional
    public CommandResult<BatchResponse> confirm(ConfirmRequest request) {
        RequestValues.uuid(request.previewId(), "previewId");
        return idempotency.execute(
                AdminOperationCode.MAIL_BATCH_CONFIRM,
                request.requestId(),
                Map.of("previewId", request.previewId(), "previewHash", request.previewHash()),
                BatchResponse.class,
                () -> {
                    var preview = mapper.lockPreview(request.previewId());
                    owned(
                            preview,
                            ErrorCode.MAIL_PREVIEW_NOT_FOUND,
                            ErrorCode.MAIL_PREVIEW_EXPIRED);
                    if (!preview.getPreviewHash().equals(request.previewHash()))
                        throw new BusinessException(ErrorCode.EMAIL_PREVIEW_CHANGED);
                    var prior = mapper.batchByPreview(preview.getId());
                    if (prior != null)
                        return new CommandResult<>(
                                BusinessCode.MAIL_BATCH_REUSED, batchResponse(prior), false);
                    var data = json.readValue(preview.getPayloadJson(), PreviewResponse.class);
                    if (data.emailEnabled() != enabled)
                        throw new BusinessException(ErrorCode.EMAIL_PREVIEW_CHANGED);
                    var messages = new ArrayList<>(data.messages());
                    messages.sort(
                            Comparator.comparing(m -> Long.valueOf(m.recipient().invitationId())));
                    for (var message : messages) {
                        var target = message.recipient();
                        var current =
                                invitations.findByIdForUpdate(
                                        Long.parseLong(target.invitationId()));
                        if (current == null)
                            throw new BusinessException(ErrorCode.INVITATION_NOT_FOUND);
                        if (!current.getVersion().toString().equals(target.expectedVersion())
                                || !current.getEmail().equals(target.recipientEmail()))
                            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
                    }
                    var user = users.required();
                    var now = ApiTime.now(clock);
                    var batch = new MailBatchEntity();
                    batch.setPreviewId(preview.getId());
                    batch.setRequestId(request.requestId());
                    batch.setActorSub(user.sub());
                    batch.setMode(data.mode());
                    batch.setRecipientCount(messages.size());
                    batch.setConfirmedAt(now);
                    mapper.insertBatch(batch);
                    for (var message : messages) {
                        var target = message.recipient();
                        long inv = Long.parseLong(target.invitationId()),
                                version = Long.parseLong(target.expectedVersion());
                        var e = new EmailNotificationEntity();
                        e.setBatchId(batch.getId());
                        e.setComposeMode(data.mode());
                        e.setInvitationId(inv);
                        e.setInvitationVersion(version);
                        e.setSendNo(notifications.nextSendNo(inv, version));
                        // Each concrete task keeps its own UUID; the administrator request is on
                        // mail_batches.
                        e.setConfirmationRequestId(UUID.randomUUID().toString());
                        e.setConfirmationRequestHash(request.previewHash());
                        e.setConfirmedBySub(user.sub());
                        e.setConfirmedByName(user.name());
                        e.setConfirmedAt(now);
                        e.setEnvironment(environment);
                        e.setClientKey(
                                "birthday16:"
                                        + environment
                                        + ":batch:"
                                        + batch.getId()
                                        + ":inv:"
                                        + inv);
                        e.setInvitationSnapshotJson(
                                json.writeValueAsString(
                                        Map.of(
                                                "id",
                                                target.invitationId(),
                                                "version",
                                                target.expectedVersion(),
                                                "name",
                                                target.name(),
                                                "email",
                                                target.recipientEmail(),
                                                "attendance",
                                                target.attendance(),
                                                "giftChoice",
                                                target.giftChoice(),
                                                "mailPreviewHash",
                                                preview.getPreviewHash(),
                                                "batchRequestId",
                                                request.requestId())));
                        e.setRecipientEmail(target.recipientEmail());
                        e.setSubject(message.subject());
                        e.setTextBody(message.textBody());
                        e.setHtmlBody(null);
                        e.setTaskStatus(enabled ? "READY" : "DISABLED");
                        e.setSubmitAttempts(0);
                        e.setPollFailures(0);
                        e.setNextRunAt(enabled ? now : null);
                        e.setVersion(1L);
                        e.setCreatedAt(now);
                        e.setUpdatedAt(now);
                        notifications.insert(e);
                    }
                    audit.record(
                            AdminOperationCode.MAIL_BATCH_CONFIRM,
                            "MAIL_BATCH",
                            batch.getId().toString(),
                            request.requestId(),
                            Map.of("mode", data.mode(), "recipientCount", messages.size()));
                    return new CommandResult<>(
                            enabled
                                    ? BusinessCode.MAIL_BATCH_CONFIRMED
                                    : BusinessCode.MAIL_BATCH_DISABLED,
                            batchResponse(batch),
                            false);
                });
    }

    private BatchResponse batchResponse(MailBatchEntity e) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String status : List.of("PENDING", "SUCCESS", "FAILED", "DISABLED", "NOT_SENT"))
            counts.put(status, 0L);
        for (var row : mapper.batchCounts(e.getId())) {
            String status = EmailTaskStatus.valueOf(row.get("status").toString()).notifyStatus();
            counts.merge(status, ((Number) row.get("total")).longValue(), Long::sum);
        }
        return new BatchResponse(
                e.getId().toString(),
                e.getMode(),
                e.getRecipientCount(),
                Map.copyOf(counts),
                ApiTime.format(e.getConfirmedAt()));
    }

    @Transactional(readOnly = true)
    public BatchResponse batch(long id) {
        var e = mapper.batch(id);
        if (e == null) throw new BusinessException(ErrorCode.MAIL_BATCH_NOT_FOUND);
        return batchResponse(e);
    }

    private HistoryItem historyItem(MailHistoryRow e) {
        return new HistoryItem(
                EmailSendResponse.from(e),
                e.getRecipientName(),
                e.getComposeMode(),
                e.getBatchId() == null ? null : e.getBatchId().toString());
    }

    @Transactional(readOnly = true)
    public HistoryItem send(long id) {
        var e = mapper.send(id);
        if (e == null) throw new BusinessException(ErrorCode.MAIL_SEND_NOT_FOUND);
        return historyItem(e);
    }

    @Transactional(readOnly = true)
    public PageResponse<HistoryItem> history(
            String keyword,
            String emailNotifyStatus,
            String invitationId,
            String batchId,
            int page,
            int size) {
        RequestValues.page(page, size, 100);
        var filter = InvitationFilters.of(null, null, keyword, emailNotifyStatus);
        filter.put("invitationId", invitationId == null ? null : RequestValues.id(invitationId));
        filter.put("batchId", batchId == null ? null : RequestValues.id(batchId));
        return PageResponse.of(
                mapper.history(filter, (page - 1L) * size, size).stream()
                        .map(this::historyItem)
                        .toList(),
                page,
                size,
                mapper.historyCount(filter));
    }
}
