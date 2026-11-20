package com.sipc115.birthday.invitation.service;

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

    public InvitationService(InvitationMapper mapper, InvitationValidator validator,
            Clock clock, PlatformTransactionManager transactionManager) {
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
