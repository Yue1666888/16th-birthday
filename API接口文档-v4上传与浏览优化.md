# API扩展v4：上传、缩略图与公开分页

2026-11-23。统一响应code/message/data/fieldErrors/traceId、日期格式、SSO规则均沿用原契约；不新增HTTP路径。以下覆盖原文档相应的上传及公开列表说明。

## 图片上传

POST /api/v1/media/images，multipart/form-data，仅一个file部分。每次一张、最多10MiB，实际格式支持JPEG/PNG/WebP/GIF。匿名归属Cookie与成员Bearer规则不变。

新增可选请求头X-Upload-ID：小写UUIDv4，代表本次照片操作。首次选中生成，压缩、重试、草稿恢复保持一致；重试必须发送相同文件字节。旧客户端省略该头仍可上传，但没有本项重放保障。

成功仍为201 / IMAGE_UPLOADED。data字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| id | UUID | 媒体编号，用于随后保存imageIds |
| url | string | 图床主图地址，用于相册 |
| thumbnailUrl | string/null | 新增，图床返回的缩略图；为空或加载失败时使用url |
| width/height | integer/null | 主图尺寸，无法取得时为null |
| originalName | string | 本服务收到的文件名；前端压缩转格式时可能已变化 |
| sourceMimeType | string | 入站实际图片格式 |
| sourceSizeBytes | integer | 入站文件大小，前端压缩后传入的字节数 |

所有回忆/荣誉接口中的ImageResponse也新增nullable thumbnailUrl，其他字段不变。旧媒体记录默认null，不推导云缩略图地址。

同上传者和X-Upload-ID、相同SHA256返回首次保存的同一id和201；图片重放不要求Idempotency-Replayed响应头。不同内容返回409 IDEMPOTENCY_CONFLICT。单实例处理中重复请求短等待，未完成返回UPLOAD_BUSY；已落库成功记录可跨重启复用。关联回忆/荣誉时仍校验归属、数量、重复编号与图片独占。

## 准入、限流和新错误码

新增503 UPLOAD_BUSY：上传槽位/等待队列已满、等待超时，或同一操作仍在处理。附Retry-After，默认3秒；前端保持同编号，退避后重试，可取消。

429 TOO_MANY_REQUESTS继续存在，表示个人或IP配额限制；附Retry-After到下个窗口。图传明确返回的429也保留此语义和冷却时间。未知上游失败、超时继续使用原IMAGE_SERVICE_ERROR/UNAVAILABLE/TIMEOUT，不能当作“已经成功”。

限制在multipart读取前执行。默认图片在途8、等待24、等待1500ms，均可配置。小额度由访客会话或成员身份区分，同IP粗阀默认3000/分钟，真实IP仅采信配置的反代。详细参数见《上传与浏览性能优化及部署》。

## 公开列表

GET /api/v1/memories 与 GET /api/v1/honors：page默认1，size默认改为10，仍接受原允许范围；网页固定发送size=10。仅点击继续浏览请求下一页，不进行全页预取。后台管理接口默认分页不变。

回忆列表仍为摘要、首图、图片数量；详情按需读取。荣誉列表含该页记录及其图片元数据，不表示下载所有图片文件。姓名墙GET /memories/names仍统计全部有效投稿，不按当前页取样。

## 缓存与保存次序

服务端仅短缓存公开数据DTO，写入事务成功后失效；envelope和traceId按请求生成。报名、后台详情和邮件不使用该公开缓存。

前端保存顺序调整不改变JSON发布/编辑接口：先完成单图上传，再将真实imageIds提交到原JSON接口。选图产生的本地临时编号不能当作媒体id提交。图片失败时不提交内容记录，已完成图片可在下一次尝试中复用。
