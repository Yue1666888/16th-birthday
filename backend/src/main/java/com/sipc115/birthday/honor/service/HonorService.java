package com.sipc115.birthday.honor.service;

import com.sipc115.birthday.audit.enums.AdminOperationCode;
import com.sipc115.birthday.audit.service.AuditLogService;
import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.*;
import com.sipc115.birthday.honor.entity.*;
import com.sipc115.birthday.honor.mapper.*;
import com.sipc115.birthday.honor.request.*;
import com.sipc115.birthday.honor.response.*;
import com.sipc115.birthday.idempotency.service.IdempotencyService;
import com.sipc115.birthday.media.model.UploadOwner;
import com.sipc115.birthday.media.response.ImageResponse;
import com.sipc115.birthday.media.service.MediaService;
import com.sipc115.birthday.security.CurrentUserProvider;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class HonorService {
    private final HonorEntryMapper mapper;
    private final HonorImageMapper links;
    private final MediaService media;
    private final IdempotencyService idempotency;
    private final AuditLogService audit;
    private final CurrentUserProvider users;
    private final Clock clock;

    public HonorService(
            HonorEntryMapper mapper,
            HonorImageMapper links,
            MediaService media,
            IdempotencyService idempotency,
            AuditLogService audit,
            CurrentUserProvider users,
            Clock clock) {
        this.mapper = mapper;
        this.links = links;
        this.media = media;
        this.idempotency = idempotency;
        this.audit = audit;
        this.users = users;
        this.clock = clock;
    }

    @Transactional
    public CommandResult<HonorAdminResponse> create(HonorCreateRequest request, UploadOwner owner) {
        String title = RequestValues.text(request.title(), 100, "title", true);
        String people = RequestValues.text(request.people(), 200, "people", true);
        media.validateIds(request.imageIds(), 1);
        List<String> ids = List.copyOf(request.imageIds());
        return idempotency.execute(
                AdminOperationCode.HONOR_CREATE,
                request.requestId(),
                Map.of("title", title, "people", people, "imageIds", ids),
                HonorAdminResponse.class,
                () -> {
                    media.lockAndValidate(ids, owner, Set.of());
                    var entity = new HonorEntryEntity();
                    entity.setTitle(title);
                    entity.setPeople(people);
                    entity.setVersion(1L);
                    entity.setCreatedBySub(users.required().sub());
                    entity.setUpdatedBySub(users.required().sub());
                    entity.setCreatedAt(LocalDateTime.now(clock));
                    entity.setUpdatedAt(entity.getCreatedAt());
                    mapper.insert(entity);
                    saveImages(entity.getId(), ids);
                    audit.record(
                            AdminOperationCode.HONOR_CREATE,
                            "HONOR",
                            entity.getId().toString(),
                            request.requestId(),
                            Map.of("version", 1));
                    return new CommandResult<>(BusinessCode.HONOR_CREATED, admin(entity), false);
                });
    }

    @Transactional
    public CommandResult<HonorAdminResponse> update(
            long id, HonorPatchRequest request, UploadOwner owner) {
        long expected = RequestValues.version(request.getExpectedVersion());
        if (request.getChanges().isEmpty()) {
            throw BusinessException.field("$", "请至少修改一个字段");
        }
        return idempotency.execute(
                AdminOperationCode.HONOR_UPDATE,
                request.getRequestId(),
                Map.of(
                        "id",
                        id,
                        "expectedVersion",
                        request.getExpectedVersion(),
                        "changes",
                        request.getChanges()),
                HonorAdminResponse.class,
                () -> {
                    var entity = requireLocked(id, expected);
                    var oldIds =
                            links.forParents(List.of(id)).stream()
                                    .map(HonorImageEntity::getImageId)
                                    .toList();
                    String title =
                            request.getChanges().containsKey("title")
                                    ? RequestValues.text(request.getTitle(), 100, "title", true)
                                    : entity.getTitle();
                    String people =
                            request.getChanges().containsKey("people")
                                    ? RequestValues.text(request.getPeople(), 200, "people", true)
                                    : entity.getPeople();
                    List<String> ids = oldIds;
                    if (request.getChanges().containsKey("imageIds")) {
                        if (request.getImageIds() == null) {
                            throw BusinessException.field("imageIds", "图片数组不能为null");
                        }
                        media.validateIds(request.getImageIds(), 1);
                        ids = List.copyOf(request.getImageIds());
                    }
                    media.lockAndValidate(ids, owner, new HashSet<>(oldIds));
                    if (!title.equals(entity.getTitle())
                            || !people.equals(entity.getPeople())
                            || !ids.equals(oldIds)) {
                        entity.setTitle(title);
                        entity.setPeople(people);
                        entity.setVersion(expected + 1);
                        entity.setUpdatedBySub(users.required().sub());
                        entity.setUpdatedAt(LocalDateTime.now(clock));
                        if (mapper.updateByVersion(entity, expected) != 1) {
                            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
                        }
                        links.deleteForParent(id);
                        saveImages(id, ids);
                    }
                    audit.record(
                            AdminOperationCode.HONOR_UPDATE,
                            "HONOR",
                            Long.toString(id),
                            request.getRequestId(),
                            Map.of("version", entity.getVersion()));
                    return new CommandResult<>(BusinessCode.HONOR_UPDATED, admin(entity), false);
                });
    }

    @Transactional
    public CommandResult<HonorDeleteResponse> delete(
            long id, String expectedVersion, String requestId) {
        long expected = RequestValues.version(expectedVersion);
        return idempotency.execute(
                AdminOperationCode.HONOR_DELETE,
                requestId,
                Map.of("id", id, "expectedVersion", expectedVersion),
                HonorDeleteResponse.class,
                () -> {
                    var entity = requireLocked(id, expected);
                    entity.setVersion(expected + 1);
                    entity.setUpdatedBySub(users.required().sub());
                    entity.setDeletedAt(LocalDateTime.now(clock));
                    entity.setUpdatedAt(entity.getDeletedAt());
                    if (mapper.deleteByVersion(entity, expected) != 1) {
                        throw new BusinessException(ErrorCode.VERSION_CONFLICT);
                    }
                    audit.record(
                            AdminOperationCode.HONOR_DELETE,
                            "HONOR",
                            Long.toString(id),
                            requestId,
                            Map.of("deleted", true));
                    return new CommandResult<>(
                            BusinessCode.HONOR_DELETED,
                            new HonorDeleteResponse(
                                    Long.toString(id),
                                    true,
                                    entity.getVersion().toString(),
                                    ApiTime.format(entity.getDeletedAt())),
                            false);
                });
    }

    private HonorEntryEntity requireLocked(long id, long expected) {
        var entity = mapper.lock(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.HONOR_NOT_FOUND);
        }
        if (entity.getVersion() != expected) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        return entity;
    }

    private void saveImages(long id, List<String> ids) {
        var rows = new ArrayList<HonorImageEntity>();
        for (int i = 0; i < ids.size(); i++) {
            var row = new HonorImageEntity();
            row.setHonorId(id);
            row.setImageId(ids.get(i));
            row.setPosition(i + 1);
            rows.add(row);
        }
        links.insertBatch(rows);
    }

    private Map<Long, List<ImageResponse>> images(List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        var rows = links.forParents(ids);
        var pictures = media.images(rows.stream().map(HonorImageEntity::getImageId).toList());
        Map<Long, List<ImageResponse>> result = new HashMap<>();
        for (var row : rows) {
            result.computeIfAbsent(row.getHonorId(), ignored -> new ArrayList<>())
                    .add(pictures.get(row.getImageId()));
        }
        return result;
    }

    private HonorAdminResponse admin(HonorEntryEntity entry) {
        return admin(entry, images(List.of(entry.getId())).getOrDefault(entry.getId(), List.of()));
    }

    private HonorAdminResponse admin(HonorEntryEntity entry, List<ImageResponse> pictures) {
        return new HonorAdminResponse(
                entry.getId().toString(),
                entry.getTitle(),
                entry.getPeople(),
                pictures,
                entry.getVersion().toString(),
                ApiTime.format(entry.getCreatedAt()),
                ApiTime.format(entry.getUpdatedAt()));
    }

    @Transactional(readOnly = true)
    public HonorAdminResponse detail(long id) {
        var entity = mapper.find(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.HONOR_NOT_FOUND);
        }
        return admin(entity);
    }

    @Transactional(readOnly = true)
    public PageResponse<HonorAdminResponse> adminPage(int page, int size) {
        RequestValues.page(page, size, 100);
        var entries = mapper.adminPage((page - 1L) * size, size);
        var pictures = images(entries.stream().map(HonorEntryEntity::getId).toList());
        return PageResponse.of(
                entries.stream()
                        .map(e -> admin(e, pictures.getOrDefault(e.getId(), List.of())))
                        .toList(),
                page,
                size,
                mapper.count());
    }

    @Transactional(readOnly = true)
    public PageResponse<HonorResponse> page(int page, int size) {
        RequestValues.page(page, size, 50);
        var entries = mapper.publicPage((page - 1L) * size, size);
        var pictures = images(entries.stream().map(HonorEntryEntity::getId).toList());
        return PageResponse.of(
                entries.stream()
                        .map(
                                e ->
                                        new HonorResponse(
                                                e.getId().toString(),
                                                e.getTitle(),
                                                e.getPeople(),
                                                pictures.getOrDefault(e.getId(), List.of())))
                        .toList(),
                page,
                size,
                mapper.count());
    }
}
