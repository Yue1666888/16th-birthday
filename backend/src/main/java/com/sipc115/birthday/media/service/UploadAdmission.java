package com.sipc115.birthday.media.service;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Bounded admission before multipart parsing. Waiters do not consume upload slots. */
@Component
public class UploadAdmission {
    private final Semaphore slots;
    private final AtomicInteger waiting = new AtomicInteger();
    private final int maximumWaiting;
    private final long waitMillis;
    public UploadAdmission(@Value("${app.upload.max-concurrent:8}") int active,
            @Value("${app.upload.max-waiting:24}") int maximumWaiting,
            @Value("${app.upload.wait-millis:1500}") long waitMillis) {
        if (active<1 || maximumWaiting<0 || waitMillis<0) throw new IllegalArgumentException("Invalid upload admission settings");
        slots=new Semaphore(active,true);this.maximumWaiting=maximumWaiting;this.waitMillis=waitMillis;
    }
    public boolean acquire() {
        if (slots.tryAcquire()) return true;
        if (waiting.incrementAndGet()>maximumWaiting) {waiting.decrementAndGet();return false;}
        try { return slots.tryAcquire(waitMillis,TimeUnit.MILLISECONDS); }
        catch (InterruptedException interrupted) {Thread.currentThread().interrupt();return false;}
        finally {waiting.decrementAndGet();}
    }
    public void release() { slots.release(); }
}
