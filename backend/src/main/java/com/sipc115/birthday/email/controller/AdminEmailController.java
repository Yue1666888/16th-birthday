package com.sipc115.birthday.email.controller;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.email.request.EmailConfirmRequest;
import com.sipc115.birthday.email.response.*;
import com.sipc115.birthday.email.service.EmailService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/invitations/{id}")
public class AdminEmailController {
    private final EmailService service;

    public AdminEmailController(EmailService service) {
        this.service = service;
    }

    @GetMapping("/email-preview")
    public CommonResponse<EmailPreviewResponse> preview(@PathVariable String id) {
        return CommonResponse.success(BusinessCode.OK, service.preview(RequestValues.id(id)));
    }

    @PostMapping("/email-sends")
    public ResponseEntity<CommonResponse<EmailSendResponse>> confirm(
            @PathVariable String id, @Valid @RequestBody EmailConfirmRequest request) {
        return CommonResponse.toEntity(service.confirm(RequestValues.id(id), request));
    }

    @GetMapping("/email-sends")
    public CommonResponse<PageResponse<EmailSendResponse>> history(
            @PathVariable String id,
            @RequestParam(required = false) String invitationVersion,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return CommonResponse.success(
                BusinessCode.OK,
                service.history(RequestValues.id(id), invitationVersion, page, size));
    }
}
