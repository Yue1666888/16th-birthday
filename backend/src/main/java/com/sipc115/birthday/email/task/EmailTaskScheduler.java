package com.sipc115.birthday.email.task;

import jakarta.annotation.PreDestroy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;

@Component
@ConditionalOnProperty(name = "app.tasks.enabled", havingValue = "true", matchIfMissing = true)
public class EmailTaskScheduler {
    private static final Logger log = LoggerFactory.getLogger(EmailTaskScheduler.class);
    private final EmailTaskTransactions transactions;
    private final EmailTaskProcessor processor;
    private final ExecutorService workers = Executors.newFixedThreadPool(2);
    private final Semaphore capacity = new Semaphore(2);

    public EmailTaskScheduler(EmailTaskTransactions transactions, EmailTaskProcessor processor) {
        this.transactions = transactions;
        this.processor = processor;
    }

    @Scheduled(fixedDelayString = "${app.tasks.delay-ms:5000}")
    public void tick() {
        int available = capacity.availablePermits();
        if (available == 0) return;
        for (var task : transactions.claim(available)) {
            capacity.acquireUninterruptibly();
            try {
                workers.submit(
                        () -> {
                            MDC.put("X-Request-ID", UUID.randomUUID().toString());
                            try {
                                processor.process(task);
                            } catch (Exception ex) {
                                log.error("邮件任务 {} 执行失败，将在租约到期后恢复", task.notification().getId());
                            } finally {
                                MDC.clear();
                                capacity.release();
                            }
                        });
            } catch (java.util.concurrent.RejectedExecutionException ex) {
                capacity.release();
            }
        }
    }

    @PreDestroy
    public void close() {
        workers.close();
    }
}
