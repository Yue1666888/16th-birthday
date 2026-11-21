package com.sipc115.birthday.invitation.service;

import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.RequestValues;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public final class InvitationFilters {
    private InvitationFilters() {}

    public static Map<String, Object> of(
            String attendance, String gift, String keyword, String emailStatus) {
        if (attendance != null && !Set.of("ATTENDING", "NOT_ATTENDING").contains(attendance))
            throw BusinessException.field("attendance", "到场筛选不合法");
        if (gift != null && !Set.of("NONE", "PICKUP", "MAIL").contains(gift))
            throw BusinessException.field("giftChoice", "礼物筛选不合法");
        if (emailStatus != null
                && !Set.of("NOT_SENT", "PENDING", "SUCCESS", "FAILED", "DISABLED")
                        .contains(emailStatus))
            throw BusinessException.field("emailNotifyStatus", "邮件状态不合法");
        String normalized = RequestValues.text(keyword, 100, "keyword", false);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("attendance", attendance);
        result.put("giftChoice", gift);
        result.put("emailNotifyStatus", emailStatus);
        result.put(
                "keyword",
                normalized == null
                        ? null
                        : "%"
                                + normalized
                                        .replace("!", "!!")
                                        .replace("%", "!%")
                                        .replace("_", "!_")
                                + "%");
        return result;
    }
}
