package com.sipc115.birthday.logs.controller;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.ratelimit.RateLimitService;
import com.sipc115.birthday.logs.service.ServiceLogService;
import com.sipc115.birthday.security.CurrentUserProvider;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/v1/admin/logs")
public class ServiceLogController {
    private final ServiceLogService service;
    private final RateLimitService limits;
    private final CurrentUserProvider users;
    private final Clock clock;

    public ServiceLogController(
            ServiceLogService service,
            RateLimitService limits,
            CurrentUserProvider users,
            Clock clock) {
        this.service = service;
        this.limits = limits;
        this.users = users;
        this.clock = clock;
    }

    private void rate() {
        limits.check("logs:" + users.required().sub(), 60);
    }

    @GetMapping
    public CommonResponse<ServiceLogService.Chunk> read(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "200") int limit) {
        rate();
        return CommonResponse.success(BusinessCode.OK, service.read(cursor, limit));
    }

    @GetMapping("/download")
    public ResponseEntity<byte[]> download() {
        rate();
        byte[] bytes = service.download();
        String date =
                java.time.LocalDateTime.now(clock)
                        .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        return ResponseEntity.ok()
                .contentType(
                        new MediaType("text", "plain", java.nio.charset.StandardCharsets.UTF_8))
                .header(
                        "Content-Disposition",
                        "attachment; filename=\"birthday16-api-" + date + ".log\"")
                .contentLength(bytes.length)
                .body(bytes);
    }
}
