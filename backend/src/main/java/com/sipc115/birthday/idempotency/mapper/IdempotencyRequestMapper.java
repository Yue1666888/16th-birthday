package com.sipc115.birthday.idempotency.mapper;
import com.sipc115.birthday.idempotency.entity.IdempotencyRequestEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface IdempotencyRequestMapper {
    int insertOrGet(IdempotencyRequestEntity entity);
    IdempotencyRequestEntity lock(IdempotencyRequestEntity key);
    int complete(IdempotencyRequestEntity entity);
}
