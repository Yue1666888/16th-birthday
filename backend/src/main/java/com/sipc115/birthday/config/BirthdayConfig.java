package com.sipc115.birthday.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BirthdayConfig {
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
