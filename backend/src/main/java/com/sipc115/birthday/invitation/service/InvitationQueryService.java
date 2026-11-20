package com.sipc115.birthday.invitation.service;

import com.sipc115.birthday.common.api.PageResponse;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.invitation.assembler.InvitationAssembler;
import com.sipc115.birthday.invitation.export.InvitationCsvWriter;
import com.sipc115.birthday.invitation.mapper.InvitationMapper;
import com.sipc115.birthday.invitation.response.InvitationResponse;
import com.sipc115.birthday.invitation.response.InvitationStatsResponse;
import java.io.IOException;
import java.io.Writer;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class InvitationQueryService {
    private final InvitationMapper mapper;
    public InvitationQueryService(InvitationMapper mapper) { this.mapper = mapper; }

    public PageResponse<InvitationResponse> page(String attendance, String gift, String keyword, int page, int size) {
        RequestValues.page(page, size, 100);
        var filter = filters(attendance, gift, keyword);
        long total = mapper.count(filter);
        var rows = mapper.page(filter, (page - 1L) * size, size);
        return PageResponse.of(rows.stream().map(InvitationAssembler::response).toList(), page, size, total);
    }
    public InvitationStatsResponse stats() { return InvitationAssembler.stats(mapper.stats()); }

    public void export(String attendance, String gift, String keyword, Writer writer) throws IOException {
        var filter = filters(attendance, gift, keyword);
        long offset = 0;
        var rows = mapper.page(filter, offset, 100);
        InvitationCsvWriter.header(writer);
        while (!rows.isEmpty()) {
            for (var row : rows) { InvitationCsvWriter.row(writer, InvitationAssembler.response(row)); }
            offset += rows.size();
            if (rows.size() < 100) { break; }
            rows = mapper.page(filter, offset, 100);
        }
        writer.flush();
    }

    private Map<String, Object> filters(String attendance, String gift, String keyword) {
        if (attendance != null && !Set.of("ATTENDING", "NOT_ATTENDING").contains(attendance)) {
            throw BusinessException.field("attendance", "到场筛选不合法");
        }
        if (gift != null && !Set.of("NONE", "PICKUP", "MAIL").contains(gift)) {
            throw BusinessException.field("giftChoice", "礼物筛选不合法");
        }
        String normalized = RequestValues.text(keyword, 100, "keyword", false);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("attendance", attendance);
        result.put("giftChoice", gift);
        result.put("keyword", normalized == null ? null :
                "%" + normalized.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
        return result;
    }
}
