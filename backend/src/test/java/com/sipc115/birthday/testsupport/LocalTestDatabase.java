package com.sipc115.birthday.testsupport;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import org.springframework.test.context.DynamicPropertyRegistry;

public final class LocalTestDatabase {
    private LocalTestDatabase() {}
    public static void configure(DynamicPropertyRegistry registry) throws Exception {
        Properties properties = new Properties();
        try (Reader reader = Files.newBufferedReader(Path.of(".env"), StandardCharsets.UTF_8)) {
            properties.load(reader);
        }
        registry.add("spring.datasource.url", () ->
                "jdbc:mysql://127.0.0.1:3306/birthday16_test?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true");
        registry.add("spring.datasource.username", () -> properties.getProperty("DB_USER"));
        registry.add("spring.datasource.password", () -> properties.getProperty("DB_PASSWORD"));
        registry.add("app.limits.invitation-per-minute", () -> "1000");
    }
}
