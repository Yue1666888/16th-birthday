package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.sipc115.birthday.invitation.request.InvitationSubmitRequest;
import com.sipc115.birthday.invitation.service.InvitationService;
import com.sipc115.birthday.testsupport.LocalTestDatabase;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.json.JsonMapper;

import java.util.*;

@SpringBootTest(properties = "EMAIL_ENABLED=false")
@AutoConfigureMockMvc
class MailManagementDisabledIT {
    @Autowired MockMvc mvc;
    @Autowired InvitationService invitations;
    @Autowired JdbcTemplate jdbc;
    @Autowired JsonMapper json;

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) throws Exception {
        LocalTestDatabase.configure(r);
    }

    @BeforeEach
    @AfterEach
    void clear() {
        assertEquals("birthday16_test", jdbc.queryForObject("SELECT DATABASE()", String.class));
        for (String table :
                List.of(
                        "admin_operation_logs",
                        "idempotency_requests",
                        "email_notifications",
                        "mail_batches",
                        "mail_previews",
                        "mail_recipient_selections",
                        "invitations")) jdbc.update("DELETE FROM " + table);
    }

    @Test
    void customBatchHonorsDisabledEnvironmentWithoutScheduling() throws Exception {
        String id =
                invitations
                        .submit(
                                new InvitationSubmitRequest(
                                        "测试",
                                        "13800138000",
                                        "test@example.com",
                                        "ATTENDING",
                                        "NONE",
                                        null))
                        .data()
                        .id();
        String raw =
                mvc.perform(
                                post("/api/v1/admin/mail/previews")
                                        .with(jwt())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                json.writeValueAsString(
                                                        Map.of(
                                                                "mode",
                                                                "SINGLE",
                                                                "subject",
                                                                "自定义",
                                                                "textBody",
                                                                "测试正文",
                                                                "recipientIds",
                                                                List.of(id)))))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.data.emailEnabled").value(false))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        var preview = json.readTree(raw).path("data");
        mvc.perform(
                        post("/api/v1/admin/mail/batches")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "requestId",
                                                        UUID.randomUUID().toString(),
                                                        "previewId",
                                                        preview.path("id").asString(),
                                                        "previewHash",
                                                        preview.path("previewHash").asString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("MAIL_BATCH_DISABLED"))
                .andExpect(jsonPath("$.data.counts.DISABLED").value(1));
        assertEquals(
                0,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM email_notifications WHERE next_run_at IS NOT NULL",
                        Integer.class));
    }
}
