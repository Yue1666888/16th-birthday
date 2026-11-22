package com.sipc115.birthday;

import com.sipc115.birthday.common.utils.RequestFingerprint;
import com.sipc115.birthday.email.service.MailTemplateRenderer;
import com.sipc115.birthday.invitation.entity.InvitationEntity;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

class MailTemplateRendererTest {
    @Test
    void usesSuppliedInvitationAndEscapesRecipientWithoutRecursiveSubstitution() throws Exception {
        var renderer = new MailTemplateRenderer(new RequestFingerprint(JsonMapper.builder().build()), true);
        var recipient = new InvitationEntity();
        recipient.setId(42L); recipient.setVersion(1L); recipient.setName("<张三>{{id}}");
        recipient.setEmail("test@example.com"); recipient.setAttendance("ATTENDING"); recipient.setGiftChoice("NONE");
        var preview = renderer.render(recipient);
        assertEquals("山海几重，今盼汝归", preview.subject());
        assertTrue(preview.textBody().contains("<张三>{{id}}，好久不见！"));
        assertTrue(preview.textBody().contains("2026年12月19日"));
        assertTrue(preview.textBody().contains("天津理工大学7号教学楼115室"));
        assertTrue(preview.htmlBody().contains("&lt;张三&gt;{{id}}"));
        assertTrue(preview.htmlBody().contains("<strong>SIPC115成立一十六周年庆生</strong>"));
        assertEquals(64, preview.previewHash().length());
    }
}
