package com.sipc115.birthday.media.validation;

import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class ImageUploadValidator {
    public String validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException(ErrorCode.IMAGE_EMPTY);
        }
        if (file.getSize() > 10485760) {
            throw new BusinessException(ErrorCode.IMAGE_FILE_TOO_LARGE);
        }
        try (var input = file.getInputStream()) {
            byte[] header = input.readNBytes(12);
            if (header.length >= 3
                    && (header[0] & 255) == 255
                    && (header[1] & 255) == 216
                    && (header[2] & 255) == 255) {
                return "image/jpeg";
            }
            if (header.length >= 8
                    && java.util.Arrays.equals(
                            java.util.Arrays.copyOf(header, 8),
                            new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10})) {
                return "image/png";
            }
            String prefix = new String(header, StandardCharsets.ISO_8859_1);
            if (prefix.startsWith("GIF87a") || prefix.startsWith("GIF89a")) {
                return "image/gif";
            }
            if (header.length == 12
                    && prefix.startsWith("RIFF")
                    && prefix.substring(8).equals("WEBP")) {
                return "image/webp";
            }
            throw new BusinessException(ErrorCode.IMAGE_TYPE_UNSUPPORTED);
        } catch (IOException ex) {
            throw new BusinessException(ErrorCode.IMAGE_INVALID);
        }
    }
}
