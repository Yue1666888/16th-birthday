package com.sipc115.birthday.honor.controller;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.honor.request.*;
import com.sipc115.birthday.honor.response.*;
import com.sipc115.birthday.honor.service.HonorService;
import com.sipc115.birthday.media.service.UploadOwnershipService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/honors")
public class AdminHonorController {
    private final HonorService service;
    private final UploadOwnershipService owners;

    public AdminHonorController(HonorService service, UploadOwnershipService owners) {
        this.service = service;
        this.owners = owners;
    }

    @GetMapping
    public CommonResponse<PageResponse<HonorAdminResponse>> page(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return CommonResponse.success(BusinessCode.OK, service.adminPage(page, size));
    }

    @GetMapping("/{id}")
    public CommonResponse<HonorAdminResponse> detail(@PathVariable String id) {
        return CommonResponse.success(BusinessCode.OK, service.detail(RequestValues.id(id)));
    }

    @PostMapping
    public ResponseEntity<CommonResponse<HonorAdminResponse>> create(
            @RequestBody HonorCreateRequest request, HttpServletRequest http) {
        return CommonResponse.toEntity(service.create(request, owners.current(http)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CommonResponse<HonorAdminResponse>> update(
            @PathVariable String id,
            @RequestBody HonorPatchRequest request,
            HttpServletRequest http) {
        return CommonResponse.toEntity(
                service.update(RequestValues.id(id), request, owners.current(http)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<CommonResponse<HonorDeleteResponse>> delete(
            @PathVariable String id,
            @RequestParam String expectedVersion,
            @RequestParam String requestId) {
        return CommonResponse.toEntity(
                service.delete(RequestValues.id(id), expectedVersion, requestId));
    }
}
