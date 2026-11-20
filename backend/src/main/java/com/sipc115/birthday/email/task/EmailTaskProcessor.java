package com.sipc115.birthday.email.task;

import com.sipc115.birthday.common.utils.ApiTime;
import com.sipc115.birthday.email.client.MailApiClient;
import com.sipc115.birthday.email.client.MailIntegrationException;
import com.sipc115.birthday.email.entity.EmailNotificationEntity;
import com.sipc115.birthday.email.enums.MailTaskErrorCode;

import org.springframework.stereotype.Service;

import java.time.Clock;

@Service
public class EmailTaskProcessor {
    private final EmailTaskTransactions transactions;
    private final MailApiClient client;
    private final Clock clock;

    public EmailTaskProcessor(
            EmailTaskTransactions transactions, MailApiClient client, Clock clock) {
        this.transactions = transactions;
        this.client = client;
        this.clock = clock;
    }

    public void process(LeasedEmailTask task) {
        var e = task.notification();
        if (!transactions.ownsLease(e)) return;
        try {
            if (e.getRemoteMailId() != null) {
                poll(e);
            } else if (!transactions.currentVersion(e)) {
                if (task.previouslyUncertain()) {
                    e.setTaskStatus("SUBMIT_UNKNOWN");
                    e.setNextRunAt(null);
                    error(
                            e,
                            MailTaskErrorCode.MAIL_SUBMISSION_UNCERTAIN,
                            "旧版本的中台受理结果不确定，已暂停；请联系维护人员核对原幂等键");
                } else {
                    e.setTaskStatus("CANCELLED");
                    e.setNextRunAt(null);
                    error(e, MailTaskErrorCode.MAIL_VERSION_OBSOLETE, "确认后回执已更新，尚未提交的旧版本邮件已取消");
                }
            } else {
                submit(e);
            }
        } catch (MailIntegrationException ex) {
            integrationFailure(task, ex);
        } catch (Exception ex) {
            // Never mark a possibly accepted external call as a definitive failure.
            e.setTaskStatus(e.getRemoteMailId() != null ? "POLLING" : "SUBMIT_UNKNOWN");
            e.setNextRunAt(ApiTime.now(clock).plusSeconds(60));
            error(e, MailTaskErrorCode.MAIL_INTERNAL_ERROR, "邮件任务处理异常，将按原幂等键核对");
        }
        transactions.finish(e); // Lease token and expiry fence late workers.
    }

    private void submit(EmailNotificationEntity e) {
        if (!transactions.beginSubmit(e)) return;
        var accepted = client.submit(e);
        e.setRemoteMailId(accepted.id());
        e.setRemoteStatus(accepted.status());
        if (e.getAcceptedAt() == null) e.setAcceptedAt(ApiTime.now(clock));
        e.setTaskStatus("POLLING");
        e.setNextRunAt(ApiTime.now(clock).plusSeconds(15));
        clear(e);
        // Even an idempotent 'sent' reply must be queried for its authoritative sent_at.
    }

    private void poll(EmailNotificationEntity e) {
        var remote = client.status(e.getRemoteMailId());
        e.setRemoteStatus(remote.status());
        e.setRemoteAttempts(remote.attempts());
        e.setPollFailures(0);
        clear(e);
        switch (remote.status()) {
            case "sent" -> {
                e.setTaskStatus("SUCCEEDED");
                e.setSentAt(remote.sentAt());
                e.setNextRunAt(null);
            }
            case "failed" -> {
                e.setTaskStatus("FAILED");
                e.setNextRunAt(null);
                error(
                        e,
                        remote.smtpTimeout()
                                ? MailTaskErrorCode.MAIL_SMTP_TIMEOUT
                                : MailTaskErrorCode.MAIL_SMTP_FAILED,
                        remote.smtpTimeout() ? "中台 SMTP 发送最终超时" : "中台 SMTP 发送最终失败");
            }
            default -> {
                e.setTaskStatus("POLLING");
                e.setNextRunAt(ApiTime.now(clock).plusSeconds(30));
            }
        }
    }

    private void integrationFailure(LeasedEmailTask task, MailIntegrationException ex) {
        var e = task.notification();
        if (e.getRemoteMailId() != null) {
            e.setTaskStatus("POLLING");
            e.setPollFailures(e.getPollFailures() + 1);
            e.setNextRunAt(ApiTime.now(clock).plusSeconds(backoff(e.getPollFailures())));
            error(e, MailTaskErrorCode.MAIL_STATUS_QUERY_FAILED, "中台状态暂时无法查询，保留上次已知状态并安排重试");
            return;
        }
        boolean uncertain = task.previouslyUncertain() || ex.uncertain();
        e.setTaskStatus(uncertain ? "SUBMIT_UNKNOWN" : ex.retryable() ? "SUBMIT_RETRY" : "FAILED");
        e.setNextRunAt(
                uncertain || ex.retryable()
                        ? ApiTime.now(clock).plusSeconds(backoff(e.getSubmitAttempts()))
                        : null);
        error(e, ex.code(), ex.getMessage());
    }

    private long backoff(int attempts) {
        return Math.min(1800, 15L * (1L << Math.min(attempts, 7)));
    }

    private void clear(EmailNotificationEntity e) {
        e.setLastErrorCode(null);
        e.setLastErrorMessage(null);
    }

    private void error(EmailNotificationEntity e, MailTaskErrorCode code, String message) {
        e.setLastErrorCode(code.name());
        e.setLastErrorMessage(message);
    }
}
