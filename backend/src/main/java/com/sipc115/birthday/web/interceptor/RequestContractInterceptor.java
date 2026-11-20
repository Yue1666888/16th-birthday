package com.sipc115.birthday.web.interceptor;

import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.ratelimit.RateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class RequestContractInterceptor implements HandlerInterceptor {
    private final RateLimitService rateLimit;
    private final int invitationLimit;

    public RequestContractInterceptor(RateLimitService rateLimit,
            @Value("${app.limits.invitation-per-minute}") int invitationLimit) {
        this.rateLimit = rateLimit;
        this.invitationLimit = invitationLimit;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }
        for (var entry : request.getParameterMap().entrySet()) {
            if (entry.getValue().length != 1) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "查询参数不能重复", Map.of(entry.getKey(), "参数重复"));
            }
            throw BusinessException.field(entry.getKey(), "当前接口不接受该查询参数");
        }
        if ("POST".equals(request.getMethod()) && "/api/v1/invitations".equals(request.getRequestURI())) {
            rateLimit.check("invitation:" + request.getRemoteAddr(), invitationLimit);
        }
        return true;
    }
}
