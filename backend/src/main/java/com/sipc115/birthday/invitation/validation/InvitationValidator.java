package com.sipc115.birthday.invitation.validation;

import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.invitation.enums.Attendance;
import com.sipc115.birthday.invitation.enums.GiftChoice;
import com.sipc115.birthday.invitation.request.InvitationSubmitRequest;
import org.springframework.stereotype.Component;

@Component
public class InvitationValidator {
    public void validate(InvitationSubmitRequest request) {
        requireText(request.name(), 50, "name");
        requireText(request.email(), 254, "email");
        if (!request.email().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw BusinessException.field("email", "请输入有效邮箱");
        }
        if (request.phone() == null || !request.phone().matches("^1[3-9][0-9]{9}$")) {
            throw BusinessException.field("phone", "请输入11位大陆手机号");
        }
        Attendance attendance;
        GiftChoice gift;
        try {
            attendance = Attendance.valueOf(request.attendance());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw BusinessException.field("attendance", "到场选择不合法");
        }
        try {
            gift = GiftChoice.valueOf(request.giftChoice());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw BusinessException.field("giftChoice", "礼物选择不合法");
        }
        if (gift == GiftChoice.PICKUP && attendance != Attendance.ATTENDING) {
            throw BusinessException.field("giftChoice", "不到场时请选择不需要或邮寄");
        }
        if (gift == GiftChoice.MAIL) {
            requireText(request.mailingAddress(), 500, "mailingAddress");
        } else if (request.mailingAddress() != null) {
            throw BusinessException.field("mailingAddress", "非邮寄方式请清空邮寄地址");
        }
    }

    private static void requireText(String value, int maximum, String field) {
        if (value == null || value.isBlank()) {
            throw BusinessException.field(field, "该字段不能为空");
        }
        if (value.codePointCount(0, value.length()) > maximum) {
            throw BusinessException.field(field, "字段长度不能超过" + maximum + "字");
        }
    }
}
