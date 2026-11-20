package com.sipc115.birthday.common.api;

import java.util.Map;
import org.springframework.http.ResponseEntity;

public record CommonResponse<T>(
        String code, String message, T data,
        Map<String, String> fieldErrors, String traceId) {

    public static <T> CommonResponse<T> success(BusinessCode code, T data) {
        return new CommonResponse<>(code.name(), code.message(), data, Map.of(), TraceId.current());
    }

    public static CommonResponse<Void> failure(ErrorCode code, String message, Map<String, String> fields) {
        return new CommonResponse<>(code.name(), message, null, Map.copyOf(fields), TraceId.current());
    }

    public static <T> ResponseEntity<CommonResponse<T>> toEntity(CommandResult<T> result) {
        var response = ResponseEntity.status(result.code().status());
        if (result.replayed()) {
            response.header("Idempotency-Replayed", "true");
        }
        return response.body(success(result.code(), result.data()));
    }

    public static <T> ResponseEntity<CommonResponse<T>> respond(BusinessCode code, T data) {
        return ResponseEntity.status(code.status()).body(success(code, data));
    }
}
