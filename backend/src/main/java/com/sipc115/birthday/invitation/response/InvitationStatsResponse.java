package com.sipc115.birthday.invitation.response;
public record InvitationStatsResponse(long total, AttendanceStats attendance, GiftStats gifts,
        EmailStats email, long mailingAddressCount) {
    public record AttendanceStats(long attending, long notAttending) {}
    public record GiftStats(long none, long pickup, long mail) {}
    public record EmailStats(long notSent, long pending, long success, long failed, long disabled) {}
}
