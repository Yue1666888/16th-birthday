package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.sipc115.birthday.testsupport.LocalTestDatabase;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.*;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.context.annotation.Import(ServiceLogsIT.FixtureConfig.class)
class ServiceLogsIT {
    private static final Path FILE;

    static {
        try {
            FILE = Files.createTempFile("birthday16-log-api-", ".log");
        } catch (Exception e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    @Autowired MockMvc mvc;

    @org.springframework.boot.test.context.TestConfiguration
    static class FixtureConfig {
        @org.springframework.context.annotation.Bean
        @org.springframework.context.annotation.Primary
        com.sipc115.birthday.logs.service.ServiceLogService fixtureLogSource(
                tools.jackson.databind.json.JsonMapper json,
                com.sipc115.birthday.common.utils.RequestFingerprint fingerprints,
                com.sipc115.birthday.logs.service.LogRedactor redactor) {
            return new com.sipc115.birthday.logs.service.ServiceLogService(
                    FILE.toString(), json, fingerprints, redactor);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry r) throws Exception {
        LocalTestDatabase.configure(r);
    }

    @BeforeEach
    void prepareLogContent() throws Exception {
        Files.writeString(
                FILE, "2026-11-21 INFO ready one@example.com 13800138000\n    stack line\n");
    }

    @AfterAll
    static void cleanup() throws Exception {
        Files.deleteIfExists(FILE);
    }

    @Test
    void unauthenticatedLogRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/v1/admin/logs"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/v1/admin/logs/download")).andExpect(status().isUnauthorized());
    }

    @Test
    void readAndDownloadAreRedactedAndMalformedCursorIsJson() throws Exception {
        mvc.perform(get("/api/v1/admin/logs").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.data.entries[0].text")
                                .value("2026-11-21 INFO ready [EMAIL] [PHONE]"))
                .andExpect(jsonPath("$.data.nextCursor").isString());
        var result =
                mvc.perform(get("/api/v1/admin/logs/download").with(jwt()))
                        .andExpect(status().isOk())
                        .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                        .andExpect(header().exists("Content-Disposition"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertTrue(result.contains("stack line"));
        assertFalse(result.contains("one@example.com"));
        mvc.perform(get("/api/v1/admin/logs").with(jwt()).param("cursor", "bad"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.fieldErrors.cursor").exists());
    }
}
