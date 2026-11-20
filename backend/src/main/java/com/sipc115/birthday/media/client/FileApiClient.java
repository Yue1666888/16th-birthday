package com.sipc115.birthday.media.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpTimeoutException;
import java.util.Map;

@Component
public class FileApiClient {
    public record Result(
            String url, String originalName, String uploadedName, Integer width, Integer height) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Reply(
            Boolean success,
            String url,
            String error,
            @JsonProperty("original_name") String originalName,
            @JsonProperty("uploaded_name") String uploadedName,
            Map<String, Object> data) {}

    private final RestClient client;
    private final JsonMapper json;
    private final String allowedHost;

    public FileApiClient(
            @Qualifier("fileRestClient") RestClient client,
            JsonMapper json,
            @Value("${FILE_IMAGE_HOST:image.sipc115.com}") String allowedHost) {
        this.client = client;
        this.json = json;
        this.allowedHost = allowedHost;
    }

    public Result upload(MultipartFile file) {
        String original = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename();
        original = original.replace('\\', '/');
        final String filename = original.substring(original.lastIndexOf('/') + 1);
        try (var input = file.getInputStream()) {
            var resource =
                    new InputStreamResource(input) {
                        @Override
                        public String getFilename() {
                            return filename;
                        }

                        @Override
                        public long contentLength() {
                            return file.getSize();
                        }
                    };
            var body = new LinkedMultiValueMap<String, Object>();
            body.add("file", resource);
            return client.post()
                    .uri("/api/v1/images")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .exchange(
                            (request, response) -> {
                                if (response.getStatusCode().value() == 413) {
                                    throw new BusinessException(ErrorCode.IMAGE_FILE_TOO_LARGE);
                                }
                                byte[] bytes = response.getBody().readNBytes(1048577);
                                if (bytes.length > 1048576) {
                                    throw new BusinessException(ErrorCode.IMAGE_SERVICE_ERROR);
                                }
                                Reply reply;
                                try {
                                    reply = json.readValue(bytes, Reply.class);
                                } catch (RuntimeException ex) {
                                    throw new BusinessException(ErrorCode.IMAGE_SERVICE_ERROR);
                                }
                                if (reply == null) {
                                    throw new BusinessException(ErrorCode.IMAGE_SERVICE_ERROR);
                                }
                                if (response.getStatusCode().isError()
                                        || !Boolean.TRUE.equals(reply.success())) {
                                    String message =
                                            reply.error() == null
                                                    ? ""
                                                    : reply.error().toLowerCase();
                                    if (response.getStatusCode().value() == 413) {
                                        throw new BusinessException(ErrorCode.IMAGE_FILE_TOO_LARGE);
                                    }
                                    if (message.contains("pixel")
                                            || message.contains("dimensions")) {
                                        throw new BusinessException(
                                                ErrorCode.IMAGE_DIMENSIONS_EXCEEDED);
                                    }
                                    if (response.getStatusCode().value() == 400) {
                                        throw new BusinessException(ErrorCode.IMAGE_INVALID);
                                    }
                                    throw new BusinessException(ErrorCode.IMAGE_SERVICE_ERROR);
                                }
                                try {
                                    URI uri = URI.create(reply.url());
                                    if (!"https".equals(uri.getScheme())
                                            || !allowedHost.equalsIgnoreCase(uri.getHost())) {
                                        throw new IllegalArgumentException();
                                    }
                                } catch (RuntimeException ex) {
                                    throw new BusinessException(ErrorCode.IMAGE_SERVICE_ERROR);
                                }
                                Map<?, ?> metadata = reply.data() == null ? Map.of() : reply.data();
                                if (metadata.get("data") instanceof Map<?, ?> nested) {
                                    metadata = nested;
                                }
                                Integer width = dimension(metadata.get("width"));
                                Integer height = dimension(metadata.get("height"));
                                if (width == null || height == null) {
                                    width = null;
                                    height = null;
                                }
                                return new Result(
                                        reply.url(),
                                        reply.originalName() == null
                                                ? filename
                                                : reply.originalName(),
                                        reply.uploadedName(),
                                        width,
                                        height);
                            });
        } catch (ResourceAccessException ex) {
            Throwable cause = ex;
            while (cause != null) {
                if (cause instanceof HttpTimeoutException
                        || cause instanceof java.net.SocketTimeoutException) {
                    throw new BusinessException(ErrorCode.IMAGE_SERVICE_TIMEOUT);
                }
                cause = cause.getCause();
            }
            throw new BusinessException(ErrorCode.IMAGE_SERVICE_UNAVAILABLE);
        } catch (IOException ex) {
            throw new BusinessException(ErrorCode.IMAGE_INVALID);
        }
    }

    private Integer dimension(Object value) {
        if (value instanceof Number number
                && number.longValue() > 0
                && number.longValue() <= Integer.MAX_VALUE) {
            return number.intValue();
        }
        return null;
    }
}
