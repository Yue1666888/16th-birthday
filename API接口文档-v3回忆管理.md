# 回忆管理接口扩展 v3

2026-11-22。继承《API接口文档》和v2统一契约。本扩展新增5个 HTTP 方法/路径组合；前缀 `/api/v1`，管理接口均要求 member SSO Bearer，沿用现有权限，不增加角色。

## 响应与通用规范

统一返回 `code/message/data/fieldErrors/traceId`；成功 fieldErrors 为 `{}`，错误 data 为 null。ID、version、expectedVersion 均为十进制正整数**字符串**；UUID 使用小写v4。日期时间为 Asia/Shanghai 带时区和毫秒的字符串。未知请求字段、未知/重复查询参数、错误类型均拒绝。姓名、标题、正文 trim，空白统一为 null；长度按 Unicode 码点。

| 方法 | 路径 | 成功 HTTP / code | data |
| --- | --- | --- | --- |
| GET | /admin/memories | 200 / OK | Page<MemoryAdminResponse> |
| GET | /admin/memories/{id} | 200 / OK | MemoryAdminResponse |
| POST | /admin/memories | 201 / MEMORY_CREATED | MemoryAdminResponse |
| PATCH | /admin/memories/{id} | 200 / MEMORY_UPDATED | MemoryAdminResponse |
| DELETE | /admin/memories/{id} | 200 / MEMORY_DELETED | MemoryDeleteResponse |

## 列表与详情

GET 列表 query：`page` 默认1，正整数；`size` 默认20，1～100；`keyword` 可省略，trim后最多100码点，按姓名/标题/正文**字面包含**搜索，`%`、`_` 不作为通配符。只返回未删除内容，按 updatedAt倒序、id倒序。详情路径id不存在或已删除统一404。

Page字段：`content` 对象数组、`page` 整数、`size` 整数、`totalElements` 整数、`totalPages` 整数；空结果content=[]、totalPages=0。

MemoryAdminResponse：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| id | string(int64) | 回忆编号 |
| displayName | string/null | 姓名，可空，界面按匿名显示 |
| title | string/null | 标题，可空 |
| content | string/null | 完整正文，可空 |
| images | ImageResponse[] | 按顺序展示，0～9张；首张作封面 |
| publishedAt | date-time | 首次发布时间，编辑保持不变 |
| updatedAt | date-time | 实际编辑时间 |
| version | string(int64) | 并发版本 |
| source | VISITOR / ADMIN | 来源只读；管理员编辑访客投稿不改变来源 |

ImageResponse字段固定为 `id` UUID、`url` string、`width` integer/null、`height` integer/null。不公开上传凭证或SSO sub。

## 新增和修改

POST JSON：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| requestId | 是 | UUID v4，创建重试保持一致 |
| displayName | 否 | null或string，最多50码点 |
| title | 否 | null或string，最多100码点 |
| content | 否 | null或string，最多5000码点 |
| imageIds | 是 | 0～9个不同图片UUID，按最终展示顺序传递 |

正文和图片至少一项；仅姓名/标题不成立。图片先使用现有 `POST /media/images`，multipart字段file，附当前Bearer；保存时传返回的图片ID，不能传任意URL。上传限制沿用原图片接口（每张10MiB，JPG/PNG/WebP/GIF及实际解码校验）。

PATCH JSON：必填 `requestId`、`expectedVersion`，至少一个可修改字段displayName/title/content/imageIds。省略字段保持原值；可选文本传null或空白表示清空；imageIds传[]清空全部图片，传null非法。清空后仍需满足图文至少一项。

新增图片必须由当前SSO成员上传；编辑可保留原投稿已有图片，即使原图来自匿名访客。图片不得已被其他回忆占用，包括软删除投稿。图片增删与重新排序、正文/姓名修改、版本更新在同一事务完成。真实变化使version+1；无变化保存返回MEMORY_UPDATED但不递增版本或修改时间。

示例：

```json
{"requestId":"a83a721e-987d-4f27-b4f8-3d1519371585","expectedVersion":"2","displayName":"归来的同学","content":"在115的回忆","imageIds":[]}
```

## 删除

DELETE `/admin/memories/123?expectedVersion=2&requestId=a83a721e-987d-4f27-b4f8-3d1519371585`，无请求体。

MemoryDeleteResponse字段：`id` string、`deleted` true、`version` string、`deletedAt` date-time。软删除后管理列表、公开列表/详情、姓名墙统计都不再展示；原数据和图片关联留存，不支持恢复接口。

## 幂等、并发、公开联动

创建、修改、删除均以操作类型+当前成员+requestId幂等；同编号同规范化请求返回首次结果并带 `Idempotency-Replayed: true`，同编号不同请求返回409 IDEMPOTENCY_CONFLICT。删除后的新请求返回404；原成功删除请求重放仍返回原成功结果。expectedVersion不匹配返回409 VERSION_CONFLICT，界面保留草稿，不能静默覆盖。

公开 `/memories`、`/memories/{id}`、`/memories/names` 契约不变；查询统一排除软删除。管理员修改不会篡改首次投稿的submissionId/hash，原访客重试不能恢复已删除记录。管理写入记录MEMORY_CREATE/UPDATE/DELETE审计动作，resourceType=MEMORY，不保存正文或凭据到审计摘要。

## 相关错误码

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | BAD_REQUEST / VALIDATION_ERROR | JSON、查询、ID、版本、字段、长度、空PATCH非法 |
| 400 | MEMORY_CONTENT_REQUIRED | 正文与图片全空 |
| 400 | IMAGE_COUNT_INVALID / IMAGE_DUPLICATED | 图片数量或重复ID不合法 |
| 401 | UNAUTHORIZED | 缺失或无效SSO令牌 |
| 403 | IMAGE_ACCESS_DENIED | 无权关联新增图片 |
| 404 | MEMORY_NOT_FOUND / IMAGE_NOT_FOUND | 回忆已删除/不存在，或图片不存在 |
| 409 | VERSION_CONFLICT / IDEMPOTENCY_CONFLICT | 并发版本或操作编号冲突 |
| 409 | IMAGE_ALREADY_USED | 图片被另一投稿认领，包括并发认领 |
| 503 | SERVICE_BUSY | 事务并发重试耗尽 |

通用405/406/413/415/500及上传中台502/503/504继续遵循原接口文档，无新增错误码。新增业务码MEMORY_UPDATED、MEMORY_DELETED；MEMORY_CREATED原已存在。
