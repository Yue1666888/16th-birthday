package com.sipc115.birthday.mail.service;

import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.mail.model.MailModels.Recipient;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Pattern;

@Component
public class MailTemplateVariables {
    private static final Pattern TOKEN = Pattern.compile("\\{\\{\\s*([a-zA-Z][a-zA-Z0-9_]*)\\s*}}");

    public String render(String text, Recipient r, String field) {
        var values =
                Map.of(
                        "name",
                        r.name(),
                        "attendance",
                        "ATTENDING".equals(r.attendance()) ? "到场" : "不到场",
                        "giftChoice",
                        switch (r.giftChoice()) {
                            case "PICKUP" -> "到场领取";
                            case "MAIL" -> "邮寄";
                            default -> "不领取";
                        },
                        "id",
                        r.invitationId());
        var matcher = TOKEN.matcher(text);
        String residue = matcher.replaceAll("");
        if (residue.contains("{{") || residue.contains("}}"))
            throw BusinessException.field(field, "模板变量格式不完整");
        matcher.reset();
        var result = new StringBuilder();
        while (matcher.find()) {
            String value = values.get(matcher.group(1));
            if (value == null) throw BusinessException.field(field, "未知模板变量：" + matcher.group(1));
            matcher.appendReplacement(result, java.util.regex.Matcher.quoteReplacement(value));
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
