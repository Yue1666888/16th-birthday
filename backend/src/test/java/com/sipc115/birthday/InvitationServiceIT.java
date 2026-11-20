package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;

import com.sipc115.birthday.common.api.BusinessCode;
import com.sipc115.birthday.invitation.request.InvitationSubmitRequest;
import com.sipc115.birthday.invitation.service.InvitationService;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Properties;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
class InvitationServiceIT {
    @Autowired private InvitationService service;
    @Autowired private JdbcTemplate jdbc;

    @DynamicPropertySource
    static void localTestDatabase(DynamicPropertyRegistry registry) throws Exception {
        Properties local = new Properties();
        try (Reader reader = Files.newBufferedReader(Path.of(".env"), StandardCharsets.UTF_8)) {
            local.load(reader);
        }
        registry.add("spring.datasource.url", () ->
                "jdbc:mysql://127.0.0.1:3306/birthday16_test?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true");
        registry.add("spring.datasource.username", () -> local.getProperty("DB_USER"));
        registry.add("spring.datasource.password", () -> local.getProperty("DB_PASSWORD"));
    }

    @BeforeEach
    void prepare() {
        assertEquals("birthday16_test", jdbc.queryForObject("SELECT DATABASE()", String.class));
        clear();
    }

    @AfterEach
    void clear() {
        jdbc.update("DELETE FROM email_notifications");
        jdbc.update("DELETE FROM invitations");
    }

    private InvitationSubmitRequest request(String name) {
        return new InvitationSubmitRequest(name, "13800138000", "test@example.com",
                "ATTENDING", "NONE", null);
    }

    @Test
    void createsUpdatesAndPreservesVersionForNoop() {
        var created = service.submit(request("张三"));
        assertEquals(BusinessCode.INVITATION_CREATED, created.code());
        assertNotNull(created.data().id());
        var unchanged = service.submit(request("张三"));
        assertEquals(BusinessCode.INVITATION_UPDATED, unchanged.code());
        assertEquals(1L, jdbc.queryForObject("SELECT version FROM invitations", Long.class));
        service.submit(request("李四"));
        assertEquals(2L, jdbc.queryForObject("SELECT version FROM invitations", Long.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM invitations", Integer.class));
    }

    @Test
    void neverCreatesMailTaskWhenSavingReceipt() {
        service.submit(request("张三"));
        service.submit(request("李四"));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM email_notifications", Integer.class));
    }

    @Test
    void concurrentSamePhoneStaysOneRecord() throws Exception {
        try (var executor = Executors.newFixedThreadPool(8)) {
            var calls = new ArrayList<Callable<String>>();
            for (int i = 0; i < 8; i++) {
                calls.add(() -> service.submit(request("并发测试")).data().id());
            }
            var results = executor.invokeAll(calls);
            String id = results.getFirst().get();
            for (var result : results) {
                assertEquals(id, result.get());
            }
        }
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM invitations", Integer.class));
        assertEquals(1L, jdbc.queryForObject("SELECT version FROM invitations", Long.class));
    }
}
