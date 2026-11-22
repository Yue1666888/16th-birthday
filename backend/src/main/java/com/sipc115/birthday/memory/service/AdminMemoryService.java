package com.sipc115.birthday.memory.service;

import com.sipc115.birthday.audit.enums.AdminOperationCode;
import com.sipc115.birthday.audit.service.AuditLogService;
import com.sipc115.birthday.common.api.*;
import com.sipc115.birthday.common.exceptions.BusinessException;
import com.sipc115.birthday.common.utils.*;
import com.sipc115.birthday.idempotency.service.IdempotencyService;
import com.sipc115.birthday.media.model.UploadOwner;
import com.sipc115.birthday.media.response.ImageResponse;
import com.sipc115.birthday.media.service.MediaService;
import com.sipc115.birthday.memory.entity.*;
import com.sipc115.birthday.memory.mapper.*;
import com.sipc115.birthday.memory.request.*;
import com.sipc115.birthday.memory.response.*;
import com.sipc115.birthday.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.*;

@Service
public class AdminMemoryService {
    private final MemoryMapper mapper;
    private final MemoryImageMapper links;
    private final MediaService media;
    private final IdempotencyService idempotency;
    private final AuditLogService audit;
    private final CurrentUserProvider users;
    private final RequestFingerprint hashes;
    private final Clock clock;
    public AdminMemoryService(MemoryMapper mapper, MemoryImageMapper links, MediaService media, IdempotencyService idempotency, AuditLogService audit, CurrentUserProvider users, RequestFingerprint hashes, Clock clock) {
        this.mapper=mapper;this.links=links;this.media=media;this.idempotency=idempotency;this.audit=audit;this.users=users;this.hashes=hashes;this.clock=clock;
    }
    private Map<String,Object> payload(String name,String title,String content,List<String> ids) {
        var value=new LinkedHashMap<String,Object>();value.put("displayName",name);value.put("title",title);value.put("content",content);value.put("imageIds",ids);return value;
    }
    private void validate(String content,List<String> ids) {
        media.validateIds(ids,0);
        if(content==null && ids.isEmpty()) throw new BusinessException(ErrorCode.MEMORY_CONTENT_REQUIRED);
    }
    @Transactional
    public CommandResult<MemoryAdminResponse> create(MemoryCreateRequest request,UploadOwner owner) {
        String name=RequestValues.text(request.displayName(),50,"displayName",false),title=RequestValues.text(request.title(),100,"title",false),content=RequestValues.text(request.content(),5000,"content",false);
        validate(content,request.imageIds());var ids=List.copyOf(request.imageIds());var value=payload(name,title,content,ids);
        return idempotency.execute(AdminOperationCode.MEMORY_CREATE,request.requestId(),value,MemoryAdminResponse.class,()->{
            media.lockAndValidate(ids,owner,Set.of());
            if(!ids.isEmpty() && links.claimed(ids)>0) throw new BusinessException(ErrorCode.IMAGE_ALREADY_USED);
            var entry=new MemoryEntity();entry.setSubmissionId(UUID.randomUUID().toString());entry.setSubmissionHash(hashes.hash(value));entry.setDisplayName(name);entry.setTitle(title);entry.setContent(content);entry.setVersion(1L);entry.setPublishedAt(ApiTime.now(clock));entry.setUpdatedAt(entry.getPublishedAt());entry.setCreatedBySub(users.required().sub());entry.setUpdatedBySub(users.required().sub());
            mapper.insert(entry);saveImages(entry.getId(),ids);
            audit.record(AdminOperationCode.MEMORY_CREATE,"MEMORY",entry.getId().toString(),request.requestId(),Map.of("version",1));
            return new CommandResult<>(BusinessCode.MEMORY_CREATED,response(entry),false);
        });
    }
    @Transactional
    public CommandResult<MemoryAdminResponse> update(long id,MemoryPatchRequest request,UploadOwner owner) {
        long expected=RequestValues.version(request.getExpectedVersion());
        if(request.getChanges().isEmpty()) throw BusinessException.field("$","请至少修改一个字段");
        return idempotency.execute(AdminOperationCode.MEMORY_UPDATE,request.getRequestId(),Map.of("id",id,"expectedVersion",request.getExpectedVersion(),"changes",request.getChanges()),MemoryAdminResponse.class,()->{
            var entry=locked(id,expected);
            var oldIds=links.forParents(List.of(id)).stream().map(MemoryImageEntity::getImageId).toList();
            String name=request.getChanges().containsKey("displayName")?RequestValues.text(request.getDisplayName(),50,"displayName",false):entry.getDisplayName();
            String title=request.getChanges().containsKey("title")?RequestValues.text(request.getTitle(),100,"title",false):entry.getTitle();
            String content=request.getChanges().containsKey("content")?RequestValues.text(request.getContent(),5000,"content",false):entry.getContent();
            var ids=request.getChanges().containsKey("imageIds")?request.getImageIds():oldIds;
            validate(content,ids);ids=List.copyOf(ids);media.lockAndValidate(ids,owner,new HashSet<>(oldIds));
            if(!ids.isEmpty() && links.claimedByOther(ids,id)>0) throw new BusinessException(ErrorCode.IMAGE_ALREADY_USED);
            if(!Objects.equals(name,entry.getDisplayName()) || !Objects.equals(title,entry.getTitle()) || !Objects.equals(content,entry.getContent()) || !ids.equals(oldIds)) {
                entry.setDisplayName(name);entry.setTitle(title);entry.setContent(content);entry.setVersion(expected+1);entry.setUpdatedAt(ApiTime.now(clock));entry.setUpdatedBySub(users.required().sub());
                if(mapper.updateByVersion(entry,expected)!=1) throw new BusinessException(ErrorCode.VERSION_CONFLICT);
                links.deleteForParent(id);saveImages(id,ids);
            }
            audit.record(AdminOperationCode.MEMORY_UPDATE,"MEMORY",Long.toString(id),request.getRequestId(),Map.of("version",entry.getVersion()));
            return new CommandResult<>(BusinessCode.MEMORY_UPDATED,response(entry),false);
        });
    }
    @Transactional
    public CommandResult<MemoryDeleteResponse> delete(long id,String expectedVersion,String requestId) {
        long expected=RequestValues.version(expectedVersion);
        return idempotency.execute(AdminOperationCode.MEMORY_DELETE,requestId,Map.of("id",id,"expectedVersion",expectedVersion),MemoryDeleteResponse.class,()->{
            var entry=locked(id,expected);entry.setVersion(expected+1);entry.setDeletedAt(ApiTime.now(clock));entry.setUpdatedAt(entry.getDeletedAt());entry.setUpdatedBySub(users.required().sub());
            if(mapper.deleteByVersion(entry,expected)!=1) throw new BusinessException(ErrorCode.VERSION_CONFLICT);
            audit.record(AdminOperationCode.MEMORY_DELETE,"MEMORY",Long.toString(id),requestId,Map.of("deleted",true));
            return new CommandResult<>(BusinessCode.MEMORY_DELETED,new MemoryDeleteResponse(Long.toString(id),true,entry.getVersion().toString(),ApiTime.format(entry.getDeletedAt())),false);
        });
    }
    private MemoryEntity locked(long id,long expected) {
        var entry=mapper.lock(id);if(entry==null)throw new BusinessException(ErrorCode.MEMORY_NOT_FOUND);
        if(entry.getVersion()!=expected)throw new BusinessException(ErrorCode.VERSION_CONFLICT);return entry;
    }
    private void saveImages(long id,List<String> ids) {
        if(ids.isEmpty())return;
        var rows=new ArrayList<MemoryImageEntity>();for(int i=0;i<ids.size();i++){var row=new MemoryImageEntity();row.setMemoryId(id);row.setImageId(ids.get(i));row.setPosition(i+1);rows.add(row);}
        try { links.insertBatch(rows); } catch (DuplicateKeyException ex) { throw new BusinessException(ErrorCode.IMAGE_ALREADY_USED); }
    }
    private Map<Long,List<ImageResponse>> pictures(List<Long> ids) {
        if(ids.isEmpty())return Map.of();var rows=links.forParents(ids);var all=media.images(rows.stream().map(MemoryImageEntity::getImageId).toList());
        var result=new HashMap<Long,List<ImageResponse>>();for(var row:rows)result.computeIfAbsent(row.getMemoryId(),key->new ArrayList<>()).add(all.get(row.getImageId()));return result;
    }
    private MemoryAdminResponse response(MemoryEntity entry) { return response(entry,pictures(List.of(entry.getId())).getOrDefault(entry.getId(),List.of())); }
    private MemoryAdminResponse response(MemoryEntity entry,List<ImageResponse> images) {return new MemoryAdminResponse(entry.getId().toString(),entry.getDisplayName(),entry.getTitle(),entry.getContent(),images,ApiTime.format(entry.getPublishedAt()),ApiTime.format(entry.getUpdatedAt()),entry.getVersion().toString(),entry.getCreatedBySub()==null?"VISITOR":"ADMIN");}
    @Transactional(readOnly=true)
    public MemoryAdminResponse detail(long id) {var entry=mapper.findById(id);if(entry==null)throw new BusinessException(ErrorCode.MEMORY_NOT_FOUND);return response(entry);}
    @Transactional(readOnly=true)
    public PageResponse<MemoryAdminResponse> page(int page,int size,String keyword) {
        RequestValues.page(page,size,100);String query=RequestValues.text(keyword,100,"keyword",false);
        if(query!=null)query=query.replace("!","!!").replace("%","!%").replace("_","!_");
        var entries=mapper.adminPage(query,(page-1L)*size,size);var images=pictures(entries.stream().map(MemoryEntity::getId).toList());
        return PageResponse.of(entries.stream().map(e->response(e,images.getOrDefault(e.getId(),List.of()))).toList(),page,size,mapper.adminCount(query));
    }
}
