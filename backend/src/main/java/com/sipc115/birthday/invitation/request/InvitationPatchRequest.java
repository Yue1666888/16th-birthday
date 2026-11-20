package com.sipc115.birthday.invitation.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;

@Getter
public class InvitationPatchRequest {
    private String requestId;
    private String expectedVersion;
    private String name;
    private String email;
    private String attendance;
    private String giftChoice;
    private String mailingAddress;
    @JsonIgnore
    private final Map<String, Object> changes = new LinkedHashMap<>();

    public void setRequestId(String value) { requestId = value; }
    public void setExpectedVersion(String value) { expectedVersion = value; }
    public void setName(String value) { name = trim(value); changes.put("name", name); }
    public void setEmail(String value) { email = trim(value); changes.put("email", email); }
    public void setAttendance(String value) { attendance = value; changes.put("attendance", value); }
    public void setGiftChoice(String value) { giftChoice = value; changes.put("giftChoice", value); }
    public void setMailingAddress(String value) {
        mailingAddress = trim(value);
        if (mailingAddress != null && mailingAddress.isEmpty()) {
            mailingAddress = null;
        }
        changes.put("mailingAddress", mailingAddress);
    }
    private static String trim(String value) { return value == null ? null : value.strip(); }
}
