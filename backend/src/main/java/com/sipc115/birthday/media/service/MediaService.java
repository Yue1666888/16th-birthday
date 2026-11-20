package com.sipc115.birthday.media.service;

import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.media.assembler.MediaAssembler;
import com.sipc115.birthday.media.client.FileApiClient;
import com.sipc115.birthday.media.entity.MediaImageEntity;
import com.sipc115.birthday.media.mapper.MediaImageMapper;
import com.sipc115.birthday.media.model.UploadOwner;
import com.sipc115.birthday.media.response.ImageResponse;
import com.sipc115.birthday.media.response.ImageUploadResponse;
import com.sipc115.birthday.media.validation.ImageUploadValidator;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class MediaService {
    private final MediaImageMapper mapper;
    private final FileApiClient upstream;
    private final ImageUploadValidator validator;
    private final Clock clock;

    public MediaService(
            MediaImageMapper mapper,
            FileApiClient upstream,
            ImageUploadValidator validator,
            Clock clock) {
        this.mapper = mapper;
        this.upstream = upstream;
        this.validator = validator;
        this.clock = clock;
    }

    public ImageUploadResponse upload(MultipartFile file, UploadOwner owner) {
        String mime = validator.validate(file);
        var result = upstream.upload(file);
        var entity = new MediaImageEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setUrl(result.url());
        entity.setOriginalName(result.originalName());
        entity.setUploadedName(result.uploadedName());
        entity.setSourceMimeType(mime);
        entity.setSourceSizeBytes(file.getSize());
        entity.setWidth(result.width());
        entity.setHeight(result.height());
        entity.setUploaderSub(owner.sub());
        entity.setUploadOwnerHash(owner.sessionHash());
        entity.setCreatedAt(LocalDateTime.now(clock));
        mapper.insert(entity);
        return MediaAssembler.uploaded(entity);
    }

    public void validateIds(List<String> ids, int minimum) {
        if (ids == null || ids.size() < minimum || ids.size() > 9) {
            throw new BusinessException(ErrorCode.IMAGE_COUNT_INVALID);
        }
        var unique = new HashSet<String>();
        for (int i = 0; i < ids.size(); i++) {
            RequestValues.uuid(ids.get(i), "imageIds[" + i + "]");
            if (!unique.add(ids.get(i))) {
                throw new BusinessException(ErrorCode.IMAGE_DUPLICATED);
            }
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void lockAndValidate(List<String> ids, UploadOwner owner, Set<String> existing) {
        if (ids.isEmpty()) {
            return;
        }
        var images = mapper.lockByIds(ids.stream().sorted().toList());
        if (images.size() != ids.size()) {
            throw new BusinessException(ErrorCode.IMAGE_NOT_FOUND);
        }
        for (var image : images) {
            boolean allowed =
                    existing.contains(image.getId())
                            || (owner.sub() != null && owner.sub().equals(image.getUploaderSub()))
                            || (owner.sessionHash() != null
                                    && owner.sessionHash().equals(image.getUploadOwnerHash()));
            if (!allowed) {
                throw new BusinessException(ErrorCode.IMAGE_ACCESS_DENIED);
            }
        }
    }

    public Map<String, ImageResponse> images(List<String> ids) {
        Map<String, ImageResponse> result = new HashMap<>();
        if (!ids.isEmpty()) {
            for (var image : mapper.selectByIds(ids.stream().distinct().toList())) {
                result.put(image.getId(), MediaAssembler.image(image));
            }
        }
        return result;
    }
}
