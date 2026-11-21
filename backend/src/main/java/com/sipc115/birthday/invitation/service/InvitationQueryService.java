package com.sipc115.birthday.invitation.service;

import com.sipc115.birthday.common.api.PageResponse;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.invitation.assembler.InvitationAssembler;
import com.sipc115.birthday.invitation.export.InvitationCsvWriter;
import com.sipc115.birthday.invitation.mapper.InvitationMapper;
import com.sipc115.birthday.invitation.response.InvitationResponse;
import com.sipc115.birthday.invitation.response.InvitationStatsResponse;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.Writer;

@Service
@Transactional(readOnly = true)
public class InvitationQueryService {
    private final InvitationMapper mapper;

    public InvitationQueryService(InvitationMapper mapper) {
        this.mapper = mapper;
    }

    public PageResponse<InvitationResponse> page(
            String attendance, String gift, String keyword, int page, int size) {
        return page(attendance, gift, keyword, null, page, size);
    }

    public PageResponse<InvitationResponse> page(
            String attendance,
            String gift,
            String keyword,
            String emailNotifyStatus,
            int page,
            int size) {
        RequestValues.page(page, size, 100);
        var filter = InvitationFilters.of(attendance, gift, keyword, emailNotifyStatus);
        long total = mapper.count(filter);
        var rows = mapper.page(filter, (page - 1L) * size, size);
        return PageResponse.of(
                rows.stream().map(InvitationAssembler::response).toList(), page, size, total);
    }

    public InvitationStatsResponse stats() {
        return InvitationAssembler.stats(mapper.stats());
    }

    public InvitationResponse detail(long id) {
        var row = mapper.summary(id);
        if (row == null)
            throw new com.sipc115.birthday.common.exceptions.BusinessException(
                    com.sipc115.birthday.common.api.ErrorCode.INVITATION_NOT_FOUND);
        return InvitationAssembler.response(row);
    }

    public void export(String attendance, String gift, String keyword, Writer writer)
            throws IOException {
        export(attendance, gift, keyword, null, writer);
    }

    public void export(
            String attendance, String gift, String keyword, String emailNotifyStatus, Writer writer)
            throws IOException {
        var filter = InvitationFilters.of(attendance, gift, keyword, emailNotifyStatus);
        long offset = 0;
        var rows = mapper.page(filter, offset, 100);
        InvitationCsvWriter.header(writer);
        while (!rows.isEmpty()) {
            for (var row : rows) {
                InvitationCsvWriter.row(writer, InvitationAssembler.response(row));
            }
            offset += rows.size();
            if (rows.size() < 100) {
                break;
            }
            rows = mapper.page(filter, offset, 100);
        }
        writer.flush();
    }
}
