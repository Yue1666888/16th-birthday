package com.sipc115.birthday.healthcheck;

import com.sipc115.birthday.common.api.BusinessCode;
import com.sipc115.birthday.common.api.CommonResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthCheckController {
    @GetMapping("/api/v1/health")
    public CommonResponse<HealthCheckResponse> check() {
        return CommonResponse.success(BusinessCode.OK, new HealthCheckResponse("UP"));
    }
}
