package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.sipc115.birthday.email.client.*;
import com.sipc115.birthday.email.enums.MailTaskErrorCode;
import com.sipc115.birthday.email.mapper.EmailNotificationMapper;
import com.sipc115.birthday.email.task.*;
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

import java.time.LocalDateTime;
import java.util.UUID;

@SpringBootTest
@AutoConfigureMockMvc
class EmailIT {
    @Autowired MockMvc mvc;
    @Autowired InvitationService invitations;
    @Autowired JdbcTemplate jdbc;
    @Autowired JsonMapper json;
    @Autowired EmailTaskTransactions transactions;
    @Autowired EmailTaskProcessor processor;
    @Autowired EmailNotificationMapper mapper;
    @MockitoBean MailApiClient client;
    private String id;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) throws Exception {
        LocalTestDatabase.configure(registry);
    }

    @BeforeEach
    void prepare() {
        assertEquals("birthday16_test", jdbc.queryForObject("SELECT DATABASE()", String.class));
        clear();
        reset(client);
        id = invitations.submit(input("<张三>{{id}}", "original@example.com")).data().id();
    }

    @AfterEach
    void clear() {
        jdbc.update("DELETE FROM admin_operation_logs");
        jdbc.update("DELETE FROM idempotency_requests");
        jdbc.update("DELETE FROM email_notifications");
        jdbc.update("DELETE FROM invitations");
    }

    private InvitationSubmitRequest input(String name, String email) {
        return new InvitationSubmitRequest(name, "13800138000", email, "ATTENDING", "NONE", null);
    }

    private String preview() throws Exception {
        var result =
                mvc.perform(get("/api/v1/admin/invitations/" + id + "/email-preview").with(jwt()))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.data.emailEnabled").value(true))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        var data = json.readTree(result).path("data");
        assertTrue(data.path("htmlBody").asString().contains("&lt;张三&gt;{{id}}"));
        return data.path("previewHash").asString();
    }

    private String payload(String request, String version, String hash) {
        return "{\"requestId\":\""
                + request
                + "\",\"expectedVersion\":\""
                + version
                + "\",\"previewHash\":\""
                + hash
                + "\"}";
    }

    private long confirm() throws Exception {
        String payload = payload(UUID.randomUUID().toString(), "1", preview());
        var result =
                mvc.perform(
                                post("/api/v1/admin/invitations/" + id + "/email-sends")
                                        .with(jwt())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(payload))
                        .andExpect(status().isAccepted())
                        .andExpect(jsonPath("$.data.taskStatus").value("READY"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return Long.parseLong(json.readTree(result).path("data").path("id").asString());
    }

    private void due(long task) {
        jdbc.update(
                "UPDATE email_notifications SET next_run_at=UTC_TIMESTAMP(3)-INTERVAL 1 SECOND"
                    + " WHERE id=?",
                task);
    }

    @Test
    void manualConfirmationIsAtomicAndReplaysOriginalResponse() throws Exception {
        String hash = preview();
        assertEquals(
                0, jdbc.queryForObject("SELECT COUNT(*) FROM email_notifications", Integer.class));
        String request = UUID.randomUUID().toString(), body = payload(request, "1", hash);
        var call =
                post("/api/v1/admin/invitations/" + id + "/email-sends")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body);
        var first =
                mvc.perform(call)
                        .andExpect(status().isAccepted())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        mvc.perform(
                        post("/api/v1/admin/invitations/" + id + "/email-sends")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                .andExpect(status().isAccepted())
                .andExpect(header().string("Idempotency-Replayed", "true"))
                .andExpect(
                        jsonPath("$.data")
                                .value(json.readValue(first, java.util.Map.class).get("data")));
        mvc.perform(
                        post("/api/v1/admin/invitations/" + id + "/email-sends")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload(UUID.randomUUID().toString(), "1", hash)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("EMAIL_SEND_REUSED"));
        assertEquals(
                1, jdbc.queryForObject("SELECT COUNT(*) FROM email_notifications", Integer.class));
        assertEquals(
                1, jdbc.queryForObject("SELECT COUNT(*) FROM admin_operation_logs", Integer.class));
        mvc.perform(
                        get("/api/v1/admin/invitations/" + id + "/email-sends")
                                .with(jwt())
                                .param("invitationVersion", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));
        mvc.perform(
                        get("/api/v1/admin/invitations/" + id + "/email-sends")
                                .with(jwt())
                                .param("invitationVersion", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.invitationVersion").exists());
        verifyNoInteractions(client);
    }

    @Test
    void staleVersionAndChangedPreviewDoNotPersistJobs() throws Exception {
        String hash = preview();
        mvc.perform(
                        post("/api/v1/admin/invitations/" + id + "/email-sends")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        payload(UUID.randomUUID().toString(), "1", "a".repeat(64))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_PREVIEW_CHANGED"));
        invitations.submit(input("新名字", "changed@example.com"));
        mvc.perform(
                        post("/api/v1/admin/invitations/" + id + "/email-sends")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload(UUID.randomUUID().toString(), "1", hash)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        assertEquals(
                0, jdbc.queryForObject("SELECT COUNT(*) FROM email_notifications", Integer.class));
        assertEquals(
                0, jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_requests", Integer.class));
    }

    @Test
    void acceptedMailIsPolledAndOldVersionSuccessStaysHistorical() throws Exception {
        long task = confirm();
        String remote = UUID.randomUUID().toString();
        when(client.submit(any())).thenReturn(new MailApiClient.Accepted(remote, "queued"));
        processor.process(transactions.claim(1).getFirst());
        assertEquals("POLLING", mapper.get(task).getTaskStatus());
        invitations.submit(input("新名字", "changed@example.com"));
        when(client.status(remote))
                .thenReturn(
                        new MailApiClient.RemoteMail(
                                remote, "sent", 1, LocalDateTime.of(2026, 11, 21, 0, 0), false));
        due(task);
        processor.process(transactions.claim(1).getFirst());
        assertEquals("SUCCEEDED", mapper.get(task).getTaskStatus());
        assertEquals("original@example.com", mapper.get(task).getRecipientEmail());
        mvc.perform(get("/api/v1/admin/invitations").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].emailNotifyStatus").value("NOT_SENT"));
        mvc.perform(get("/api/v1/admin/invitations/" + id + "/email-sends").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].emailNotifyStatus").value("SUCCESS"));
        verify(client, times(1)).submit(any());
    }

    @Test
    void uncertainSubmissionUsesSameKeyAndPausesAfterVersionChange() throws Exception {
        long task = confirm();
        when(client.submit(any()))
                .thenThrow(
                        new MailIntegrationException(
                                MailTaskErrorCode.MAIL_SERVICE_TIMEOUT, true, true, "受理结果未知"));
        processor.process(transactions.claim(1).getFirst());
        assertEquals("SUBMIT_UNKNOWN", mapper.get(task).getTaskStatus());
        String key = mapper.get(task).getClientKey();
        invitations.submit(input("新名字", "changed@example.com"));
        due(task);
        processor.process(transactions.claim(1).getFirst());
        assertEquals("SUBMIT_UNKNOWN", mapper.get(task).getTaskStatus());
        assertNull(mapper.get(task).getNextRunAt());
        assertEquals("MAIL_SUBMISSION_UNCERTAIN", mapper.get(task).getLastErrorCode());
        assertEquals(key, mapper.get(task).getClientKey());
        verify(client, times(1)).submit(any());
    }

    @Test
    void obsoleteUnsubmittedTaskCancelsWithoutSending() throws Exception {
        long task = confirm();
        invitations.submit(input("新名字", "changed@example.com"));
        processor.process(transactions.claim(1).getFirst());
        assertEquals("CANCELLED", mapper.get(task).getTaskStatus());
        verifyNoInteractions(client);
    }

    @Test
    void expiredLeaseCannotOverwriteNewWorkersResult() throws Exception {
        long task = confirm();
        var old = transactions.claim(1).getFirst();
        jdbc.update(
                "UPDATE email_notifications SET lease_until=UTC_TIMESTAMP(3)-INTERVAL 1 SECOND"
                    + " WHERE id=?",
                task);
        var fresh = transactions.claim(1).getFirst();
        assertTrue(fresh.previouslyUncertain());
        assertNotEquals(old.notification().getLeaseToken(), fresh.notification().getLeaseToken());
        old.notification().setTaskStatus("FAILED");
        assertFalse(transactions.finish(old.notification()));
        String remote = UUID.randomUUID().toString();
        when(client.submit(any())).thenReturn(new MailApiClient.Accepted(remote, "queued"));
        processor.process(old);
        verifyNoInteractions(client);
        processor.process(fresh);
        assertEquals("POLLING", mapper.get(task).getTaskStatus());
        verify(client).submit(any());
    }

    @Test
    void queryFailuresKeepKnownRemoteStateAndSmtpFinalFailureIsTerminal() throws Exception {
        long task = confirm();
        String remote = UUID.randomUUID().toString();
        when(client.submit(any())).thenReturn(new MailApiClient.Accepted(remote, "sending"));
        processor.process(transactions.claim(1).getFirst());
        when(client.status(remote))
                .thenThrow(
                        new MailIntegrationException(
                                MailTaskErrorCode.MAIL_SERVICE_TIMEOUT, true, false, "暂时超时"));
        due(task);
        processor.process(transactions.claim(1).getFirst());
        assertEquals("sending", mapper.get(task).getRemoteStatus());
        assertEquals("POLLING", mapper.get(task).getTaskStatus());
        assertEquals("MAIL_STATUS_QUERY_FAILED", mapper.get(task).getLastErrorCode());
        doReturn(new MailApiClient.RemoteMail(remote, "failed", 5, null, true))
                .when(client)
                .status(remote);
        due(task);
        processor.process(transactions.claim(1).getFirst());
        assertEquals("FAILED", mapper.get(task).getTaskStatus());
        assertEquals("MAIL_SMTP_TIMEOUT", mapper.get(task).getLastErrorCode());
        assertNull(mapper.get(task).getNextRunAt());
    }
}
