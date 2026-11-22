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
class AdminMemoriesIT {
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

    private String createPublic(String name,String content,List<String> images,Cookie cookie) throws Exception {
        var body=new LinkedHashMap<String,Object>();body.put("submissionId",UUID.randomUUID().toString());body.put("displayName",name);body.put("content",content);body.put("imageIds",images);
        var call=post("/api/v1/memories").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));if(cookie!=null)call.cookie(cookie);
        return json.readTree(mvc.perform(call).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("data").path("id").asString();
    }
    private String patchBody(String version,String requestId,Map<String,Object> changes) {
        var body=new LinkedHashMap<String,Object>(changes);body.put("expectedVersion",version);body.put("requestId",requestId);return json.writeValueAsString(body);
    }
    @Test
    void publicMemoryCanBeEditedIdempotentlyAndPublicViewsReflectChanges() throws Exception {
        String id=createPublic("原作者","原内容",List.of(),null),request=UUID.randomUUID().toString();
        String body=patchBody("1",request,Map.of("displayName","新作者","title","新标题","content","新内容"));
        mvc.perform(patch("/api/v1/admin/memories/"+id).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.code").value("MEMORY_UPDATED")).andExpect(jsonPath("$.data.version").value("2")).andExpect(jsonPath("$.data.source").value("VISITOR"));
        mvc.perform(patch("/api/v1/admin/memories/"+id).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(header().string("Idempotency-Replayed","true"));
        mvc.perform(get("/api/v1/memories/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.data.content").value("新内容"));
        mvc.perform(get("/api/v1/memories/names")).andExpect(jsonPath("$.data.names[0].name").value("新作者"));
        mvc.perform(get("/api/v1/admin/memories").with(jwt()).param("keyword","新标题")).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1));
        mvc.perform(get("/api/v1/admin/memories/"+id)).andExpect(status().isUnauthorized());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM admin_operation_logs WHERE action='MEMORY_UPDATE'",Integer.class));
    }
    @Test
    void deletionLeavesTombstoneAndSubmissionRetryCannotResurrectIt() throws Exception {
        var submission=UUID.randomUUID().toString();String payload=json.writeValueAsString(Map.of("submissionId",submission,"displayName","删除作者","content","待删除内容","imageIds",List.of()));
        String id=json.readTree(mvc.perform(post("/api/v1/memories").contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("data").path("id").asString();
        String request=UUID.randomUUID().toString();
        for(int attempt=0;attempt<2;attempt++)mvc.perform(delete("/api/v1/admin/memories/"+id).with(jwt()).param("expectedVersion","1").param("requestId",request)).andExpect(status().isOk()).andExpect(jsonPath("$.code").value("MEMORY_DELETED"));
        mvc.perform(get("/api/v1/memories/"+id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/memories/names")).andExpect(jsonPath("$.data.totalSubmissions").value(0));
        mvc.perform(get("/api/v1/admin/memories").with(jwt())).andExpect(jsonPath("$.data.totalElements").value(0));
        mvc.perform(post("/api/v1/memories").contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isNotFound());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM memories WHERE id=? AND deleted_at IS NOT NULL",Integer.class,id));
    }
    @Test
    void anonymousImagesCanBeRetainedButForeignNewUploadsCannotBeAdded() throws Exception {
        var original=upload(false);String id=createPublic(null,null,List.of(original.id()),original.cookie());
        mvc.perform(patch("/api/v1/admin/memories/"+id).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(patchBody("1",UUID.randomUUID().toString(),Map.of("title","保留匿名图片")))).andExpect(status().isOk()).andExpect(jsonPath("$.data.images[0].id").value(original.id()));
        var foreign=upload(false);
        mvc.perform(patch("/api/v1/admin/memories/"+id).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(patchBody("2",UUID.randomUUID().toString(),Map.of("imageIds",List.of(original.id(),foreign.id()))))).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("IMAGE_ACCESS_DENIED"));
        var own=upload(true);
        mvc.perform(patch("/api/v1/admin/memories/"+id).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(patchBody("2",UUID.randomUUID().toString(),Map.of("imageIds",List.of(own.id(),original.id()))))).andExpect(status().isOk()).andExpect(jsonPath("$.data.images[0].id").value(own.id()));
    }
    @Test
    void contentRuleAndVersionConflictAreEnforcedWithoutOverwritingData() throws Exception {
        String id=createPublic(null,"保留内容",List.of(),null);
        var empty=new LinkedHashMap<String,Object>();empty.put("content",null);empty.put("imageIds",List.of());
        mvc.perform(patch("/api/v1/admin/memories/"+id).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(patchBody("1",UUID.randomUUID().toString(),empty))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("MEMORY_CONTENT_REQUIRED"));
        mvc.perform(patch("/api/v1/admin/memories/"+id).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(patchBody("1",UUID.randomUUID().toString(),Map.of("content","新版本")))).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/admin/memories/"+id).with(jwt()).param("expectedVersion","1").param("requestId",UUID.randomUUID().toString())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        mvc.perform(get("/api/v1/memories/"+id)).andExpect(jsonPath("$.data.content").value("新版本"));
    }
    @Test
    void adminCreationClaimsImagesAndLiteralSearchDoesNotTreatWildcardsAsPatterns() throws Exception {
        var image=upload(true);String request=UUID.randomUUID().toString();
        String body=json.writeValueAsString(Map.of("requestId",request,"displayName","管理员","content","完成100%_真实","imageIds",List.of(image.id())));
        for(int attempt=0;attempt<2;attempt++)mvc.perform(post("/api/v1/admin/memories").with(jwt()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.data.source").value("ADMIN"));
        mvc.perform(get("/api/v1/admin/memories").with(jwt()).param("keyword","%_")).andExpect(jsonPath("$.data.totalElements").value(1));
        mvc.perform(get("/api/v1/admin/memories").with(jwt()).param("keyword","not-present%")).andExpect(jsonPath("$.data.totalElements").value(0));
        String other=json.writeValueAsString(Map.of("requestId",UUID.randomUUID().toString(),"content","重复图片","imageIds",List.of(image.id())));
        mvc.perform(post("/api/v1/admin/memories").with(jwt()).contentType(MediaType.APPLICATION_JSON).content(other)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IMAGE_ALREADY_USED"));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM memories",Integer.class));
    }    @Test
    void concurrentClaimsForOneImageHaveExactlyOneWinner() throws Exception {
        var image=upload(true);
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        var ready=new java.util.concurrent.CountDownLatch(2);
        var go=new java.util.concurrent.CountDownLatch(1);
        try {
            var tasks=new ArrayList<java.util.concurrent.Future<Integer>>();
            for(int n=0;n<2;n++) tasks.add(pool.submit(()->{
                ready.countDown();go.await();
                return mvc.perform(post("/api/v1/admin/memories").with(jwt()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("requestId",UUID.randomUUID().toString(),"content","并发图片认领","imageIds",List.of(image.id()))))).andReturn().getResponse().getStatus();
            }));
            assertTrue(ready.await(5,java.util.concurrent.TimeUnit.SECONDS));go.countDown();
            var statuses=new HashSet<Integer>();for(var task:tasks)statuses.add(task.get(10,java.util.concurrent.TimeUnit.SECONDS));
            assertEquals(Set.of(201,409),statuses);
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM memories",Integer.class));
        } finally { go.countDown();pool.shutdownNow(); }
    }

}
