package com.sipc115.birthday.media.response;

public record ImageResponse(String id, String url, Integer width, Integer height, String thumbnailUrl) {
    public ImageResponse(String id, String url, Integer width, Integer height) { this(id, url, width, height, null); }
}
