# EdgeOne Links Manager (友情链接与博客联盟管理平台)

基于 **Tencent EdgeOne Makers** 构建的高性能现代化友情链接与博客联盟管理系统。深度融合 EdgeOne Blob 对象持久化存储与 EdgeOne KV 边缘加速。

---

## 特性亮点

1. **强一致性无数据库架构 (Blob as Database)**：
   - 依据 EdgeOne 官方规范，采用 `@edgeone/pages-blob` 强一致性模式 (`consistency: "strong"`) 作为持久化存储后端，无需维护传统 SQL/MongoDB 数据库。
   - 自动生成独立命名空间 `links_store`，零配置冷启动。
2. **边缘 KV 极速缓存 (Edge Functions + KV)**：
   - 配备 Edge Function 入口，可读取绑定的 `links_kv` 全局变量，实现毫秒级边缘命中与极速响应。
3. **全能友情链接管理**：
   - 支持字段：`title`（网站名称）、`author`（作者/站长）、`protocol`（支持自定义协议，如 https://、http://、gemini:// 等）、`url`、`description`（站点说明）、`pinned`（是否置顶显示）。
   - **多源头像支持**：
     - **Gravatar / 多源头像智能代理**：
       - 默认代理镜像源为 `gravatar.bluecdn.com`，系统设置中只需填入纯域名（如 `cravatar.cn`、`weavatar.com`），系统自动统一规范拼接 `/avatar/{ID}`；
       - 友情链接头像直接调用系统设置中统一配置的 CDN 镜像源，无需在每条链接中单独配置；
       - 头像标识 `{ID}` 智能支持三种输入格式并实时解析：
         1. **邮箱（推荐）**：在线去除首尾空格并小写后实时计算 MD5 匹配；
         2. **已有 MD5 哈希**：32–64 位 hex 字符串，跳过 MD5 计算直接匹配；
         3. **QQ 号**：5–12 位纯数字，自动从 `q.qlogo.cn` 拉取 640px 高清头像。
     - **网络图片 URL**：直接输入图片链接。
     - **上传至 EdgeOne Blob**：图片直接上传至 EdgeOne 分布式 Blob 存储并托管。
   - **Google Favicon API 智能自动抓取**：填写友链 URL 时，支持一键调用 Google Favicon API 抓取站点高清 Favicon 图标并自动持久化缓存至 Blob，无需手动寻找和上传。
4. **博客联盟全流程管理**：
   - 独立维护博客联盟成员站点（名称、域名、站长、专属图标、详细描述、自定义协议等）。
   - 前台支持单独模块呈现与外部 Embed 挂载。
5. **现代化响应式前台 (UI/UX)**：
   - 提供「简约风格」、「详情风格」与「应用风格」三种交互模式，自适应暗黑/浅色模式，支持快速搜索过滤、分类浏览与状态指示。
6. **自包含嵌入脚本 (embed.js)**：
   - 提供无第三方依赖的独立 JavaScript 挂载脚本，内置全部 CSS 样式，自适应主题，支持通过 HTML `data-*` 属性自定义显示列数、排序规则、健康指示等。
7. **数据备份与细粒度导入导出**：
   - 支持全量 JSON 快照备份与一键恢复。
   - 支持单独导出友情链接或单独导出博客联盟。
   - 支持单独导入友情链接与单独导入博客联盟，具备智能格式解析（纯数组、对象包装或全量快照自动提取），并提供“增量合并更新”与“完全覆盖”两种导入模式。
   - 后台各导入模块均提供标准 JSON 导入模板一键下载，直观展示字段定义与示例数据，便于编辑后安全导入。
8. **站点健康巡检与 SSL / 域名到期监控 (EdgeOne Schedules + Blob 缓存)**：
   - **最低开销探测**：HTTP 连通性首选轻量 `HEAD` 请求（零 HTML 负载，超短超时熔断）；SSL 证书基于 Node.js 原生 `node:tls` 握手读取到期日与证书链（握手完毕立刻销毁 Socket）；
   - **ICANN RDAP 域名过期检测与长效缓存**：支持通过国际规范 RDAP RESTful JSON 接口获取顶级域名注册到期时间，实行 15 天本地长效持久化缓存，有效规避高频限流；
   - **边缘自动化定时巡检**：原生结合 `edgeone.json` 的 `schedules` 任务，每天凌晨 04:00 自动巡检一次，采用微并发池（4并发）受控执行，总耗时仅数秒，产生近乎为零的云资源消耗；
   - **全端健康状态微标指示**：前台门户与 `embed.js` 卡片右上角渲染 HTTP 状态微标（绿色正常 / 红色异常，悬停仅显示 HTTP 状态代码），第二行域名前呈现 SSL 证书状态锁（绿色有效 / 红色无效，移除曲别针图标），域名后仅在到期时呈现预警图标；管理后台提供状态胶囊与一键体检/巡检。

---

## 目录结构

```text
.
├── index.html                  # 前台展示主页（上部联盟、下部友链、支持简约/详情/应用风格与登录弹窗）
├── admin.html                  # 管理控制台界面（链接/联盟/设置/备份/健康巡检）
├── css/
│   ├── style.css               # 现代化设计系统与自适应主题（含健康指示微标）
│   └── admin.css               # 管理控制台交互样式
├── js/
│   ├── app.js                  # 门户前端逻辑（Turnstile 人机验证、健康状态指示）
│   ├── embed.js                # 独立自包含嵌入脚本（内置完整样式、参数化挂载、健康状态指示）
│   └── admin.js                # 后台业务逻辑（CRUD、MD5计算、Favicon抓取、一键体检）
├── cloud-functions/            # Node.js 20.x 云函数
│   └── api/
│       ├── _storage.js         # Blob 强一致存储封装与默认数据源
│       ├── _auth.js            # 认证授权与 Token 校验
│       ├── _health.js          # 健康巡检核心引擎 (HEAD连通性/TLS证书/RDAP域名到期/并发池)
│       ├── public/
│       │   ├── links.js        # 公开链接列表 API (含 health 指标)
│       │   └── stats.js        # 统计数据 API（需鉴权）
│       ├── admin/
│       │   ├── auth.js         # Turnstile 校验、登录与密码修改
│       │   ├── links.js        # 友链 CRUD
│       │   ├── unions.js       # 博客联盟 CRUD
│       │   ├── settings.js     # 站点设置与 Turnstile 密钥管理
│       │   ├── health.js       # 健康巡检管理与定时任务触发入口
│       │   └── sync-kv.js      # 数据导入导出（支持全量及单独导入导出友链与博客联盟）
│       ├── file.js             # Blob 文件资源直读服务 (Content-Type + 缓存头)
│       ├── upload.js           # 本地图片上传至 EdgeOne Blob
│       └── favicon.js          # Google Favicon 抓取并缓存至 Blob
├── edge-functions/             # Edge Functions (V8 边缘运行时)
│   └── api/
│       └── edge-links.js       # 基于 EdgeOne KV 的边缘极速只读接口
├── edgeone.json                # EdgeOne 边缘网关路由、定时触发巡检与全局 CORS 配置
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

## 本地开发与测试

### 1. 安装项目依赖

```bash
pnpm install
```

### 2. 启动本地开发预览

由于项目使用了 EdgeOne Blob，推荐携带 `-n <项目名>` 启动以避免沙箱中交互式询问挂起：

```bash
pnpm dev
# 或执行：edgeone makers dev -n links-manager
```

本地服务默认监听 `http://localhost:8088/`。

---

## 部署到 EdgeOne Makers China

本项目提供两种部署方式：**控制台网页部署**（推荐用于生产环境及 Git 持续集成）与 **CLI 命令行部署**（适合本地快速发布与调试）。

### 方式一：EdgeOne Makers 控制台网页部署（推荐）

#### 第一步：将代码推送至远程 Git 仓库
将当前项目代码提交并推送到您常用的 Git 托管平台（GitHub、GitLab、Gitee 或 CODING）。

#### 第二步：登录 EdgeOne 控制台并创建项目
1. 访问腾讯云 EdgeOne Pages 控制台：[https://console.cloud.tencent.com/edgeone/pages](https://console.cloud.tencent.com/edgeone/pages)。
2. 点击页面右上角的 **「新建项目」**（或「导入项目」）。
3. 选择 **「通过 Git 仓库导入」**，并完成对应 Git 平台的授权。
4. 在仓库列表中选中本项目的 Git 仓库，点击 **「开始配置」**。

#### 第三步：构建与运行时核心配置
在项目构建配置页面，按以下规范填写：

| 配置项 | 推荐值 | 说明 |
| :--- | :--- | :--- |
| **项目名称 (Project Name)** | `links-manager` | 自定义英文字符名称 |
| **框架预设 (Framework)** | **None** | 原生静态 + 云函数架构，选择 None |
| **根目录 (Root Directory)** | `./` | 项目根目录 |
| **包管理器 (Package Manager)** | **pnpm** | 匹配 `pnpm-lock.yaml` |
| **构建命令 (Build Command)** | `pnpm install` 或留空 | 无需编译前端，安装依赖即可 |
| **输出目录 (Output Directory)** | `./` | 使静态文件、`cloud-functions/`、`edge-functions/` 全部生效 |
| **Node.js 版本** | **20.x** | 云函数运行时环境 |

#### 第四步：环境变量配置 (Environment Variables)
在部署配置页面的「环境变量」区域添加以下变量（可根据实际需要调整）：

| 变量名称 | 必填 | 示例 / 说明 |
| :--- | :---: | :--- |
| `TURNSTILE_SITE_KEY` | 否 | Cloudflare Turnstile 站点密钥（未配置时默认使用测试公钥） |
| `TURNSTILE_SECRET_KEY` | 否 | Cloudflare Turnstile 服务端私钥（未配置时默认使用测试私钥） |
| `GRAVATAR_MIRROR` | 否 | `gravatar.bluecdn.com`（默认镜像域名，只需填入纯域名，如 cravatar.cn / weavatar.com） |
| `ADMIN_SECRET_KEY` | 否 | 管理员后台登录密码（配置后优先直接作为管理密码登录；未配置时使用初始密码 `admin123`） |

#### 第五步：存储资源开通与绑定

1. **Blob 存储（必选，主数据库）**：
   - EdgeOne Makers 的 `@edgeone/pages-blob` 会在代码首次读写时自动在当前项目下初始化 `links_store` 命名空间，无需手动预建。
   - 部署完成后可在项目详情的「存储」标签页查看 Blob 对象的读写指标与文件列表。
2. **KV 存储（可选，用于边缘加速）**：
   - 进入 EdgeOne 控制台左侧菜单的 **「KV 存储」** 页面。
   - 点击 **「申请开通」**（若尚未开通），随后点击 **「新建命名空间」**，输入命名空间名称（如 `links_kv`）。
   - 创建成功后，进入刚才新建的项目详情页，选择 **「KV 存储」** 选项卡。
   - 点击 **「关联命名空间」**：
     - 选择命名空间：`links_kv`
     - **变量名称必须填写为**：`links_kv`（严格匹配 `edge-functions/api/edge-links.js` 中调用的全局变量名）。
     - 保存绑定。

#### 第六步：触发构建与上线
1. 点击 **「保存并部署」**。
2. 平台将自动拉取代码、执行 `pnpm install` 并部署边缘网关和云函数。
3. 部署完成后，控制台将生成专属的预览与生产域名（如 `https://links-manager-xxxx.edgeone.cool`）。
4. 访问 `https://<分配的域名>/admin.html`，即可进入后台开始录入友链。

---

### 方式二：EdgeOne CLI 命令行部署

#### 1. 安装 CLI 工具
确保全局安装版本 ≥ `1.6.0`：
```bash
npm install -g edgeone@latest
```

#### 2. 设置上下文环境变量
```bash
export EDGEONE_CAMPUS=china
```

#### 3. 登录认证（中国站）
中国站仅支持 API Token 模式进行 CLI 身份验证：
```bash
edgeone login --site china
```
或直接通过 Token 静默登录：
1. 访问 [EdgeOne 密钥管理控制台](https://console.cloud.tencent.com/edgeone/pages?tab=settings) 创建 API Token。
2. 运行 `edgeone login --token <你的API_TOKEN>`。

#### 4. 执行部署
在项目根目录下直接运行：
```bash
edgeone makers deploy
```

---

## 自定义域名绑定与 SSL 证书

1. 登录 EdgeOne 控制台，进入项目详情页。
2. 点击 **「域名管理」** -> **「添加自定义域名」**（例如 `links.yourdomain.com`）。
3. 根据系统提示，前往您的 DNS 域名服务商（如腾讯云 DNSPod、Cloudflare、阿里云 DNS 等）添加一条 `CNAME` 解析记录，指向 EdgeOne 提供的 CNAME 地址。
4. EdgeOne 将自动申请并签发免费的 SSL/TLS 证书，通常在 5 ~ 15 分钟内解析生效并开启全球 CDN 加速。

---

## 初始管理凭证与系统配置

- **管理后台入口**：`/admin.html`（或前台 `/` 验证通过后自动进入）
- **初始管理密码**：`admin123`
- **安全建议**：
  1. 首次部署登录后，请立即进入 **「系统设置」** 页面修改默认密码；
  2. 若在生产环境中需要固定密码，可通过环境变量 `ADMIN_SECRET_KEY` 指定；
  3. 支持随时点击 **「数据备份」** 导出全量 JSON 备份，防止误操作。

---

## 公开 API 接口规范

### 1. 获取友情链接与博客联盟数据
- **路径**：`GET /api/public/links`
- **查询参数**：
  - `category`（可选）：`all`（默认返回全部）、`links`（仅返回友链）、`unions`（仅返回联盟）。
- **请求示例**：
  ```bash
  curl -X GET "https://<你的域名>/api/public/links?category=all"
  ```
- **响应示例**：
  ```json
  {
    "title": "友情链接 - EdgeOne",
    "description": "连接彼此，共享价值",
    "favicon": "/api/file?key=favicon.png",
    "links": [
      {
        "id": "link_1710000000000",
        "title": "示例博客",
        "author": "张三",
        "url": "https://example.com",
        "description": "专注全栈与边缘计算",
        "avatar": "https://gravatar.bluecdn.com/avatar/xxxxxxxx",
        "favicon": "https://www.google.com/s2/favicons?domain=example.com&sz=128",
        "pinned": true,
        "order": 1,
        "health": {
          "status": "healthy",
          "httpCode": 200,
          "sslValid": true,
          "sslDays": 85,
          "domainDays": 320,
          "checkedAt": 1710005000000
        }
      }
    ],
    "unions": [
      {
        "id": "union_1710000000000",
        "name": "开往-友链接力",
        "url": "https://www.travellings.cn",
        "author": "开往项目组",
        "description": "一个链接，带你探索未知世界",
        "iconLight": "/api/file?key=unions/travellings-light.png",
        "iconDark": "/api/file?key=unions/travellings-dark.png",
        "websiteIcon": "/api/file?key=unions/travellings.png",
        "order": 1
      }
    ]
  }
  ```

### 2. 统计数据接口 (仅限管理员凭证调用)
- **路径**：`GET /api/public/stats`
- **认证**：需要在请求头中携带管理员 Token：`Authorization: Bearer <admin_token>`
- **响应示例**：
  ```json
  {
    "linksCount": 35,
    "unionsCount": 6,
    "lastUpdated": 1710000000000
  }
  ```

### 3. Blob 静态文件托管接口
- **路径**：`GET /api/file?key=<blob_key>`
- **说明**：提供对上传到 EdgeOne Blob 中的头像、博客联盟图标及缓存 Favicon 的直链访问，内置严格防目录穿越限制与 CDN 长期强缓存响应头。

---

## 外部博客极简挂载 (Embed)

只需在博客的友链页面或 Markdown 挂载一个 HTML 容器并引入 `embed.js`，即可呈现全功能交互。

### 1. 最简挂载
```html
<div id="links"></div>
<script src="https://<你的域名>/js/embed.js" defer></script>
```

### 2. 声明式参数配置 (HTML data-* 属性)
```html
<div id="links"
     data-api="https://<你的域名>"
     data-style="detailed"
     data-shuffle="true"
     data-columns="detailed:3,simple:4,app:6"
     data-show-switcher="true"
     data-show-unions="true"
     data-show-links="true"
     data-show-health="true"
     data-theme="auto"
     data-limit="0">
</div>
<script src="https://<你的域名>/js/embed.js" defer></script>
```

### 3. 编程式调用 (JavaScript API)
```html
<div id="custom-links-container"></div>
<script src="https://<你的域名>/js/embed.js"></script>
<script>
  window.addEventListener("DOMContentLoaded", () => {
    window.EdgeOneLinks.init({
      el: "#custom-links-container",
      api: "https://<你的域名>",
      style: "detailed",
      shuffle: true,
      columns: { detailed: 3, simple: 4, app: 6 },
      showSwitcher: true,
      showUnions: true,
      showLinks: true,
      showHealth: true,
      theme: "auto",
      rememberStyle: true
    });
  });
</script>
```

### 4. 挂载参数规范

| 配置项 (JS) | HTML 属性 | 类型 | 默认值 | 说明 |
| :--- | :--- | :---: | :---: | :--- |
| `el` | `data-el` | String | `'#links'` | 挂载目标选择器（支持 `#links`、`#links-container` 等） |
| `api` | `data-api` | String | `自动探测` | API 数据服务源地址（未配置时自动嗅探 `<script src>` 所在域名） |
| `style` | `data-style` | String | `'detailed'` | 默认卡片风格：`'detailed'`（详情）、`'simple'`（简约）、`'app'`（应用） |
| `shuffle` | `data-shuffle` | Boolean | `true` | 是否随机乱序排列友情链接 |
| `columns` | `data-columns` | Object/String | `'auto'` | 列数规则：支持复合设定（如 `'detailed:3,simple:4,app:6'` 或 `'3,4,6'`）、单值（如 `3`，简约与应用模式智能递增衍生）或 `'auto'`（按卡片最佳尺寸响应式流式排版） |
| `columnsDetailed` | `data-columns-detailed` | Number/String | `null` | 详情风格专属列数（优先于 `columns`） |
| `columnsSimple` | `data-columns-simple` | Number/String | `null` | 简约风格专属列数（优先于 `columns`） |
| `columnsApp` | `data-columns-app` | Number/String | `null` | 应用风格专属列数（优先于 `columns`） |
| `showSwitcher` | `data-show-switcher` | Boolean | `true` | 是否展示卡片风格切换按钮 |
| `showUnions` | `data-show-unions` | Boolean | `true` | 是否展示“博客联盟”模块 |
| `showLinks` | `data-show-links` | Boolean | `true` | 是否展示“友情链接”模块 |
| `showHealth` | `data-show-health` | Boolean | `true` | 是否展示友链健康巡检状态指示点（绿/黄/红微标） |
| `theme` | `data-theme` | String | `'auto'` | 主题适配：`'auto'`（随博客/系统）、`'dark'`、`'light'` |
| `limit` | `data-limit` | Number | `0` | 友链最大展示数量（`0` 表示全部展示） |
| `rememberStyle` | `data-remember-style` | Boolean | `true` | 是否在本地持久化用户切换后的风格选择 |
| `target` | `data-target` | String | `'_blank'` | 链接打开目标窗口 |
| `rel` | `data-rel` | String | `'noopener noreferrer'` | 链接安全性 rel 属性 |

---

## 常见问题与排查 (Troubleshooting)

1. **部署后静态页面 404 或云函数无法调用**：
   - 确认在控制台配置的「根目录」为 `./`，「输出目录」为 `./`。
   - 确认云函数均位于 `cloud-functions/` 目录下且文件携带 `.js` 扩展名。
2. **Turnstile 人机验证报错**：
   - 若未配置自己的 Cloudflare 密钥，系统默认使用测试密钥，在部分网络环境下可能需要点击验证框确认。
   - 配置正式密钥时，请确保 Cloudflare Turnstile 后台添加了您的 EdgeOne 域名与自定义域名。
3. **KV 边缘缓存未命中**：
   - 确认在控制台将命名空间关联到项目时，变量名称精确设置为 `links_kv`（不能使用下划线以外的特殊字符或大小写不一致）。
