package com.sipc115.birthday.common.api;

import java.util.List;

public record PageResponse<T>(
        List<T> content, int page, int size, long totalElements, long totalPages) {

    public static <T> PageResponse<T> of(List<T> content, int page, int size, long total) {
        return new PageResponse<>(List.copyOf(content), page, size, total, (total + size - 1L) / size);
    }
}
