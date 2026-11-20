package com.sipc115.birthday.honor.mapper;

import com.sipc115.birthday.honor.entity.HonorEntryEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface HonorEntryMapper {
    int insert(HonorEntryEntity entity);

    HonorEntryEntity find(@Param("id") long id);

    HonorEntryEntity lock(@Param("id") long id);

    int updateByVersion(@Param("entity") HonorEntryEntity entity, @Param("expected") long expected);

    int deleteByVersion(@Param("entity") HonorEntryEntity entity, @Param("expected") long expected);

    long count();

    List<HonorEntryEntity> publicPage(@Param("offset") long offset, @Param("limit") int limit);

    List<HonorEntryEntity> adminPage(@Param("offset") long offset, @Param("limit") int limit);
}
