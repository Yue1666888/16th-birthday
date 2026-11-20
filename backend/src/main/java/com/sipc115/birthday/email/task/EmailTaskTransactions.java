package com.sipc115.birthday.email.task;

import com.sipc115.birthday.common.utils.ApiTime;
import com.sipc115.birthday.email.entity.EmailNotificationEntity;
import com.sipc115.birthday.email.mapper.EmailNotificationMapper;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class EmailTaskTransactions {
    private final EmailNotificationMapper mapper;
    private final Clock clock;
    private final String owner = UUID.randomUUID().toString();

    public EmailTaskTransactions(EmailNotificationMapper mapper, Clock clock) {
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional
    public List<LeasedEmailTask> claim(int limit) {
        var now = ApiTime.now(clock);
        var tasks = new ArrayList<LeasedEmailTask>();
        for (var e : mapper.due(now, limit)) {
            boolean uncertain =
                    "SUBMITTING".equals(e.getTaskStatus())
                            || "SUBMIT_UNKNOWN".equals(e.getTaskStatus());
            if (e.getRemoteMailId() == null) {
                e.setTaskStatus(uncertain ? "SUBMIT_UNKNOWN" : "SUBMITTING");
            }
            e.setLeaseOwner(owner);
            e.setLeaseToken(UUID.randomUUID().toString());
            e.setLeaseUntil(now.plusSeconds(120));
            e.setUpdatedAt(now);
            mapper.claim(e);
            tasks.add(new LeasedEmailTask(e, uncertain));
        }
        return tasks;
    }

    @Transactional
    public boolean beginSubmit(EmailNotificationEntity e) {
        if (mapper.beginSubmit(e, ApiTime.now(clock)) != 1) return false;
        e.setSubmitAttempts(e.getSubmitAttempts() + 1);
        return true;
    }

    public boolean currentVersion(EmailNotificationEntity e) {
        return java.util.Objects.equals(
                mapper.invitationVersion(e.getInvitationId()), e.getInvitationVersion());
    }

    public boolean ownsLease(EmailNotificationEntity e) {
        var current = mapper.get(e.getId());
        return current != null
                && e.getLeaseToken().equals(current.getLeaseToken())
                && current.getLeaseUntil() != null
                && current.getLeaseUntil().isAfter(ApiTime.now(clock));
    }

    @Transactional
    public boolean finish(EmailNotificationEntity e) {
        return mapper.finish(e, ApiTime.now(clock)) == 1;
    }
}
