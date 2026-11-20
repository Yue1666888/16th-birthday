package com.sipc115.birthday.memory.response;

import com.sipc115.birthday.media.response.ImageResponse;

public record MemorySummaryResponse(
        String id,
        String displayName,
        String title,
        String excerpt,
        ImageResponse coverImage,
        int imageCount,
        String publishedAt) {}
