package com.sipc115.birthday.invitation.entity;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InvitationEntity {
    private Long id;
    private String name;
    private String phone;
    private String email;
    private String attendance;
    private String giftChoice;
    private String mailingAddress;
    private Long version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
