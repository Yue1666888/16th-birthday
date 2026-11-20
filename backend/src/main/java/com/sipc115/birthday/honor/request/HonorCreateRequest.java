package com.sipc115.birthday.honor.request;

import java.util.List;

public record HonorCreateRequest(
        String requestId, String title, String people, List<String> imageIds) {}
