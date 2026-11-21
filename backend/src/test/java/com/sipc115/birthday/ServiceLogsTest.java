package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;

import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.RequestFingerprint;
import com.sipc115.birthday.logs.service.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import tools.jackson.databind.json.JsonMapper;

import java.nio.file.*;

class ServiceLogsTest {
    @TempDir Path dir;

    private ServiceLogService service(Path file) {
        var json = JsonMapper.builder().build();
        return new ServiceLogService(
                file.toString(), json, new RequestFingerprint(json), new LogRedactor());
    }

    @Test
    void cursorPreservesUtf8AndAvoidsDuplicates() throws Exception {
        Path file = dir.resolve("app.log");
        Files.writeString(file, "2026-11-21 INFO 开始\n    stack line\n");
        var service = service(file);
        var first = service.read(null, 20);
        assertEquals(2, first.entries().size());
        assertTrue(service.read(first.nextCursor(), 20).entries().isEmpty());
        Files.writeString(file, "2026-11-21 WARN 新日志\n", StandardOpenOption.APPEND);
        var next = service.read(first.nextCursor(), 20);
        assertEquals(1, next.entries().size());
        assertTrue(next.entries().getFirst().text().contains("新日志"));
    }

    @Test
    void rotationAndTruncationResetCursor() throws Exception {
        Path file = dir.resolve("app.log");
        Files.writeString(file, "INFO initial\n");
        var service = service(file);
        var initial = service.read(null, 20);
        Files.move(file, dir.resolve("old.log"));
        Files.writeString(file, "ERROR rotated\n");
        var rotated = service.read(initial.nextCursor(), 20);
        assertTrue(rotated.rotated());
        assertTrue(rotated.entries().getFirst().text().contains("rotated"));
    }

    @Test
    void liveReadAndDownloadRedactCredentialsAndPersonalFields() throws Exception {
        Path file = dir.resolve("app.log");
        Files.writeString(
                file,
                "INFO Authorization: Bearer test-secret-jwt password=example-password"
                    + " secret=private-key one@example.com 13800138000\n");
        var service = service(file);
        String display = service.read(null, 20).entries().getFirst().text(),
                download = new String(service.download(), java.nio.charset.StandardCharsets.UTF_8);
        for (String value :
                new String[] {
                    "test-secret-jwt",
                    "example-password",
                    "private-key",
                    "one@example.com",
                    "13800138000"
                }) {
            assertFalse(display.contains(value));
            assertFalse(download.contains(value));
        }
        assertTrue(download.contains("[REDACTED]"));
    }

    @Test
    void invalidCursorAndMissingSourceAreBusinessErrors() {
        assertEquals(
                ErrorCode.VALIDATION_ERROR,
                assertThrows(
                                BusinessException.class,
                                () -> service(dir.resolve("none")).read("not-a-cursor", 20))
                        .errorCode());
        assertEquals(
                ErrorCode.LOG_UNAVAILABLE,
                assertThrows(
                                BusinessException.class,
                                () -> service(dir.resolve("none")).read(null, 20))
                        .errorCode());
    }
}
