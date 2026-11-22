package com.sipc115.birthday.memory.response;

import com.sipc115.birthday.media.response.ImageResponse;
import java.util.List;
public record MemoryAdminResponse(String id, String displayName, String title, String content, List<ImageResponse> images, String publishedAt, String updatedAt, String version, String source) {}
