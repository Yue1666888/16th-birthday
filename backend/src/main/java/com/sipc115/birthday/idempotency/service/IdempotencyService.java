package com.sipc115.birthday.idempotency.service;

import com.sipc115.birthday.audit.enums.AdminOperationCode;
import com.sipc115.birthday.common.api.BusinessCode;
import com.sipc115.birthday.common.api.CommandResult;
import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.RequestFingerprint;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.idempotency.entity.IdempotencyRequestEntity;
import com.sipc115.birthday.idempotency.mapper.IdempotencyRequestMapper;
import com.sipc115.birthday.security.CurrentUserProvider;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class IdempotencyService {
    private record SavedResult(String code, Object data) {}
    private final IdempotencyRequestMapper mapper;
    private final CurrentUserProvider users;
    private final RequestFingerprint fingerprints;
    private final JsonMapper json;
    private final Clock clock;
    public IdempotencyService(IdempotencyRequestMapper mapper, CurrentUserProvider users,
            RequestFingerprint fingerprints, JsonMapper json, Clock clock) {
        this.mapper = mapper;
        this.users = users;
        this.fingerprints = fingerprints;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public <T> CommandResult<T> execute(AdminOperationCode operation, String requestId,
            Object payload, Class<T> type, Supplier<CommandResult<T>> action) {
        RequestValues.uuid(requestId, "requestId");
        var key = new IdempotencyRequestEntity();
        key.setOperationCode(operation.name());
        key.setActorSub(users.required().sub());
        key.setRequestId(requestId);
        key.setRequestHash(fingerprints.hash(payload));
        key.setCreatedAt(LocalDateTime.now(clock));
        mapper.insertOrGet(key);
        var stored = mapper.lock(key);
        if (!stored.getRequestHash().equals(key.getRequestHash())) {
            throw new BusinessException(ErrorCode.IDEMPOTENCY_CONFLICT);
        }
        if ("COMPLETED".equals(stored.getState())) {
            var saved = json.readValue(stored.getResponseBodyJson(), SavedResult.class);
            return new CommandResult<>(BusinessCode.valueOf(saved.code()),
                    json.convertValue(saved.data(), type), true);
        }
        CommandResult<T> result = action.get();
        Map<?, ?> fields = json.convertValue(result.data(), Map.class);
        stored.setResourceId(fields.get("id").toString());
        stored.setResourceType(operation.name().startsWith("HONOR") ? "HONOR" : "INVITATION");
        stored.setResponseStatus(result.code().status());
        stored.setResponseBodyJson(json.writeValueAsString(new SavedResult(result.code().name(), result.data())));
        stored.setCompletedAt(LocalDateTime.now(clock));
        if (mapper.complete(stored) != 1) {
            throw new BusinessException(ErrorCode.SERVICE_BUSY);
        }
        return result;
    }
}
