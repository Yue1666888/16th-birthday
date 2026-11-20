package com.sipc115.birthday.audit.entity;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
@Getter
@Setter
public class AdminOperationLogEntity {
    private Long id;
    private String actorSub;
    private String actorName;
    private String action;
    private String entityType;
    private String entityId;
    private String traceId;
    private String operationRequestId;
    private String changesJson;
    private LocalDateTime createdAt;
}
