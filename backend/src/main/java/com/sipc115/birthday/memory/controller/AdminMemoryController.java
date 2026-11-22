package com.sipc115.birthday.memory.controller;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.utils.RequestValues;
import com.sipc115.birthday.media.service.UploadOwnershipService;
import com.sipc115.birthday.memory.request.*;
import com.sipc115.birthday.memory.response.*;
import com.sipc115.birthday.memory.service.AdminMemoryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/memories")
public class AdminMemoryController {
    private final com.sipc115.birthday.common.cache.PublicWallCache cache;
    private final AdminMemoryService service;
    private final UploadOwnershipService owners;
    public AdminMemoryController(com.sipc115.birthday.common.cache.PublicWallCache cache, AdminMemoryService service, UploadOwnershipService owners) { this.cache=cache; this.service = service; this.owners = owners; }
    @GetMapping
    public CommonResponse<PageResponse<MemoryAdminResponse>> page(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size, @RequestParam(required=false) String keyword) {
        return CommonResponse.success(BusinessCode.OK, service.page(page,size,keyword));
    }
    @GetMapping("/{id}")
    public CommonResponse<MemoryAdminResponse> detail(@PathVariable String id) { return CommonResponse.success(BusinessCode.OK, service.detail(RequestValues.id(id))); }
    @PostMapping
    public ResponseEntity<CommonResponse<MemoryAdminResponse>> create(@RequestBody MemoryCreateRequest request, HttpServletRequest http) { return CommonResponse.toEntity(cache.afterWrite(service.create(request, owners.current(http)))); }
    @PatchMapping("/{id}")
    public ResponseEntity<CommonResponse<MemoryAdminResponse>> update(@PathVariable String id, @RequestBody MemoryPatchRequest request, HttpServletRequest http) { return CommonResponse.toEntity(cache.afterWrite(service.update(RequestValues.id(id), request, owners.current(http)))); }
    @DeleteMapping("/{id}")
    public ResponseEntity<CommonResponse<MemoryDeleteResponse>> delete(@PathVariable String id, @RequestParam String expectedVersion, @RequestParam String requestId) { return CommonResponse.toEntity(cache.afterWrite(service.delete(RequestValues.id(id), expectedVersion, requestId))); }
}
