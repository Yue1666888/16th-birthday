package com.sipc115.birthday.memory.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MemoryEntity {
    private Long id;
    private String submissionId;
    private String submissionHash;
    private String displayName;
    private String title;
    private String content;
    private LocalDateTime publishedAt;
    private Long version;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
    private String createdBySub;
    private String updatedBySub;
}
