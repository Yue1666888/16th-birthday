package com.sipc115.birthday.email.task;

import com.sipc115.birthday.email.entity.EmailNotificationEntity;

public record LeasedEmailTask(EmailNotificationEntity notification, boolean previouslyUncertain) {}
