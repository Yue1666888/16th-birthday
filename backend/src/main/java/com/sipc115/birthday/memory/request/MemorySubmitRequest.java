package com.sipc115.birthday.memory.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class MemorySubmitRequest {
    private String submissionId;
    private String displayName;
    private String title;
    private String content;
    private List<String> imageIds = List.of();
}
