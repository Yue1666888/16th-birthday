package com.sipc115.birthday.memory.response;
public record MemoryDeleteResponse(String id, boolean deleted, String version, String deletedAt) {}
