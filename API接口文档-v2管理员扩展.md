# 管理员接口扩展 v2

日期：2026-11-21。补充原API文档；本节定义已实现的新增能力，原固定回执邮件接口保留兼容。所有接口相对/api/v1，均需有效member SSO Bearer，无新管理员角色。

统一响应仍为code/message/data/fieldErrors/traceId；ID与版本为string(int64)，时间为Asia/Shanghai带毫秒和时区字符串。分页仍为content/page/size/totalElements/totalPages。CSV和日志成功返回文件，失败返回统一JSON。

## 1. 新增路径和原接口变化

| 方法 | 相对路径 | 功能 |
| --- | --- | --- |
| GET | /admin/invitations/{id} | 完整当前回执，既有InvitationResponse |
| GET | /admin/mail/recipients | 收件人分页与组合筛选 |
| POST | /admin/mail/recipient-selections | 冻结全部筛选结果 |
| POST | /admin/mail/previews | 自定义单发/模板群发预览 |
| POST | /admin/mail/batches | 确认预览，登记发送批次 |
| GET | /admin/mail/batches/{id} | 实时批次计数 |
| GET | /admin/mail/sends | 集中历史 |
| GET | /admin/mail/sends/{id} | 冻结邮件详情 |
| GET | /admin/logs | 日志增量读取 |
| GET | /admin/logs/download | 脱敏当前应用日志下载 |

现有GET /admin/invitations与GET /admin/invitations/export新增可选emailNotifyStatus，允许NOT_SENT/PENDING/SUCCESS/FAILED/DISABLED，取当前回执版本最大send_no的状态。stats仍全量。以上加原19项，合计29个HTTP方法/路径组合。

## 2. 收件人查询与选择快照

GET /admin/mail/recipients参数：keyword可选trim最多100码点，按姓名/手机号/邮箱字面包含；attendance可选ATTENDING/NOT_ATTENDING；giftChoice可选NONE/PICKUP/MAIL；emailNotifyStatus可选五状态；page默认1，size默认20且1～100。

响应为Page<InvitationResponse>，字段完整包含原回执和当前邮件摘要，不能以当前页代替全部匹配结果。

POST /admin/mail/recipient-selections的JSON字段为keyword、attendance、giftChoice、emailNotifyStatus，均可省略，规则同query；不接受分页参数。没有匹配返回VALIDATION_ERROR，超过500人返回MAIL_RECIPIENT_LIMIT。

SelectionResponse固定字段：
| 字段 | 类型 | 含义 |
| --- | --- | --- |
| id | UUID v4 | 选择快照编号，仅本人可用 |
| recipientCount | integer | 1～500 |
| expiresAt | date-time | 创建后10分钟 |
| recipientIds | string(int64)[] | 全部目标编号，供跨页勾选/计数 |

选择冻结id/版本/姓名/邮箱/到场/礼物。使用快照预览时资料版本变化会返回VERSION_CONFLICT；切换筛选不改旧快照。修改个别勾选后可以改用显式ID集重新预览，不复用目标不一致的selectionId。

## 3. 自定义预览

POST /admin/mail/previews JSON：
| 字段 | 必填 | 规则 |
| --- | --- | --- |
| mode | 是 | SINGLE或BULK |
| subject | 是 | string，trim非空，最多200码点，渲染后也必须保持单行且无控制字符 |
| textBody | 是 | string，trim非空，最多10000码点，纯文本 |
| recipientIds | 二选一 | 1～500个不同的string(int64)，SINGLE只许1人 |
| selectionId | 二选一 | 本人有效快照UUID，不能同时传recipientIds |

SINGLE按填写内容原样保存，不解释变量。BULK在主题和正文中允许：
| 变量 | 替换 |
| --- | --- |
| {{name}} | 报名姓名 |
| {{attendance}} | 到场/不到场 |
| {{giftChoice}} | 到场领取/邮寄/不领取 |
| {{id}} | 回执编号 |

未知/不完整变量为VALIDATION_ERROR，fieldErrors指subject或textBody。只替换一次，不递归解释姓名中的相似片段，不执行HTML或表达式；替换后仍检查长度。

PreviewResponse固定字段：
| 字段 | 类型 | 含义 |
| --- | --- | --- |
| id | UUID | 预览编号 |
| mode | SINGLE/BULK | 模式 |
| previewHash | sha256字符串 | 绑定预览id/模式/全部逐人内容 |
| expiresAt | date-time | 10分钟有效 |
| emailEnabled | boolean | 本环境是否实际发送 |
| recipientCount | integer | 人数 |
| messages | Message[] | 逐人实际邮件 |

Message有recipient对象、subject字符串、textBody字符串。Recipient固定包含invitationId、expectedVersion、name、recipientEmail、attendance、giftChoice；前两者为string(int64)，其余为字符串/既有枚举。无关地址/手机号不复制到新预览。

预览只保存内容，不创建发送任务、不调用中台；选择与预览均校验创建人，其他人的UUID按不存在处理。

## 4. 确认批次

POST /admin/mail/batches JSON固定三字段：requestId（UUID v4，同一次确认保持不变）、previewId（UUID v4）、previewHash（64位小写sha256）。

先查MAIL_BATCH_CONFIRM幂等结果，再锁预览、检查本人/有效期/hash、查是否已有批次；新批次按报名id升序锁全量回执，核对版本/邮箱，单事务写批次、逐人任务、审计及幂等结果。任何版本改变整体回滚，不产生半批通知。emailEnabled运行配置变化也要求重新预览。

同一预览用新requestId再确认复用已有批次。同一次requestId重放保留原HTTP/code/data，Idempotency-Replayed:true；实时状态需GET批次。

| 结果 | HTTP/code |
| --- | --- |
| 新批次登记 | 202 / MAIL_BATCH_CONFIRMED |
| 同预览复用 | 200 / MAIL_BATCH_REUSED |
| 实际发送禁用 | 200 / MAIL_BATCH_DISABLED；通知DISABLED，无next_run_at |

BatchResponse字段：
| 字段 | 类型 | 含义 |
| --- | --- | --- |
| id | string(int64) | 批次号 |
| mode | SINGLE/BULK | 模式 |
| recipientCount | integer | 人数 |
| counts | object | 固定PENDING/SUCCESS/FAILED/DISABLED/NOT_SENT五个integer计数 |
| confirmedAt | date-time | 确认时间 |

取消映射NOT_SENT，活动任务映射PENDING。不同明确确认的自定义批次可以同时存在；同预览去重不靠“同版本一个活动任务”约束。

每位收件人独立一封邮件，不暴露他人邮箱。复用原租约/稳定client_key/中台状态查询与SMTP任务错误码。任务登记不等于投递成功，确认后的逐人投递可能部分失败；重发需重新选择目标、预览确认，不自动全批重发。

## 5. 批次与历史读取

GET /admin/mail/batches/{id}返回实时BatchResponse，不存在为MAIL_BATCH_NOT_FOUND。

GET /admin/mail/sends query：keyword（可选最多100码点，冻结姓名/邮箱/主题字面包含）；emailNotifyStatus（可选五状态，按各通知自身状态）；invitationId、batchId（可选string(int64)）；page=1、size=20且最多100。排序confirmed_at/id倒序，data=Page<HistoryItem>。

HistoryItem固定：
| 字段 | 类型 | 含义 |
| --- | --- | --- |
| notification | 原EmailSendItem | 原25字段，包括冻结正文和任务状态 |
| recipientName | string | 确认时姓名 |
| mode | LEGACY/SINGLE/BULK | LEGACY为旧固定回执通知 |
| batchId | string(int64)/null | 旧记录为null |

GET /admin/mail/sends/{id}返回相同对象，不存在为MAIL_SEND_NOT_FOUND。以后改草稿或报名不改变历史正文。整批原始requestId存mail_batches，每封通知另有独立confirmation_request_id。

## 6. 日志读取与下载

GET /admin/logs query：cursor可选opaque字符串，最长1024；limit默认200、1～500。不接受path/filename等参数。

data字段：
| 字段 | 类型 | 含义 |
| --- | --- | --- |
| entries | LogEntry[] | 文件顺序的日志行 |
| nextCursor | string | 下次原样传回 |
| rotated | boolean | 文件更换/截断后重建尾部读取 |
| truncated | boolean | 较早内容/超长行被截断 |
| source | string | 展示名application.log，不暴露绝对路径 |

LogEntry有id稳定字符串、level（TRACE/DEBUG/INFO/WARN/ERROR/STACK）、text脱敏文本。首次取最近64KiB内末尾limit行，之后按UTF-8字节cursor读增量。单行展示上限16KiB并标记截断，未写完的短行等下次，堆栈保留连续行。

GET /admin/logs/download返回text/plain;charset=UTF-8、附件Content-Disposition和脱敏后的当前应用文件；不是前端截断缓冲或全部轮转归档。文件不可用、非常规文件或大于12MiB返回LOG_UNAVAILABLE。失败统一JSON。

两接口按SSO sub共享每分钟60次限流。脱敏常见Bearer、password/secret/token、邮箱和大陆手机号；源日志也不应写入秘密。APP_LOG_FILE配置文件位置；滚动设置为单文件10MB、历史7天、总量100MB。无命令执行/任意路径/清空接口。

## 7. 新增码及审计

| 新增错误码 | HTTP | 说明 |
| --- | --- | --- |
| MAIL_SELECTION_NOT_FOUND | 404 | 选择不存在或不属于本人 |
| MAIL_SELECTION_EXPIRED | 409 | 选择超过10分钟 |
| MAIL_PREVIEW_NOT_FOUND | 404 | 预览不存在或不属于本人 |
| MAIL_PREVIEW_EXPIRED | 409 | 预览超过10分钟 |
| MAIL_BATCH_NOT_FOUND | 404 | 批次不存在 |
| MAIL_SEND_NOT_FOUND | 404 | 通知不存在 |
| MAIL_RECIPIENT_LIMIT | 400 | 单次超过500位 |
| LOG_UNAVAILABLE | 503 | 日志暂不可用 |

新增成功码为MAIL_BATCH_CONFIRMED/REUSED/DISABLED，HTTP见第4节。复用VERSION_CONFLICT、IDEMPOTENCY_CONFLICT、EMAIL_PREVIEW_CHANGED及原认证/验证/限流错误。

新增审计和幂等操作MAIL_BATCH_CONFIRM，resourceType=MAIL_BATCH；审计只保存模式、人数、批次等必要摘要。其余SMTP错误字典不变。数据迁移见数据库文档及backend/sql/migrations/01_mail_management.sql。

本机dev/test已迁移；本轮未操作生产库，测试不试发真实邮件。


公开扩展补充：新增GET /api/v1/memories/names，完整契约见[API主文档第13节](API接口文档.md#13-公开回忆姓名墙统计2026-11-21)。在本扩展29条的基础上，当前总计30个方法/路径组合。
