package com.sipc115.birthday.media.mapper;

import com.sipc115.birthday.media.entity.MediaImageEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MediaImageMapper {
    MediaImageEntity findUpload(@org.apache.ibatis.annotations.Param("requestId") String requestId, @org.apache.ibatis.annotations.Param("sub") String sub, @org.apache.ibatis.annotations.Param("ownerHash") String ownerHash);
    int insert(MediaImageEntity image);

    List<MediaImageEntity> selectByIds(@Param("ids") List<String> ids);

    List<MediaImageEntity> lockByIds(@Param("ids") List<String> ids);
}
