package com.sipc115.birthday.common.exceptions;

import com.sipc115.birthday.common.api.ErrorCode;
import java.util.Map;

public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;
    private final Map<String, String> fieldErrors;
    private int retryAfterSeconds;

    public BusinessException(ErrorCode code) {
        this(code, code.message(), Map.of());
    }

    public BusinessException(ErrorCode code, String message, Map<String, String> fields) {
        super(message);
        this.errorCode = code;
        this.fieldErrors = Map.copyOf(fields);
    }

    public static BusinessException field(String field, String message) {
        return new BusinessException(ErrorCode.VALIDATION_ERROR, "请检查填写内容", Map.of(field, message));
    }

    public static BusinessException throttled(int seconds) {
        BusinessException error = new BusinessException(ErrorCode.TOO_MANY_REQUESTS);
        error.retryAfterSeconds = seconds;
        return error;
    }

    public static BusinessException uploadBusy() {
        BusinessException error = new BusinessException(ErrorCode.UPLOAD_BUSY);
        error.retryAfterSeconds = 3;
        return error;
    }

    public int retryAfterSeconds() { return retryAfterSeconds; }
    public ErrorCode errorCode() { return errorCode; }
    public Map<String, String> fieldErrors() { return fieldErrors; }
}
