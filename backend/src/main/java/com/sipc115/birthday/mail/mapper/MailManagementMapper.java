package com.sipc115.birthday.mail.mapper;

import com.sipc115.birthday.mail.entity.*;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface MailManagementMapper {
    int insertSelection(MailSnapshotEntity e);

    int insertPreview(MailSnapshotEntity e);

    MailSnapshotEntity selection(@Param("id") String id);

    MailSnapshotEntity preview(@Param("id") String id);

    MailSnapshotEntity lockPreview(@Param("id") String id);

    int insertBatch(MailBatchEntity e);

    MailBatchEntity batch(@Param("id") long id);

    MailBatchEntity batchByPreview(@Param("id") String id);

    List<Map<String, Object>> batchCounts(@Param("id") long id);

    List<MailHistoryRow> history(
            @Param("filter") Map<String, Object> filter,
            @Param("offset") long offset,
            @Param("limit") int limit);

    long historyCount(@Param("filter") Map<String, Object> filter);

    MailHistoryRow send(@Param("id") long id);
}
