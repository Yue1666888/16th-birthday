package com.sipc115.birthday.email.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sipc115.birthday.email.entity.EmailNotificationEntity;
import com.sipc115.birthday.email.enums.MailTaskErrorCode;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import tools.jackson.databind.json.JsonMapper;

import java.net.http.HttpTimeoutException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class MailApiClient {
    public record Accepted(String id, String status) {}

    public record RemoteMail(
            String id, String status, int attempts, LocalDateTime sentAt, boolean smtpTimeout) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AcceptedData(String id, String status) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AcceptedReply(Integer code, AcceptedData data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RemoteData(
            String id,
            String status,
            Integer attempts,
            @JsonProperty("sent_at") String sentAt,
            @JsonProperty("last_error") String lastError) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record QueryData(RemoteData mail) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record QueryReply(Integer code, QueryData data) {}

    private static final Set<String> STATUSES = Set.of("queued", "sending", "sent", "failed");
    private final RestClient client;
    private final MailAccessTokenProvider tokens;
    private final JsonMapper json;

    public MailApiClient(
            @Qualifier("mailRestClient") RestClient client,
            MailAccessTokenProvider tokens,
            JsonMapper json) {
        this.client = client;
        this.tokens = tokens;
        this.json = json;
    }

    public Accepted submit(EmailNotificationEntity e) {
        var body =
                Map.of(
                        "to",
                        List.of(e.getRecipientEmail()),
                        "subject",
                        e.getSubject(),
                        "text",
                        e.getTextBody(),
                        "html",
                        e.getHtmlBody() == null ? "" : e.getHtmlBody(),
                        "client_key",
                        e.getClientKey());
        var reply = call(true, "/api/v1/mails", body, AcceptedReply.class);
        if (reply == null || reply.code() == null || reply.code() != 0 || reply.data() == null)
            throw invalid(true);
        valid(reply.data().id(), reply.data().status(), true);
        return new Accepted(reply.data().id(), reply.data().status());
    }

    public RemoteMail status(String id) {
        var reply = call(false, "/api/v1/mails/" + id, null, QueryReply.class);
        if (reply == null
                || reply.code() == null
                || reply.code() != 0
                || reply.data() == null
                || reply.data().mail() == null) throw invalid(false);
        var m = reply.data().mail();
        valid(m.id(), m.status(), false);
        if (!id.equals(m.id()) || m.attempts() == null || m.attempts() < 0) throw invalid(false);
        LocalDateTime sent = null;
        if (m.sentAt() != null) {
            try {
                sent =
                        OffsetDateTime.parse(m.sentAt())
                                .withOffsetSameInstant(ZoneOffset.UTC)
                                .toLocalDateTime()
                                .truncatedTo(ChronoUnit.MILLIS);
            } catch (Exception ex) {
                throw invalid(false);
            }
        }
        if ("sent".equals(m.status()) && sent == null) throw invalid(false);
        String error =
                m.lastError() == null ? "" : m.lastError().toLowerCase(java.util.Locale.ROOT);
        return new RemoteMail(
                m.id(),
                m.status(),
                m.attempts(),
                sent,
                error.contains("timeout") || error.contains("timed out") || error.contains("超时"));
    }

    private <T> T call(boolean post, String uri, Object body, Class<T> type) {
        for (int attempt = 0; attempt < 2; attempt++) {
            String token = tokens.token();
            final boolean refresh = attempt == 0;
            try {
                var request =
                        post
                                ? client.post()
                                        .uri(uri)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body(body)
                                : client.get().uri(uri);
                T result =
                        request.headers(headers -> headers.setBearerAuth(token))
                                .exchange(
                                        (req, res) -> {
                                            int status = res.getStatusCode().value();
                                            if (status == 401 && refresh) {
                                                tokens.invalidate(token);
                                                return null;
                                            }
                                            if (status == 401)
                                                throw new MailIntegrationException(
                                                        MailTaskErrorCode.MAIL_AUTH_FAILED,
                                                        true,
                                                        false,
                                                        "邮件服务拒绝身份令牌");
                                            if (status == 403)
                                                throw new MailIntegrationException(
                                                        MailTaskErrorCode.MAIL_PERMISSION_DENIED,
                                                        false,
                                                        false,
                                                        "邮件服务账号缺少发送权限");
                                            if (status == 429)
                                                throw new MailIntegrationException(
                                                        MailTaskErrorCode.MAIL_RATE_LIMITED,
                                                        true,
                                                        false,
                                                        "邮件服务限流，稍后重试");
                                            if (status >= 500)
                                                throw new MailIntegrationException(
                                                        MailTaskErrorCode.MAIL_SERVICE_UNAVAILABLE,
                                                        true,
                                                        post,
                                                        "邮件服务暂时不可用");
                                            if (!res.getStatusCode().is2xxSuccessful())
                                                throw new MailIntegrationException(
                                                        MailTaskErrorCode.MAIL_REQUEST_REJECTED,
                                                        false,
                                                        false,
                                                        "邮件服务明确拒绝请求");
                                            byte[] bytes =
                                                    res.getBody().readNBytes(1024 * 1024 + 1);
                                            if (bytes.length > 1024 * 1024) throw invalid(post);
                                            try {
                                                T decoded = json.readValue(bytes, type);
                                                if (decoded == null) throw invalid(post);
                                                return decoded;
                                            } catch (Exception ex) {
                                                throw invalid(post);
                                            }
                                        });
                if (result != null) return result;
            } catch (MailIntegrationException ex) {
                throw ex;
            } catch (ResourceAccessException ex) {
                boolean timeout = false;
                Throwable cause = ex;
                while (cause != null) {
                    if (cause instanceof HttpTimeoutException
                            || cause instanceof java.net.SocketTimeoutException) timeout = true;
                    cause = cause.getCause();
                }
                throw new MailIntegrationException(
                        timeout
                                ? MailTaskErrorCode.MAIL_SERVICE_TIMEOUT
                                : MailTaskErrorCode.MAIL_SERVICE_UNAVAILABLE,
                        true,
                        post,
                        "邮件服务连接或响应失败");
            } catch (RestClientException ex) {
                throw new MailIntegrationException(
                        MailTaskErrorCode.MAIL_SERVICE_UNAVAILABLE, true, post, "邮件服务调用失败");
            }
        }
        throw new MailIntegrationException(
                MailTaskErrorCode.MAIL_AUTH_FAILED, true, false, "邮件服务身份验证重试失败");
    }

    private void valid(String id, String status, boolean post) {
        try {
            if (id == null
                    || !UUID.fromString(id).toString().equals(id)
                    || !STATUSES.contains(status)) throw invalid(post);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw invalid(post);
        }
    }

    private MailIntegrationException invalid(boolean post) {
        return new MailIntegrationException(
                MailTaskErrorCode.MAIL_RESPONSE_INVALID, true, post, "邮件服务响应不完整，等待核对受理结果");
    }
}
