package com.sipc115.birthday.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class HttpClientConfig {
    private RestClient client(String baseUrl) {
        var http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(30));
        return RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    @Bean("fileRestClient")
    public RestClient fileClient(
            @Value("${FILE_API_BASE_URL:https://services.sipc115.com/file-api}") String url) {
        return client(url);
    }

    @Bean("mailRestClient")
    public RestClient mailClient(
            @Value("${MAIL_API_BASE_URL:https://services.sipc115.com/mail-api}") String url) {
        return client(url);
    }

    @Bean("keycloakRestClient")
    public RestClient keycloakClient(@Value("${KEYCLOAK_URL:https://sso.sipc115.com}") String url) {
        return client(url);
    }
}
