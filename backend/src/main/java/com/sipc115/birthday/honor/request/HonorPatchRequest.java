package com.sipc115.birthday.honor.request;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.Getter;

import java.util.*;

@Getter
public class HonorPatchRequest {
    private String requestId;
    private String expectedVersion;
    private String title;
    private String people;
    private List<String> imageIds;
    @JsonIgnore private final Map<String, Object> changes = new LinkedHashMap<>();

    public void setRequestId(String value) {
        requestId = value;
    }

    public void setExpectedVersion(String value) {
        expectedVersion = value;
    }

    public void setTitle(String value) {
        title = value == null ? null : value.strip();
        changes.put("title", title);
    }

    public void setPeople(String value) {
        people = value == null ? null : value.strip();
        changes.put("people", people);
    }

    public void setImageIds(List<String> value) {
        imageIds = value;
        changes.put("imageIds", value);
    }
}
