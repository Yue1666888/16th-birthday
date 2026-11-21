package com.sipc115.birthday.invitation.controller;

import com.sipc115.birthday.common.api.BusinessCode;
import com.sipc115.birthday.common.api.CommonResponse;
import com.sipc115.birthday.common.api.PageResponse;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.invitation.request.InvitationPatchRequest;
import com.sipc115.birthday.invitation.response.InvitationResponse;
import com.sipc115.birthday.invitation.response.InvitationStatsResponse;
import com.sipc115.birthday.invitation.service.InvitationQueryService;
import com.sipc115.birthday.invitation.service.InvitationService;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/admin/invitations")
public class AdminInvitationController {
    private final InvitationQueryService queries;
    private final InvitationService service;

    public AdminInvitationController(InvitationQueryService queries, InvitationService service) {
        this.queries = queries;
        this.service = service;
    }

    @GetMapping
    public CommonResponse<PageResponse<InvitationResponse>> page(
            @RequestParam(required = false) String attendance,
            @RequestParam(required = false) String giftChoice,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String emailNotifyStatus,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return CommonResponse.success(
                BusinessCode.OK,
                queries.page(attendance, giftChoice, keyword, emailNotifyStatus, page, size));
    }

    @GetMapping("/stats")
    public CommonResponse<InvitationStatsResponse> stats() {
        return CommonResponse.success(BusinessCode.OK, queries.stats());
    }

    @GetMapping("/export")
    public void export(
            @RequestParam(required = false) String attendance,
            @RequestParam(required = false) String giftChoice,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String emailNotifyStatus,
            HttpServletResponse response)
            throws IOException {
        var csv = java.nio.file.Files.createTempFile("birthday-receipts-", ".csv");
        try {
            try (var writer =
                    java.nio.file.Files.newBufferedWriter(
                            csv, java.nio.charset.StandardCharsets.UTF_8)) {
                queries.export(attendance, giftChoice, keyword, emailNotifyStatus, writer);
            }
            response.setContentType("text/csv;charset=UTF-8");
            response.setHeader(
                    "Content-Disposition", "attachment; filename=\"birthday-invitations.csv\"");
            response.setContentLengthLong(java.nio.file.Files.size(csv));
            java.nio.file.Files.copy(csv, response.getOutputStream());
        } finally {
            java.nio.file.Files.deleteIfExists(csv);
        }
    }

    @GetMapping("/{id}")
    public CommonResponse<InvitationResponse> detail(@PathVariable String id) {
        return CommonResponse.success(BusinessCode.OK, queries.detail(RequestValues.id(id)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CommonResponse<InvitationResponse>> update(
            @PathVariable String id, @RequestBody InvitationPatchRequest request) {
        return CommonResponse.toEntity(service.correct(RequestValues.id(id), request));
    }
}
