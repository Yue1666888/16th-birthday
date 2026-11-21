package com.sipc115.birthday.mail.mapper;

import com.sipc115.birthday.email.entity.EmailNotificationEntity;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MailHistoryRow extends EmailNotificationEntity {
    private String recipientName;
}
