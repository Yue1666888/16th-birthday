package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.sipc115.birthday.invitation.request.InvitationSubmitRequest;
import com.sipc115.birthday.invitation.service.InvitationService;
import com.sipc115.birthday.testsupport.LocalTestDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AdminInvitationIT {
    @Autowired private MockMvc mvc;
    @Autowired private InvitationService service;
    @Autowired private JdbcTemplate jdbc;
    private String id;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) throws Exception {
        LocalTestDatabase.configure(registry);
    }

    @BeforeEach
    void prepare() {
        assertEquals("birthday16_test", jdbc.queryForObject("SELECT DATABASE()", String.class));
        clear();
        id = service.submit(new InvitationSubmitRequest("含%名字", "13800138000",
                "test@example.com", "ATTENDING", "NONE", null)).data().id();
    }

    @AfterEach
    void clear() {
        jdbc.update("DELETE FROM admin_operation_logs");
        jdbc.update("DELETE FROM idempotency_requests");
        jdbc.update("DELETE FROM email_notifications");
        jdbc.update("DELETE FROM invitations");
    }

    @Test
    void authenticatedMemberCanReadPageAndStatsWithoutExtraRole() throws Exception {
        mvc.perform(get("/api/v1/admin/invitations").with(jwt()).param("page", "1").param("size", "20"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(id))
                .andExpect(jsonPath("$.data.content[0].version").value("1"))
                .andExpect(jsonPath("$.data.content[0].emailNotifyStatus").value("NOT_SENT"));
        mvc.perform(get("/api/v1/admin/invitations/stats").with(jwt()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.email.notSent").value(1))
                .andExpect(jsonPath("$.data.attendance.attending").value(1));
    }

    @Test
    void queryWildcardsAreTreatedLiterallyAndPaginationIsStrict() throws Exception {
        mvc.perform(get("/api/v1/admin/invitations").with(jwt()).param("keyword", "%"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1));
        mvc.perform(get("/api/v1/admin/invitations").with(jwt()).param("size", "101"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.size").exists());
        mvc.perform(get("/api/v1/admin/invitations").with(jwt()).param("size", "1").param("size", "2"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void correctionIsVersionedAuditedAndIdempotent() throws Exception {
        String payload = "{\"requestId\":\"10000000-0000-4000-8000-000000000001\","
                + "\"expectedVersion\":\"1\",\"attendance\":\"NOT_ATTENDING\",\"giftChoice\":\"MAIL\","
                + "\"mailingAddress\":\"测试地址\"}";
        mvc.perform(patch("/api/v1/admin/invitations/" + id).with(jwt())
                .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value("2"))
                .andExpect(jsonPath("$.data.giftChoice").value("MAIL"));
        mvc.perform(patch("/api/v1/admin/invitations/" + id).with(jwt())
                .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk()).andExpect(header().string("Idempotency-Replayed", "true"))
                .andExpect(jsonPath("$.data.version").value("2"));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM admin_operation_logs", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM email_notifications", Integer.class));
    }

    @Test
    void explicitNullIsRejectedAndStaleVersionConflicts() throws Exception {
        mvc.perform(patch("/api/v1/admin/invitations/" + id).with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"requestId\":\"10000000-0000-4000-8000-000000000002\","
                        + "\"expectedVersion\":\"1\",\"name\":null}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.name").exists());
        mvc.perform(patch("/api/v1/admin/invitations/" + id).with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"requestId\":\"10000000-0000-4000-8000-000000000003\","
                        + "\"expectedVersion\":\"2\",\"name\":\"名字\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
    }

    @Test
    void csvIsUtf8WithBomAndContainsFixedColumns() throws Exception {
        byte[] output = mvc.perform(get("/api/v1/admin/invitations/export").with(jwt()))
                .andExpect(status().isOk()).andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"birthday-invitations.csv\""))
                .andReturn().getResponse().getContentAsByteArray();
        assertArrayEquals(new byte[] {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF},
                java.util.Arrays.copyOf(output, 3));
        assertTrue(new String(output, java.nio.charset.StandardCharsets.UTF_8).contains("邮件状态"));
        mvc.perform(get("/api/v1/admin/invitations/export").with(jwt()).param("attendance", "INVALID"))
                .andExpect(status().isBadRequest()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }
}
