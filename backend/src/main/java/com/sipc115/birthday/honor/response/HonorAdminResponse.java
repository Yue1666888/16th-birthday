package com.sipc115.birthday.honor.response;

import com.sipc115.birthday.media.response.ImageResponse;

import java.util.List;

public record HonorAdminResponse(
        String id,
        String title,
        String people,
        List<ImageResponse> images,
        String version,
        String createdAt,
        String updatedAt) {}
