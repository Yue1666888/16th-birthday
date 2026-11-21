package com.sipc115.birthday.logs.service;

import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.RequestFingerprint;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class ServiceLogService {
    public record Entry(String id, String level, String text) {}

    public record Chunk(
            List<Entry> entries,
            String nextCursor,
            boolean rotated,
            boolean truncated,
            String source) {}

    private record Cursor(String key, long offset) {}

    private static final Pattern LEVEL = Pattern.compile("\\b(TRACE|DEBUG|INFO|WARN|ERROR)\\b");
    private static final int WINDOW = 65536, MAX_DOWNLOAD = 12 * 1024 * 1024;
    private final Path path;
    private final JsonMapper json;
    private final RequestFingerprint fingerprints;
    private final LogRedactor redactor;

    public ServiceLogService(
            @Value("${APP_LOG_FILE:logs/application.log}") String path,
            JsonMapper json,
            RequestFingerprint fingerprints,
            LogRedactor redactor) {
        this.path = Path.of(path).toAbsolutePath().normalize();
        this.json = json;
        this.fingerprints = fingerprints;
        this.redactor = redactor;
    }

    private BasicFileAttributes attributes() throws IOException {
        var attrs =
                Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
        if (!attrs.isRegularFile() || attrs.isSymbolicLink())
            throw new IOException("Invalid log source");
        return attrs;
    }

    private String key(BasicFileAttributes a) throws IOException {
        // Windows may expose no fileKey and preserve creation time through NTFS tunneling.
        // The first log line adds a stable identity across appends and changes on rotation.
        byte[] prefix;
        try (var input = Files.newInputStream(path)) {
            prefix = input.readNBytes(1024);
        }
        int end = 0;
        while (end < prefix.length && prefix[end] != '\n') end++;
        return fingerprints.hash(
                Map.of(
                        "key",
                        String.valueOf(a.fileKey()),
                        "created",
                        a.creationTime().toString(),
                        "first",
                        Base64.getEncoder().encodeToString(Arrays.copyOf(prefix, end))));
    }

    private Cursor decode(String value) {
        if (value == null) return null;
        try {
            if (value.length() > 1024) throw new IllegalArgumentException();
            var c = json.readValue(Base64.getUrlDecoder().decode(value), Cursor.class);
            if (c == null || c.key() == null || !c.key().matches("[a-f0-9]{64}") || c.offset() < 0)
                throw new IllegalArgumentException();
            return c;
        } catch (Exception ex) {
            throw BusinessException.field("cursor", "日志游标不合法");
        }
    }

    private String encode(Cursor c) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.writeValueAsBytes(c));
    }

    public Chunk read(String value, int limit) {
        if (limit < 1 || limit > 500) throw BusinessException.field("limit", "每次日志数量应在1到500之间");
        var cursor = decode(value);
        try {
            var attrs = attributes();
            String key = key(attrs);
            long size = attrs.size();
            boolean
                    rotated =
                            cursor != null && (!key.equals(cursor.key()) || cursor.offset() > size),
                    initial = cursor == null || rotated;
            long start = initial ? Math.max(0, size - WINDOW) : cursor.offset();
            byte[] bytes;
            try (var file = new RandomAccessFile(path.toFile(), "r")) {
                file.seek(start);
                bytes = new byte[(int) Math.min(WINDOW, Math.max(0, size - start))];
                file.readFully(bytes);
            }
            int position = 0;
            if (initial && start > 0) {
                while (position < bytes.length && bytes[position] != '\n') position++;
                if (position < bytes.length) position++;
            }
            var result = new ArrayList<Entry>();
            int consumed = position;
            boolean truncated = initial && start > 0;
            while (position < bytes.length) {
                int end = position;
                while (end < bytes.length && bytes[end] != '\n') end++;
                if (end == bytes.length) {
                    if (bytes.length == WINDOW) {
                        result.add(new Entry(key + ":" + (start + position), "WARN", "[超长日志行已截断]"));
                        consumed = bytes.length;
                        truncated = true;
                    }
                    break;
                }
                String text =
                        new String(
                                        bytes,
                                        position,
                                        Math.min(end - position, 16384),
                                        StandardCharsets.UTF_8)
                                .stripTrailing();
                if (end - position > 16384) {
                    text += " [单行已截断]";
                    truncated = true;
                }
                var match = LEVEL.matcher(text);
                String level = match.find() ? match.group(1) : "STACK";
                result.add(new Entry(key + ":" + (start + position), level, redactor.redact(text)));
                position = end + 1;
                consumed = position;
                if (!initial && result.size() >= limit) break;
            }
            if (initial && result.size() > limit) {
                result = new ArrayList<>(result.subList(result.size() - limit, result.size()));
                truncated = true;
            }
            return new Chunk(
                    List.copyOf(result),
                    encode(new Cursor(key, start + consumed)),
                    rotated,
                    truncated,
                    "application.log");
        } catch (IOException ex) {
            throw new BusinessException(ErrorCode.LOG_UNAVAILABLE);
        }
    }

    public byte[] download() {
        try {
            var attrs = attributes();
            if (attrs.size() > MAX_DOWNLOAD) throw new BusinessException(ErrorCode.LOG_UNAVAILABLE);
            byte[] bytes;
            try (var stream = Files.newInputStream(path)) {
                bytes = stream.readNBytes((int) attrs.size());
            }
            return redactor.redact(new String(bytes, StandardCharsets.UTF_8))
                    .getBytes(StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new BusinessException(ErrorCode.LOG_UNAVAILABLE);
        }
    }
}
