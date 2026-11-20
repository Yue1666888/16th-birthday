package com.sipc115.birthday.media.response;

public record ImageUploadResponse(
        String id,
        String url,
        Integer width,
        Integer height,
        String originalName,
        String sourceMimeType,
        long sourceSizeBytes) {}
