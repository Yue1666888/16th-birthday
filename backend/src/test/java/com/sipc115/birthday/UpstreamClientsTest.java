package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.config.JacksonConfig;
import com.sipc115.birthday.email.client.*;
import com.sipc115.birthday.email.entity.EmailNotificationEntity;
import com.sipc115.birthday.email.enums.MailTaskErrorCode;
import com.sipc115.birthday.media.client.FileApiClient;

import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.util.UUID;

class UpstreamClientsTest {
    private JsonMapper json() {
        var builder = JsonMapper.builder();
        new JacksonConfig().strictJson().customize(builder);
        return builder.build();
    }

    private EmailNotificationEntity email() {
        var e = new EmailNotificationEntity();
        e.setRecipientEmail("test@example.com");
        e.setSubject("测试");
        e.setTextBody("正文");
        e.setClientKey("birthday16:test:stable");
        return e;
    }

    @Test
    void submitsWithStableKeyRefreshesUnauthorizedTokenAndParsesRemoteStatus() {
        var builder = RestClient.builder().baseUrl("https://mail.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        var tokens = mock(MailAccessTokenProvider.class);
        when(tokens.token()).thenReturn("old", "fresh");
        String id = UUID.randomUUID().toString();
        server.expect(requestTo("https://mail.example/api/v1/mails"))
                .andExpect(header("Authorization", "Bearer old"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));
        server.expect(requestTo("https://mail.example/api/v1/mails"))
                .andExpect(header("Authorization", "Bearer fresh"))
                .andExpect(
                        content()
                                .json(
                                        "{\"to\":[\"test@example.com\"],\"subject\":\"测试\",\"text\":\"正文\",\"html\":\"\",\"client_key\":\"birthday16:test:stable\"}"))
                .andRespond(
                        withSuccess(
                                "{\"code\":0,\"data\":{\"id\":\""
                                        + id
                                        + "\",\"status\":\"queued\",\"status_query\":\"ignored\"}}",
                                MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://mail.example/api/v1/mails/" + id))
                .andRespond(
                        withSuccess(
                                "{\"code\":0,\"data\":{\"mail\":{\"id\":\""
                                        + id
                                        + "\",\"status\":\"sent\",\"attempts\":2,\"sent_at\":\"2026-11-21T10:00:00.123+08:00\",\"last_error\":\"\",\"to\":[\"ignored@example.com\"]},\"logs\":[]}}",
                                MediaType.APPLICATION_JSON));
        var client = new MailApiClient(builder.build(), tokens, json());
        assertEquals(id, client.submit(email()).id());
        verify(tokens).invalidate("old");
        var status = client.status(id);
        assertEquals(2, status.attempts());
        assertEquals(2, status.sentAt().getHour());
        assertEquals(123000000, status.sentAt().getNano());
        server.verify();
    }

    @Test
    void malformedSuccessIsUncertainAndPermissionDenialIsDefinitive() {
        var builder = RestClient.builder().baseUrl("https://mail.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        var tokens = mock(MailAccessTokenProvider.class);
        when(tokens.token()).thenReturn("token");
        server.expect(anything())
                .andRespond(
                        withSuccess(
                                "{\"code\":0,\"data\":{\"id\":\"bad\",\"status\":\"queued\"}}",
                                MediaType.APPLICATION_JSON));
        server.expect(anything()).andRespond(withStatus(HttpStatus.FORBIDDEN));
        var client = new MailApiClient(builder.build(), tokens, json());
        var unknown = assertThrows(MailIntegrationException.class, () -> client.submit(email()));
        assertTrue(unknown.uncertain());
        assertEquals(MailTaskErrorCode.MAIL_RESPONSE_INVALID, unknown.code());
        var denied = assertThrows(MailIntegrationException.class, () -> client.submit(email()));
        assertFalse(denied.uncertain());
        assertFalse(denied.retryable());
        assertEquals(MailTaskErrorCode.MAIL_PERMISSION_DENIED, denied.code());
        server.verify();
    }

    @Test
    void tokenUsesClientCredentialsFormAndCachesUntilExpiry() {
        var builder = RestClient.builder().baseUrl("https://sso.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://sso.example/realms/member/protocol/openid-connect/token"))
                .andExpect(
                        content()
                                .string(
                                        org.hamcrest.Matchers.containsString(
                                                "grant_type=client_credentials")))
                .andExpect(
                        content()
                                .string(
                                        org.hamcrest.Matchers.containsString(
                                                "client_id=birthday-api-mail")))
                .andRespond(
                        withSuccess(
                                "{\"access_token\":\"test-only\",\"expires_in\":300,\"token_type\":\"Bearer\"}",
                                MediaType.APPLICATION_JSON));
        var tokens =
                new MailAccessTokenProvider(
                        builder.build(),
                        json(),
                        Clock.systemUTC(),
                        "member",
                        "birthday-api-mail",
                        "test-only-secret");
        assertEquals("test-only", tokens.token());
        assertEquals("test-only", tokens.token());
        server.verify();
    }

    @Test
    void imageWrapperAndNestedLskyMetadataAreParsedAndExternalHostsRejected() {
        var builder = RestClient.builder().baseUrl("https://file.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://file.example/api/v1/images"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(
                        header(
                                "Content-Type",
                                org.hamcrest.Matchers.startsWith("multipart/form-data;boundary=")))
                .andRespond(
                        withSuccess(
                                "{\"success\":true,\"url\":\"https://image.sipc115.com/1.webp\",\"original_name\":\"a.png\",\"uploaded_name\":\"1.webp\",\"data\":{\"data\":{\"width\":20,\"height\":30,\"links\":{\"thumbnail_url\":\"https://image.sipc115.com/thumbnails/1.webp\"}}}}",
                                MediaType.APPLICATION_JSON));
        server.expect(anything())
                .andRespond(
                        withSuccess(
                                "{\"success\":true,\"url\":\"https://other.example/a.png\"}",
                                MediaType.APPLICATION_JSON));
        var client = new FileApiClient(builder.build(), json(), "image.sipc115.com");
        var file = new MockMultipartFile("file", "a.png", "image/png", new byte[] {1, 2});
        var result = client.upload(file);
        assertEquals(20, result.width());
        assertEquals(30, result.height());
        assertEquals("https://image.sipc115.com/thumbnails/1.webp", result.thumbnailUrl());
        assertEquals(
                ErrorCode.IMAGE_SERVICE_ERROR,
                assertThrows(BusinessException.class, () -> client.upload(file)).errorCode());
        server.verify();
    }

    @Test
    void nullImageResponseMapsToUpstreamError() {
        var builder = RestClient.builder().baseUrl("https://file.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(anything()).andRespond(withSuccess("null", MediaType.APPLICATION_JSON));
        var client = new FileApiClient(builder.build(), json(), "image.sipc115.com");
        assertEquals(
                ErrorCode.IMAGE_SERVICE_ERROR,
                assertThrows(
                                BusinessException.class,
                                () ->
                                        client.upload(
                                                new MockMultipartFile(
                                                        "file",
                                                        "a.png",
                                                        "image/png",
                                                        new byte[] {1})))
                        .errorCode());
        server.verify();
    }

    @Test
    void imageProviderRateLimitRetainsItsCooldownInsteadOfBecomingAnUnknownUploadFailure() {
        var builder = RestClient.builder().baseUrl("https://file.example");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", "5").body("busy"));
        var client = new FileApiClient(builder.build(), json(), "image.sipc115.com");
        var failure = assertThrows(BusinessException.class, () -> client.upload(new MockMultipartFile("file", "a.png", "image/png", new byte[] {1})));
        assertEquals(ErrorCode.TOO_MANY_REQUESTS, failure.errorCode());
        assertEquals(5, failure.retryAfterSeconds());
        server.verify();
    }
}
