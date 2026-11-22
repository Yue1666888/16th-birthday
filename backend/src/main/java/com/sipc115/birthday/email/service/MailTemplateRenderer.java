package com.sipc115.birthday.email.service;

import com.sipc115.birthday.common.utils.RequestFingerprint;
import com.sipc115.birthday.email.response.EmailPreviewResponse;
import com.sipc115.birthday.invitation.entity.InvitationEntity;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class MailTemplateRenderer {
    public static final String TEMPLATE_VERSION = "invitation-16th-v2";
    private final RequestFingerprint fingerprints;
    private final boolean enabled;
    private final String subjectTemplate, textTemplate, htmlTemplate;

    public MailTemplateRenderer(
            RequestFingerprint fingerprints, @Value("${EMAIL_ENABLED:true}") boolean enabled)
            throws IOException {
        this.fingerprints = fingerprints;
        this.enabled = enabled;
        subjectTemplate =
                new ClassPathResource("mail/subject.txt")
                        .getContentAsString(StandardCharsets.UTF_8).strip();
        textTemplate =
                new ClassPathResource("mail/receipt.txt")
                        .getContentAsString(StandardCharsets.UTF_8);
        htmlTemplate =
                new ClassPathResource("mail/receipt.html")
                        .getContentAsString(StandardCharsets.UTF_8);
    }

    public EmailPreviewResponse render(InvitationEntity i) {
        String subject = subjectTemplate;
        Map<String, String> values =
                Map.of(
                        "name",
                        i.getName(),
                        "attendance",
                        "ATTENDING".equals(i.getAttendance()) ? "到场" : "不到场",
                        "gift",
                        switch (i.getGiftChoice()) {
                            case "PICKUP" -> "到场领取";
                            case "MAIL" -> "邮寄";
                            default -> "不领取";
                        },
                        "id",
                        i.getId().toString());
        String text = replace(textTemplate, values, false),
                html = replace(htmlTemplate, values, true);
        String hash =
                fingerprints.hash(
                        Map.of(
                                "invitationId",
                                i.getId().toString(),
                                "invitationVersion",
                                i.getVersion().toString(),
                                "recipientEmail",
                                i.getEmail(),
                                "subject",
                                subject,
                                "textBody",
                                text,
                                "htmlBody",
                                html,
                                "templateVersion",
                                TEMPLATE_VERSION));
        return new EmailPreviewResponse(
                i.getId().toString(),
                i.getVersion().toString(),
                i.getEmail(),
                subject,
                text,
                html,
                hash,
                enabled);
    }

    private String replace(String template, Map<String, String> values, boolean html) {
        // One pass prevents interpreting visitor-supplied text as template placeholders.
        var matcher =
                java.util.regex.Pattern.compile("\\{\\{(name|attendance|gift|id)\\}\\}")
                        .matcher(template);
        var result = new StringBuilder();
        while (matcher.find()) {
            String value = values.get(matcher.group(1));
            matcher.appendReplacement(
                    result,
                    java.util.regex.Matcher.quoteReplacement(
                            html ? HtmlUtils.htmlEscape(value) : value));
        }
        matcher.appendTail(result);
        return result.toString().strip();
    }
}
