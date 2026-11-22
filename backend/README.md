# birthday16-api

十六周年邀请函后端，采用 Java 21、Spring Boot 4.1.2、MyBatis-Plus 3.5.18、MySQL 8。35 个业务和健康检查接口已经落地，与上一级 API 文档中的路径一致。

## 本机启动

先将 JAVA_HOME 指向 JDK 21；本机已安装的目录为 C:/Users/zhangyue/.jdks/jdk-21.0.13.1+2，新电脑请换成自己的安装目录。所有命令在 backend 目录执行，IDE工作目录也应设为backend，以读取该目录的.env。

```powershell
$env:JAVA_HOME='C:\Users\zhangyue\.jdks\jdk-21.0.13.1+2'
.\mvnw.cmd spring-boot:run
```

本机 .env 已切换为直连社团云上 MySQL 的独立 16th_birthday 数据库，应用账号仅有项目库读写权限并强制使用 TLS。原本机 birthday16_dev 保留，但开发服务不再连接它。密码、邮件客户端 Secret 均在 Git 忽略范围内。新机器先按 .env.example 创建 .env，使用有建表权限的数据库账号执行 sql/schema/00_birthday_schema.sql，再给运行账号授予项目库的 SELECT、INSERT、UPDATE、DELETE 权限。应用不会自动创建或修改数据库表。

开发服务地址为 http://127.0.0.1:16621，健康检查 GET /api/v1/health。后端没有首页，直接打开根路径会返回 JSON 404。前端位于同仓库 web，开发地址 http://127.0.0.1:5173/admin。

普通启动不要求本机MySQL或Docker。实际项目库账号与邮件Secret由维护者私发，不能提交到仓库；.local-private/已统一忽略。社友收到私发配置后保存为backend/.env即可连接现有项目库，无需再次建表。多人使用共享开发库时，建议普通本地实例设置EMAIL_ENABLED=false、APP_TASKS_ENABLED=false；邮件联调由指定实例启用发送和扫描。

## 已实现的功能

| 模块 | 实现 |
| --- | --- |
| 报名回执 | 大陆手机号创建或更新、内容不变保持版本、到场与领取方式联动校验、限流 |
| 网页报名管理 | Keycloak Bearer JWT 验证、分页筛选、统计、CSV 导出、带版本校验的修正 |
| 邮件 | 后端预览、管理员确认、冻结收件人与正文、幂等提交、发送历史、后台查询中台 SMTP 结果 |
| 回忆墙 | 免登录投稿、图文至少一项、最多9图；管理员新增/编辑/软删除、版本幂等、公开姓名权重联动 |
| 荣誉墙 | 管理员维护标题、人员文本、1～9 图；版本控制、软删除、公开展示 |
| 图片 | 调用现有 file-api；本地只保存 URL 与元信息；匿名上传凭 Cookie 归属，管理上传凭 SSO sub 归属 |
| 公共能力 | 固定五字段响应、分页、严格 JSON 与查询参数校验、请求编号、操作审计、请求幂等 |

管理接口只要求有效的 member realm 身份令牌，不增加额外管理员角色。浏览器完成生日站点的 SSO 登录后，在管理请求中附带 Authorization: Bearer <access_token>。后端验证签名、有效期、issuer 和 audience；当前沿用现有令牌中的 account audience，可通过 ADMIN_API_AUDIENCE 调整。

## 配置

| 环境变量 | 用途与当前默认值 |
| --- | --- |
| SPRING_PROFILES_ACTIVE | dev；生产设置 prod |
| SERVER_ADDRESS / SERVER_PORT | 监听地址与端口；本机 .env 为 127.0.0.1:16621，镜像通常为 0.0.0.0:16620 |
| DB_HOST / DB_PORT / DB_NAME | 开发直连云上 MySQL；主机必须配置，端口缺省 3308、库名缺省 16th_birthday；prod 显式指定主机与库名 |
| DB_USER / DB_PASSWORD | 云库运行账号；不使用 root 作为应用账号 |
| DB_SSL_MODE | 默认 REQUIRED，开发连接使用 TLS；云库运行账号也要求 SSL |
| TEST_DB_USER / TEST_DB_PASSWORD | 本机集成测试专用凭据；不会用云库账号登录本机测试库 |
| KEYCLOAK_URL / KEYCLOAK_REALM | https://sso.sipc115.com / member |
| ADMIN_API_AUDIENCE | account；应与生日 Web 客户端签发的 access token 保持一致 |
| APP_CORS_ALLOWED_ORIGINS | 默认允许 http://127.0.0.1:5173 和 http://localhost:5173；生产填写实际前端 origin |
| FILE_API_BASE_URL / FILE_IMAGE_HOST | https://services.sipc115.com/file-api / image.sipc115.com |
| MAIL_API_BASE_URL | https://services.sipc115.com/mail-api |
| MAIL_CLIENT_ID / MAIL_CLIENT_SECRET | birthday-api-mail 及其服务客户端 Secret；服务账号需具有现有 mail 角色 |
| APP_ENV | development；生产用 production，参与中台幂等键，不能随意修改已有环境名称 |
| EMAIL_ENABLED | true；false 时仍允许预览与确认，但只记录 DISABLED 批次 |
| RATE_LIMIT_REQUESTS_PER_MINUTE | 公开报名每 IP 每分钟 10 次 |
| APP_TASKS_ENABLED | true；false 时关闭邮件扫描器 |
| APP_TASKS_DELAY_MS | 5000；邮件扫描间隔毫秒数 |

其他固定上限为：投稿每 IP 每分钟 5 次；匿名上传每 IP 每分钟 20 次；登录上传每 sub 每分钟 60 次；JSON 1 MiB；单张图片 10 MiB。可通过对应 app.limits 属性覆盖限流值。限流为单实例内存窗口。

## 邮件处理边界

提交或修改回执均不会自动发信。管理员先 GET email-preview，核对内容后将 expectedVersion、previewHash 和新 requestId 提交到 email-sends。202 仅表示任务已登记，不代表 SMTP 已发送成功。

后台最多并行处理 2 个任务，每次只领取当前可用容量。任务使用 MySQL 行锁与 SKIP LOCKED 领取，租约为 120 秒；结果写回同时校验 lease_token 和租约有效期。外部 HTTP 调用在事务外，连接超时 10 秒、响应超时 30 秒。

同一次发送批次始终沿用 client_key。已取得中台邮件编号后只查状态。提交结果不确定时保持 SUBMIT_UNKNOWN；若回执版本已改变，暂停可能新建旧邮件的调用并保存核对提示。已受理的旧批次继续查询，但只影响该历史版本的邮件状态。最终 SMTP 失败后可由管理员使用新 requestId 再次确认发送。

邮件上游错误只保存固定脱敏摘要，不回显 token、Secret、中台原始错误正文或 SMTP 连接信息。

## 验证

普通测试不需要数据库或真实云服务：

```powershell
.\mvnw.cmd test
```

全量本机验证使用独立 birthday16_test 库；运行账号需提前获授该库读写权限，结构与 dev 库一致：

```powershell
.\mvnw.cmd -Plocal-it verify
```

此配置运行全部 *Test 与 *IT。集成测试从本机 .env 读取 TEST_DB_USER/TEST_DB_PASSWORD，连接固定 127.0.0.1:3306/birthday16_test，并在清理数据前核对当前库名。旧配置没有 TEST_DB_* 时兼容 DB_USER/DB_PASSWORD，但连接地址和库名仍固定为本机测试库。不要把测试库用作业务存储。测试关闭邮件扫描器，并使用模拟邮件/图片服务，不发送真实邮件或上传真实图片。

本次验证：50 项测试全部通过；实际 JAR 的 9 项本机 HTTP 检查通过；29 条路由与 API 文档对齐；JAR 字节码版本为 Java 21 的 65。启动检查创建的临时回执已删除，未生成邮件任务。

真实浏览器 SSO 登录与云端图片上传仍需前端联调验证。先前真实邮件测试已被中台受理，但 SMTP 超时问题由社团邮件服务维护方处理；本次没有新增真实试发。

## 构建与交付

交付沿用去年方式：先构建可执行 JAR，再由 Dockerfile 复制 JAR，不要求 Docker Compose。

```powershell
.\mvnw.cmd clean verify
docker build -t birthday16-api:local .
```

产物为 target/app.jar，运行镜像基于 eclipse-temurin:21-jre-alpine。本机已有进程运行 target/app.jar 时，先停止该项目进程再重新打包，避免 Windows 文件占用。

生产环境另行准备 .env.production，指定共享 MySQL 的地址、账号、库名、生产 origin、APP_ENV=production 和 SPRING_PROFILES_ACTIVE=prod。部署示例：

```powershell
docker run -d --name birthday16-api --restart unless-stopped --env-file .env.production -e SERVER_ADDRESS=0.0.0.0 -e SERVER_PORT=16620 -p 16620:16620 birthday16-api:local
```

容器中的 127.0.0.1 指向容器本身；生产 DB_HOST 填共享数据库的实际地址。生产端口与反向代理按服务器现有部署方式接入。

可执行 JAR 已成功打包并在本机启动。当前 Docker Desktop 引擎未运行，因此本次没有完成 Docker 镜像实际构建，也没有向云端发布。

## 资料

- [需求规格与实现链路](../需求规格与实现链路.md)
- [数据库设计](../数据库设计.md)
- [API 接口文档](../API接口文档.md)
- [后端项目结构与实现说明](../后端项目结构与实现说明.md)


## 管理员v2扩展

新增完整回执详情、收件人邮件状态筛选、选择/预览快照、自定义单发与模板群发批次、集中历史、真实服务日志读取下载。原固定邮件接口兼容保留；不同自定义批次可共存，同一预览及requestId重复确认会复用。

已有九表数据库只执行sql/migrations/01_mail_management.sql一次，本机birthday16_dev/test已完成。云上16th_birthday作为新库已执行当前完整sql/schema/00_birthday_schema.sql，不再重复01。新结构12表、120字段、6外键；共享实例内其他数据库未改。

应用日志默认logs/application.log，APP_LOG_FILE可修改。按10MB滚动，保存7天/总100MB；API读取/下载对常见凭据、邮箱、手机号脱敏，不允许任意路径。日志下载上限12MiB，增量读取cursor绑定文件，单个SSO用户每分钟60次。

新增测试覆盖了批次变量/幂等/版本整批回滚/创建人隔离/禁用发送，以及日志cursor/中文/轮转/脱敏/HTTP鉴权。50项全量测试通过；实际本机HTTP使用真实SSO签发JWT验证读取、快照、变量预览、日志下载，临时记录已清理，未确认实际发送批次。

完整字段与错误码见上级API接口文档-v2管理员扩展.md。前端8项单元和7项隔离Chrome流程验证通过；SSO浏览器只验证到登录页，没有代用户输入真实成员密码。


## 回忆姓名墙统计

新增公开GET /api/v1/memories/names，从全部memories汇总非空display_name，返回totalSubmissions/namedSubmissions/names（name、submissionCount、weight）。投稿数而非图片数作为权重，分母包含匿名投稿；只读聚合，不建人员表，不改schema。52项本机独立库测试通过，覆盖跨分页统计与空/匿名投稿。新JAR已重启，云库接口返回正常空数组。

## 邀请函预置更新

固定邮件预览的主题/文本/HTML已按新邀请函稿件同步为“山海几重，今盼汝归”，包含2026年12月19日及天津理工大学7号教学楼115室。模板版本invitation-16th-v2参与预览哈希，HTML姓名继续一次性转义替换。新增模板单元测试，19项普通测试通过；未提交真实试发任务。前端单发/群发预置与主动载入入口见[邀请函浮窗与音乐续播](../邀请函浮窗与音乐续播.md)。

回忆管理增量接口见[API v3](../API接口文档-v3回忆管理.md)，02迁移已在云开发库和本机测试库完成；本轮Java21 verify共59项通过。
