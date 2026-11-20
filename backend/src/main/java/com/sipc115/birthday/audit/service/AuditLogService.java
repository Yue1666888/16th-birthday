package com.sipc115.birthday.audit.service;

import com.sipc115.birthday.audit.entity.AdminOperationLogEntity;
import com.sipc115.birthday.audit.enums.AdminOperationCode;
import com.sipc115.birthday.audit.mapper.AdminOperationLogMapper;
import com.sipc115.birthday.common.api.TraceId;
import com.sipc115.birthday.common.utils.ApiTime;
import com.sipc115.birthday.security.CurrentUserProvider;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;

@Service
public class AuditLogService {
    private final AdminOperationLogMapper mapper;
    private final CurrentUserProvider users;
    private final Clock clock;
    private final JsonMapper json;

    public AuditLogService(
            AdminOperationLogMapper mapper,
            CurrentUserProvider users,
            Clock clock,
            JsonMapper json) {
        this.mapper = mapper;
        this.users = users;
        this.clock = clock;
        this.json = json;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(
            AdminOperationCode action, String type, String id, String requestId, Object changes) {
        var user = users.required();
        var entry = new AdminOperationLogEntity();
        entry.setActorSub(user.sub());
        entry.setActorName(user.name());
        entry.setAction(action.name());
        entry.setEntityType(type);
        entry.setEntityId(id);
        entry.setTraceId(TraceId.current());
        entry.setOperationRequestId(requestId);
        entry.setChangesJson(json.writeValueAsString(changes));
        entry.setCreatedAt(ApiTime.now(clock));
        mapper.insert(entry);
    }
}
