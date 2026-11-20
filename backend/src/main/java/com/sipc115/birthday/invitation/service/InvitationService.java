package com.sipc115.birthday.invitation.service;

import com.sipc115.birthday.audit.enums.AdminOperationCode;
import com.sipc115.birthday.audit.service.AuditLogService;
import com.sipc115.birthday.idempotency.service.IdempotencyService;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.invitation.request.InvitationPatchRequest;
import com.sipc115.birthday.invitation.response.InvitationResponse;
import com.sipc115.birthday.invitation.assembler.InvitationAssembler;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import com.sipc115.birthday.common.api.BusinessCode;
import com.sipc115.birthday.common.api.CommandResult;
import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.ApiTime;
import com.sipc115.birthday.invitation.entity.InvitationEntity;
import com.sipc115.birthday.invitation.enums.InvitationResult;
import com.sipc115.birthday.invitation.mapper.InvitationMapper;
import com.sipc115.birthday.invitation.request.InvitationSubmitRequest;
import com.sipc115.birthday.invitation.response.InvitationSubmitResponse;
import com.sipc115.birthday.invitation.validation.InvitationValidator;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Objects;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class InvitationService {
    private final InvitationMapper mapper;
    private final InvitationValidator validator;
    private final Clock clock;
    private final TransactionTemplate transactions;
    private final IdempotencyService idempotency;
    private final AuditLogService audit;

    public InvitationService(InvitationMapper mapper, InvitationValidator validator,
            Clock clock, PlatformTransactionManager transactionManager,
            IdempotencyService idempotency, AuditLogService audit) {
        this.idempotency = idempotency;
        this.audit = audit;
        this.mapper = mapper;
        this.validator = validator;
        this.clock = clock;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public CommandResult<InvitationSubmitResponse> submit(InvitationSubmitRequest request) {
        validator.validate(request);
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                return Objects.requireNonNull(transactions.execute(status -> save(request)));
            } catch (DuplicateKeyException | PessimisticLockingFailureException ex) {
                if (attempt == 2) {
                    throw new BusinessException(ErrorCode.SERVICE_BUSY);
                }
            }
        }
        throw new IllegalStateException("Unreachable retry state");
    }

    private CommandResult<InvitationSubmitResponse> save(InvitationSubmitRequest request) {
        LocalDateTime now = LocalDateTime.now(clock);
        InvitationEntity entity = mapper.findByPhoneForUpdate(request.phone());
        boolean created = entity == null;
        if (created) {
            entity = new InvitationEntity();
            entity.setPhone(request.phone());
            entity.setVersion(1L);
            entity.setCreatedAt(now);
            apply(entity, request);
            entity.setUpdatedAt(now);
            mapper.insert(entity);
        } else if (changed(entity, request)) {
            long previousVersion = entity.getVersion();
            apply(entity, request);
            entity.setVersion(previousVersion + 1);
            entity.setUpdatedAt(now);
            if (mapper.updateByVersion(entity, previousVersion) != 1) {
                throw new BusinessException(ErrorCode.VERSION_CONFLICT);
            }
        }
        InvitationResult result = created ? InvitationResult.CREATED : InvitationResult.UPDATED;
        BusinessCode code = created ? BusinessCode.INVITATION_CREATED : BusinessCode.INVITATION_UPDATED;
        return new CommandResult<>(code,
                new InvitationSubmitResponse(entity.getId().toString(), result, ApiTime.format(now)), false);
    }

    @Transactional
    public CommandResult<InvitationResponse> correct(
            long id, InvitationPatchRequest request) {
        long expected = RequestValues.version(request.getExpectedVersion());
        if (request.getChanges().isEmpty()) {
            throw BusinessException.field("$", "请至少修改一个字段");
        }
        return idempotency.execute(AdminOperationCode.INVITATION_UPDATE,
                request.getRequestId(), Map.of("id", id, "version", request.getExpectedVersion(),
                        "changes", request.getChanges()),
                InvitationResponse.class, () -> {
                    InvitationEntity entity = mapper.findByIdForUpdate(id);
                    if (entity == null) { throw new BusinessException(ErrorCode.INVITATION_NOT_FOUND); }
                    if (entity.getVersion() != expected) { throw new BusinessException(ErrorCode.VERSION_CONFLICT); }
                    var changes = request.getChanges();
                    for (String field : changes.keySet()) {
                        if (!field.equals("mailingAddress") && changes.get(field) == null) {
                            throw BusinessException.field(field, "该字段不能为null");
                        }
                    }
                    String gift = changes.containsKey("giftChoice") ? request.getGiftChoice() : entity.getGiftChoice();
                    String address = changes.containsKey("mailingAddress") ? request.getMailingAddress()
                            : ("MAIL".equals(gift) ? entity.getMailingAddress() : null);
                    var merged = new InvitationSubmitRequest(
                            changes.containsKey("name") ? request.getName() : entity.getName(),
                            entity.getPhone(),
                            changes.containsKey("email") ? request.getEmail() : entity.getEmail(),
                            changes.containsKey("attendance") ? request.getAttendance() : entity.getAttendance(),
                            gift, address);
                    validator.validate(merged);
                    if (changed(entity, merged)) {
                        apply(entity, merged);
                        entity.setVersion(expected + 1);
                        entity.setUpdatedAt(LocalDateTime.now(clock));
                        if (mapper.updateByVersion(entity, expected) != 1) {
                            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
                        }
                    }
                    audit.record(AdminOperationCode.INVITATION_UPDATE,
                            "INVITATION", Long.toString(id), request.getRequestId(),
                            Map.of("version", entity.getVersion()));
                    return new CommandResult<>(BusinessCode.INVITATION_UPDATED,
                            InvitationAssembler.response(mapper.summary(id)),
                            false);
                });
    }

    private static void apply(InvitationEntity entity, InvitationSubmitRequest request) {
        entity.setName(request.name());
        entity.setEmail(request.email());
        entity.setAttendance(request.attendance());
        entity.setGiftChoice(request.giftChoice());
        entity.setMailingAddress(request.mailingAddress());
    }

    private static boolean changed(InvitationEntity entity, InvitationSubmitRequest request) {
        return !Objects.equals(entity.getName(), request.name())
                || !Objects.equals(entity.getEmail(), request.email())
                || !Objects.equals(entity.getAttendance(), request.attendance())
                || !Objects.equals(entity.getGiftChoice(), request.giftChoice())
                || !Objects.equals(entity.getMailingAddress(), request.mailingAddress());
    }
}
