package com.sipc115.birthday.media.service;

import com.sipc115.birthday.common.utils.RequestFingerprint;
import com.sipc115.birthday.media.model.UploadOwner;
import com.sipc115.birthday.security.CurrentUserProvider;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UploadOwnershipService {
    public static final String COOKIE_NAME = "birthday_upload_session";
    private final CurrentUserProvider users;
    private final com.sipc115.birthday.web.filter.ClientAddressResolver addresses;

    public UploadOwnershipService(CurrentUserProvider users, com.sipc115.birthday.web.filter.ClientAddressResolver addresses) {
        this.users = users;
        this.addresses = addresses;
    }

    public UploadOwner current(HttpServletRequest request) {
        var user = users.optional();
        String session = cookie(request);
        return new UploadOwner(
                user == null ? null : user.sub(),
                session == null ? null : RequestFingerprint.digest(session));
    }

    public UploadOwner resolveOrCreate(HttpServletRequest request, HttpServletResponse response) {
        var owner = current(request);
        if (owner.sub() != null || owner.sessionHash() != null) {
            return owner;
        }
        String token =
                UUID.randomUUID().toString().replace("-", "")
                        + UUID.randomUUID().toString().replace("-", "");
        var cookie =
                ResponseCookie.from(COOKIE_NAME, token)
                        .httpOnly(true)
                        .secure(addresses.secure(request))
                        .sameSite("Lax")
                        .path("/api/v1")
                        .build();
        request.setAttribute(COOKIE_NAME, token);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return new UploadOwner(null, RequestFingerprint.digest(token));
    }

    private String cookie(HttpServletRequest request) {
        if (request.getAttribute(COOKIE_NAME) instanceof String minted) return minted;
        if (request.getCookies() != null) {
            for (var cookie : request.getCookies()) {
                if (COOKIE_NAME.equals(cookie.getName())
                        && cookie.getValue().matches("[0-9a-f]{64}")) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
