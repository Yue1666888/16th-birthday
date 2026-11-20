package com.sipc115.birthday.invitation.controller;

import com.sipc115.birthday.common.api.CommonResponse;
import com.sipc115.birthday.invitation.request.InvitationSubmitRequest;
import com.sipc115.birthday.invitation.response.InvitationSubmitResponse;
import com.sipc115.birthday.invitation.service.InvitationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InvitationController {
    private final InvitationService service;

    public InvitationController(InvitationService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/invitations")
    public ResponseEntity<CommonResponse<InvitationSubmitResponse>> submit(
            @Valid @RequestBody InvitationSubmitRequest request) {
        return CommonResponse.toEntity(service.submit(request));
    }
}
