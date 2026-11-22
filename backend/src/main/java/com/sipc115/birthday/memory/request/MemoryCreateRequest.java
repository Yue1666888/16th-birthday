package com.sipc115.birthday.memory.request;

import java.util.List;
public record MemoryCreateRequest(String requestId, String displayName, String title, String content, List<String> imageIds) {}
