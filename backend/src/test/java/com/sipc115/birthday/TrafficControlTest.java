package com.sipc115.birthday;
import static org.junit.jupiter.api.Assertions.*;
import com.sipc115.birthday.web.filter.ClientAddressResolver;
import com.sipc115.birthday.media.service.UploadAdmission;
import com.sipc115.birthday.common.cache.PublicWallCache;
import com.sipc115.birthday.memory.response.MemoryNameWallResponse;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class TrafficControlTest {
    @Test void busyAdmissionRejectsBeforeReadingTheMultipartBody() throws Exception {
        var resolver=new ClientAddressResolver("");
        var users=org.mockito.Mockito.mock(com.sipc115.birthday.security.CurrentUserProvider.class);
        var owners=new com.sipc115.birthday.media.service.UploadOwnershipService(users,resolver);
        var gate=new UploadAdmission(1,0,0);assertTrue(gate.acquire());
        var filter=new com.sipc115.birthday.web.filter.PublicAdmissionFilter(
            new com.sipc115.birthday.common.ratelimit.RateLimitService(java.time.Clock.systemUTC()),owners,resolver,gate,
            new com.sipc115.birthday.common.api.ApiErrorWriter(tools.jackson.databind.json.JsonMapper.builder().build()),10,5,20,60,600);
        var request=new MockHttpServletRequest("POST","/api/v1/media/images") {
            @Override public jakarta.servlet.ServletInputStream getInputStream(){throw new AssertionError("Body read before admission");}
        };
        request.setContentType("multipart/form-data; boundary=test");
        var response=new MockHttpServletResponse();
        filter.doFilter(request,response,(a,b)->{throw new AssertionError("Busy request dispatched");});
        assertEquals(503,response.getStatus());assertEquals("3",response.getHeader("Retry-After"));
        assertTrue(response.getContentAsString().contains("UPLOAD_BUSY"));assertFalse(gate.acquire());gate.release();
    }
    @Test void separateVisitorSessionsOnTheSameNetworkDoNotShareTheSmallSubmissionQuota() throws Exception {
        var resolver=new ClientAddressResolver("");
        var users=org.mockito.Mockito.mock(com.sipc115.birthday.security.CurrentUserProvider.class);
        var filter=new com.sipc115.birthday.web.filter.PublicAdmissionFilter(
            new com.sipc115.birthday.common.ratelimit.RateLimitService(java.time.Clock.systemUTC()),
            new com.sipc115.birthday.media.service.UploadOwnershipService(users,resolver),resolver,new UploadAdmission(1,0,0),
            new com.sipc115.birthday.common.api.ApiErrorWriter(tools.jackson.databind.json.JsonMapper.builder().build()),1,1,1,1,100);
        for(int index=0;index<3;index++){
            var request=new MockHttpServletRequest("POST","/api/v1/invitations");request.setRemoteAddr("198.51.100.9");
            request.setCookies(new jakarta.servlet.http.Cookie("birthday_upload_session",(index==2?"b":"a").repeat(64)));
            var response=new MockHttpServletResponse();filter.doFilter(request,response,(a,b)->{});
            assertEquals(index==1?429:200,response.getStatus());
        }
    }
    @Test void onlyTrustedProxiesCanReplaceTheClientAddress() {
        var resolver=new ClientAddressResolver("127.0.0.1/32,10.0.0.0/8");
        var request=new MockHttpServletRequest();request.setRemoteAddr("198.51.100.2");
        request.addHeader("X-Forwarded-For","203.0.113.8");request.addHeader("X-Forwarded-Proto","https");
        assertEquals("198.51.100.2",resolver.address(request));assertFalse(resolver.secure(request));
        request.setRemoteAddr("127.0.0.1");
        assertEquals("203.0.113.8",resolver.address(request));assertTrue(resolver.secure(request));
        request.removeHeader("X-Forwarded-For");request.addHeader("X-Forwarded-For","192.0.2.4, 203.0.113.8, 10.1.1.2");
        assertEquals("203.0.113.8",resolver.address(request));
        request.removeHeader("X-Forwarded-For");request.addHeader("X-Forwarded-For","malicious.example");
        assertEquals("127.0.0.1",resolver.address(request));
    }
    @Test void uploadAdmissionRejectsExcessWorkAndReleasesSlots() {
        var admission=new UploadAdmission(2,0,0);
        assertTrue(admission.acquire());assertTrue(admission.acquire());assertFalse(admission.acquire());
        admission.release();assertTrue(admission.acquire());admission.release();admission.release();
    }
    @Test void publicCacheCoalescesConcurrentReads() throws Exception {
        var cache=new PublicWallCache(10);var loads=new AtomicInteger();
        try(var pool=Executors.newFixedThreadPool(8)) {
            var tasks=new ArrayList<Future<MemoryNameWallResponse>>();
            for(int i=0;i<8;i++) tasks.add(pool.submit(()->cache.names(()-> {loads.incrementAndGet();try{Thread.sleep(30);}catch(InterruptedException ex){throw new IllegalStateException(ex);}return new MemoryNameWallResponse(1,0,List.of());})));
            for(var task:tasks)assertEquals(1,task.get().totalSubmissions());
        }
        assertEquals(1,loads.get());
        cache.invalidate();assertEquals(2,cache.names(()->new MemoryNameWallResponse(2,0,List.of())).totalSubmissions());
    }
    @Test void oldReadCannotRefillTheNewGenerationAfterInvalidation() throws Exception {
        var cache=new PublicWallCache(10);var entered=new CountDownLatch(1);var release=new CountDownLatch(1);
        try(var pool=Executors.newSingleThreadExecutor()) {
            var old=pool.submit(()->cache.names(()->{entered.countDown();try{release.await();}catch(InterruptedException ex){throw new IllegalStateException(ex);}return new MemoryNameWallResponse(1,0,List.of());}));
            assertTrue(entered.await(2,TimeUnit.SECONDS));cache.invalidate();
            assertEquals(2,cache.names(()->new MemoryNameWallResponse(2,0,List.of())).totalSubmissions());
            release.countDown();assertEquals(1,old.get().totalSubmissions());
            assertEquals(2,cache.names(()->{throw new AssertionError("stale refill");}).totalSubmissions());
        }
    }
}
