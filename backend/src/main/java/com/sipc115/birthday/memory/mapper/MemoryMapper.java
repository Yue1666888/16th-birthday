package com.sipc115.birthday.memory.mapper;

import com.sipc115.birthday.memory.entity.MemoryEntity;
import com.sipc115.birthday.memory.model.MemoryNameCount;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MemoryMapper {
    MemoryEntity findSubmission(@Param("submissionId") String id);

    MemoryEntity findById(@Param("id") long id);

    int insert(MemoryEntity entity);
    MemoryEntity lock(@Param("id") long id);
    int updateByVersion(@Param("entity") MemoryEntity entity, @Param("expected") long expected);
    int deleteByVersion(@Param("entity") MemoryEntity entity, @Param("expected") long expected);
    long adminCount(@Param("keyword") String keyword);
    List<MemoryEntity> adminPage(@Param("keyword") String keyword, @Param("offset") long offset, @Param("limit") int limit);

    long count();

    List<MemoryNameCount> nameCounts();

    List<MemoryEntity> page(@Param("offset") long offset, @Param("limit") int limit);
}
