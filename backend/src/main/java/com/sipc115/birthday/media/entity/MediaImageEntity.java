package com.sipc115.birthday.media.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MediaImageEntity {
    private String id;
    private String url;
    private String originalName;
    private String uploadedName;
    private String sourceMimeType;
    private Long sourceSizeBytes;
    private Long storedSizeBytes;
    private Integer width;
    private Integer height;
    private String uploaderSub;
    private String uploadOwnerHash;
    private LocalDateTime createdAt;
}
