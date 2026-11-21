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

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.*;

@SpringBootTest
@AutoConfigureMockMvc
class MailManagementIT {
    @Autowired MockMvc mvc;
    @Autowired InvitationService invitations;
    @Autowired JdbcTemplate jdbc;
    @Autowired JsonMapper json;
    private String first, second;

    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) throws Exception {
        LocalTestDatabase.configure(r);
    }

    @BeforeEach
    void setup() {
        clear();
        first =
                invitations
                        .submit(
                                new InvitationSubmitRequest(
                                        "甲{{id}}",
                                        "13800138000",
                                        "one@example.com",
                                        "ATTENDING",
                                        "PICKUP",
                                        null))
                        .data()
                        .id();
        second =
                invitations
                        .submit(
                                new InvitationSubmitRequest(
                                        "乙",
                                        "13800138001",
                                        "two@example.com",
                                        "NOT_ATTENDING",
                                        "NONE",
                                        null))
                        .data()
                        .id();
    }

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

    private JsonNode postData(String path, Object body, int status) throws Exception {
        return json.readTree(
                        mvc.perform(
                                        post("/api/v1/admin/mail" + path)
                                                .with(jwt())
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(json.writeValueAsString(body)))
                                .andExpect(status().is(status))
                                .andReturn()
                                .getResponse()
                                .getContentAsString())
                .path("data");
    }

    private JsonNode preview() throws Exception {
        return postData(
                "/previews",
                Map.of(
                        "mode",
                        "BULK",
                        "subject",
                        "给{{name}}",
                        "textBody",
                        "{{name}} / {{attendance}} / {{giftChoice}} / {{id}}",
                        "recipientIds",
                        List.of(first, second)),
                200);
    }

    @Test
    void bulkSnapshotsVariablesAndIsIdempotent() throws Exception {
        var p = preview();
        assertTrue(p.path("messages").get(0).path("subject").asString().contains("甲{{id}}"));
        assertTrue(p.path("messages").get(0).path("textBody").asString().contains("到场领取"));
        var body =
                Map.of(
                        "requestId",
                        UUID.randomUUID().toString(),
                        "previewId",
                        p.path("id").asString(),
                        "previewHash",
                        p.path("previewHash").asString());
        var b = postData("/batches", body, 202);
        assertEquals(2, b.path("recipientCount").asInt());
        assertEquals(2, b.path("counts").path("PENDING").asInt());
        mvc.perform(
                        post("/api/v1/admin/mail/batches")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(body)))
                .andExpect(status().isAccepted())
                .andExpect(header().string("Idempotency-Replayed", "true"))
                .andExpect(jsonPath("$.data.id").value(b.path("id").asString()));
        postData(
                "/batches",
                Map.of(
                        "requestId",
                        UUID.randomUUID().toString(),
                        "previewId",
                        p.path("id").asString(),
                        "previewHash",
                        p.path("previewHash").asString()),
                200);
        assertEquals(
                2, jdbc.queryForObject("SELECT COUNT(*) FROM email_notifications", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM mail_batches", Integer.class));
        mvc.perform(
                        get("/api/v1/admin/mail/sends")
                                .with(jwt())
                                .param("batchId", b.path("id").asString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2));
        mvc.perform(
                        get("/api/v1/admin/mail/recipients")
                                .with(jwt())
                                .param("emailNotifyStatus", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2));
        mvc.perform(get("/api/v1/admin/invitations/" + first).with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(first));
    }

    @Test
    void differentCustomMailBatchesCanCoexistForSameVersion() throws Exception {
        for (int n = 0; n < 2; n++) {
            var p =
                    postData(
                            "/previews",
                            Map.of(
                                    "mode",
                                    "SINGLE",
                                    "subject",
                                    "主题" + n,
                                    "textBody",
                                    "正文" + n,
                                    "recipientIds",
                                    List.of(first)),
                            200);
            postData(
                    "/batches",
                    Map.of(
                            "requestId",
                            UUID.randomUUID().toString(),
                            "previewId",
                            p.path("id").asString(),
                            "previewHash",
                            p.path("previewHash").asString()),
                    202);
        }
        assertEquals(
                2,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM email_notifications WHERE invitation_id=?",
                        Integer.class,
                        first));
        assertEquals(
                2,
                jdbc.queryForObject(
                        "SELECT MAX(send_no) FROM email_notifications WHERE invitation_id=?",
                        Integer.class,
                        first));
    }

    @Test
    void changedReceiptInvalidatesWholeBatchWithoutPartialWrites() throws Exception {
        var p = preview();
        invitations.submit(
                new InvitationSubmitRequest(
                        "乙更新", "13800138001", "new@example.com", "NOT_ATTENDING", "NONE", null));
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
                                                        p.path("id").asString(),
                                                        "previewHash",
                                                        p.path("previewHash").asString()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM mail_batches", Integer.class));
        assertEquals(
                0, jdbc.queryForObject("SELECT COUNT(*) FROM email_notifications", Integer.class));
    }

    @Test
    void selectionIsFrozenOwnedAndExpires() throws Exception {
        var selection =
                postData(
                        "/recipient-selections",
                        Map.of("attendance", "ATTENDING", "emailNotifyStatus", "NOT_SENT"),
                        200);
        assertEquals(1, selection.path("recipientCount").asInt());
        String id = selection.path("id").asString();
        postData(
                "/previews",
                Map.of("mode", "BULK", "subject", "Hi", "textBody", "{{name}}", "selectionId", id),
                200);
        jdbc.update(
                "UPDATE mail_recipient_selections SET expires_at=UTC_TIMESTAMP()-INTERVAL 1 SECOND"
                    + " WHERE id=?",
                id);
        mvc.perform(
                        post("/api/v1/admin/mail/previews")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "mode",
                                                        "BULK",
                                                        "subject",
                                                        "Hi",
                                                        "textBody",
                                                        "{{name}}",
                                                        "selectionId",
                                                        id))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MAIL_SELECTION_EXPIRED"));
    }

    @Test
    void malformedVariablesDuplicateRecipientsAndWrongOwnerAreRejected() throws Exception {
        mvc.perform(
                        post("/api/v1/admin/mail/previews")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "mode",
                                                        "BULK",
                                                        "subject",
                                                        "Hi",
                                                        "textBody",
                                                        "{{unknown}}",
                                                        "recipientIds",
                                                        List.of(first)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.textBody").exists());
        postData(
                "/previews",
                Map.of(
                        "mode",
                        "BULK",
                        "subject",
                        "Hi",
                        "textBody",
                        "text",
                        "recipientIds",
                        List.of(first, first)),
                400);
        var p = preview();
        mvc.perform(
                        post("/api/v1/admin/mail/batches")
                                .with(jwt().jwt(j -> j.subject("another-member")))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "requestId",
                                                        UUID.randomUUID().toString(),
                                                        "previewId",
                                                        p.path("id").asString(),
                                                        "previewHash",
                                                        p.path("previewHash").asString()))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MAIL_PREVIEW_NOT_FOUND"));
        mvc.perform(
                        get("/api/v1/admin/mail/recipients")
                                .with(jwt())
                                .param("emailNotifyStatus", "INVALID"))
                .andExpect(status().isBadRequest());
    }
}
