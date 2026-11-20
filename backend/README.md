# birthday16-api

Java 21、Spring Boot 4.1.2、MyBatis-Plus。backend/.env 配置本机独立数据库和现有 SSO。

## 启动

使用 JDK 21，在 backend 根目录执行。

```powershell
.\mvnw.cmd spring-boot:run
```

当前本地配置端口为 16621，健康检查路径为 /api/v1/health。

## 构建交付

```powershell
.\mvnw.cmd clean verify
docker build -t birthday16-api .
```

产物为 target/app.jar。Dockerfile 复制已经构建的 JAR 到 Java 21 镜像，容器默认端口 16620。

接口、数据库和后端结构说明位于上一级工作区。当前阶段实现工程基础与报名链路。

## 已实现

- 健康检查与固定五字段响应。
- Keycloak JWT 管理入口认证。
- 公开回执创建、同手机号更新、内容相同保持版本、跨字段校验和每分钟限流。

## 验证

普通单元测试使用 Maven test。本机 MySQL 集成测试使用独立 birthday16_test 库。

```powershell
.\mvnw.cmd test "-Dtest=CommonResponseTest,InvitationValidatorTest,InvitationServiceIT"
```
