package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.sipc115.birthday.email.client.MailApiClient;
import com.sipc115.birthday.email.task.EmailTaskTransactions;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.json.JsonMapper;

import java.util.UUID;

@SpringBootTest(properties = "EMAIL_ENABLED=false")
@AutoConfigureMockMvc
class EmailDisabledIT {
    @Autowired MockMvc mvc;
    @Autowired InvitationService invitations;
    @Autowired JdbcTemplate jdbc;
    @Autowired JsonMapper json;
    @Autowired EmailTaskTransactions transactions;
    @MockitoBean MailApiClient client;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) throws Exception {
        LocalTestDatabase.configure(registry);
    }

    @BeforeEach
    @AfterEach
    void clear() {
        assertEquals("birthday16_test", jdbc.queryForObject("SELECT DATABASE()", String.class));
        jdbc.update("DELETE FROM admin_operation_logs");
        jdbc.update("DELETE FROM idempotency_requests");
        jdbc.update("DELETE FROM email_notifications");
        jdbc.update("DELETE FROM invitations");
    }

    @Test
    void disabledEnvironmentRecordsConfirmationWithoutScheduling() throws Exception {
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
        var result =
                mvc.perform(get("/api/v1/admin/invitations/" + id + "/email-preview").with(jwt()))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.data.emailEnabled").value(false))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        String hash = json.readTree(result).path("data").path("previewHash").asString();
        mvc.perform(
                        post("/api/v1/admin/invitations/" + id + "/email-sends")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"requestId\":\""
                                                + UUID.randomUUID()
                                                + "\",\"expectedVersion\":\"1\",\"previewHash\":\""
                                                + hash
                                                + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("EMAIL_SEND_DISABLED"))
                .andExpect(jsonPath("$.data.taskStatus").value("DISABLED"))
                .andExpect(jsonPath("$.data.nextCheckAt").isEmpty());
        assertTrue(transactions.claim(2).isEmpty());
        verifyNoInteractions(client);
    }
}
