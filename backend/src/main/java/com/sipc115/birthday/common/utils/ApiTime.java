package com.sipc115.birthday.common.utils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public final class ApiTime {
    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Shanghai");

    private ApiTime() {}

    public static String format(LocalDateTime utc) {
        return utc == null ? null : utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(DISPLAY_ZONE).format(FORMAT);
    }
}
