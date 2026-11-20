package com.sipc115.birthday.honor.mapper;

import com.sipc115.birthday.honor.entity.HonorImageEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface HonorImageMapper {
    int insertBatch(@Param("rows") List<HonorImageEntity> rows);

    List<HonorImageEntity> forParents(@Param("ids") List<Long> ids);

    int deleteForParent(@Param("id") long id);

    long claimed(@Param("ids") List<String> ids);
}
