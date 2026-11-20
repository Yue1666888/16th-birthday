package com.sipc115.birthday.idempotency.entity;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
@Getter
@Setter
public class IdempotencyRequestEntity {
    private Long id;
    private String operationCode;
    private String actorSub;
    private String requestId;
    private String requestHash;
    private String state;
    private String resourceType;
    private String resourceId;
    private Integer responseStatus;
    private String responseBodyJson;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
