package com.sipc115.birthday.email.request;

import com.sipc115.birthday.common.utils.RequestValues;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record EmailConfirmRequest(
        @NotNull @Pattern(regexp = RequestValues.UUID_V4) String requestId,
        @NotNull @Pattern(regexp = "[1-9][0-9]*") String expectedVersion,
        @NotNull @Pattern(regexp = "[0-9a-f]{64}") String previewHash) {}
