package com.sipc115.birthday.memory.controller;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.media.service.UploadOwnershipService;
import com.sipc115.birthday.memory.request.MemorySubmitRequest;
import com.sipc115.birthday.memory.response.*;
import com.sipc115.birthday.memory.service.MemoryService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/memories")
public class MemoryController {
    private final MemoryService service;
    private final UploadOwnershipService owners;

    public MemoryController(MemoryService service, UploadOwnershipService owners) {
        this.service = service;
        this.owners = owners;
    }

    @PostMapping
    public ResponseEntity<CommonResponse<MemoryDetailResponse>> publish(
            @RequestBody MemorySubmitRequest request, HttpServletRequest http) {
        return CommonResponse.toEntity(service.publish(request, owners.current(http)));
    }

    @GetMapping
    public CommonResponse<PageResponse<MemorySummaryResponse>> page(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return CommonResponse.success(BusinessCode.OK, service.page(page, size));
    }

    @GetMapping("/{id}")
    public CommonResponse<MemoryDetailResponse> detail(@PathVariable String id) {
        return CommonResponse.success(BusinessCode.OK, service.detail(RequestValues.id(id)));
    }
}
