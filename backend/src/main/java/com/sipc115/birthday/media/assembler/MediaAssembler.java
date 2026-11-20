package com.sipc115.birthday.media.assembler;

import com.sipc115.birthday.media.entity.MediaImageEntity;
import com.sipc115.birthday.media.response.ImageResponse;
import com.sipc115.birthday.media.response.ImageUploadResponse;

public final class MediaAssembler {
    private MediaAssembler() {}

    public static ImageResponse image(MediaImageEntity entity) {
        return new ImageResponse(
                entity.getId(), entity.getUrl(), entity.getWidth(), entity.getHeight());
    }

    public static ImageUploadResponse uploaded(MediaImageEntity entity) {
        return new ImageUploadResponse(
                entity.getId(),
                entity.getUrl(),
                entity.getWidth(),
                entity.getHeight(),
                entity.getOriginalName(),
                entity.getSourceMimeType(),
                entity.getSourceSizeBytes());
    }
}
