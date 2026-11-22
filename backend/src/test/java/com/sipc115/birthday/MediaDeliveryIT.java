package com.sipc115.birthday;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import com.sipc115.birthday.media.client.FileApiClient;
import com.sipc115.birthday.testsupport.LocalTestDatabase;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest @AutoConfigureMockMvc
class MediaDeliveryIT {
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired JsonMapper json;
    @Autowired com.sipc115.birthday.common.cache.PublicWallCache cache;
    @MockitoBean FileApiClient files;
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry)throws Exception{LocalTestDatabase.configure(registry);registry.add("app.cache.public-seconds",()->"10");}
    @BeforeEach void prepare(){
        assertEquals("birthday16_test",jdbc.queryForObject("SELECT DATABASE()",String.class));
        jdbc.update("DELETE FROM memory_images");jdbc.update("DELETE FROM honor_images");jdbc.update("DELETE FROM media_images");
        jdbc.update("DELETE FROM memories");cache.invalidate();
        when(files.upload(any())).thenReturn(new FileApiClient.Result("https://image.sipc115.com/1.png","one.png","1.png",4,4,"https://image.sipc115.com/thumbnails/1.png"));
    }
    @Test void successfulUploadsReplayByOwnerAndOperationIdWithoutSendingTheFileAgain()throws Exception{
        String operation=UUID.randomUUID().toString();byte[] bytes={(byte)137,80,78,71,13,10,26,10,1};
        var file=new MockMultipartFile("file","one.png","image/png",bytes);
        var first=mvc.perform(multipart("/api/v1/media/images").file(file).header("X-Upload-ID",operation)).andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.thumbnailUrl").value("https://image.sipc115.com/thumbnails/1.png")).andReturn();
        Cookie cookie=first.getResponse().getCookie("birthday_upload_session");assertNotNull(cookie);
        String id=json.readTree(first.getResponse().getContentAsString()).path("data").path("id").asText();
        mvc.perform(multipart("/api/v1/media/images").file(file).cookie(cookie).header("X-Upload-ID",operation)).andExpect(status().isCreated()).andExpect(jsonPath("$.data.id").value(id));
        verify(files,times(1)).upload(any());
        bytes[8]=2;
        mvc.perform(multipart("/api/v1/media/images").file(new MockMultipartFile("file","one.png","image/png",bytes)).cookie(cookie).header("X-Upload-ID",operation)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM media_images",Integer.class));
    }
    @Test void committedAdminChangesInvalidateCachedNamesAndDetails()throws Exception{
        var created=mvc.perform(post("/api/v1/memories").contentType("application/json").content("{\"submissionId\":\""+UUID.randomUUID()+"\",\"displayName\":\"缓存旧署名\",\"content\":\"回忆\",\"imageIds\":[]}")).andExpect(status().isCreated()).andReturn();
        String id=json.readTree(created.getResponse().getContentAsString()).path("data").path("id").asText();
        mvc.perform(get("/api/v1/memories/names")).andExpect(jsonPath("$.data.names[0].name").value("缓存旧署名"));
        mvc.perform(get("/api/v1/memories/"+id)).andExpect(jsonPath("$.data.displayName").value("缓存旧署名"));
        mvc.perform(patch("/api/v1/admin/memories/"+id).with(jwt()).contentType("application/json").content("{\"requestId\":\""+UUID.randomUUID()+"\",\"expectedVersion\":\"1\",\"displayName\":\"缓存新署名\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/memories/names")).andExpect(jsonPath("$.data.names[0].name").value("缓存新署名"));
        mvc.perform(get("/api/v1/memories/"+id)).andExpect(jsonPath("$.data.displayName").value("缓存新署名"));
        mvc.perform(delete("/api/v1/admin/memories/"+id).with(jwt()).param("expectedVersion","2").param("requestId",UUID.randomUUID().toString())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/memories/"+id)).andExpect(status().isNotFound());
    }
    @Test void concurrentUploadsStayWithinAdmissionBudget()throws Exception{
        var active=new java.util.concurrent.atomic.AtomicInteger();var peak=new java.util.concurrent.atomic.AtomicInteger();
        when(files.upload(any())).thenAnswer(invocation->{
            int count=active.incrementAndGet();peak.accumulateAndGet(count,Math::max);
            try{Thread.sleep(80);return new FileApiClient.Result("https://image.sipc115.com/1.png","one.png","1.png",4,4);}
            finally{active.decrementAndGet();}
        });
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(12)){
            var pending=new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for(int i=0;i<12;i++)pending.add(pool.submit(()->mvc.perform(multipart("/api/v1/media/images")
                .file(new MockMultipartFile("file","one.png","image/png",new byte[]{(byte)137,80,78,71,13,10,26,10,1}))
                .cookie(new Cookie("birthday_upload_session","c".repeat(64))).header("X-Upload-ID",UUID.randomUUID().toString())).andReturn().getResponse().getStatus()));
            for(var response:pending)assertEquals(201,response.get());
        }
        assertTrue(peak.get()<=8);assertTrue(peak.get()>1);
    }

}
