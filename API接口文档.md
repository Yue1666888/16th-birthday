# 社团十六周年邀请函 API 契约

文档版本为 v2.1，API 主版本为 v1，更新日期为 2026-11-21。

依据 [需求规格与实现链路 v1.5](需求规格与实现链路.md) 和 [数据库设计 v1.2](数据库设计.md) 编写。本文确定统一响应、分页、字段类型、全部首版接口、业务码、错误码、状态枚举和幂等规则，作为前后端实现与后续 OpenAPI 同步的契约。业务接口实现与 HTTP 联调在开发阶段验证。

> 最新管理员接口以 [v2扩展](API接口文档-v2管理员扩展.md) 为准：新增详情、收件人快照、自定义单发/群发、集中历史和服务日志；原接口保留兼容，加上下文新增的公开姓名墙接口，当前合计30个HTTP方法/路径组合。

## 1. 基础约定

### 1.1 地址、路径与认证

| 项目 | 契约 |
| --- | --- |
| 业务前缀 | /api/v1 |
| 本地前端 | http://127.0.0.1:5173 或 http://localhost:5173，通过 /api 代理至本机后端 |
| 生产地址 | 正式域名待配置，同源 /api 反向代理 |
| JSON 请求 | Content-Type: application/json; charset=utf-8 |
| JSON 响应 | Content-Type: application/json; charset=utf-8 |
| Accept | JSON 接口接受 application/json，CSV 接口接受 text/csv，支持省略或兼容通配类型 |
| 管理认证 | Authorization: Bearer <Keycloak 用户 access_token> |
| 管理资格 | member 域 SSO 用户认证通过即可管理 |
| 图片上传 | multipart/form-data，字段 file，每次一张 |
| 字段风格 | JSON 使用 lowerCamelCase，数据库字段按 ORM 映射转换 |
| 缓存 | 本项目 API 默认 Cache-Control: no-store；图床资源缓存由图片服务处理 |

管理端使用 birthday-web 完成授权码与 PKCE S256 登录，后端验证签名、issuer、有效期及配置的 audience。邮件客户端 birthday-api-mail 由后端使用，其 mail 角色供中台鉴权。

### 1.2 通用请求规范

- 路径和字段名称大小写敏感，枚举值必须使用本文规定的大小写。
- JSON 请求体最大 1 MiB，multipart 总体最大 11 MiB，其中单张文件最多 10 MiB，超过时按对应大小错误码返回。
- 请求体为空的接口要求空 body，额外内容返回 BAD_REQUEST。
- 请求对象拒绝未知字段，类型错误统一返回校验错误，JSON 数字不会隐式转成手机号、编号或版本。
- Query 参数均为单值，重复同名参数返回 BAD_REQUEST。除明确声明字段外的参数返回 VALIDATION_ERROR。
- 非必填查询参数省略时采用默认值；空白 keyword 等同省略。page、size、枚举与版本传空字符串视为非法。
- 文本长度按 Unicode 码点计算，与 MySQL CHAR_LENGTH 对齐。业务文本先去首尾空白再校验。
- 可选文本空白规范化为 null，业务正文按纯文本处理，图片以编号数组关联。
- 所有图片数组保留顺序，元素不得重复；数据库 position 从 1 开始，错误字段路径的数组下标从 0 开始。
- 创建或修改成功后，前端以服务端返回的版本和图片顺序为准。

### 1.3 编号、版本、时间与空值

| 类型 | JSON 表达 |
| --- | --- |
| 数据库 BIGINT 编号 | 正整数十进制字符串，例如 "1024" |
| version、expectedVersion、invitationVersion | 正整数十进制字符串，例如 "2" |
| 图片、提交和操作编号 | 小写 UUID v4 字符串 |
| page、size、sendNo、计数、图片宽高与字节数 | JSON integer |
| 时间 | RFC 3339，固定毫秒精度与 +08:00 时区 |
| 空对象和空数组 | 分别为 {} 与 [] |
| 已声明可空字段 | 固定返回该键，值为 null |

编号和版本范围为 1～9223372036854775807，JSON 和路由参数使用无前导零的字符串，防止 JavaScript 精度丢失。分页总数使用非负安全整数。数据库时间按 UTC 保存，由 API 转换为 Asia/Shanghai。

### 1.4 追踪与幂等标识

| 名称 | 位置 | 含义 |
| --- | --- | --- |
| traceId | 响应体 | 服务端为本次 HTTP 请求生成的 UUID |
| X-Request-ID | 响应头 | 与 traceId 一致 |
| requestId | 管理命令 JSON 或删除 query | 本次业务操作的 UUID，网络重试复用 |
| submissionId | 投稿请求 JSON | 本次公开投稿的稳定 UUID |
| Idempotency-Replayed | 响应头 | 幂等重放时为 true |
| Retry-After | 429 响应头 | 建议等待的正整数秒 |

traceId 随每次 HTTP 请求生成，requestId 与 submissionId 随一次用户操作生成。后端生成摘要并比较规范化请求，摘要包含资源路径、版本和有序业务参数。同键不同参数返回 IDEMPOTENCY_CONFLICT。

管理命令按操作类型和用户 sub 隔离，投稿按 submissionId 去重，邮件确认按确认用户和 requestId 去重。成功重放保留原 HTTP 状态、code 与 data，traceId 使用当前请求值。删除重试必须复用原 requestId。

## 2. 统一响应与分页

### 2.1 JSON 响应

统一采用 ApiResponse<T>，五个字段始终存在。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "status": "UP"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

失败示例如下。

```json
{
  "code": "VALIDATION_ERROR",
  "message": "请检查填写内容",
  "data": null,
  "fieldErrors": {
    "mailingAddress": "选择邮寄时必须填写地址"
  },
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

fieldErrors 使用请求字段路径，例如 name、expectedVersion、imageIds、imageIds[0]。一个字段返回一条中文错误提示，跨字段错误归到可修正的字段。非字段错误返回 {}。

HTTP 状态用于区分成功、校验、认证、冲突或服务失败。code 是稳定机器码，message 可展示，前端据 code 执行业务分支。成功码与错误码分别见第 4 节。

### 2.2 分页

所有列表使用相同 Page<T>，固定放在 data 中，采用 content、page、size、totalElements、totalPages 五个字段。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "content": [],
    "page": 1,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

| 参数或行为 | 约定 |
| --- | --- |
| page | 从 1 开始，默认 1 |
| size | 默认 20 |
| 公开回忆、公开荣誉 | size 最大 50 |
| 后台报名、后台荣誉、邮件历史 | size 最大 100 |
| 参数越界 | 返回 400，不静默截断或改为默认值 |
| 空列表 | content=[]，totalElements=0，totalPages=0 |
| 超过最后一页 | content=[]，保留请求 page，返回实际总数和总页数 |
| 是否还有下一页 | 前端根据 page < totalPages 计算 |
| 排序 | 每个接口指定固定排序，同时间使用编号稳定排序 |

### 2.3 CSV 文件响应

导出成功返回 HTTP 200、Content-Type: text/csv; charset=utf-8、Content-Disposition: attachment; filename="birthday-invitations.csv"，响应体是带 UTF-8 BOM 的文件字节。X-Request-ID 仍提供追踪。

导出开始前发生的错误使用统一 JSON。前端根据 HTTP 状态和 Content-Type 判断下载或错误展示，下载连接中断时提示重试。

CSV 列顺序固定如下。

| 列 | 来源 |
| --- | --- |
| 报名编号 | id，按文本输出 |
| 姓名 | name |
| 手机号 | phone，按文本输出 |
| 邮箱 | email |
| 是否到场 | attendance 的中文含义 |
| 礼物领取方式 | giftChoice 的中文含义 |
| 邮寄地址 | mailingAddress |
| 邮件状态 | emailNotifyStatus 的中文含义 |
| 最近发送时间 | emailNotifiedAt |
| 创建时间 | createdAt |
| 更新时间 | updatedAt |

null 导出为空。对逗号、引号和换行按 CSV 规则转义，对可能被表格软件识别为公式的值进行文本化处理。

## 3. HTTP 状态与状态枚举

### 3.1 HTTP 状态

| 状态 | 使用场景 |
| --- | --- |
| 200 | 查询、更新、删除、已有手机号更新、任务复用或禁用发送结果 |
| 201 | 新报名、图片登记、投稿与荣誉创建 |
| 202 | 管理员确认的邮件任务已持久化，等待处理 |
| 204 | 框架处理 OPTIONS 预检，无业务 JSON |
| 400 | 请求格式或业务字段不合法 |
| 401 | 用户访问令牌缺失或无效 |
| 403 | 图片关联权限不满足 |
| 404 | 路径或目标业务资源不存在 |
| 405 | 请求方法不支持 |
| 406 | Accept 无法满足 |
| 409 | 版本、幂等、认领或邮件确认冲突 |
| 413 | 图片或整体请求超过上限 |
| 415 | 请求类型或图片实际格式不支持 |
| 429 | 超出请求频率 |
| 500 | 未预期内部错误 |
| 502 | 图片中台返回异常 |
| 503 | 当前服务繁忙或依赖暂不可用 |
| 504 | 图片中台响应超时 |

删除成功返回 200 与 JSON 删除结果。

### 3.2 Attendance

| 值 | 含义 |
| --- | --- |
| `ATTENDING` | 到场 |
| `NOT_ATTENDING` | 不到场 |

### 3.3 GiftChoice

| 值 | 含义 |
| --- | --- |
| `NONE` | 不需要 |
| `PICKUP` | 现场领取，仅到场可选 |
| `MAIL` | 邮寄，地址必填 |

### 3.4 InvitationResult

| 值 | 含义 |
| --- | --- |
| `CREATED` | 首次创建 |
| `UPDATED` | 已有手机号更新，内容相同也返回 UPDATED |

### 3.5 EmailNotifyStatus

| 值 | 含义 |
| --- | --- |
| `NOT_SENT` | 当前版本未确认发送或对应任务已取消 |
| `PENDING` | 已确认并等待处理 |
| `SUCCESS` | SMTP 已发送 |
| `FAILED` | 最终失败 |
| `DISABLED` | 发送禁用 |

### 3.6 EmailTaskStatus

| 值 | 含义 |
| --- | --- |
| `READY` | 等待提交 |
| `SUBMITTING` | 提交中台中 |
| `SUBMIT_RETRY` | 待重试 |
| `SUBMIT_UNKNOWN` | 受理结果不确定 |
| `POLLING` | 查询中台状态 |
| `SUCCEEDED` | 发送成功 |
| `FAILED` | 最终失败 |
| `CANCELLED` | 确认已过时且任务取消 |
| `DISABLED` | 环境禁用 |

### 3.7 RemoteMailStatus

| 值 | 含义 |
| --- | --- |
| `queued` | 中台排队 |
| `sending` | 中台发送中 |
| `sent` | SMTP 发送成功 |
| `failed` | 中台最终失败 |

### 3.8 HealthStatus

| 值 | 含义 |
| --- | --- |
| `UP` | 应用正常运行 |
| `DOWN` | 应用暂未就绪 |

### 3.9 ImageMimeType

| 值 | 含义 |
| --- | --- |
| `image/jpeg` | JPEG |
| `image/png` | PNG |
| `image/webp` | WebP |
| `image/gif` | GIF |

### 3.10 IdempotencyState

| 值 | 含义 |
| --- | --- |
| `PROCESSING` | 管理命令事务内处理中 |
| `COMPLETED` | 管理命令与响应快照已提交 |

### 3.11 AdminOperationCode

| 值 | 含义 |
| --- | --- |
| `INVITATION_UPDATE` | 后台更正回执 |
| `EMAIL_CONFIRM` | 管理员确认一次发送 |
| `HONOR_CREATE` | 创建荣誉 |
| `HONOR_UPDATE` | 编辑荣誉 |
| `HONOR_DELETE` | 软删除荣誉 |

IdempotencyState 与 AdminOperationCode 用于后端任务、幂等与操作记录，其余枚举用于本文 DTO。EmailNotifyStatus 中 SUCCESS 表示 SMTP 已发送。EmailTaskStatus 属于本项目，RemoteMailStatus 属于中台，均以各自枚举解释。回忆直接发布，荣誉直接保存展示。

## 4. 全部业务码与错误码

### 4.1 成功业务码

| code | HTTP | 含义 |
| --- | --- | --- |
| `OK` | 200 | 读取成功或健康检查成功 |
| `INVITATION_CREATED` | 201 | 首次保存报名回执 |
| `INVITATION_UPDATED` | 200 | 同手机号更新或管理员更正成功 |
| `IMAGE_UPLOADED` | 201 | 单张图片上传并登记成功 |
| `MEMORY_CREATED` | 201 | 投稿已保存并公开 |
| `HONOR_CREATED` | 201 | 荣誉创建成功 |
| `HONOR_UPDATED` | 200 | 荣誉编辑成功，包括内容未变化的保存 |
| `HONOR_DELETED` | 200 | 荣誉软删除成功 |
| `EMAIL_SEND_CONFIRMED` | 202 | 管理员确认已持久化并进入处理 |
| `EMAIL_SEND_REUSED` | 200 | 同版本已有活动任务，返回该任务 |
| `EMAIL_SEND_DISABLED` | 200 | 已记录确认，本环境禁用实际发送 |

### 4.2 HTTP 错误码

除健康检查暂未就绪外，下表响应的 data 为 null。字段相关错误可携带 fieldErrors，其余为 {}。

| code | HTTP | 触发条件 | 前端处理 |
| --- | --- | --- | --- |
| `BAD_REQUEST` | 400 | JSON 无法解析、路径或查询格式非法、重复查询参数 | 修正请求后重试 |
| `VALIDATION_ERROR` | 400 | 缺失必填、类型或枚举错误、长度、未知字段、跨字段校验、空 PATCH | 按 fieldErrors 修正 |
| `MEMORY_CONTENT_REQUIRED` | 400 | 正文和图片都为空，姓名或标题不能代替正文 | 补正文或图片 |
| `IMAGE_COUNT_INVALID` | 400 | 回忆图片超过 9 张，或荣誉图片不在 1～9 张 | 修正 imageIds |
| `IMAGE_DUPLICATED` | 400 | imageIds 包含重复编号 | 去重后提交 |
| `IMAGE_EMPTY` | 400 | 上传空文件 | 选择图片 |
| `IMAGE_DIMENSIONS_EXCEEDED` | 400 | 原图超过 2500 万像素或解码边界限制 | 缩小图片 |
| `UNAUTHORIZED` | 401 | 管理令牌缺失、过期、签名或 issuer/audience 不合法 | 刷新或跳转 SSO |
| `IMAGE_ACCESS_DENIED` | 403 | 调用方无权关联该图片 | 使用本会话上传图片或合法原引用 |
| `ENDPOINT_NOT_FOUND` | 404 | 本项目路径不存在 | 检查路径 |
| `INVITATION_NOT_FOUND` | 404 | 目标回执不存在 | 刷新列表 |
| `MEMORY_NOT_FOUND` | 404 | 目标投稿不存在 | 返回列表 |
| `HONOR_NOT_FOUND` | 404 | 荣誉不存在或已软删除 | 刷新列表 |
| `IMAGE_NOT_FOUND` | 404 | 图片编号不存在 | 重新上传 |
| `METHOD_NOT_ALLOWED` | 405 | 路径存在但方法不支持 | 按接口方法调用 |
| `VERSION_CONFLICT` | 409 | expectedVersion 与当前版本不符 | 重新读取后确认 |
| `IDEMPOTENCY_CONFLICT` | 409 | 同一操作编号对应不同规范化请求 | 同请求保持原编号，新操作使用新编号 |
| `IMAGE_ALREADY_USED` | 409 | 回忆图片已由另一投稿认领 | 复用原投稿结果或重新上传 |
| `EMAIL_PREVIEW_CHANGED` | 409 | 同一回执版本的邮件预览摘要已改变 | 重新预览并确认 |
| `IMAGE_FILE_TOO_LARGE` | 413 | 单张图片超过 10485760 字节 | 缩小图片 |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | 请求 Content-Type 不符合接口约定 | 修正 Content-Type |
| `IMAGE_TYPE_UNSUPPORTED` | 415 | 文件实际格式为允许范围外类型 | 选择 JPEG、PNG、WebP 或 GIF |
| `TOO_MANY_REQUESTS` | 429 | 公开请求超出配置限流 | 按 Retry-After 等待 |
| `IMAGE_SERVICE_ERROR` | 502 | 图片中台错误、拒绝凭证或返回异常结果 | 保留输入，稍后重试 |
| `SERVICE_UNAVAILABLE` | 503 | 本项目依赖或初始化状态导致暂不可用 | 稍后重试 |
| `SERVICE_BUSY` | 503 | 事务冲突重试耗尽或并发命令繁忙 | 保持原操作编号重试 |
| `IMAGE_SERVICE_UNAVAILABLE` | 503 | 图片服务连接不可用 | 保留输入，稍后重试 |
| `IMAGE_SERVICE_TIMEOUT` | 504 | 等待图片上游响应超时 | 保留输入，重试可能产生未关联上传资源 |
| `INTERNAL_ERROR` | 500 | 本项目未预期内部错误 | 提供 traceId 排查 |
| `EMAIL_SEND_IN_PROGRESS` | 409 | 同版本已有活动任务，且其确认内容与本次预览不同 | 等待已有任务结束后重新预览确认 |
| `IMAGE_INVALID` | 400 | 图片已损坏、内容不完整或无法安全解析 | 更换或重新导出图片 |
| `NOT_ACCEPTABLE` | 406 | Accept 仅允许接口无法提供的响应类型 | JSON 接口接受 application/json，导出接受 text/csv 或通配类型 |
| `REQUEST_TOO_LARGE` | 413 | JSON 请求体超过 1 MiB，或 multipart 总体超过 11 MiB | 缩小请求并按单图接口提交 |

### 4.3 异步邮件任务错误码

下表用于 EmailSendItem.lastErrorCode。读取历史接口本身可以返回 200 / OK，同时其中某批次为 FAILED 或正在重试。

| lastErrorCode | 含义 |
| --- | --- |
| `MAIL_AUTH_FAILED` | 邮件服务令牌获取失败或刷新后仍被拒绝 |
| `MAIL_PERMISSION_DENIED` | 邮件中台返回 403，服务账号缺少 mail 等实际授权 |
| `MAIL_RATE_LIMITED` | 邮件中台限流，任务安排重试 |
| `MAIL_SERVICE_UNAVAILABLE` | 中台连接失败或暂时性服务错误 |
| `MAIL_SERVICE_TIMEOUT` | 中台调用超时，受理结果需核对 |
| `MAIL_RESPONSE_INVALID` | 中台结果格式、任务编号或已知状态不合法 |
| `MAIL_REQUEST_REJECTED` | 中台明确拒绝请求参数 |
| `MAIL_STATUS_QUERY_FAILED` | 查询失败，保留已知任务状态与诊断 |
| `MAIL_SMTP_TIMEOUT` | 中台最终失败原因明确为 SMTP 超时 |
| `MAIL_SMTP_FAILED` | 中台最终 SMTP 发送失败的其他原因 |
| `MAIL_SUBMISSION_UNCERTAIN` | 外部受理结果不确定，需要原键核对 |
| `MAIL_VERSION_OBSOLETE` | 尚未提交的确认任务因回执版本过时而取消 |
| `MAIL_INTERNAL_ERROR` | 本地任务处理遇到异常 |

成功恢复后清空已解决的当前错误摘要。SMTP 最终失败保留错误；暂时查询失败保留已有业务状态并显示查询诊断。CANCELLED 可保存 MAIL_VERSION_OBSOLETE，DISABLED 为配置结果，可保持错误字段为空。

### 4.4 通用失败处理

- 所有接口可能产生 BAD_REQUEST、VALIDATION_ERROR、METHOD_NOT_ALLOWED、NOT_ACCEPTABLE、REQUEST_TOO_LARGE、SERVICE_UNAVAILABLE、SERVICE_BUSY、INTERNAL_ERROR。
- 管理接口额外处理 UNAUTHORIZED。公开接口携带了无效 Authorization 时也返回 UNAUTHORIZED。
- 配置了限流的接口产生 TOO_MANY_REQUESTS，返回 Retry-After。
- 图片服务的输入错误按本项目图片错误码转换，凭证或不可解析上游响应归为 IMAGE_SERVICE_ERROR。
- 数据库异常转为本项目错误，响应保留 traceId 和业务提示。
- 后端集中处理控制器、参数解析、认证和业务异常，使可处理的 JSON 响应使用同一封装。

## 5. 数据对象完整字段

请求表中的“必填”描述客户端必须提供的字段；响应表中的全部字段固定返回，可空字段保留 null。Page<T> 和 ApiResponse<T> 适用于所有对应接口。

### 5.1 ApiResponse<T>

所有本项目 JSON 响应固定包含下列五个键。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 | 否 | 本规范定义的成功业务码或错误码。 |
| `message` | `string` | 是 | 否 | 可直接展示的中文提示，业务逻辑使用 code 判断。 |
| `data` | `T / null` | 是 | 是 | 成功时为接口数据，失败时为 null；健康检查失败可返回 HealthData。 |
| `fieldErrors` | `object<string,string>` | 是 | 否 | 成功和非字段错误为 {}，字段错误按请求字段路径给出一条提示。 |
| `traceId` | `string(UUID)` | 是 | 否 | 当前 HTTP 请求追踪编号，与 X-Request-ID 响应头一致。 |

### 5.2 Page<T>

统一分页对象，放在 data 中。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `content` | `T[]` | 是 | 否 | 本页记录，空页返回 []。 |
| `page` | `integer` | 是 | 否 | 从 1 开始的请求页码。 |
| `size` | `integer` | 是 | 否 | 实际采用的每页条数。 |
| `totalElements` | `integer` | 是 | 否 | 符合条件的总记录数，非负且不超过 JavaScript 安全整数范围。 |
| `totalPages` | `integer` | 是 | 否 | ceil(totalElements / size)，总数为零时为 0。 |

### 5.3 Image

公开图片对象。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(UUID)` | 是 | 否 | 小写 UUID v4，同一次操作或上传结果保持稳定。 |
| `url` | `string(uri)` | 是 | 否 | 图床返回的图片绝对访问地址。 |
| `width` | `integer / null` | 是 | 是 | 实际图片宽度，未知时 null。 |
| `height` | `integer / null` | 是 | 是 | 实际图片高度，未知时 null，与 width 同时已知或同时为空。 |

### 5.4 ImageUploadData

单张上传结果，所有键始终返回。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(UUID)` | 是 | 否 | 小写 UUID v4，同一次操作或上传结果保持稳定。 |
| `url` | `string(uri)` | 是 | 否 | 图床返回的图片绝对访问地址。 |
| `width` | `integer / null` | 是 | 是 | 实际图片宽度，未知时 null。 |
| `height` | `integer / null` | 是 | 是 | 实际图片高度，未知时 null，与 width 同时已知或同时为空。 |
| `originalName` | `string` | 是 | 否 | 规范化后的原始文件名。 |
| `sourceMimeType` | `ImageMimeType` | 是 | 否 | 后端检测的输入 MIME。 |
| `sourceSizeBytes` | `integer` | 是 | 否 | 原始上传字节数，范围 1～10485760。 |

### 5.5 InvitationSubmitRequest

公开回执请求，手机号用于识别同一报名人。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 | 否 | trim 后 1～50 字。 |
| `phone` | `string` | 是 | 否 | trim 后匹配 ^1[3-9][0-9]{9}$。 |
| `email` | `string` | 是 | 否 | trim 后合法邮箱，最多 254 字。 |
| `attendance` | `Attendance` | 是 | 否 | ATTENDING 或 NOT_ATTENDING。 |
| `giftChoice` | `GiftChoice` | 是 | 否 | NONE、PICKUP、MAIL，执行跨字段校验。 |
| `mailingAddress` | `string / null` | 否 | 是 | 最多 500 字；MAIL 时 trim 后非空；其他选择可空、空白或省略，保存 null。 |

### 5.6 InvitationSubmitData

回执保存结果。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(int64)` | 是 | 否 | 正整数十进制字符串，范围 1～9223372036854775807。 |
| `result` | `InvitationResult` | 是 | 否 | CREATED 或 UPDATED。 |
| `submittedAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |

### 5.7 InvitationRecord

后台完整回执。邮件字段按当前业务版本的最新批次推导。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(int64)` | 是 | 否 | 正整数十进制字符串，范围 1～9223372036854775807。 |
| `name` | `string` | 是 | 否 | 报名姓名。 |
| `phone` | `string` | 是 | 否 | 11 位大陆手机号，后台修改接口只读。 |
| `email` | `string` | 是 | 否 | 当前邮箱。 |
| `attendance` | `Attendance` | 是 | 否 | 到场选择。 |
| `giftChoice` | `GiftChoice` | 是 | 否 | 礼物选择。 |
| `mailingAddress` | `string / null` | 是 | 是 | 邮寄地址，其余选择为 null。 |
| `version` | `string(int64)` | 是 | 否 | 正整数版本字符串。 |
| `emailNotifyStatus` | `EmailNotifyStatus` | 是 | 否 | 当前版本最新批次状态，无批次时 NOT_SENT。 |
| `emailNotifiedAt` | `string(date-time) / null` | 是 | 是 | 当前最新批次成功时为 sentAt，其余为 null。 |
| `createdAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |
| `updatedAt` | `string(date-time)` | 是 | 否 | 最近业务变更时间，邮件轮询不改变。 |

### 5.8 InvitationPatchRequest

至少提交一个可编辑业务字段。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `requestId` | `string(UUID)` | 是 | 否 | 本次修改的幂等操作编号。 |
| `expectedVersion` | `string(int64)` | 是 | 否 | 前端读取到的当前回执版本。 |
| `name` | `string` | 否 | 否 | 提供时 trim 后 1～50 字。 |
| `email` | `string` | 否 | 否 | 提供时合法邮箱，最多 254 字。 |
| `attendance` | `Attendance` | 否 | 否 | 提供时为有效枚举。 |
| `giftChoice` | `GiftChoice` | 否 | 否 | 提供时为有效枚举。 |
| `mailingAddress` | `string / null` | 否 | 是 | 按合并后的礼物选择校验。 |

### 5.9 AttendanceStats

到场统计。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `attending` | `integer` | 是 | 否 | 到场人数。 |
| `notAttending` | `integer` | 是 | 否 | 不到场人数。 |

### 5.10 GiftStats

礼物统计。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `none` | `integer` | 是 | 否 | 不需要人数。 |
| `pickup` | `integer` | 是 | 否 | 现场领取人数。 |
| `mail` | `integer` | 是 | 否 | 邮寄人数。 |

### 5.11 EmailStats

当前版本、最新批次邮件统计。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `notSent` | `integer` | 是 | 否 | 未发送人数。 |
| `pending` | `integer` | 是 | 否 | 处理中的人数。 |
| `success` | `integer` | 是 | 否 | 已发送人数。 |
| `failed` | `integer` | 是 | 否 | 最终失败人数。 |
| `disabled` | `integer` | 是 | 否 | 发送禁用人数。 |

### 5.12 InvitationStats

全量报名统计。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `total` | `integer` | 是 | 否 | 总报名人数。 |
| `attendance` | `AttendanceStats` | 是 | 否 | 两种到场状态。 |
| `gifts` | `GiftStats` | 是 | 否 | 三种礼物选择。 |
| `email` | `EmailStats` | 是 | 否 | 五种邮件状态。 |
| `mailingAddressCount` | `integer` | 是 | 否 | 有效邮寄地址数量。 |

### 5.13 MemorySubmitRequest

姓名和标题可选，正文或图片至少一项。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `submissionId` | `string(UUID)` | 是 | 否 | 同次投稿的去重编号。 |
| `displayName` | `string / null` | 否 | 是 | trim 后最多 50 字，空白保存 null。 |
| `title` | `string / null` | 否 | 是 | trim 后最多 100 字，空白保存 null。 |
| `content` | `string / null` | 否 | 是 | trim 后最多 5000 字，空白保存 null。 |
| `imageIds` | `string(UUID)[]` | 否 | 否 | 省略为 []，0～9 张，顺序有意义，编号不得重复。 |

### 5.14 MemoryListItem

回忆列表条目。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(int64)` | 是 | 否 | 正整数十进制字符串，范围 1～9223372036854775807。 |
| `displayName` | `string / null` | 是 | 是 | 未填写时 null，界面展示匿名。 |
| `title` | `string / null` | 是 | 是 | 未填写时 null。 |
| `excerpt` | `string / null` | 是 | 是 | 正文前 120 个 Unicode 码点，图片投稿可为 null。 |
| `coverImage` | `Image / null` | 是 | 是 | 首图，无图片时 null。 |
| `imageCount` | `integer` | 是 | 否 | 0～9。 |
| `publishedAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |

### 5.15 MemoryDetail

完整公开投稿，创建成功也返回此对象。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(int64)` | 是 | 否 | 正整数十进制字符串，范围 1～9223372036854775807。 |
| `displayName` | `string / null` | 是 | 是 | 原始选填姓名，不填充匿名占位文字。 |
| `title` | `string / null` | 是 | 是 | 原始选填标题。 |
| `content` | `string / null` | 是 | 是 | 完整正文。 |
| `images` | `Image[]` | 是 | 否 | 按 imageIds 顺序返回，0～9 张。 |
| `publishedAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |

### 5.16 HonorItem

公开荣誉，仅标题、图片、人员三个业务字段。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(int64)` | 是 | 否 | 正整数十进制字符串，范围 1～9223372036854775807。 |
| `title` | `string` | 是 | 否 | 1～100 字标题。 |
| `people` | `string` | 是 | 否 | 1～200 字人员文本，由管理员直接填写。 |
| `images` | `Image[]` | 是 | 否 | 1～9 张，数组第一张为封面，预览按数组顺序。 |

### 5.17 HonorAdminItem

后台荣誉条目。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(int64)` | 是 | 否 | 正整数十进制字符串，范围 1～9223372036854775807。 |
| `title` | `string` | 是 | 否 | 1～100 字标题。 |
| `people` | `string` | 是 | 否 | 1～200 字人员文本，由管理员直接填写。 |
| `images` | `Image[]` | 是 | 否 | 1～9 张，数组第一张为封面，预览按数组顺序。 |
| `version` | `string(int64)` | 是 | 否 | 当前业务版本。 |
| `createdAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |
| `updatedAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |

### 5.18 HonorCreateRequest

荣誉创建表单。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `requestId` | `string(UUID)` | 是 | 否 | 本次创建操作编号。 |
| `title` | `string` | 是 | 否 | trim 后 1～100 字。 |
| `people` | `string` | 是 | 否 | trim 后 1～200 字，可用顿号分隔多人。 |
| `imageIds` | `string(UUID)[]` | 是 | 否 | 有序 1～9 张图片编号，不得重复。 |

### 5.19 HonorPatchRequest

至少提供 title、people、imageIds 中一项。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `requestId` | `string(UUID)` | 是 | 否 | 本次编辑操作编号。 |
| `expectedVersion` | `string(int64)` | 是 | 否 | 已读取的条目版本。 |
| `title` | `string` | 否 | 否 | 提供时 trim 后 1～100 字。 |
| `people` | `string` | 否 | 否 | 提供时 trim 后 1～200 字。 |
| `imageIds` | `string(UUID)[]` | 否 | 否 | 提供时为替换后的完整有序图片集合，1～9 张。 |

### 5.20 HonorDeleteData

删除结果。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(int64)` | 是 | 否 | 被删除的荣誉编号。 |
| `deleted` | `boolean` | 是 | 否 | 固定 true。 |
| `version` | `string(int64)` | 是 | 否 | 软删除后的版本。 |
| `deletedAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |

### 5.21 EmailPreviewData

仅生成预览，读取不创建发送任务。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `invitationId` | `string(int64)` | 是 | 否 | 回执编号。 |
| `invitationVersion` | `string(int64)` | 是 | 否 | 当前回执版本，确认时作为 expectedVersion。 |
| `recipientEmail` | `string` | 是 | 否 | 本次预览的收件邮箱。 |
| `subject` | `string` | 是 | 否 | 后端渲染的邮件主题。 |
| `textBody` | `string` | 是 | 否 | 后端渲染的纯文本正文。 |
| `htmlBody` | `string / null` | 是 | 是 | 后端渲染的 HTML 正文。 |
| `previewHash` | `string(sha256)` | 是 | 否 | 64 位小写十六进制，覆盖回执版本、收件人、主题、正文与模板版本。 |
| `emailEnabled` | `boolean` | 是 | 否 | 当前环境是否启用实际发信。 |

### 5.22 EmailConfirmRequest

管理员二次确认发送。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `requestId` | `string(UUID)` | 是 | 否 | 同一次确认保持相同编号，新一轮再次发送使用新编号。 |
| `expectedVersion` | `string(int64)` | 是 | 否 | 刚预览的回执版本。 |
| `previewHash` | `string(sha256)` | 是 | 否 | 原样提交预览返回值，后端重新计算并比对。 |

### 5.23 EmailSendItem

本项目邮件批次与状态摘要，状态来自后端已保存的中台查询结果。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `id` | `string(int64)` | 是 | 否 | 本地通知任务编号。 |
| `invitationId` | `string(int64)` | 是 | 否 | 回执编号。 |
| `invitationVersion` | `string(int64)` | 是 | 否 | 该批次确认时版本。 |
| `sendNo` | `integer` | 是 | 否 | 同一回执版本内从 1 开始的批次。 |
| `requestId` | `string(UUID)` | 是 | 否 | 管理员确认请求编号。 |
| `recipientEmail` | `string` | 是 | 否 | 确认时收件邮箱。 |
| `subject` | `string` | 是 | 否 | 确认时主题。 |
| `textBody` | `string` | 是 | 否 | 确认时纯文本正文。 |
| `htmlBody` | `string / null` | 是 | 是 | 确认时 HTML 正文。 |
| `emailNotifyStatus` | `EmailNotifyStatus` | 是 | 否 | 此批次的对外状态，CANCELLED 映射 NOT_SENT。 |
| `taskStatus` | `EmailTaskStatus` | 是 | 否 | 本地任务状态。 |
| `remoteMailId` | `string(UUID) / null` | 是 | 是 | 中台受理后取得的 UUID。 |
| `remoteStatus` | `RemoteMailStatus / null` | 是 | 是 | 中台已知状态。 |
| `confirmedBySub` | `string` | 是 | 否 | 确认人员的 SSO sub。 |
| `confirmedByName` | `string / null` | 是 | 是 | 确认人员当时的用户名或显示名。 |
| `confirmedAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |
| `acceptedAt` | `string(date-time) / null` | 是 | 是 | 首次确认中台受理时间。 |
| `sentAt` | `string(date-time) / null` | 是 | 是 | 中台 SMTP 发送成功时间。 |
| `submitAttempts` | `integer` | 是 | 否 | 本地提交中台的累计次数。 |
| `smtpAttempts` | `integer / null` | 是 | 是 | 已知的中台 SMTP 尝试次数。 |
| `nextCheckAt` | `string(date-time) / null` | 是 | 是 | 本地任务下次执行或查询时间，终态可空。 |
| `lastErrorCode` | `MailTaskErrorCode / null` | 是 | 是 | 本规范邮件任务错误码。 |
| `lastErrorMessage` | `string / null` | 是 | 是 | 脱敏后最多 2000 字错误摘要。 |
| `createdAt` | `string(date-time)` | 是 | 否 | RFC 3339，固定毫秒和时区，例如 2026-11-21T10:00:00.000+08:00。 |
| `updatedAt` | `string(date-time)` | 是 | 否 | 最近任务状态更新时间。 |

### 5.24 HealthData

应用运行状态。

| 字段 | 类型 | 必填或固定返回 | 可空 | 规则与含义 |
| --- | --- | --- | --- | --- |
| `status` | `HealthStatus` | 是 | 否 | UP 或 DOWN，邮件实际可投递性以邮件任务结果为准。 |

## 6. 接口总览

下列 19 个接口构成本项目首版对前端开放的业务接口。

| 序号 | 方法 | 路径 | 认证 | 名称 |
| --- | --- | --- | --- | --- |
| 01 | POST | `/api/v1/invitations` | 公开 | 提交或更新回执 |
| 02 | GET | `/api/v1/admin/invitations` | SSO 用户 | 分页查询报名 |
| 03 | GET | `/api/v1/admin/invitations/stats` | SSO 用户 | 全量报名统计 |
| 04 | GET | `/api/v1/admin/invitations/export` | SSO 用户 | 导出 CSV |
| 05 | PATCH | `/api/v1/admin/invitations/{id}` | SSO 用户 | 更正回执 |
| 06 | GET | `/api/v1/admin/invitations/{id}/email-preview` | SSO 用户 | 预览确认邮件 |
| 07 | POST | `/api/v1/admin/invitations/{id}/email-sends` | SSO 用户 | 确认首次发送或再次发送 |
| 08 | GET | `/api/v1/admin/invitations/{id}/email-sends` | SSO 用户 | 查看邮件历史与处理状态 |
| 09 | POST | `/api/v1/media/images` | 公开，可携带 SSO 令牌 | 上传一张图片 |
| 10 | POST | `/api/v1/memories` | 公开 | 提交回忆 |
| 11 | GET | `/api/v1/memories` | 公开 | 分页回忆墙 |
| 12 | GET | `/api/v1/memories/{id}` | 公开 | 回忆详情 |
| 13 | GET | `/api/v1/honors` | 公开 | 分页公开荣誉墙 |
| 14 | GET | `/api/v1/admin/honors` | SSO 用户 | 后台荣誉列表 |
| 15 | GET | `/api/v1/admin/honors/{id}` | SSO 用户 | 读取荣誉编辑值 |
| 16 | POST | `/api/v1/admin/honors` | SSO 用户 | 创建荣誉 |
| 17 | PATCH | `/api/v1/admin/honors/{id}` | SSO 用户 | 编辑荣誉 |
| 18 | DELETE | `/api/v1/admin/honors/{id}` | SSO 用户 | 删除荣誉 |
| 19 | GET | `/api/v1/health` | 公开 | 应用健康检查 |

## 7. 全部接口详情

路径中的 id 均为正整数十进制字符串，对应目标业务资源。每个接口都执行第 1 节请求规范和第 4.4 节通用错误处理。

### 7.1 提交或更新回执

- 路径为 `POST /api/v1/invitations`。
- 认证为 公开。
- 查询参数为空。

请求体采用 `InvitationSubmitRequest`，完整字段见第 5 节。

```json
{
  "name": "张三",
  "phone": "13800138000",
  "email": "alumni@example.com",
  "attendance": "ATTENDING",
  "giftChoice": "PICKUP",
  "mailingAddress": null
}
```

响应约定如下。

本例返回 HTTP 201、`INVITATION_CREATED`，data 类型为 `InvitationSubmitData`。

```json
{
  "code": "INVITATION_CREATED",
  "message": "回执已保存",
  "data": {
    "id": "1024",
    "result": "CREATED",
    "submittedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 首次手机号返回 201 / INVITATION_CREATED，data.result=CREATED；已有手机号返回 200 / INVITATION_UPDATED，data.result=UPDATED。
- 同内容重复提交仍返回 UPDATED，业务版本保持，submittedAt 是本次处理时间。
- 保存回执后邮件状态为 NOT_SENT，发送由管理员手动确认。
- 默认每客户端 IP 每分钟 10 次，超限返回 Retry-After。

重点错误码包括 `VALIDATION_ERROR`、`TOO_MANY_REQUESTS`，含义与 HTTP 映射见第 4 节。

### 7.2 分页查询报名

- 路径为 `GET /api/v1/admin/invitations`。
- 认证为 SSO 用户。

查询参数如下。

| 参数 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `attendance` | `Attendance` | 否 | 按到场筛选。 |
| `giftChoice` | `GiftChoice` | 否 | 按礼物选择筛选。 |
| `keyword` | `string` | 否 | trim 后最多 100 字，姓名、手机号或邮箱包含匹配，空白视为省略。 |
| `page` | `integer` | 否 | 默认 1，最小 1。 |
| `size` | `integer` | 否 | 默认 20，范围按接口上限。 |

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `Page<InvitationRecord>`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "content": [
      {
        "id": "1024",
        "name": "张三",
        "phone": "13800138000",
        "email": "alumni@example.com",
        "attendance": "ATTENDING",
        "giftChoice": "PICKUP",
        "mailingAddress": null,
        "version": "1",
        "emailNotifyStatus": "NOT_SENT",
        "emailNotifiedAt": null,
        "createdAt": "2026-11-21T10:00:00.000+08:00",
        "updatedAt": "2026-11-21T10:00:00.000+08:00"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- size 范围 1～100，按 updatedAt、id 倒序。
- 只按已声明筛选查询，多个条件取交集。

重点错误码包括 `UNAUTHORIZED`、`VALIDATION_ERROR`，含义与 HTTP 映射见第 4 节。

### 7.3 全量报名统计

- 路径为 `GET /api/v1/admin/invitations/stats`。
- 认证为 SSO 用户。
- 查询参数为空。

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `InvitationStats`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "total": 1,
    "attendance": {
      "attending": 1,
      "notAttending": 0
    },
    "gifts": {
      "none": 0,
      "pickup": 1,
      "mail": 0
    },
    "email": {
      "notSent": 1,
      "pending": 0,
      "success": 0,
      "failed": 0,
      "disabled": 0
    },
    "mailingAddressCount": 0
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 统计所有当前回执，当前接口无筛选参数。
- attendance、gifts、email 三组分类人数各自相加均等于 total。

### 7.4 导出 CSV

- 路径为 `GET /api/v1/admin/invitations/export`。
- 认证为 SSO 用户。

查询参数如下。

| 参数 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `attendance` | `Attendance` | 否 | 按到场筛选。 |
| `giftChoice` | `GiftChoice` | 否 | 按礼物选择筛选。 |
| `keyword` | `string` | 否 | trim 后最多 100 字，姓名、手机号或邮箱包含匹配，空白视为省略。 |

请求体为空。

响应约定如下。

HTTP 200 返回 CSV 文件，列与响应头见第 2.3 节。错误响应仍采用 ApiResponse。

```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="birthday-invitations.csv"
X-Request-ID: d58a80ad-84e2-4ad6-91e2-8dc40e0e1431

<带 UTF-8 BOM 的 CSV 字节>
```

业务规则如下。

- 导出所有匹配记录，排序与列表一致。
- 成功返回 UTF-8 BOM 的 CSV 字节；失败返回统一 JSON。
- Content-Disposition 固定为 attachment; filename="birthday-invitations.csv"。
- null 值导出为空单元格。

重点错误码包括 `UNAUTHORIZED`、`VALIDATION_ERROR`，含义与 HTTP 映射见第 4 节。

### 7.5 更正回执

- 路径为 `PATCH /api/v1/admin/invitations/{id}`。
- 认证为 SSO 用户。
- 路径参数 id 必填，类型为 string(int64)，合法格式与范围见第 1.3 节。
- 查询参数为空。

请求体采用 `InvitationPatchRequest`，完整字段见第 5 节。

```json
{
  "requestId": "10000000-0000-4000-8000-000000000001",
  "expectedVersion": "1",
  "attendance": "NOT_ATTENDING",
  "giftChoice": "MAIL",
  "mailingAddress": "示例邮寄地址"
}
```

响应约定如下。

本例返回 HTTP 200、`INVITATION_UPDATED`，data 类型为 `InvitationRecord`。

```json
{
  "code": "INVITATION_UPDATED",
  "message": "回执已更新",
  "data": {
    "id": "1024",
    "name": "张三",
    "phone": "13800138000",
    "email": "alumni@example.com",
    "attendance": "NOT_ATTENDING",
    "giftChoice": "MAIL",
    "mailingAddress": "示例邮寄地址",
    "version": "2",
    "emailNotifyStatus": "NOT_SENT",
    "emailNotifiedAt": null,
    "createdAt": "2026-11-21T10:00:00.000+08:00",
    "updatedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 请求提供至少一个可编辑字段，phone 为只读字段。
- 先合并现有值再校验，切到不到场时原 PICKUP 必须同步修改。
- giftChoice 改为非 MAIL 且地址键省略时清空原地址；显式携带非空地址会校验失败。
- 内容变化才递增版本并将新版本邮件显示为 NOT_SENT，相同内容保留版本。
- 本接口 requestId 必填，重复请求按原响应重放。

重点错误码包括 `INVITATION_NOT_FOUND`、`VERSION_CONFLICT`、`IDEMPOTENCY_CONFLICT`、`VALIDATION_ERROR`，含义与 HTTP 映射见第 4 节。

### 7.6 预览确认邮件

- 路径为 `GET /api/v1/admin/invitations/{id}/email-preview`。
- 认证为 SSO 用户。
- 路径参数 id 必填，类型为 string(int64)，合法格式与范围见第 1.3 节。
- 查询参数为空。

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `EmailPreviewData`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "invitationId": "1024",
    "invitationVersion": "1",
    "recipientEmail": "alumni@example.com",
    "subject": "社团十六周年邀请函回执确认",
    "textBody": "张三，你好！已收到你的回执。到场选择：到场；礼物选择：现场领取。回执编号：1024。",
    "htmlBody": null,
    "previewHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "emailEnabled": true
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 只渲染当前回执的后端模板，返回收件邮箱和 previewHash。
- 不登记发送任务，不调用中台发信。
- 预览仍可在 emailEnabled=false 时查看。

重点错误码包括 `INVITATION_NOT_FOUND`，含义与 HTTP 映射见第 4 节。

### 7.7 确认首次发送或再次发送

- 路径为 `POST /api/v1/admin/invitations/{id}/email-sends`。
- 认证为 SSO 用户。
- 路径参数 id 必填，类型为 string(int64)，合法格式与范围见第 1.3 节。
- 查询参数为空。

请求体采用 `EmailConfirmRequest`，完整字段见第 5 节。

```json
{
  "requestId": "10000000-0000-4000-8000-000000000001",
  "expectedVersion": "1",
  "previewHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

响应约定如下。

本例返回 HTTP 202、`EMAIL_SEND_CONFIRMED`，data 类型为 `EmailSendItem`。

```json
{
  "code": "EMAIL_SEND_CONFIRMED",
  "message": "已确认发送，任务已登记",
  "data": {
    "id": "8192",
    "invitationId": "1024",
    "invitationVersion": "1",
    "sendNo": 1,
    "requestId": "10000000-0000-4000-8000-000000000001",
    "recipientEmail": "alumni@example.com",
    "subject": "社团十六周年邀请函回执确认",
    "textBody": "张三，你好！已收到你的回执。到场选择：到场；礼物选择：现场领取。回执编号：1024。",
    "htmlBody": null,
    "emailNotifyStatus": "PENDING",
    "taskStatus": "READY",
    "remoteMailId": null,
    "remoteStatus": null,
    "confirmedBySub": "2f4c4d75-395e-4c68-a4b6-4cc197c2f49e",
    "confirmedByName": "示例成员",
    "confirmedAt": "2026-11-21T10:00:00.000+08:00",
    "acceptedAt": null,
    "sentAt": null,
    "submitAttempts": 0,
    "smtpAttempts": null,
    "nextCheckAt": "2026-11-21T10:00:00.000+08:00",
    "lastErrorCode": null,
    "lastErrorMessage": null,
    "createdAt": "2026-11-21T10:00:00.000+08:00",
    "updatedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 先处理同用户同 requestId 的重放，再核对 expectedVersion 和 previewHash。
- 新确认持久化邮件快照和任务，202 仅表示任务已登记。
- 同版本已有内容一致的活动任务时，200 / EMAIL_SEND_REUSED 返回已有任务。
- 已有活动任务与本次确认的内容不同时，409 / EMAIL_SEND_IN_PROGRESS。
- 回执版本一致但模板或内容摘要变化时，409 / EMAIL_PREVIEW_CHANGED，要求重新预览。
- 环境禁用实际发信时记录 DISABLED 批次，返回 200 / EMAIL_SEND_DISABLED。
- 已成功或最终失败后再次确认发送，使用新 requestId，建立新 sendNo。
- 中台暂时不可用通过任务状态和 lastErrorCode 表达，不撤销已保存的回执。

重点错误码包括 `INVITATION_NOT_FOUND`、`VERSION_CONFLICT`、`IDEMPOTENCY_CONFLICT`、`EMAIL_PREVIEW_CHANGED`、`EMAIL_SEND_IN_PROGRESS`、`VALIDATION_ERROR`，含义与 HTTP 映射见第 4 节。

### 7.8 查看邮件历史与处理状态

- 路径为 `GET /api/v1/admin/invitations/{id}/email-sends`。
- 认证为 SSO 用户。
- 路径参数 id 必填，类型为 string(int64)，合法格式与范围见第 1.3 节。

查询参数如下。

| 参数 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `invitationVersion` | `string(int64)` | 否 | 指定历史回执版本，省略时返回全部版本。 |
| `page` | `integer` | 否 | 默认 1，最小 1。 |
| `size` | `integer` | 否 | 默认 20，范围按接口上限。 |

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `Page<EmailSendItem>`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "content": [
      {
        "id": "8192",
        "invitationId": "1024",
        "invitationVersion": "1",
        "sendNo": 1,
        "requestId": "10000000-0000-4000-8000-000000000001",
        "recipientEmail": "alumni@example.com",
        "subject": "社团十六周年邀请函回执确认",
        "textBody": "张三，你好！已收到你的回执。到场选择：到场；礼物选择：现场领取。回执编号：1024。",
        "htmlBody": null,
        "emailNotifyStatus": "PENDING",
        "taskStatus": "READY",
        "remoteMailId": null,
        "remoteStatus": null,
        "confirmedBySub": "2f4c4d75-395e-4c68-a4b6-4cc197c2f49e",
        "confirmedByName": "示例成员",
        "confirmedAt": "2026-11-21T10:00:00.000+08:00",
        "acceptedAt": null,
        "sentAt": null,
        "submitAttempts": 0,
        "smtpAttempts": null,
        "nextCheckAt": "2026-11-21T10:00:00.000+08:00",
        "lastErrorCode": null,
        "lastErrorMessage": null,
        "createdAt": "2026-11-21T10:00:00.000+08:00",
        "updatedAt": "2026-11-21T10:00:00.000+08:00"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- size 范围 1～100，按 confirmedAt、id 倒序。
- 读取本项目保存的状态摘要，后台工作器异步刷新中台状态。
- 无发送历史时返回空页。目标回执不存在时返回 404。

重点错误码包括 `INVITATION_NOT_FOUND`、`VALIDATION_ERROR`，含义与 HTTP 映射见第 4 节。

### 7.9 上传一张图片

- 路径为 `POST /api/v1/media/images`。
- 认证为 公开，可携带 SSO 令牌。
- 查询参数为空。

请求采用 multipart/form-data。

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| file | binary | 是 | 恰好一个非空图片文件 |

```http
POST /api/v1/media/images HTTP/1.1
Content-Type: multipart/form-data; boundary=ExampleBoundary

--ExampleBoundary
Content-Disposition: form-data; name="file"; filename="memory.png"
Content-Type: image/png

<图片二进制>
--ExampleBoundary--
```

响应约定如下。

本例返回 HTTP 201、`IMAGE_UPLOADED`，data 类型为 `ImageUploadData`。

```json
{
  "code": "IMAGE_UPLOADED",
  "message": "图片上传成功",
  "data": {
    "id": "00000000-0000-4000-8000-000000000001",
    "url": "https://image.sipc115.com/i/example/image1.png",
    "width": null,
    "height": null,
    "originalName": "memory.png",
    "sourceMimeType": "image/png",
    "sourceSizeBytes": 102400
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- Content-Type 为 multipart/form-data，只有 file 一个文件字段，浏览器自动生成 boundary。
- 单次一张，逐张上传最多 9 张后将 id 数组提交给投稿或荣誉保存接口。
- 允许 JPEG、PNG、WebP、GIF，实际内容校验，单文件 1～10485760 字节，原图最多 2500 万像素。
- 首次匿名上传设置会话 Cookie，后续上传与提交由浏览器自动携带。
- 提供 Authorization 时必须通过校验，失效令牌返回 401。
- 上传成功返回正式 URL 和图片 UUID，压缩后的实际尺寸未知时为 null。

重点错误码包括 `UNAUTHORIZED`、`IMAGE_EMPTY`、`IMAGE_INVALID`、`IMAGE_TYPE_UNSUPPORTED`、`IMAGE_FILE_TOO_LARGE`、`IMAGE_DIMENSIONS_EXCEEDED`、`TOO_MANY_REQUESTS`、`IMAGE_SERVICE_ERROR`、`IMAGE_SERVICE_UNAVAILABLE`、`IMAGE_SERVICE_TIMEOUT`，含义与 HTTP 映射见第 4 节。

### 7.10 提交回忆

- 路径为 `POST /api/v1/memories`。
- 认证为 公开。
- 查询参数为空。

请求体采用 `MemorySubmitRequest`，完整字段见第 5 节。

```json
{
  "submissionId": "10000000-0000-4000-8000-000000000001",
  "displayName": null,
  "title": null,
  "content": "一起做项目的日子值得记住。",
  "imageIds": [
    "00000000-0000-4000-8000-000000000001"
  ]
}
```

响应约定如下。

本例返回 HTTP 201、`MEMORY_CREATED`，data 类型为 `MemoryDetail`。

```json
{
  "code": "MEMORY_CREATED",
  "message": "投稿成功",
  "data": {
    "id": "2048",
    "displayName": null,
    "title": null,
    "content": "一起做项目的日子值得记住。",
    "images": [
      {
        "id": "00000000-0000-4000-8000-000000000001",
        "url": "https://image.sipc115.com/i/example/image1.png",
        "width": null,
        "height": null
      }
    ],
    "publishedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 正文非空或图片非空至少满足一项，只有姓名或标题时返回 MEMORY_CONTENT_REQUIRED。
- 姓名与标题均可省略或为 null，空白统一保存 null。
- imageIds 为有序数组，最多 9 张；[] 合法，null 非法。
- 确认图片归属与认领状态，原子保存内容和全部图片关联，提交成功即公开。
- 同 submissionId 同规范化参数返回原 201 / MEMORY_CREATED，标记幂等重放；不同参数返回 409。
- 默认每客户端 IP 每分钟 5 次，可配置。

重点错误码包括 `MEMORY_CONTENT_REQUIRED`、`IMAGE_COUNT_INVALID`、`IMAGE_DUPLICATED`、`IMAGE_NOT_FOUND`、`IMAGE_ACCESS_DENIED`、`IMAGE_ALREADY_USED`、`IDEMPOTENCY_CONFLICT`、`TOO_MANY_REQUESTS`，含义与 HTTP 映射见第 4 节。

### 7.11 分页回忆墙

- 路径为 `GET /api/v1/memories`。
- 认证为 公开。

查询参数如下。

| 参数 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `page` | `integer` | 否 | 默认 1，最小 1。 |
| `size` | `integer` | 否 | 默认 20，范围按接口上限。 |

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `Page<MemoryListItem>`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "content": [
      {
        "id": "2048",
        "displayName": null,
        "title": null,
        "excerpt": "一起做项目的日子值得记住。",
        "coverImage": {
          "id": "00000000-0000-4000-8000-000000000001",
          "url": "https://image.sipc115.com/i/example/image1.png",
          "width": null,
          "height": null
        },
        "imageCount": 1,
        "publishedAt": "2026-11-21T10:00:00.000+08:00"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- size 范围 1～50，按 publishedAt、id 倒序。
- 列表仅返回正文摘要和首图，完整内容通过详情读取。

### 7.12 回忆详情

- 路径为 `GET /api/v1/memories/{id}`。
- 认证为 公开。
- 路径参数 id 必填，类型为 string(int64)，合法格式与范围见第 1.3 节。
- 查询参数为空。

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `MemoryDetail`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "id": "2048",
    "displayName": null,
    "title": null,
    "content": "一起做项目的日子值得记住。",
    "images": [
      {
        "id": "00000000-0000-4000-8000-000000000001",
        "url": "https://image.sipc115.com/i/example/image1.png",
        "width": null,
        "height": null
      }
    ],
    "publishedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 图片数组按投稿时顺序返回。

重点错误码包括 `MEMORY_NOT_FOUND`，含义与 HTTP 映射见第 4 节。

### 7.13 分页公开荣誉墙

- 路径为 `GET /api/v1/honors`。
- 认证为 公开。

查询参数如下。

| 参数 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `page` | `integer` | 否 | 默认 1，最小 1。 |
| `size` | `integer` | 否 | 默认 20，范围按接口上限。 |

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `Page<HonorItem>`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "content": [
      {
        "id": "4096",
        "title": "社团荣誉展示",
        "people": "张三、李四",
        "images": [
          {
            "id": "00000000-0000-4000-8000-000000000001",
            "url": "https://image.sipc115.com/i/example/image1.png",
            "width": null,
            "height": null
          }
        ]
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- size 范围 1～50，按 createdAt、id 倒序。
- 每条包含 1～9 张图片，第一张作为封面，其余按序预览。

### 7.14 后台荣誉列表

- 路径为 `GET /api/v1/admin/honors`。
- 认证为 SSO 用户。

查询参数如下。

| 参数 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `page` | `integer` | 否 | 默认 1，最小 1。 |
| `size` | `integer` | 否 | 默认 20，范围按接口上限。 |

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `Page<HonorAdminItem>`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "content": [
      {
        "id": "4096",
        "title": "社团荣誉展示",
        "people": "张三、李四",
        "images": [
          {
            "id": "00000000-0000-4000-8000-000000000001",
            "url": "https://image.sipc115.com/i/example/image1.png",
            "width": null,
            "height": null
          }
        ],
        "version": "1",
        "createdAt": "2026-11-21T10:00:00.000+08:00",
        "updatedAt": "2026-11-21T10:00:00.000+08:00"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- size 范围 1～100，按 updatedAt、id 倒序，返回有效条目。

### 7.15 读取荣誉编辑值

- 路径为 `GET /api/v1/admin/honors/{id}`。
- 认证为 SSO 用户。
- 路径参数 id 必填，类型为 string(int64)，合法格式与范围见第 1.3 节。
- 查询参数为空。

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `HonorAdminItem`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "id": "4096",
    "title": "社团荣誉展示",
    "people": "张三、李四",
    "images": [
      {
        "id": "00000000-0000-4000-8000-000000000001",
        "url": "https://image.sipc115.com/i/example/image1.png",
        "width": null,
        "height": null
      }
    ],
    "version": "1",
    "createdAt": "2026-11-21T10:00:00.000+08:00",
    "updatedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 所有图片带 UUID，编辑时可将原图片编号按所需顺序提交。

重点错误码包括 `HONOR_NOT_FOUND`，含义与 HTTP 映射见第 4 节。

### 7.16 创建荣誉

- 路径为 `POST /api/v1/admin/honors`。
- 认证为 SSO 用户。
- 查询参数为空。

请求体采用 `HonorCreateRequest`，完整字段见第 5 节。

```json
{
  "requestId": "10000000-0000-4000-8000-000000000001",
  "title": "社团荣誉展示",
  "people": "张三、李四",
  "imageIds": [
    "00000000-0000-4000-8000-000000000001"
  ]
}
```

响应约定如下。

本例返回 HTTP 201、`HONOR_CREATED`，data 类型为 `HonorAdminItem`。

```json
{
  "code": "HONOR_CREATED",
  "message": "荣誉已创建",
  "data": {
    "id": "4096",
    "title": "社团荣誉展示",
    "people": "张三、李四",
    "images": [
      {
        "id": "00000000-0000-4000-8000-000000000001",
        "url": "https://image.sipc115.com/i/example/image1.png",
        "width": null,
        "height": null
      }
    ],
    "version": "1",
    "createdAt": "2026-11-21T10:00:00.000+08:00",
    "updatedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- title、people 和 imageIds 均必填，人员按原始姓名文本保存。
- imageIds 长度 1～9，不得重复，数组顺序即展示顺序。
- 事务保存条目与图片关联，成功立即公开。
- 同 requestId 重试返回原 201 响应。

重点错误码包括 `IMAGE_COUNT_INVALID`、`IMAGE_DUPLICATED`、`IMAGE_NOT_FOUND`、`IMAGE_ACCESS_DENIED`、`IDEMPOTENCY_CONFLICT`、`VALIDATION_ERROR`，含义与 HTTP 映射见第 4 节。

### 7.17 编辑荣誉

- 路径为 `PATCH /api/v1/admin/honors/{id}`。
- 认证为 SSO 用户。
- 路径参数 id 必填，类型为 string(int64)，合法格式与范围见第 1.3 节。
- 查询参数为空。

请求体采用 `HonorPatchRequest`，完整字段见第 5 节。

```json
{
  "requestId": "10000000-0000-4000-8000-000000000001",
  "expectedVersion": "1",
  "title": "更新后的荣誉标题",
  "imageIds": [
    "00000000-0000-4000-8000-000000000001"
  ]
}
```

响应约定如下。

本例返回 HTTP 200、`HONOR_UPDATED`，data 类型为 `HonorAdminItem`。

```json
{
  "code": "HONOR_UPDATED",
  "message": "荣誉已保存",
  "data": {
    "id": "4096",
    "title": "更新后的荣誉标题",
    "people": "张三、李四",
    "images": [
      {
        "id": "00000000-0000-4000-8000-000000000001",
        "url": "https://image.sipc115.com/i/example/image1.png",
        "width": null,
        "height": null
      }
    ],
    "version": "2",
    "createdAt": "2026-11-21T10:00:00.000+08:00",
    "updatedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 至少提供一个业务字段。未提供的业务字段保留原值。
- 提供 imageIds 时为替换后的完整集合，长度 1～9；删除全部图片会被拒绝。
- 允许复用该条目原有图片；新增图片检查上传归属。
- 锁定条目并校验版本，图片集合整组事务替换，失败全部回滚。
- 实际内容变化时 version 加一，内容完全相同保留版本和 updatedAt。

重点错误码包括 `HONOR_NOT_FOUND`、`VERSION_CONFLICT`、`IDEMPOTENCY_CONFLICT`、`IMAGE_COUNT_INVALID`、`IMAGE_DUPLICATED`、`IMAGE_NOT_FOUND`、`IMAGE_ACCESS_DENIED`、`VALIDATION_ERROR`，含义与 HTTP 映射见第 4 节。

### 7.18 删除荣誉

- 路径为 `DELETE /api/v1/admin/honors/{id}`。
- 认证为 SSO 用户。
- 路径参数 id 必填，类型为 string(int64)，合法格式与范围见第 1.3 节。

查询参数如下。

| 参数 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `expectedVersion` | `string(int64)` | 是 | 已读取的当前版本。 |
| `requestId` | `string(UUID)` | 是 | 本次删除操作编号，重试保持一致。 |

请求体为空。

响应约定如下。

本例返回 HTTP 200、`HONOR_DELETED`，data 类型为 `HonorDeleteData`。

```json
{
  "code": "HONOR_DELETED",
  "message": "荣誉已删除",
  "data": {
    "id": "4096",
    "deleted": true,
    "version": "2",
    "deletedAt": "2026-11-21T10:00:00.000+08:00"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 请求体为空，版本和操作编号放在 query。
- 成功软删除，图片关联继续保存，公开列表移除。
- 相同 requestId 重放返回原成功响应。新请求访问已删除条目返回 HONOR_NOT_FOUND。

重点错误码包括 `HONOR_NOT_FOUND`、`VERSION_CONFLICT`、`IDEMPOTENCY_CONFLICT`，含义与 HTTP 映射见第 4 节。

### 7.19 应用健康检查

- 路径为 `GET /api/v1/health`。
- 认证为 公开。
- 查询参数为空。

请求体为空。

响应约定如下。

本例返回 HTTP 200、`OK`，data 类型为 `HealthData`。

```json
{
  "code": "OK",
  "message": "操作成功",
  "data": {
    "status": "UP"
  },
  "fieldErrors": {},
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

业务规则如下。

- 读取本项目应用运行状态。
- 暂未就绪时返回 HTTP 503 / SERVICE_UNAVAILABLE，data.status=DOWN。
- 邮件中台 SMTP 超时不会被包装成该接口的发信成功状态。

重点错误码包括 `SERVICE_UNAVAILABLE`，含义与 HTTP 映射见第 4 节。

## 8. 关键跨字段、上传与发送链路

### 8.1 回执跨字段

| attendance | giftChoice | mailingAddress |
| --- | --- | --- |
| ATTENDING | NONE | 空或省略 |
| ATTENDING | PICKUP | 空或省略 |
| ATTENDING | MAIL | 必填 |
| NOT_ATTENDING | NONE | 空或省略 |
| NOT_ATTENDING | MAIL | 必填 |

其他组合返回 VALIDATION_ERROR。PATCH 以合并后的数据校验，切换为非邮寄且省略地址时清空旧地址。手机号只支持大陆 11 位号码，管理更正请求 phone 属于未知字段。

### 8.2 图片与匿名会话

1. 先逐张调用 POST /media/images。
2. 匿名上传成功后，后端设置 HttpOnly 会话 Cookie，数据库保存凭据摘要，浏览器在后续上传和投稿时自动携带。
3. 生产 Cookie 使用 Secure、SameSite=Lax 与 Path=/api/v1，本机 HTTP 开发按环境使用相应属性。
4. 登录上传按 SSO 用户记录。新增关联校验当前上传者或有效匿名会话，荣誉编辑可复用本条目的已有图片。
5. 前端将返回的 UUID 组成 imageIds，并保持所需顺序。
6. 回忆可为 0～9 张且有非空正文，荣誉必须为 1～9 张。
7. 投稿或荣誉保存事务校验所有图片并完整保存，单张失败可重试；响应丢失导致上传重试时可能产生未关联图片，按既有图床能力维护。

前端使用同源 /api 代理，浏览器保留会话 Cookie。单次 multipart 仅一个 file，文件上限为 10 MiB，代理请求体上限应留出 multipart 元数据空间。公开图片接口默认匿名每 IP 每分钟 20 次，登录上传每 sub 每分钟 60 次；公开投稿每 IP 每分钟 5 次，均可配置。

### 8.3 邮件预览与确认

1. 管理员读取回执或管理列表的 version。
2. 读取 email-preview，展示 recipientEmail、subject、textBody、htmlBody。
3. 用户二次确认后，提交返回的 invitationVersion 与 previewHash，并附本次 requestId。
4. 后端重算摘要，确认版本和预览一致后持久化快照与任务。
5. 202 表示本地任务已确认，前端通过邮件历史列表查看异步结果。
6. 重复网络请求复用 requestId。新的再次发送操作使用新编号。
7. 原版本任务结果保留历史，当前回执版本的邮件状态独立计算。
8. 暂时性中台故障由已确认任务重试，SMTP 最终失败由任务 lastErrorCode 展示。

previewHash 是内容一致性校验值，身份认证仍依赖 SSO 令牌。预览使用后端模板，确认请求只提交编号、版本和摘要。

### 8.4 状态显示与轮询

| 当前任务情况 | 前端显示 |
| --- | --- |
| 当前回执版本没有发送批次 | 未发送 |
| READY / SUBMITTING / SUBMIT_RETRY / POLLING | 处理中，可查看已有任务 |
| SUBMIT_UNKNOWN | 处理中或待核实，展示错误摘要 |
| SUCCEEDED | 已发送 |
| FAILED | 发送失败，可由管理员再次确认 |
| CANCELLED | 原确认已失效，当前版本可重新预览 |
| DISABLED | 当前环境禁用实际发信 |

邮件 history 接口返回缓存状态及 updatedAt、nextCheckAt。前端可在有待处理任务时按数秒间隔刷新列表，离开页面后停止轮询。

## 9. 字段错误示例与边界

### 9.1 多图上限

```json
{
  "code": "IMAGE_COUNT_INVALID",
  "message": "荣誉图片数量必须为 1～9 张",
  "data": null,
  "fieldErrors": {
    "imageIds": "请上传至少 1 张、最多 9 张图片"
  },
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

### 9.2 版本冲突

```json
{
  "code": "VERSION_CONFLICT",
  "message": "内容已更新，请刷新后重试",
  "data": null,
  "fieldErrors": {
    "expectedVersion": "请重新读取当前版本"
  },
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

### 9.3 邮件预览变化

```json
{
  "code": "EMAIL_PREVIEW_CHANGED",
  "message": "邮件内容已变化，请重新预览后确认",
  "data": null,
  "fieldErrors": {
    "previewHash": "请使用最新预览结果"
  },
  "traceId": "d58a80ad-84e2-4ad6-91e2-8dc40e0e1431"
}
```

### 9.4 匿名文字投稿

```json
{
  "submissionId": "10000000-0000-4000-8000-000000000002",
  "content": "十六周年快乐！",
  "imageIds": []
}
```

该请求合法，displayName 和 title 保存 null。content 为空且 imageIds=[] 时返回 MEMORY_CONTENT_REQUIRED。

## 10. 契约校验清单

| 检查 | 预期 |
| --- | --- |
| 19 个接口路径与方法 | 与第 6 节一一对应 |
| JSON 响应键 | 固定 code、message、data、fieldErrors、traceId |
| BIGINT 编号和版本 | 字符串，禁止隐式数字转换 |
| 分页对象 | 固定五个字段，空页与越界页规则一致 |
| 校验错误 | HTTP、code 与字段路径匹配 |
| SSO 管理 | member 用户认证成功即可，失效返回 401 |
| 上传 | 每次一张、MIME 内容验证、大小与像素限制、会话归属 |
| 回忆 | 姓名标题可空，正文或图片至少一项 |
| 荣誉 | 标题、人员、1～9 张图片必填，人员为直接文本 |
| 幂等 | 重复操作重放原结果，同键不同参数 409 |
| 手动发信 | 版本与预览摘要共同校验，202 与发送成功区分 |
| CSV | 文件成功、JSON 失败、字段和响应头固定 |
| 错误码 | 使用本文登记值，新增时同步接口文档 |
| 外部服务 | 原始结构由后端适配为本项目结构 |

## 11. 与既有资料的对齐

- 统一 JSON 包装用于本项目，回执旧示例中的 id、result、submittedAt 放入 data。
- 原分页五个字段保持，放入 data。
- BIGINT 编号与版本统一序列化为字符串。
- requestId 适用于管理更正、荣誉增删改和邮件确认；删除参数通过 query 提交。
- 邮件确认增加 previewHash，利用现有确认参数摘要和邮件快照实现。
- 邮件状态增加 NOT_SENT，到场状态只有两种。
- 荣誉使用 title、people、imageIds，人员是文本，图片最多 9 张。
- 旧 OpenAPI 的静态管理员令牌调整为 SSO 用户认证。
- 本文中新增的投稿、上传限流默认值通过配置落实。

API Markdown 是当前契约，开发时据此同步正式 OpenAPI、后端 DTO 和前端类型。需求与数据库文档中的对象示例按字段说明阅读，完整 HTTP 包装以本文为准。

## 12. 参考

- [需求规格与实现链路](需求规格与实现链路.md)。
- [数据库设计](数据库设计.md)。
- [现有邮件 API](sipc-org/sipc-infra/mail/mail-api/README.md)。
- [现有图片服务](sipc-org/sipc-infra/storage/file-api/infra/图片上传服务调用说明.md)。

本文示例使用演示数据，客户端 Secret、用户令牌和数据库密码由各自环境管理。


## 13. 公开回忆姓名墙统计（2026-11-21）

`GET /api/v1/memories/names`，无需登录；不接收查询参数或请求体，不分页。成功HTTP 200、code=OK，沿用五字段统一响应。该静态路径与`/memories/{id}`分别映射。

| 响应data字段 | 类型 | 规则 |
| --- | --- | --- |
| totalSubmissions | 非负整数 | 全部已公开回忆投稿总数，包含匿名投稿，不局限当前加载页 |
| namedSubmissions | 非负整数 | 非空署名投稿数，同一姓名多篇逐篇计数，≤totalSubmissions |
| names | 数组 | 所有非空姓名的汇总；按投稿数降序，同数按姓名二进制升序 |
| names[].name | 字符串 | 投稿署名文本，最多50码点，去首尾空白；相同文本归并，不推断真实身份、不拆成多个人 |
| names[].submissionCount | 正整数 | 此姓名在全部投稿中的出现次数，每篇计一次，与图片数量无关 |
| names[].weight | number，0～1 | submissionCount / totalSubmissions；所有weight的和可小于1，因为分母包含匿名投稿 |

例如10篇投稿中6篇署名甲、2篇署名乙、2篇匿名时：

```json
{
  "code": "OK",
  "message": "读取成功或健康检查成功",
  "data": {
    "totalSubmissions": 10,
    "namedSubmissions": 8,
    "names": [
      {"name": "甲", "submissionCount": 6, "weight": 0.6},
      {"name": "乙", "submissionCount": 2, "weight": 0.2}
    ]
  },
  "fieldErrors": {},
  "traceId": "由服务生成"
}
```

无投稿返回`totalSubmissions=0,namedSubmissions=0,names=[]`；仅匿名投稿返回真实总数、namedSubmissions=0、names=[]，均为正常成功，前端隐藏姓名墙。读取失败仍使用原统一错误包装和通用错误码，不伪装成空数据；额外query参数按现有严格参数规则返回400。没有新增业务码或数据库字段。
