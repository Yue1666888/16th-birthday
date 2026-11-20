package com.sipc115.birthday.audit.mapper;
import com.sipc115.birthday.audit.entity.AdminOperationLogEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface AdminOperationLogMapper {
    int insert(AdminOperationLogEntity entity);
}
