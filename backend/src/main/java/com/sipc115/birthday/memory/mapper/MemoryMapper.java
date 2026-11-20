package com.sipc115.birthday.memory.mapper;

import com.sipc115.birthday.memory.entity.MemoryEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MemoryMapper {
    MemoryEntity findSubmission(@Param("submissionId") String id);

    MemoryEntity findById(@Param("id") long id);

    int insert(MemoryEntity entity);

    long count();

    List<MemoryEntity> page(@Param("offset") long offset, @Param("limit") int limit);
}
