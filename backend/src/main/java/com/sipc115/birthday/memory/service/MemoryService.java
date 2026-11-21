package com.sipc115.birthday.memory.service;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.*;
import com.sipc115.birthday.common.utils.ApiTime;
import com.sipc115.birthday.media.model.UploadOwner;
import com.sipc115.birthday.media.response.ImageResponse;
import com.sipc115.birthday.media.service.MediaService;
import com.sipc115.birthday.memory.entity.*;
import com.sipc115.birthday.memory.mapper.*;
import com.sipc115.birthday.memory.request.MemorySubmitRequest;
import com.sipc115.birthday.memory.response.*;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.util.*;

@Service
public class MemoryService {
    private final MemoryMapper mapper;
    private final MemoryImageMapper links;
    private final MediaService media;
    private final RequestFingerprint hashes;
    private final Clock clock;
    private final TransactionTemplate transactions;

    public MemoryService(
            MemoryMapper mapper,
            MemoryImageMapper links,
            MediaService media,
            RequestFingerprint hashes,
            Clock clock,
            PlatformTransactionManager manager) {
        this.mapper = mapper;
        this.links = links;
        this.media = media;
        this.hashes = hashes;
        this.clock = clock;
        this.transactions = new TransactionTemplate(manager);
    }

    public CommandResult<MemoryDetailResponse> publish(
            MemorySubmitRequest request, UploadOwner owner) {
        RequestValues.uuid(request.getSubmissionId(), "submissionId");
        String name = RequestValues.text(request.getDisplayName(), 50, "displayName", false);
        String title = RequestValues.text(request.getTitle(), 100, "title", false);
        String content = RequestValues.text(request.getContent(), 5000, "content", false);
        if (request.getImageIds() == null) {
            throw BusinessException.field("imageIds", "图片数组不能为null");
        }
        media.validateIds(request.getImageIds(), 0);
        List<String> ids = List.copyOf(request.getImageIds());
        if (content == null && ids.isEmpty()) {
            throw new BusinessException(ErrorCode.MEMORY_CONTENT_REQUIRED);
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("displayName", name);
        payload.put("title", title);
        payload.put("content", content);
        payload.put("imageIds", ids);
        String hash = hashes.hash(payload);
        try {
            return Objects.requireNonNull(
                    transactions.execute(
                            tx -> {
                                var existing = mapper.findSubmission(request.getSubmissionId());
                                if (existing != null) {
                                    return replay(existing, hash);
                                }
                                media.lockAndValidate(ids, owner, Set.of());
                                if (!ids.isEmpty() && links.claimed(ids) > 0) {
                                    throw new BusinessException(ErrorCode.IMAGE_ALREADY_USED);
                                }
                                var entry = new MemoryEntity();
                                entry.setSubmissionId(request.getSubmissionId());
                                entry.setSubmissionHash(hash);
                                entry.setDisplayName(name);
                                entry.setTitle(title);
                                entry.setContent(content);
                                entry.setPublishedAt(ApiTime.now(clock));
                                mapper.insert(entry);
                                if (!ids.isEmpty()) {
                                    List<MemoryImageEntity> rows = new ArrayList<>();
                                    for (int i = 0; i < ids.size(); i++) {
                                        var row = new MemoryImageEntity();
                                        row.setMemoryId(entry.getId());
                                        row.setImageId(ids.get(i));
                                        row.setPosition(i + 1);
                                        rows.add(row);
                                    }
                                    links.insertBatch(rows);
                                }
                                return new CommandResult<>(
                                        BusinessCode.MEMORY_CREATED, detailEntity(entry), false);
                            }));
        } catch (DuplicateKeyException ex) {
            var existing = mapper.findSubmission(request.getSubmissionId());
            if (existing != null) {
                return replay(existing, hash);
            }
            throw new BusinessException(ErrorCode.IMAGE_ALREADY_USED);
        }
    }

    private CommandResult<MemoryDetailResponse> replay(MemoryEntity entry, String hash) {
        if (!hash.equals(entry.getSubmissionHash())) {
            throw new BusinessException(ErrorCode.IDEMPOTENCY_CONFLICT);
        }
        return new CommandResult<>(BusinessCode.MEMORY_CREATED, detailEntity(entry), true);
    }

    @Transactional(readOnly = true)
    public PageResponse<MemorySummaryResponse> page(int page, int size) {
        RequestValues.page(page, size, 50);
        long total = mapper.count();
        var entries = mapper.page((page - 1L) * size, size);
        if (entries.isEmpty()) {
            return PageResponse.of(List.of(), page, size, total);
        }
        var mapping = imageMapping(entries.stream().map(MemoryEntity::getId).toList());
        List<MemorySummaryResponse> result = new ArrayList<>();
        for (var entry : entries) {
            var images = mapping.getOrDefault(entry.getId(), List.of());
            String content = entry.getContent();
            String excerpt =
                    content == null
                            ? null
                            : content.substring(
                                    0,
                                    content.offsetByCodePoints(
                                            0,
                                            Math.min(
                                                    120,
                                                    content.codePointCount(0, content.length()))));
            result.add(
                    new MemorySummaryResponse(
                            entry.getId().toString(),
                            entry.getDisplayName(),
                            entry.getTitle(),
                            excerpt,
                            images.isEmpty() ? null : images.getFirst(),
                            images.size(),
                            ApiTime.format(entry.getPublishedAt())));
        }
        return PageResponse.of(result, page, size, total);
    }

    @Transactional(readOnly = true)
    public MemoryNameWallResponse nameWall() {
        long total = mapper.count();
        if (total == 0) {
            return new MemoryNameWallResponse(0, 0, List.of());
        }
        var counts = mapper.nameCounts();
        long named = counts.stream().mapToLong(entry -> entry.getSubmissionCount()).sum();
        var names = counts.stream()
                .map(entry -> new MemoryNameWallResponse.Name(
                        entry.getName(), entry.getSubmissionCount(), (double) entry.getSubmissionCount() / total))
                .toList();
        return new MemoryNameWallResponse(total, named, names);
    }

    @Transactional(readOnly = true)
    public MemoryDetailResponse detail(long id) {
        var entry = mapper.findById(id);
        if (entry == null) {
            throw new BusinessException(ErrorCode.MEMORY_NOT_FOUND);
        }
        return detailEntity(entry);
    }

    private MemoryDetailResponse detailEntity(MemoryEntity entry) {
        return new MemoryDetailResponse(
                entry.getId().toString(),
                entry.getDisplayName(),
                entry.getTitle(),
                entry.getContent(),
                imageMapping(List.of(entry.getId())).getOrDefault(entry.getId(), List.of()),
                ApiTime.format(entry.getPublishedAt()));
    }

    private Map<Long, List<ImageResponse>> imageMapping(List<Long> ids) {
        var rows = links.forParents(ids);
        var images = media.images(rows.stream().map(MemoryImageEntity::getImageId).toList());
        Map<Long, List<ImageResponse>> result = new HashMap<>();
        for (var row : rows) {
            result.computeIfAbsent(row.getMemoryId(), ignored -> new ArrayList<>())
                    .add(images.get(row.getImageId()));
        }
        return result;
    }
}
