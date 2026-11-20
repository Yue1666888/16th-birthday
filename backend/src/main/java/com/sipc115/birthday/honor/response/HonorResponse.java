package com.sipc115.birthday.honor.response;

import com.sipc115.birthday.media.response.ImageResponse;

import java.util.List;

public record HonorResponse(String id, String title, String people, List<ImageResponse> images) {}
