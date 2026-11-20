package com.sipc115.birthday.invitation.assembler;

import com.sipc115.birthday.common.utils.ApiTime;
import com.sipc115.birthday.invitation.mapper.InvitationSummaryRow;
import com.sipc115.birthday.invitation.mapper.InvitationStatsRow;
import com.sipc115.birthday.invitation.response.InvitationResponse;
import com.sipc115.birthday.invitation.response.InvitationStatsResponse;

public final class InvitationAssembler {
    private InvitationAssembler() {}
    public static InvitationResponse response(InvitationSummaryRow row) {
        return new InvitationResponse(row.getId().toString(), row.getName(), row.getPhone(), row.getEmail(),
                row.getAttendance(), row.getGiftChoice(), row.getMailingAddress(), row.getVersion().toString(),
                row.getEmailNotifyStatus(), ApiTime.format(row.getEmailNotifiedAt()),
                ApiTime.format(row.getCreatedAt()), ApiTime.format(row.getUpdatedAt()));
    }
    public static InvitationStatsResponse stats(InvitationStatsRow row) {
        return new InvitationStatsResponse(row.getTotal(),
                new InvitationStatsResponse.AttendanceStats(row.getAttending(), row.getNotAttending()),
                new InvitationStatsResponse.GiftStats(row.getNone(), row.getPickup(), row.getMail()),
                new InvitationStatsResponse.EmailStats(row.getNotSent(), row.getPending(), row.getSuccess(),
                        row.getFailed(), row.getDisabled()), row.getMailingAddressCount());
    }
}
