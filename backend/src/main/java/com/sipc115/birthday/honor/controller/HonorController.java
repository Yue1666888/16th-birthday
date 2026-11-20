package com.sipc115.birthday.honor.controller;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.honor.response.HonorResponse;
import com.sipc115.birthday.honor.service.HonorService;

import org.springframework.web.bind.annotation.*;

@RestController
public class HonorController {
    private final HonorService service;

    public HonorController(HonorService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/honors")
    public CommonResponse<PageResponse<HonorResponse>> page(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return CommonResponse.success(BusinessCode.OK, service.page(page, size));
    }
}
