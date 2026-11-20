package com.sipc115.birthday.email.client;

import com.sipc115.birthday.email.enums.MailTaskErrorCode;

public class MailIntegrationException extends RuntimeException {
    private final MailTaskErrorCode code;
    private final boolean retryable, uncertain;

    public MailIntegrationException(
            MailTaskErrorCode code, boolean retryable, boolean uncertain, String message) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.uncertain = uncertain;
    }

    public MailTaskErrorCode code() {
        return code;
    }

    public boolean retryable() {
        return retryable;
    }

    public boolean uncertain() {
        return uncertain;
    }
}
