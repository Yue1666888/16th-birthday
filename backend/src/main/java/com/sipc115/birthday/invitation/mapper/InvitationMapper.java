package com.sipc115.birthday.invitation.mapper;

import com.sipc115.birthday.invitation.entity.InvitationEntity;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface InvitationMapper {
    InvitationEntity findByPhoneForUpdate(@Param("phone") String phone);
    InvitationEntity findByIdForUpdate(@Param("id") long id);
    InvitationSummaryRow summary(@Param("id") long id);
    List<InvitationSummaryRow> page(@Param("filter") Map<String, Object> filter,
            @Param("offset") long offset, @Param("limit") int limit);
    long count(@Param("filter") Map<String, Object> filter);
    InvitationStatsRow stats();
    int insert(InvitationEntity entity);
    int updateByVersion(@Param("entity") InvitationEntity entity, @Param("expectedVersion") long expectedVersion);
}
