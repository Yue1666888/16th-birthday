package com.sipc115.birthday.media.controller;

import com.sipc115.birthday.common.api.BusinessCode;
import com.sipc115.birthday.common.api.CommonResponse;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.media.response.ImageUploadResponse;
import com.sipc115.birthday.media.service.MediaService;
import com.sipc115.birthday.media.service.UploadOwnershipService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

@RestController
public class MediaController {
    private final MediaService media;
    private final UploadOwnershipService owners;

    public MediaController(MediaService media, UploadOwnershipService owners) {
        this.media = media;
        this.owners = owners;
    }

    @PostMapping(value = "/api/v1/media/images", consumes = "multipart/form-data")
    public ResponseEntity<CommonResponse<ImageUploadResponse>> upload(
            @RequestPart("file") MultipartFile file,
            @RequestHeader(value="X-Upload-ID", required=false) String uploadId,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (request instanceof MultipartHttpServletRequest multipart
                && (multipart.getMultiFileMap().size() != 1
                        || multipart.getFiles("file").size() != 1)) {
            throw BusinessException.field("file", "每次只允许上传一张图片");
        }
        return CommonResponse.respond(
                BusinessCode.IMAGE_UPLOADED,
                media.upload(file, owners.resolveOrCreate(request, response), uploadId));
    }
}
