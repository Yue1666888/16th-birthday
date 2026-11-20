package com.sipc115.birthday.common.api;

import java.util.UUID;
import org.slf4j.MDC;

public final class TraceId {
    public static final String HEADER_NAME = "X-Request-ID";

    private TraceId() {}

    public static String current() {
        String value = MDC.get(HEADER_NAME);
        return value == null ? UUID.randomUUID().toString() : value;
    }
}
