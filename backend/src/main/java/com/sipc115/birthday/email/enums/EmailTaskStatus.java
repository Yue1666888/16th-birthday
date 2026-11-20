package com.sipc115.birthday.email.enums;

public enum EmailTaskStatus {
    READY,
    SUBMITTING,
    SUBMIT_RETRY,
    SUBMIT_UNKNOWN,
    POLLING,
    SUCCEEDED,
    FAILED,
    CANCELLED,
    DISABLED;

    public String notifyStatus() {
        return switch (this) {
            case SUCCEEDED -> "SUCCESS";
            case FAILED -> "FAILED";
            case CANCELLED -> "NOT_SENT";
            case DISABLED -> "DISABLED";
            default -> "PENDING";
        };
    }
}
