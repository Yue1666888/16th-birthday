package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;

import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.invitation.request.InvitationSubmitRequest;
import com.sipc115.birthday.invitation.validation.InvitationValidator;
import org.junit.jupiter.api.Test;

class InvitationValidatorTest {
    private final InvitationValidator validator = new InvitationValidator();

    private InvitationSubmitRequest request(String name, String attendance, String gift, String address) {
        return new InvitationSubmitRequest(name, "13800138000", "test@example.com", attendance, gift, address);
    }

    @Test
    void acceptsPickupOnlyForAttending() {
        assertDoesNotThrow(() -> validator.validate(request("张三", "ATTENDING", "PICKUP", null)));
        BusinessException error = assertThrows(BusinessException.class,
                () -> validator.validate(request("张三", "NOT_ATTENDING", "PICKUP", null)));
        assertTrue(error.fieldErrors().containsKey("giftChoice"));
    }

    @Test
    void mailRequiresAddress() {
        BusinessException error = assertThrows(BusinessException.class,
                () -> validator.validate(request("张三", "NOT_ATTENDING", "MAIL", "  ")));
        assertTrue(error.fieldErrors().containsKey("mailingAddress"));
    }

    @Test
    void nonMailRejectsStoredAddress() {
        assertThrows(BusinessException.class,
                () -> validator.validate(request("张三", "ATTENDING", "NONE", "地址")));
    }

    @Test
    void countsUnicodeCodePoints() {
        assertDoesNotThrow(() -> validator.validate(request("😀".repeat(50), "ATTENDING", "NONE", null)));
        assertThrows(BusinessException.class,
                () -> validator.validate(request("😀".repeat(51), "ATTENDING", "NONE", null)));
    }

    @Test
    void acceptsOnlyMainlandMobilePhone() {
        var input = new InvitationSubmitRequest("张三", "+8613800138000", "test@example.com",
                "ATTENDING", "NONE", null);
        assertThrows(BusinessException.class, () -> validator.validate(input));
    }
}
