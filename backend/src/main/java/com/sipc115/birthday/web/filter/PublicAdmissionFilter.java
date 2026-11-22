package com.sipc115.birthday.web.filter;

import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.ratelimit.RateLimitService;
import com.sipc115.birthday.media.service.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(-90) // After Spring Security (-100), before DispatcherServlet/multipart parsing.
public class PublicAdmissionFilter extends OncePerRequestFilter {
    private final RateLimitService rates; private final UploadOwnershipService owners;
    private final ClientAddressResolver addresses; private final UploadAdmission admission; private final ApiErrorWriter errors;
    private final int invitations, memories, anonymousUploads, memberUploads, ipLimit;
    public PublicAdmissionFilter(RateLimitService rates,UploadOwnershipService owners,ClientAddressResolver addresses,UploadAdmission admission,ApiErrorWriter errors,
        @Value("${app.limits.invitation-per-minute:10}") int invitations,
        @Value("${app.limits.memory-per-minute:5}") int memories,
        @Value("${app.limits.anonymous-upload-per-minute:20}") int anonymousUploads,
        @Value("${app.limits.authenticated-upload-per-minute:60}") int memberUploads,
        @Value("${app.limits.ip-per-minute:3000}") int ipLimit) {
        this.rates=rates;this.owners=owners;this.addresses=addresses;this.admission=admission;this.errors=errors;
        this.invitations=invitations;this.memories=memories;this.anonymousUploads=anonymousUploads;this.memberUploads=memberUploads;this.ipLimit=ipLimit;
    }
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !Set.of("/api/v1/invitations","/api/v1/memories","/api/v1/media/images").contains(request.getRequestURI());
    }
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws IOException,ServletException {
        boolean acquired=false;
        try {
            var owner=owners.resolveOrCreate(request,response);
            String identity=owner.sub()!=null?"user:"+owner.sub():"session:"+owner.sessionHash();
            rates.check("public-ip:"+addresses.address(request),ipLimit);
            String path=request.getRequestURI();
            int limit=path.endsWith("/images")?(owner.sub()==null?anonymousUploads:memberUploads):path.endsWith("/invitations")?invitations:memories;
            if(path.endsWith("/images")) {
                acquired=admission.acquire();
                if(!acquired){response.setHeader("Retry-After","3");errors.write(response,ErrorCode.UPLOAD_BUSY);return;}
            }
            rates.check(path+":"+identity,limit);
            chain.doFilter(request,response);
        } catch(BusinessException limited) {
            if(limited.retryAfterSeconds()>0)response.setHeader("Retry-After",Integer.toString(limited.retryAfterSeconds()));
            errors.write(response,limited.errorCode());
        } finally {if(acquired)admission.release();}
    }
}
