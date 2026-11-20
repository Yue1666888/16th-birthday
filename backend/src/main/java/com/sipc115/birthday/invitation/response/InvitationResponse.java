package com.sipc115.birthday.invitation.response;
public record InvitationResponse(String id, String name, String phone, String email,
        String attendance, String giftChoice, String mailingAddress, String version,
        String emailNotifyStatus, String emailNotifiedAt, String createdAt, String updatedAt) {}
