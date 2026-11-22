package com.sipc115.birthday.common.cache;

import com.github.benmanes.caffeine.cache.*;
import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.memory.response.*;
import com.sipc115.birthday.honor.response.HonorResponse;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Cache public data, never identity-bearing envelopes. Epoch keys prevent late stale refills. */
@Component
public class PublicWallCache {
    private final boolean enabled;
    private final AtomicLong epoch = new AtomicLong();
    private final Cache<String, PageResponse<MemorySummaryResponse>> memories;
    private final Cache<String, MemoryDetailResponse> details;
    private final Cache<Long, MemoryNameWallResponse> names;
    private final Cache<String, PageResponse<HonorResponse>> honors;
    public PublicWallCache(@Value("${app.cache.public-seconds:10}") long seconds) {
        enabled = seconds > 0;
        var duration = Duration.ofSeconds(Math.max(1, seconds));
        memories = Caffeine.newBuilder().maximumSize(256).expireAfterWrite(duration).build();
        details = Caffeine.newBuilder().maximumSize(256).expireAfterWrite(duration).build();
        names = Caffeine.newBuilder().maximumSize(16).expireAfterWrite(duration).build();
        honors = Caffeine.newBuilder().maximumSize(256).expireAfterWrite(duration).build();
    }
    public PageResponse<MemorySummaryResponse> memories(int page,int size,Supplier<PageResponse<MemorySummaryResponse>> load) { if(!enabled)return load.get(); return memories.get(epoch.get()+":"+page+":"+size, ignored -> load.get()); }
    public MemoryDetailResponse detail(String id,Supplier<MemoryDetailResponse> load) { if(!enabled)return load.get(); return details.get(epoch.get()+":"+id, ignored -> load.get()); }
    public MemoryNameWallResponse names(Supplier<MemoryNameWallResponse> load) { if(!enabled)return load.get(); return names.get(epoch.get(), ignored -> load.get()); }
    public PageResponse<HonorResponse> honors(int page,int size,Supplier<PageResponse<HonorResponse>> load) { if(!enabled)return load.get(); return honors.get(epoch.get()+":"+page+":"+size, ignored -> load.get()); }
    public void invalidate() { epoch.incrementAndGet(); memories.invalidateAll(); details.invalidateAll(); names.invalidateAll(); honors.invalidateAll(); }
    /** Controller calls this only after the transactional service has returned successfully. */
    public <T> CommandResult<T> afterWrite(CommandResult<T> result) { if (!result.replayed()) invalidate(); return result; }
}
