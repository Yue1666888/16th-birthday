# SIPC 十六周年前端

同一个 Vite + React Router 项目，公开邀请函首页 / 目前只保留占位；公开回忆墙 /memories、荣誉墙 /honors、115编年史 /chronicle 已实现电脑与手机视图；管理员入口 /admin，登录后进入 /admin/invitations。

## 仓库与启动

Git 根为上一级16thbirthday，统一使用已有.githooks/commit-msg。web没有自己的.git、Husky、commitlint、prepare或.gitignore；ESLint/Prettier仅用于代码质量。

在web目录执行：
pnpm install --frozen-lockfile
pnpm dev

开发地址 http://127.0.0.1:5173，后端代理 http://127.0.0.1:16621。SSO默认member realm / birthday-web，回调需要覆盖实际/admin URL。无需把后端mail client Secret提供给浏览器。

Vite同时监听局域网，手机连接同一Wi-Fi后使用启动输出的Network地址。当前WLAN为10.111.74.18，可访问 http://10.111.74.18:5173/memories 和 /honors。只在开发环境显式追加 ?preview=1 可看标明的示例内容，真实接口失败不会自动切到示例；生产构建剔除示例模块。详见[公开双墙开发与手机验收](../公开双墙开发与手机验收.md)。

## 已实现

- 报名列表、全量统计、搜索筛选、CSV、实时详情、RHF/Zod修改、版本冲突和离开确认。
- 荣誉新增编辑删除、人员文本、1～9图上传预览与顺序。
- 邮件单发草稿、群发模板/变量、到场/领取/邮件状态组合筛选、全筛选结果选择、逐人预览、确认批次、集中历史及冻结正文。
- 日志增量读取、失败退避、滚动跟随、内存缓冲上限、脱敏日志下载。
- Keycloak仅在后台路由初始化。公开首页不初始化后台身份或加载后台界面。

真实API模式是唯一正常运行方式，不把模拟成功作为回退。后端需执行sql/migrations/01_mail_management.sql（本机dev/test已完成）；全新库只执行更新后的00_birthday_schema.sql，不重复执行扩展迁移。

## 检查

    pnpm typecheck
    pnpm lint
    pnpm format:check
    pnpm test
    pnpm build
    pnpm test:e2e

浏览器流程使用5175的独立测试配置，测试专属认证适配器与截获API；生产vite.config.ts不包含认证绕过。默认使用本机Chrome，无需下载另一套浏览器。后端真实MySQL集成测试在birthday16_test独立验证，不向真实邮箱试发或向云端上传测试图片。

构建产物为dist。Docker构建位置仍可选择“Docker内构建”或“预构建dist再封装”，本轮未发布到服务器。

## 115编年史

访问/chronicle，按资料中的发展历史展示13个节点，不包含历年全委。两端均为固定放大的螺旋（中心2009、外圈2026），只标年份；电脑悬停、手机点按/长按显示详情，不可拖动；内容静态整理，不调用业务API或SSO。详见[页面设计与实现](../115编年史页面设计与实现.md)。
