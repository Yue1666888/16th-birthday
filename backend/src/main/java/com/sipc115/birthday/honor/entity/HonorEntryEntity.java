package com.sipc115.birthday.honor.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class HonorEntryEntity {
    private Long id;
    private String title;
    private String people;
    private Long version;
    private String createdBySub;
    private String updatedBySub;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
}
