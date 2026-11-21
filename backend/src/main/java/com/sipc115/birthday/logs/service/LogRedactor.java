package com.sipc115.birthday.logs.service;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class LogRedactor {
    private static final Pattern BEARER = Pattern.compile("(?i)Bearer\\s+[^\\s,;]+");
    private static final Pattern SECRET =
            Pattern.compile("(?i)(password|secret|token|authorization)(\\s*[:=]\\s*)([^\\s,;]+)");
    private static final Pattern EMAIL =
            Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private static final Pattern PHONE = Pattern.compile("(?<!\\d)1[3-9]\\d{9}(?!\\d)");

    public String redact(String text) {
        String result = BEARER.matcher(text).replaceAll("Bearer [REDACTED]");
        result = SECRET.matcher(result).replaceAll("$1$2[REDACTED]");
        return PHONE.matcher(EMAIL.matcher(result).replaceAll("[EMAIL]")).replaceAll("[PHONE]");
    }
}
