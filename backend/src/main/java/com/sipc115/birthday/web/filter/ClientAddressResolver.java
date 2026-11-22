package com.sipc115.birthday.web.filter;

import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

@Component
public class ClientAddressResolver {
    private final List<IpAddressMatcher> trusted;
    public ClientAddressResolver(@Value("${app.proxy.trusted-proxies:}") String values) {
        trusted = Arrays.stream(values.split(",")).map(String::strip).filter(s -> !s.isEmpty()).map(IpAddressMatcher::new).toList();
    }
    private boolean trusted(String ip) { return trusted.stream().anyMatch(m -> m.matches(ip)); }
    public String address(HttpServletRequest request) {
        String peer = request.getRemoteAddr();
        if (!trusted(peer)) return peer;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.length() > 1024) return peer;
        String[] chain = forwarded.split(",");
        if (chain.length > 16) return peer;
        String current = peer;
        for (int i=chain.length-1; i>=0 && trusted(current); i--) {
            String candidate = chain[i].strip();
            if ((!candidate.contains(".") && !candidate.contains(":")) || !candidate.matches("[0-9a-fA-F:.]+")) return peer;
            try { new IpAddressMatcher(candidate); } catch (IllegalArgumentException invalid) { return peer; }
            current = candidate;
        }
        return current;
    }
    public boolean secure(HttpServletRequest request) {
        return request.isSecure() || (trusted(request.getRemoteAddr()) && "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto")));
    }
}
