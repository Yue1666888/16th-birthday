package com.sipc115.birthday.common.utils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class RequestFingerprint {
    private final JsonMapper mapper;
    public RequestFingerprint(JsonMapper mapper) { this.mapper = mapper; }

    public String hash(Object value) {
        return digest(mapper.writeValueAsString(canonical(mapper.convertValue(value, Object.class))));
    }

    public static String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    private Object canonical(Object value) {
        if (value instanceof Map<?, ?> source) {
            Map<String, Object> result = new TreeMap<>();
            source.forEach((key, item) -> result.put(key.toString(), canonical(item)));
            return result;
        }
        if (value instanceof List<?> source) {
            List<Object> result = new ArrayList<>();
            source.forEach(item -> result.add(canonical(item)));
            return result;
        }
        return value;
    }
}
