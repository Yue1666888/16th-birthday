package com.sipc115.birthday.email.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sipc115.birthday.email.enums.MailTaskErrorCode;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;

@Component
public class MailAccessTokenProvider {
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Token(
            @JsonProperty("access_token") String value,
            @JsonProperty("expires_in") Long lifetime) {}

    private final RestClient client;
    private final JsonMapper json;
    private final Clock clock;
    private final String realm, clientId, secret;
    private String cached;
    private Instant expires = Instant.EPOCH;

    public MailAccessTokenProvider(
            @Qualifier("keycloakRestClient") RestClient client,
            JsonMapper json,
            Clock clock,
            @Value("${KEYCLOAK_REALM:member}") String realm,
            @Value("${MAIL_CLIENT_ID:birthday-api-mail}") String clientId,
            @Value("${MAIL_CLIENT_SECRET:}") String secret) {
        this.client = client;
        this.json = json;
        this.clock = clock;
        this.realm = realm;
        this.clientId = clientId;
        this.secret = secret;
    }

    public synchronized String token() {
        if (cached != null && clock.instant().isBefore(expires.minusSeconds(30))) return cached;
        try {
            var form = new LinkedMultiValueMap<String, String>();
            form.add("grant_type", "client_credentials");
            form.add("client_id", clientId);
            form.add("client_secret", secret);
            Token token =
                    client.post()
                            .uri("/realms/{realm}/protocol/openid-connect/token", realm)
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .body(form)
                            .exchange(
                                    (req, res) -> {
                                        if (!res.getStatusCode().is2xxSuccessful()) throw failure();
                                        byte[] body = res.getBody().readNBytes(65537);
                                        if (body.length > 65536) throw failure();
                                        return json.readValue(body, Token.class);
                                    });
            if (token == null
                    || token.value() == null
                    || token.value().isBlank()
                    || token.lifetime() == null
                    || token.lifetime() <= 0) throw failure();
            cached = token.value();
            expires = clock.instant().plusSeconds(Math.min(token.lifetime(), 86400));
            return cached;
        } catch (MailIntegrationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw failure();
        }
    }

    public synchronized void invalidate(String rejected) {
        if (java.util.Objects.equals(cached, rejected)) {
            cached = null;
            expires = Instant.EPOCH;
        }
    }

    private MailIntegrationException failure() {
        return new MailIntegrationException(
                MailTaskErrorCode.MAIL_AUTH_FAILED, true, false, "邮件服务身份验证失败，请检查服务客户端配置");
    }
}
