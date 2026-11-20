package com.sipc115.birthday.invitation.mapper;
import com.sipc115.birthday.invitation.entity.InvitationEntity;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
@Getter
@Setter
public class InvitationSummaryRow extends InvitationEntity {
    private String emailNotifyStatus;
    private LocalDateTime emailNotifiedAt;
}
