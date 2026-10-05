# macOS 官网源码与更新展示候选

本目录保存现有 React/Vite 官网的必要源码、品牌资源、依赖锁与测试，位于 GitHub Pages 的 `/docs` 发布目录之外。不包含客户端源码、设计审查材料、安装依赖或签名材料。

初始基线为生产 main `a9b49bbeb36a509f2152a6b7d682be3245a4fdca`；交付前已本地同步正式 1.8.1 发布 `0619e7e46c76401abbe058c11eb1a0f958a2ff56`，沿用根页/Logo 修复的公开 source `28a75fc524e2c981d6202bd49a8c442e25a194c6`。原 prototype 与旧产物保留。本候选沿用同源 `release.json` 和 Vite 图标导入。

本次只修改官网更新说明的展示、必要验证和用户文案提案，交付独立 Draft PR。版本、构建、下载、校验与渠道仍来自现行 `macos/manifest.json`；日期来自 `generatedAt`，明确显示为“清单更新”，不称发布日。已签名 feed、安装包和客户端均未修改。

## 从源码恢复

```bash
cd website/macos
cp ../../macos/manifest.json public/release.json
npm ci
npm test
npm run build -- --base=./
```

输出在 `dist/client`。将实际使用的 assets 和 index.html 装入 `docs/macos`，保留旧产物；回仓库根目录运行：

```bash
npm run release:page
npm run release:page -- --check
node --test scripts/test-macos-download-page.mjs
```

现有同步脚本从 macOS 页面生成根主页，刷新公开 JSON、内置快照及无脚本下载链接。根页和 `/macos/` 使用同一份资产，不新增中转页。不要提交 node_modules 或临时预览服务。

## 官网链接范围

官网只展示当前正式版本的精简更新说明，不提供完整发布说明、失败提示中的发布页或支持页 GitHub Issues 出口。备用下载（包括无 JavaScript 入口）直接使用现有 `dmg.mirrorUrl` 安装包地址；它不打开仓库或 Release 页面。同步脚本沿用此规则，下载渠道、校验信息、签名 feed 和 GitHub Release 正文不变。

源码内置快照与当前正式 1.8.2 清单同步；发布的清单数据和产品正文未修改。`#updates`、`#whats-new`、移动端及键盘开合交互沿用现有实现。本次受影响的源码测试、下载页同步测试、Vite 构建和同步只读检查需通过；线上实屏由父级验收，不能把旧截图当作本次结果。

首次本地检查发现当前发布断言仍指定 1.8.1，以及“旧版本身份”检查误将正式 1.8.2 正文中的“与 1.8.1 保持一致”当作旧制品。已按现行版本/构建与实际下载目标修正断言，保留正文原样；这两处失败未通过删检查或改产品文案消除。

修正后源码检查 10/0、下载页检查 14/0，Vite 6.4.2 构建、同步 `--check` 与格式检查通过。独立 delta 审查未发现 P1/P2；确认仅保留安装包直链，正式 manifest、两份公开 JSON 和签名 appcast 无差异。手机、键盘和线上下载网络仍待本次云端实屏验证，未复用旧截图作为通过证据。

## 正文与文案采用边界

页面按正文渲染概述、分类标题、列表与粗体，不把多行 Markdown 塞入一项列表。当前 1.8.1 作者正文中的元信息、概述、四项变更与保留范围全部保留；元信息单独排版，不冒充概述。原 1.8.0 的六项变更及未解决问题保留为明确历史测试 fixture；正文只支持本页实际需要的 Markdown 子集，作者 HTML 作为纯文本显示，拒绝 frontmatter。移除旧版本 summary 特判，不新增历史系统。

`COPY-PROPOSAL.md` 是依据当前 1.8.1 正式发布事实整理的用户文案提案，包含一句概述、三项优化、一项修复与保留范围。按用户最新审定范围，提案不列内部调查事项，也不宣称相关问题已解决；原内部调查状态仍未关闭。该提案供事实与格式参考，不能将 1.8.1 既有菜单或预览改进直接作为 1.8.2 新增变更。1.8.2 最终正文由原发布负责人独立审定，只描述本次官网排版与文案变化。当前页面继续显示现行正式正文，提案尚未采用，不替换已发布的 manifest、签名 appcast 或 GitHub Release body，不修改或重签安装包。

### 用户语言规则

- 概述用一句话说明这次更新的主要体验变化，列出 3–5 项重要变更。
- 按事实归入“新增”“优化”“修复”，不把原有能力或未解决问题写成新改进。
- 用用户能理解的名称说明效果，例如“听写状态条”“独立小窗”“服务密钥”；不把内部代号、提交 SHA、测试数量或未发布实验放进亮点。
- 公开已知问题以本次用户审定范围为准；未列入正文的事项继续保留原内部调查记录，只有实际关闭证据才能改变其状态，不把省略写成已解决。
- 平台、版本、构建和日期采用实际发布事实；不声称没有验证的速度、准确率或稳定性提升。

### 唯一采用路径

1. 取得该次具体发布授权后，由原 macOS 发布负责人按实际目标版本、构建和日期更新并审定正文，同时核对公开说明范围与内部调查状态；仅描述本次实际变化。
2. 沿现有流程导出这一份无 frontmatter 的纯 Markdown 正文；同一正文同时用于现有 `--summary-file`、`--release-notes` 和 GitHub Release body，不另写第二套文案。
3. 原发布负责人按既有发布验收核对三处正文一致后，在该次授权内发布；官网继续从同源正式发布数据展示已审定正文。

本轮只交付提案与采用规则，尚未执行上述发布路径。

## 本地验证范围

本次文案收口仅更新 `COPY-PROPOSAL.md`、本文件与相邻文案断言；移除用户指定不公开的调查条目，未将其标为已解决。针对当前 1.8.1 提案的源码检查 5/0、skip 0，格式检查通过。manifest、签名 appcast、已发布 Release body、页面运行代码及生成资产均未修改。下述既有源码、静态、构建和实屏证据仅在未变范围内复用，本次不重建、不重复 GUI 验收或额外发起 CI。

初始 1.8.0 源码测试 9/0，相关静态同步检查 14/0，Vite 6.4.2 构建 exit 0。更新链接定位的局部修正后重新构建并核清单同步；无关数据断言按未变范围复用。

实际 Chrome 预览覆盖当前 canonical 正文和独立文案 fixture：桌面 1512×751、手机 400×860；手机页面宽度 400，列表及概述计算字号 16px。域名根页和 /macos/ 的 #whats-new 自动展开并定位更新区；#updates 保持可用。Enter 开合、aria-expanded、折叠内容 inert 与 Tab 跳过、展开后 Tab 进入完整说明链接均已验证。预览仅本机静态内容，提案页面明确注明未发布，未执行下载安装或改写线上内容。临时 viewport 已恢复、预览 tab 已关闭；服务经 Ctrl-C 收口，exit 130。

首次源码保全脚本因 stdin 编码编译失败，未执行写入，改为 ASCII 与 Unicode JSON 后继续。首次 Vite 默认配置加载因临时配置写入 EPERM 失败，使用已安装 Vite 的 --configLoader native 后成功，无新依赖。Browser 技能 bootstrap 因 classic-level native build 缺失受阻，改用已有 CUA，不重复 bootstrap。局部同步脚本一次在工具层解析失败、未执行写入；HTML trailing whitespace 以及中间产物与同步后字节不同的保全断言均已定位，修正后格式与同步检查通过，中间产物保留。首次实屏发现更新区已展开却未定位，已补定位并在根页与 macOS 地址实际复核。

正式发布在冻结前从 1.8.0 漂移到 1.8.1，已本地同步其公开 commit；两处生成 HTML 冲突通过正式快照重建解决，incoming manifest、公开 JSON、旧引用 bundle 与签名 appcast 字节均未改写。1.8.1 重新验证源码 10/0、静态同步 14/0、build exit 0，补桌面与 400px 正式正文和元信息实屏；此前键盘/inert/焦点证据仅按交互机制及焦点元素未变范围复用。1.8.0 原始候选 commit 26983ba、fixture、截图及中间输出保留，不伪装成当前 1.8.1 的正文。浅色桌面及窄屏、系统深色窄屏尾部均有实际截图；不扩称全站无障碍验收。两次预览服务均已 Ctrl-C / exit 130 收口。

## 阿里云杭州私有迁移资格（2026-10-03）

沿用户确认的迁移顺序，本线已完成官网、下载与签名 Catalog 的杭州私有副本及必要验证。统计后端由原后端线处理，本节不代表全部云服务迁移或国内公开切换完成。海外官网仍部署于 `imkida/V_IME_releases` 的 GitHub Pages（`main:/docs`）；`https://vimebot.ai/` 直接显示主页，`www.vimebot.ai` 经普通 HTTP 规范域名跳转后显示同一主页，无“正在打开”HTML 中转页。本次没有修改 Pages、DNS、上海源桶或生产消费者。

| 用途 | 上海源桶 | 杭州目标桶 | 杭州当前对象 / 字节 |
| --- | --- | --- | --- |
| 国内官网 | `vime-official-site-cn-shanghai` | `vime-official-site-cn-hangzhou` | 21 / 1320535 |
| 下载文件 | `vime-public-releases-cn-shanghai` | `vime-public-releases-cn-hangzhou` | 111 / 661921700 |
| Provider Catalog | `vime-provider-catalog-cn-shanghai-2026` | `vime-provider-catalog-cn-hangzhou-2026` | 2 / 4506 |

三个新目标实际采用杭州 Standard/ZRS、private ACL、阻止公共访问；无公开 BucketPolicy，匿名读取均返回 403。官网与下载目标已启用版本控制，Catalog 与源一致未启用；未添加自动删除规则。已核付费的中国内地通用标准 ZRS 存储包可抵扣同型杭州容量，但不包含请求或外网流量，本次未购买新资源包。上海下载与 Catalog 源为 LRS、官网源为 ZRS；保留上海期间的容量不能误算为已全部被该 ZRS 包覆盖。

首次固定清单为 124 个当前对象；全部源→目标字节、CRC64、实际元数据和私有对象权限校验通过。最后读回发现原发布线独立新增 1.8.3，故该次源漂移检查以 exit 1 保留，未冒称副本最新；仅补复制其四个新文件与两份控制文件。最终源清单为 128 个对象，以 126 个真实非空 OSS 版本 ID 加两份未版本化 Catalog 的 ETag/If-Match 快照固定。最终杭州共 134 个当前对象、663246741 字节，源清单及最新版本/元数据无漂移，源桶配置与最初读回一致。

官网目标采用已公开的正式 `fb7191ea15bd9d6eea7bcea60b5af3c89868012e`（1.8.3 / 2026100301、Pages built）21 个 `docs` 文件，逐文件与 Git blob 和目标内容读回一致。上海旧根入口的 342 字节中转页未改写；其初始复制版本在杭州仍可恢复。杭州当前根入口直接渲染正式主页，必要静态引用齐全；不以尚未公开的网站开发作为迁移前置。

下载中的 manifest、appcast、校验文件、DMG/ZIP 和原签名逐字节保留，原上海 URL 不重写。初始 52 条发布校验、两份 Catalog Ed25519 签名及 Android 模型包/成员校验已通过；1.8.3 增量另通过两份安装包校验、manifest 大小/摘要、Sparkle feed（2017 个签名字节）和 ZIP 签名验证。不访问 Keychain、不重签名、不安装或运行 Provider。20 个初始非当前历史版本共 66227 字节已在本机保全；上海既有非当前版本三天到期规则未改变，本阶段不声称目标保有原 OSS 版本 ID、全部历史或上海历史永久保留。

现行 macOS、Android Catalog 均拒绝重定向，macOS 更新源和 Android 模型清单回退地址仍固定上海。现有消费者继续使用上海，不能用 302 或改旧 manifest 冒称已采用杭州；后续实际采用另走具体发行资格，iOS 状态不作推断。国内官网公开访问、两个国内域名和管理域名仍待实际备案、接入资格及绑定；私有副本通过不等于中国用户已可访问，不修改管理后台或真实数据。

2026-10-03 接入资源首次只读：原后端线已在阿里云“可备案实例管理 → 函数计算套餐包”实见两条有效资源，当时各自免费备案数量（已使用/上限）为 0/1、已绑定收费服务码数量为 0，有效至 2027-10-03。当时网站信息草稿的实例下拉显示“暂无数据”，尚未刷新、选择或提交；不能将这个呈现差异继续记作无可备案资源。资源资格已确认，但 ICP 尚未完成，隐私技术答复仍待核，国内公开切换和域名绑定边界保持不变。来源为原后端线 turn `01a0fe43-62dc-7880-aee9-a300a6b4468b` 的实际界面查询与草稿读回，本增量不记录订单或账户信息。

2026-10-03 备案进展：原后端线在既有页面读回，`vimebot.com` 已于当日 14:16 提交，目前“阿里云初审：审核中”；页面预计 10 月 7 日 20 点前审核，属于预计时间。待提交管局、工信部短信核验及管局审核均为“未进行”。本线已直接目视 `/private/tmp/vime-icp-submitted-progress-20261003.png`，上述阶段与原后端线 turn `01a10069-14d4-7c43-b618-33cfd0f10c69` 的读回一致。原后端线操作前页面已提交，未重复提交；本增量只同步状态，备案尚未通过，隐私技术答复仍待核，不修改 DNS、公开接入或发布，也不重新构建、下载或云端复验。

证据沿 `/private/tmp/vime-oss-hangzhou-migration-20261003` 保留：`preflight.json`、`copy-private-receipt.json` 及 `offline-verification-receipt.json` 保存初始 124 对象/历史保全和校验；`final-readback.json` 保留首次源漂移失败；`delta-1-8-3-receipt.json`、`effective-preflight-1-8-3.json`、`offline-1-8-3-delta-verification.json`、`pages-1-8-3-receipt.json`、`website-mirror-1-8-3-receipt.json` 及 `final-readback-1-8-3.json` 保存当前固定候选和最终读回。早期 CLI 配置读取 exit 2、原 SDK 路径诊断与原始回执保留，正式复制使用固定官方 `ali-oss@6.23.0`，凭据仅在内存、不写日志。本文档收口不重跑网站构建、旧套件、GUI 或额外 CI。

## 海外官网 HTTPS 修复（2026-10-06）

用户报告浏览器连接不安全。实际 GitHub Pages 证书已获批准，覆盖 `vimebot.ai` 与 `www.vimebot.ai`，但 `https_enforced=false`；普通 HTTP 根入口返回 200 并停留在 HTTP，是本次确认的问题。沿现有官网授权，仅将 `https_enforced` 改为 true，官方 API 返回 204，随后设置读回确认。域名、`main:/docs` 发布源、网站内容及 DNS 均未更改。

首次公网复验仍命中旧 HTTP 响应缓存而未通过；实际响应为 HIT、`max-age=600`，另一现有页面 `index.html` 的新请求已返回 HTTPS 301。原失败回执保留，根据实际缓存到期时间等待后只复验一次，根域名与 www 的 HTTP/HTTPS 四入口均最终进入有效 HTTPS 并返回 200，主页脚本、样式和图标的 HTTPS 读取与证书校验通过。资源中的 W3C HTTP 命名空间标识不是网络加载地址，未发现其他 HTTP 加载引用；不扩称其他设备或全球所有边缘节点均已实测。

证据沿 `/private/tmp/vimebot-https-fix-20261006` 保留：`before-public-readback.json`、`pages-https-setting-readback.json`、首次未通过的 `after-public-readback.json`、`asset-and-cache-diagnostic.json` 及最终 `after-cache-expiry-public-readback.json`。本次设置修复与文档收口不改国内私有资产、备案状态或消费者，不重构建、不额外触发 CI，也不关闭或绕过浏览器证书验证。
