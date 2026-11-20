package com.sipc115.birthday.common.exceptions;

import com.sipc115.birthday.common.api.CommonResponse;
import com.sipc115.birthday.common.api.ErrorCode;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tools.jackson.databind.exc.MismatchedInputException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<CommonResponse<Void>> business(BusinessException ex) {
        var response = ResponseEntity.status(ex.errorCode().status());
        if (ex.retryAfterSeconds() > 0) {
            response.header("Retry-After", Integer.toString(ex.retryAfterSeconds()));
        }
        return response.body(CommonResponse.failure(ex.errorCode(), ex.getMessage(), ex.fieldErrors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<CommonResponse<Void>> validation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(
                error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return reply(ErrorCode.VALIDATION_ERROR, "请检查填写内容", fields);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<CommonResponse<Void>> constraint(ConstraintViolationException ex) {
        return reply(ErrorCode.VALIDATION_ERROR, "请检查填写内容", Map.of());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<CommonResponse<Void>> json(HttpMessageNotReadableException ex) {
        if (ex.getCause() instanceof MismatchedInputException binding) {
            StringBuilder path = new StringBuilder();
            for (var reference : binding.getPath()) {
                if (reference.getPropertyName() != null) {
                    if (!path.isEmpty()) {
                        path.append('.');
                    }
                    path.append(reference.getPropertyName());
                } else if (reference.getIndex() >= 0) {
                    path.append('[').append(reference.getIndex()).append(']');
                }
            }
            String field = path.isEmpty() ? "$" : path.toString();
            return reply(ErrorCode.VALIDATION_ERROR, "请求字段类型或名称不正确",
                    Map.of(field, "请检查字段名称和类型"));
        }
        return reply(ErrorCode.BAD_REQUEST, "请求 JSON 格式不正确", Map.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<CommonResponse<Void>> notFound(NoResourceFoundException ex) {
        return reply(ErrorCode.ENDPOINT_NOT_FOUND, "接口不存在", Map.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<CommonResponse<Void>> method(HttpRequestMethodNotSupportedException ex) {
        return reply(ErrorCode.METHOD_NOT_ALLOWED, "请求方法不支持", Map.of());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<CommonResponse<Void>> media(HttpMediaTypeNotSupportedException ex) {
        return reply(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "请求类型不支持", Map.of());
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<CommonResponse<Void>> accept(HttpMediaTypeNotAcceptableException ex) {
        return reply(ErrorCode.NOT_ACCEPTABLE, "响应类型不支持", Map.of());
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<CommonResponse<Void>> database(DataAccessException ex) {
        log.error("Database operation failed", ex);
        return reply(ErrorCode.SERVICE_UNAVAILABLE, "数据库暂不可用", Map.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<CommonResponse<Void>> unexpected(Exception ex) {
        log.error("Unhandled request failure", ex);
        return reply(ErrorCode.INTERNAL_ERROR, "服务内部错误", Map.of());
    }

    private ResponseEntity<CommonResponse<Void>> reply(ErrorCode code, String message, Map<String, String> fields) {
        return ResponseEntity.status(code.status()).body(CommonResponse.failure(code, message, fields));
    }
}
