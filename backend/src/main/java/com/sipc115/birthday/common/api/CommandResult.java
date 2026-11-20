package com.sipc115.birthday.common.api;

public record CommandResult<T>(BusinessCode code, T data, boolean replayed) {}
