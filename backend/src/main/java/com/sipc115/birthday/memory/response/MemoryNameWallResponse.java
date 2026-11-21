package com.sipc115.birthday.memory.response;

import java.util.List;

public record MemoryNameWallResponse(
        long totalSubmissions, long namedSubmissions, List<Name> names) {
    public record Name(String name, long submissionCount, double weight) {}
}
