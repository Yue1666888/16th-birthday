package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;

import com.sipc115.birthday.common.api.BusinessCode;
import com.sipc115.birthday.common.api.CommonResponse;
import com.sipc115.birthday.common.api.PageResponse;
import com.sipc115.birthday.config.JacksonConfig;
import com.sipc115.birthday.invitation.request.InvitationSubmitRequest;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class CommonResponseTest {
    private final JsonMapper mapper = mapper();

    private static JsonMapper mapper() {
        var builder = JsonMapper.builder();
        new JacksonConfig().strictJson().customize(builder);
        return builder.build();
    }

    @Test
    void keepsExactlyTheFiveEnvelopeFields() {
        Map<?, ?> value = mapper.readValue(mapper.writeValueAsString(
                CommonResponse.success(BusinessCode.OK, Map.of("id", "1024"))), Map.class);
        assertEquals(Set.of("code", "message", "data", "fieldErrors", "traceId"), value.keySet());
        assertEquals("1024", ((Map<?, ?>) value.get("data")).get("id"));
    }

    @Test
    void keepsPaginationCountersNumeric() {
        var page = PageResponse.of(List.of(), 3, 20, 0);
        Map<?, ?> value = mapper.readValue(mapper.writeValueAsString(page), Map.class);
        assertEquals(3, value.get("page"));
        assertEquals(0, value.get("totalPages"));
        assertTrue(value.get("totalElements") instanceof Number);
    }

    @Test
    void rejectsNumericPhoneCoercion() {
        assertThrows(Exception.class, () -> mapper.readValue(
                "{\"name\":\"张三\",\"phone\":13800138000}", InvitationSubmitRequest.class));
    }

    @Test
    void rejectsUnknownRequestFields() {
        assertThrows(Exception.class, () -> mapper.readValue(
                "{\"unexpected\":true}", InvitationSubmitRequest.class));
    }
}
