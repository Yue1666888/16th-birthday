package com.sipc115.birthday;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.sipc115.birthday.media.client.FileApiClient;
import com.sipc115.birthday.media.service.UploadOwnershipService;
import com.sipc115.birthday.testsupport.LocalTestDatabase;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.json.JsonMapper;

import java.util.*;

@SpringBootTest
@AutoConfigureMockMvc
class WallsIT {
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private JsonMapper json;
    @MockitoBean private FileApiClient files;

    private record Upload(String id, Cookie cookie) {}

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) throws Exception {
        LocalTestDatabase.configure(registry);
    }

    @BeforeEach
    void prepare() {
        assertEquals("birthday16_test", jdbc.queryForObject("SELECT DATABASE()", String.class));
        clear();
        when(files.upload(any()))
                .thenReturn(
                        new FileApiClient.Result(
                                "https://image.sipc115.com/i/test.png",
                                "test.png",
                                "test.png",
                                1,
                                1));
    }

    @AfterEach
    void clear() {
        jdbc.update("DELETE FROM admin_operation_logs");
        jdbc.update("DELETE FROM idempotency_requests");
        jdbc.update("DELETE FROM honor_images");
        jdbc.update("DELETE FROM honor_entries");
        jdbc.update("DELETE FROM memory_images");
        jdbc.update("DELETE FROM memories");
        jdbc.update("DELETE FROM media_images");
    }

    private Upload upload(boolean admin) throws Exception {
        byte[] png =
                Base64.getDecoder()
                        .decode(
                                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jqV0AAAAASUVORK5CYII=");
        var request =
                multipart("/api/v1/media/images")
                        .file(new MockMultipartFile("file", "test.png", "image/png", png));
        if (admin) {
            request.with(jwt());
        }
        var response =
                mvc.perform(request).andExpect(status().isCreated()).andReturn().getResponse();
        Map<?, ?> body = json.readValue(response.getContentAsString(), Map.class);
        Map<?, ?> data = (Map<?, ?>) body.get("data");
        assertTrue(data.containsKey("width"));
        Cookie cookie = null;
        String setCookie = response.getHeader("Set-Cookie");
        if (setCookie != null) {
            cookie =
                    new Cookie(
                            UploadOwnershipService.COOKIE_NAME,
                            setCookie.split(";", 2)[0].split("=", 2)[1]);
        }
        return new Upload(data.get("id").toString(), cookie);
    }

    @Test
    void anonymousTextMemoryPublishesAndReplays() throws Exception {
        String payload =
                json.writeValueAsString(
                        Map.of(
                                "submissionId",
                                UUID.randomUUID().toString(),
                                "content",
                                "匿名回忆",
                                "imageIds",
                                List.of()));
        mvc.perform(
                        post("/api/v1/memories")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.displayName").isEmpty())
                .andExpect(jsonPath("$.data.title").isEmpty());
        mvc.perform(
                        post("/api/v1/memories")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotency-Replayed", "true"));
        mvc.perform(get("/api/v1/memories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    void uploadedImageNeedsItsAnonymousSessionAndCannotBeDoubleClaimed() throws Exception {
        var image = upload(false);
        String payload =
                json.writeValueAsString(
                        Map.of(
                                "submissionId",
                                UUID.randomUUID().toString(),
                                "imageIds",
                                List.of(image.id())));
        mvc.perform(
                        post("/api/v1/memories")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("IMAGE_ACCESS_DENIED"));
        mvc.perform(
                        post("/api/v1/memories")
                                .cookie(image.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.images[0].id").value(image.id()));
        String second =
                json.writeValueAsString(
                        Map.of(
                                "submissionId",
                                UUID.randomUUID().toString(),
                                "imageIds",
                                List.of(image.id())));
        mvc.perform(
                        post("/api/v1/memories")
                                .cookie(image.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(second))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IMAGE_ALREADY_USED"));
    }

    @Test
    void emptyMemoryAndNullArrayAreRejected() throws Exception {
        mvc.perform(
                        post("/api/v1/memories")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "submissionId",
                                                        UUID.randomUUID().toString(),
                                                        "title",
                                                        "只有标题"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MEMORY_CONTENT_REQUIRED"));
        mvc.perform(
                        post("/api/v1/memories")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"submissionId\":\"10000000-0000-4000-8000-000000000001\",\"content\":\"正文\",\"imageIds\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.imageIds").exists());
    }

    @Test
    void honorSupportsNinePhotosReorderingAndVersionedDeletion() throws Exception {
        List<String> images = new ArrayList<>();
        for (int i = 0; i < 9; i++) {
            images.add(upload(true).id());
        }
        String requestId = UUID.randomUUID().toString();
        String payload =
                json.writeValueAsString(
                        Map.of(
                                "requestId",
                                requestId,
                                "title",
                                "荣誉标题",
                                "people",
                                "张三、李四",
                                "imageIds",
                                images));
        var response =
                mvc.perform(
                                post("/api/v1/admin/honors")
                                        .with(jwt())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(payload))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.data.images.length()").value(9))
                        .andExpect(jsonPath("$.data.people").value("张三、李四"))
                        .andReturn()
                        .getResponse();
        Map<?, ?> data =
                (Map<?, ?>) json.readValue(response.getContentAsString(), Map.class).get("data");
        String id = data.get("id").toString();
        mvc.perform(
                        post("/api/v1/admin/honors")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotency-Replayed", "true"));
        Collections.reverse(images);
        String update =
                json.writeValueAsString(
                        Map.of(
                                "requestId",
                                UUID.randomUUID().toString(),
                                "expectedVersion",
                                "1",
                                "imageIds",
                                images));
        mvc.perform(
                        patch("/api/v1/admin/honors/" + id)
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(update))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value("2"))
                .andExpect(jsonPath("$.data.images[0].id").value(images.getFirst()));
        mvc.perform(get("/api/v1/honors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].images.length()").value(9));
        String deletion = UUID.randomUUID().toString();
        mvc.perform(
                        delete("/api/v1/admin/honors/" + id)
                                .with(jwt())
                                .param("requestId", deletion)
                                .param("expectedVersion", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deleted").value(true));
        mvc.perform(
                        delete("/api/v1/admin/honors/" + id)
                                .with(jwt())
                                .param("requestId", deletion)
                                .param("expectedVersion", "2"))
                .andExpect(status().isOk())
                .andExpect(header().string("Idempotency-Replayed", "true"));
        mvc.perform(get("/api/v1/honors")).andExpect(jsonPath("$.data.totalElements").value(0));
        mvc.perform(get("/api/v1/admin/honors/" + id).with(jwt())).andExpect(status().isNotFound());
    }

    @Test
    void honorRejectsMissingPeopleAndInvalidImageCollections() throws Exception {
        String image = upload(true).id();
        mvc.perform(
                        post("/api/v1/admin/honors")
                                .with(jwt())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of(
                                                        "requestId",
                                                        UUID.randomUUID().toString(),
                                                        "title",
                                                        "标题",
                                                        "people",
                                                        "",
                                                        "imageIds",
                                                        List.of(image)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.people").exists());
        for (var images :
                List.of(List.<String>of(), Collections.nCopies(10, image), List.of(image, image))) {
            mvc.perform(
                            post("/api/v1/admin/honors")
                                    .with(jwt())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            json.writeValueAsString(
                                                    Map.of(
                                                            "requestId",
                                                            UUID.randomUUID().toString(),
                                                            "title",
                                                            "标题",
                                                            "people",
                                                            "人员",
                                                            "imageIds",
                                                            images))))
                    .andExpect(status().isBadRequest());
        }
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM honor_entries", Integer.class));
    }

    @Test
    void multipartAndJsonBoundariesHaveUniformErrors() throws Exception {
        mvc.perform(multipart("/api/v1/media/images"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(
                        multipart("/api/v1/media/images")
                                .file(new MockMultipartFile("file", new byte[0])))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("IMAGE_EMPTY"));
        mvc.perform(
                        post("/api/v1/memories")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("x".repeat(1048577)))
                .andExpect(status().is(413))
                .andExpect(jsonPath("$.code").value("REQUEST_TOO_LARGE"));
    }
}
