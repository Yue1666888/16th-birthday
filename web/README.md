# SIPC 十六周年前端

同一个 Vite + React Router 项目，开场 / 已实现11幕交互、逐字对白和背景音乐，可通过 /?replay=1 重播；填写首页 /invitation 已实现粒子展示、回执与投稿；公开回忆墙 /memories、荣誉墙 /honors、115编年史 /chronicle 已实现电脑与手机视图；管理员入口 /admin，登录后进入 /admin/invitations。

## 仓库与启动

Git 根为上一级16thbirthday，统一使用已有.githooks/commit-msg。web没有自己的.git、Husky、commitlint、prepare或.gitignore；ESLint/Prettier仅用于代码质量。

在web目录执行：
复制.env.example为.env.local（可选，默认值一致）
pnpm install --frozen-lockfile
pnpm dev

开发地址 http://127.0.0.1:5173，后端代理 http://127.0.0.1:16621。SSO默认member realm / birthday-web，回调需要覆盖实际/admin URL。无需把后端mail client Secret提供给浏览器。

Vite同时监听局域网，手机连接同一Wi-Fi后使用启动输出的Network地址；不要照搬其他开发者的IP。手机提交表单时，后端APP_CORS_ALLOWED_ORIGINS需要包含实际局域网origin；手机登录后台还需要核对Keycloak回跳白名单。只在开发环境显式追加 ?preview=1 可看标明的示例内容，真实接口失败不会自动切到示例；生产构建剔除示例模块。详见[公开双墙开发与手机验收](../公开双墙开发与手机验收.md)。

普通开发连接社团已存在的云上16th_birthday库，不要求本机安装MySQL或Docker。实际连接密码和邮件Secret由维护者私发，本地放入backend/.env；.local-private/中的交接文档不进入仓库。前端仅使用公开的VITE配置，不能存放这些Secret。后端需从backend目录启动，以便读取该目录的.env。

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

开发服务的Vite依赖缓存为node_modules/.vite-dev，E2E为node_modules/.vite-e2e；两者必须分开，避免测试认证适配器使真实后台的keycloak-js加载出现504 Outdated Optimize Dep。开发配置预优化keycloak-js，以支持直接打开/admin。自动化后台流程使用测试身份，真实SSO还需另行打开/admin确认能够到达社团登录页；不用在测试脚本里填写成员密码。2026-11-22已复现旧缓存故障、隔离修复，并在后台测试结束后重新验证真实SSO跳转。

构建产物为dist。Docker构建位置仍可选择“Docker内构建”或“预构建dist再封装”，本轮未发布到服务器。

## 115编年史

访问/chronicle，按资料中的发展历史展示13个节点，不包含历年全委。两端均为固定放大的螺旋（中心2009、外圈2026），只标年份；电脑悬停、手机点按/长按显示详情，不可拖动；内容静态整理，不调用业务API或SSO。详见[页面设计与实现](../115编年史页面设计与实现.md)。

## 首页与公开填写

导航首页指向/invitation，顶部提供重播开场入口。正常模式读取真实投稿姓名，?preview=1仅演示姓名，表单仍真实提交并明确提示。表单与图片队列不依赖SSO，成功保存回执不自动发邮件。草稿保存在当前标签页；未知投稿结果沿用原UUID和body重试。详见[首页粒子与表单实现](../首页粒子与表单实现.md)及[开场动画实现与验收](../开场动画实现与验收.md)。

## 公开视觉与开场 v2

加载准备采用约5–7秒的分段节奏并受真实资源进度约束；S02自动接近气球。对白/旁白使用新生图框并按标点优先换行，辅助文字增大；云朵、群飞、灯光帧及404/错误/加载页已更新。手机导航包含重播开场，电脑首页欢迎语改横排。详见[调整记录](../公开页面与开场视觉调整-v2.md)。
