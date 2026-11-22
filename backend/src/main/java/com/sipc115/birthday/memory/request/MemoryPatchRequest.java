package com.sipc115.birthday.memory.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import java.util.*;

@Getter
public class MemoryPatchRequest {
    private String requestId;
    private String expectedVersion;
    private String displayName;
    private String title;
    private String content;
    private List<String> imageIds;
    @JsonIgnore private final Map<String,Object> changes = new LinkedHashMap<>();
    public void setRequestId(String value) { requestId = value; }
    public void setExpectedVersion(String value) { expectedVersion = value; }
    public void setDisplayName(String value) { displayName = value == null ? null : value.strip(); changes.put("displayName", displayName); }
    public void setTitle(String value) { title = value == null ? null : value.strip(); changes.put("title", title); }
    public void setContent(String value) { content = value == null ? null : value.strip(); changes.put("content", content); }
    public void setImageIds(List<String> value) { imageIds = value; changes.put("imageIds", value); }
}
