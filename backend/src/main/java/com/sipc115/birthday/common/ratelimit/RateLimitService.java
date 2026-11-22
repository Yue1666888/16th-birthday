package com.sipc115.birthday.common.ratelimit;

import com.sipc115.birthday.common.exceptions.BusinessException;
import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;

@Service
public class RateLimitService {
    private record Window(long minute, int count) {}

    private final Clock clock;
    private final com.github.benmanes.caffeine.cache.Cache<String, Window> windows = com.github.benmanes.caffeine.cache.Caffeine.newBuilder().maximumSize(10000).expireAfterWrite(java.time.Duration.ofMinutes(2)).build();

    public RateLimitService(Clock clock) { this.clock = clock; }

    public void check(String key, int maximum) {
        long seconds = clock.instant().getEpochSecond();
        long minute = seconds / 60;
        Window current = windows.asMap().compute(key, (ignored, previous) -> {
            int count = previous == null || previous.minute() != minute ? 1 : previous.count() + 1;
            return new Window(minute, Math.min(count, maximum + 1));
        });
        if (current.count() > maximum) {
            throw BusinessException.throttled((int) (60 - seconds % 60));
        }
    }
}
