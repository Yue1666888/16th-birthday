package com.sipc115.birthday.honor.controller;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.honor.response.HonorResponse;
import com.sipc115.birthday.honor.service.HonorService;

import org.springframework.web.bind.annotation.*;

@RestController
public class HonorController {
    private final com.sipc115.birthday.common.cache.PublicWallCache cache;
    private final HonorService service;

    public HonorController(com.sipc115.birthday.common.cache.PublicWallCache cache, HonorService service) {
        this.cache=cache; this.service = service;
    }

    @GetMapping("/api/v1/honors")
    public CommonResponse<PageResponse<HonorResponse>> page(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return CommonResponse.success(BusinessCode.OK, cache.honors(page,size,()->service.page(page,size)));
    }
}
