package com.sipc115.birthday.common.exceptions;

import com.sipc115.birthday.common.api.ErrorCode;
import java.util.Map;

public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;
    private final Map<String, String> fieldErrors;

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

    public ErrorCode errorCode() { return errorCode; }
    public Map<String, String> fieldErrors() { return fieldErrors; }
}
