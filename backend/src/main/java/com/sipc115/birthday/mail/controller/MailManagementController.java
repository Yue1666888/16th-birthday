package com.sipc115.birthday.mail.controller;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.invitation.response.InvitationResponse;
import com.sipc115.birthday.invitation.service.InvitationQueryService;
import com.sipc115.birthday.mail.model.MailModels.*;
import com.sipc115.birthday.mail.service.MailManagementService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/mail")
public class MailManagementController {
    private final MailManagementService service;
    private final InvitationQueryService invitations;

    public MailManagementController(
            MailManagementService service, InvitationQueryService invitations) {
        this.service = service;
        this.invitations = invitations;
    }

    @GetMapping("/recipients")
    public CommonResponse<PageResponse<InvitationResponse>> recipients(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String attendance,
            @RequestParam(required = false) String giftChoice,
            @RequestParam(required = false) String emailNotifyStatus,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return CommonResponse.success(
                BusinessCode.OK,
                invitations.page(attendance, giftChoice, keyword, emailNotifyStatus, page, size));
    }

    @PostMapping("/recipient-selections")
    public CommonResponse<SelectionResponse> select(@RequestBody SelectionRequest request) {
        return CommonResponse.success(BusinessCode.OK, service.select(request));
    }

    @PostMapping("/previews")
    public CommonResponse<PreviewResponse> preview(@Valid @RequestBody PreviewRequest request) {
        return CommonResponse.success(BusinessCode.OK, service.preview(request));
    }

    @PostMapping("/batches")
    public ResponseEntity<CommonResponse<BatchResponse>> confirm(
            @Valid @RequestBody ConfirmRequest request) {
        return CommonResponse.toEntity(service.confirm(request));
    }

    @GetMapping("/batches/{id}")
    public CommonResponse<BatchResponse> batch(@PathVariable String id) {
        return CommonResponse.success(BusinessCode.OK, service.batch(RequestValues.id(id)));
    }

    @GetMapping("/sends")
    public CommonResponse<PageResponse<HistoryItem>> history(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String emailNotifyStatus,
            @RequestParam(required = false) String invitationId,
            @RequestParam(required = false) String batchId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return CommonResponse.success(
                BusinessCode.OK,
                service.history(keyword, emailNotifyStatus, invitationId, batchId, page, size));
    }

    @GetMapping("/sends/{id}")
    public CommonResponse<HistoryItem> send(@PathVariable String id) {
        return CommonResponse.success(BusinessCode.OK, service.send(RequestValues.id(id)));
    }
}
