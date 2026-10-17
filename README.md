# anqi-beauty-admin

暨美丽美容门店运营管理后台，为管理员提供商品、会员、订单、预约、员工排班和收益规则管理界面。

## 项目简介

基于若依 Vue 前端扩展的 Web 管理后台，通过 `anqi-beauty-backend` 完成认证、菜单与权限控制，再访问 `anqi-beauty-app/server` 的业务服务。

- 商品运营：分类、商品规格/库存、上下架、六档 VIP 套餐方案及权益编辑。
- 履约管理：会员、门店独立地址、订单、线下付款审核、体验卡领取、预约和核销。
- 员工排班：员工档案、门店班次、批量排班、出勤/休假与冲突校验。
- 收益管理：按套餐配置静态/动态规则、试算、发放计划与入账明细。
- 内容运营：首页模块、活动、联盟、积分商品、分享和系统配置。
- 系统管理：管理员、角色、菜单、部门、字典、参数和审计日志。

收益功能维护规则与账本，尚不包含真实提现转账；线上微信支付尚未接入。权限由后端校验，前端按钮和路由仅负责展示。

## 技术栈

| 类别 | 实际使用 |
| --- | --- |
| 框架 | Vue 3.5、JavaScript、Vue Router 4 |
| 状态与 UI | Pinia 3、Element Plus 2、Element Plus Icons |
| 工程化 | Vite 6、Sass、自动导入及 SVG 图标插件 |
| 请求与展示 | Axios、ECharts 5、VueUse、VueQuill 富文本编辑器 |
| 权限模式 | 若依动态路由、角色/菜单/按钮权限 |

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| anqi-beauty-backend | 后端服务 | [anqi-beauty-backend](https://github.com/jiangyi3265/anqi-beauty-backend) |
| anqi-beauty-admin | 管理后台 | [anqi-beauty-admin](https://github.com/jiangyi3265/anqi-beauty-admin) |
| anqi-beauty-app | 用户端 | [anqi-beauty-app](https://github.com/jiangyi3265/anqi-beauty-app) |

## 快速启动

建议 Node.js 24 LTS 和 npm。先按另外两个仓库的 README 启动 Java 后端（8080）与 Node 业务服务（3016），并完成新开发库初始化及管理员密码设置。

```bash
npm ci
npm run dev -- --port 5174
```

访问 `http://127.0.0.1:5174`，开发服务默认仅监听本机。默认 `/dev-api` 请求由 `vite.config.js` 代理到 `http://localhost:8080`，Java 再通过内部密钥连接 Node 业务服务。

`.env.development` 与 `.env.production` 只保存可以公开的标题和接口路径，均纳入版本管理。按需创建 `.env.development.local` / `.env.production.local` 覆盖 `VITE_APP_TITLE`、`VITE_APP_BASE_API` 等参数；`VITE_*` 会进入浏览器产物，禁止放置密码或密钥。

### 生产构建

```bash
npm run build:prod
npm run preview -- --port 4174
```

产物为 `dist/`。生产站点须将 `/prod-api/` 反向代理到 Java 后端，并配置单页应用的路径回退；`preview` 用于检查构建结果，不提供 Java 或 Node 服务。仓库另有 `build:stage` 脚本，使用前需自行提供 staging 环境公开构建参数。

## 项目结构

```text
src/views/anqi/    工作台、商品套餐、预约核销、排班、收益等业务界面
src/views/system/ 用户、角色、菜单及系统设置
src/api/          后端请求封装
src/router/       路由与权限入口
src/store/        Pinia 状态管理
src/layout/       后台整体布局
src/components/   表单、富文本、上传和共享组件
src/utils/        请求、认证及通用工具
vite/             构建插件
public/           静态资源
vite.config.js    开发代理与构建配置
```

## 协作说明

业务接口字段、权限标识和套餐规则变更需与两个关联仓库同步，详见 [三端协作开发](https://github.com/jiangyi3265/anqi-beauty-app/blob/main/docs/协作开发.md)。依赖与构建目录、IDE 文件、日志和本地环境配置已由 `.gitignore` 排除。保留上游若依的 MIT 许可与归属信息，见 [LICENSE](LICENSE)。

## 简历描述示例

参与 Vue 3 / Element Plus 美容门店管理后台开发，完成商品套餐、预约核销、员工排班与收益规则配置界面，并结合动态路由及按钮权限实现运营角色分工。

## 依赖检查状态

构建和业务回归已通过，第三方依赖仍有待升级的安全告警，详情见 [依赖复查记录](docs/DEPENDENCY_REVIEW.md)。
