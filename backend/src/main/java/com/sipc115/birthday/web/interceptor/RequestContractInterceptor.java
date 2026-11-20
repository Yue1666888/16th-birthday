package com.sipc115.birthday.web.interceptor;

import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.ratelimit.RateLimitService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.HashSet;
import java.util.Map;

@Component
public class RequestContractInterceptor implements HandlerInterceptor {
    private final RateLimitService rateLimit;
    private final int invitationLimit;
    private final com.sipc115.birthday.security.CurrentUserProvider users;
    private final int memoryLimit;
    private final int anonymousUploadLimit;
    private final int authenticatedUploadLimit;

    public RequestContractInterceptor(
            RateLimitService rateLimit,
            @Value("${app.limits.invitation-per-minute}") int invitationLimit,
            com.sipc115.birthday.security.CurrentUserProvider users,
            @Value("${app.limits.memory-per-minute:5}") int memoryLimit,
            @Value("${app.limits.anonymous-upload-per-minute:20}") int anonymousUploadLimit,
            @Value("${app.limits.authenticated-upload-per-minute:60}")
                    int authenticatedUploadLimit) {
        this.rateLimit = rateLimit;
        this.invitationLimit = invitationLimit;
        this.users = users;
        this.memoryLimit = memoryLimit;
        this.anonymousUploadLimit = anonymousUploadLimit;
        this.authenticatedUploadLimit = authenticatedUploadLimit;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)) {
            return true;
        }
        var allowed = new HashSet<String>();
        for (var parameter : method.getMethodParameters()) {
            var annotation = parameter.getParameterAnnotation(RequestParam.class);
            if (annotation != null) {
                String name = !annotation.name().isEmpty() ? annotation.name() : annotation.value();
                allowed.add(name.isEmpty() ? parameter.getParameterName() : name);
            }
        }
        for (var entry : request.getParameterMap().entrySet()) {
            if (entry.getValue().length != 1) {
                throw new BusinessException(
                        ErrorCode.BAD_REQUEST, "查询参数不能重复", Map.of(entry.getKey(), "参数重复"));
            }
            if (!allowed.contains(entry.getKey())) {
                throw BusinessException.field(entry.getKey(), "当前接口不接受该查询参数");
            }
            if (("page".equals(entry.getKey()) || "size".equals(entry.getKey()))
                    && !entry.getValue()[0].matches("[0-9]+")) {
                throw new BusinessException(
                        ErrorCode.BAD_REQUEST, "分页参数格式不正确", Map.of(entry.getKey(), "请输入整数"));
            }
        }
        if ("POST".equals(request.getMethod())
                && "/api/v1/invitations".equals(request.getRequestURI())) {
            rateLimit.check("invitation:" + request.getRemoteAddr(), invitationLimit);
        }
        if ("POST".equals(request.getMethod())
                && "/api/v1/memories".equals(request.getRequestURI())) {
            rateLimit.check("memory:" + request.getRemoteAddr(), memoryLimit);
        }
        if ("POST".equals(request.getMethod())
                && "/api/v1/media/images".equals(request.getRequestURI())) {
            var user = users.optional();
            String key =
                    user == null
                            ? "image-ip:" + request.getRemoteAddr()
                            : "image-user:" + user.sub();
            rateLimit.check(key, user == null ? anonymousUploadLimit : authenticatedUploadLimit);
        }
        if (("GET".equals(request.getMethod()) || "DELETE".equals(request.getMethod()))
                && (request.getContentLengthLong() > 0
                        || request.getHeader("Transfer-Encoding") != null)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        return true;
    }
}
