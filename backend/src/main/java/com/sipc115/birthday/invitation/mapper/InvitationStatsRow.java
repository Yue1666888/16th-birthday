package com.sipc115.birthday.invitation.mapper;
import lombok.Getter;
import lombok.Setter;
@Getter
@Setter
public class InvitationStatsRow {
    private long total;
    private long attending;
    private long notAttending;
    private long none;
    private long pickup;
    private long mail;
    private long notSent;
    private long pending;
    private long success;
    private long failed;
    private long disabled;
    private long mailingAddressCount;
}
