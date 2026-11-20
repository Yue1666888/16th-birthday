package com.sipc115.birthday.invitation.mapper;

import com.sipc115.birthday.invitation.entity.InvitationEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface InvitationMapper {
    InvitationEntity findByPhoneForUpdate(@Param("phone") String phone);
    int insert(InvitationEntity entity);
    int updateByVersion(@Param("entity") InvitationEntity entity, @Param("expectedVersion") long expectedVersion);
}
