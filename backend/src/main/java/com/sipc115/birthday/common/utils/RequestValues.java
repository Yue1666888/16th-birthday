package com.sipc115.birthday.common.utils;

import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import java.util.Map;
import java.util.regex.Pattern;

public final class RequestValues {
    public static final String UUID_V4 = "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";
    private static final Pattern UUID = Pattern.compile(UUID_V4);
    private RequestValues() {}

    public static long id(String value) {
        return positive(value, "id", ErrorCode.BAD_REQUEST);
    }

    public static long version(String value) {
        return positive(value, "expectedVersion", ErrorCode.VALIDATION_ERROR);
    }

    private static long positive(String value, String field, ErrorCode code) {
        try {
            if (value == null || !value.matches("[1-9][0-9]*")) {
                throw new NumberFormatException();
            }
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            throw new BusinessException(code, "编号或版本格式不正确", Map.of(field, "请输入有效正整数编号"));
        }
    }

    public static void uuid(String value, String field) {
        if (value == null || !UUID.matcher(value).matches()) {
            throw BusinessException.field(field, "请输入小写UUID v4");
        }
    }

    public static String text(String value, int max, String field, boolean required) {
        String normalized = value == null ? null : value.strip();
        if (normalized != null && normalized.isEmpty()) {
            normalized = null;
        }
        if (required && normalized == null) {
            throw BusinessException.field(field, "该字段不能为空");
        }
        if (normalized != null && normalized.codePointCount(0, normalized.length()) > max) {
            throw BusinessException.field(field, "字段长度不能超过" + max + "字");
        }
        return normalized;
    }

    public static void page(int page, int size, int max) {
        if (page < 1) {
            throw BusinessException.field("page", "页码从1开始");
        }
        if (size < 1 || size > max) {
            throw BusinessException.field("size", "每页数量应在1到" + max + "之间");
        }
    }
}
