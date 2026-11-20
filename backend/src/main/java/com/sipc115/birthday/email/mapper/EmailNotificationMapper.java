package com.sipc115.birthday.email.mapper;

import com.sipc115.birthday.email.entity.EmailNotificationEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface EmailNotificationMapper {
    int insert(EmailNotificationEntity e);

    EmailNotificationEntity get(@Param("id") long id);

    EmailNotificationEntity active(
            @Param("invitationId") long id, @Param("invitationVersion") long version);

    int nextSendNo(@Param("invitationId") long id, @Param("invitationVersion") long version);

    List<EmailNotificationEntity> history(
            @Param("invitationId") long id,
            @Param("invitationVersion") Long version,
            @Param("offset") long offset,
            @Param("limit") int limit);

    long count(@Param("invitationId") long id, @Param("invitationVersion") Long version);

    List<EmailNotificationEntity> due(@Param("now") LocalDateTime now, @Param("limit") int limit);

    int beginSubmit(@Param("e") EmailNotificationEntity e, @Param("now") LocalDateTime now);

    int claim(EmailNotificationEntity e);

    int finish(@Param("e") EmailNotificationEntity e, @Param("now") LocalDateTime now);

    Long invitationVersion(@Param("id") long id);
}
