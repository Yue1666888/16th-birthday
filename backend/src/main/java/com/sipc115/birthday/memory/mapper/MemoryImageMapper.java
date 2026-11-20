package com.sipc115.birthday.memory.mapper;

import com.sipc115.birthday.memory.entity.MemoryImageEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MemoryImageMapper {
    int insertBatch(@Param("rows") List<MemoryImageEntity> rows);

    List<MemoryImageEntity> forParents(@Param("ids") List<Long> ids);

    int deleteForParent(@Param("id") long id);

    long claimed(@Param("ids") List<String> ids);
}
