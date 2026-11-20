package com.sipc115.birthday.invitation.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record InvitationSubmitRequest(
        @NotBlank(message = "请填写姓名") String name,
        @NotBlank(message = "请填写手机号")
        @Pattern(regexp = "^1[3-9][0-9]{9}$", message = "请输入11位大陆手机号") String phone,
        @NotBlank(message = "请填写邮箱") @Email(message = "请输入有效邮箱") String email,
        @NotBlank(message = "请选择是否到场")
        @Pattern(regexp = "ATTENDING|NOT_ATTENDING", message = "到场选择不合法") String attendance,
        @NotBlank(message = "请选择礼物领取方式")
        @Pattern(regexp = "NONE|PICKUP|MAIL", message = "礼物选择不合法") String giftChoice,
        String mailingAddress) {

    public InvitationSubmitRequest {
        name = trim(name);
        phone = trim(phone);
        email = trim(email);
        mailingAddress = trim(mailingAddress);
        if (mailingAddress != null && mailingAddress.isEmpty()) {
            mailingAddress = null;
        }
    }

    private static String trim(String value) {
        return value == null ? null : value.strip();
    }
}
