package com.sipc115.birthday.invitation.response;

import com.sipc115.birthday.invitation.enums.InvitationResult;

public record InvitationSubmitResponse(String id, InvitationResult result, String submittedAt) {}
