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

## 正文与文案采用边界

页面按正文渲染概述、分类标题、列表与粗体，不把多行 Markdown 塞入一项列表。当前 1.8.1 作者正文中的元信息、概述、四项变更与保留范围全部保留；元信息单独排版，不冒充概述。原 1.8.0 的六项变更及未解决问题保留为明确历史测试 fixture；正文只支持本页实际需要的 Markdown 子集，作者 HTML 作为纯文本显示，拒绝 frontmatter。移除旧版本 summary 特判，不新增历史系统。

`COPY-PROPOSAL.md` 是依据当前 1.8.1 正式发布事实整理的用户文案提案，包含一句概述、三项优化、一项修复与保留范围。原发布负责人已确认纠错学习提示问题没有关闭证据，因此提案独立保留“仍在调查，尚未确认解决”；1.8.1 正式正文未提及该问题不代表已解决。当前页面继续显示现行正式正文，提案尚未采用，不替换已发布的 manifest、签名 appcast 或 GitHub Release body，不修改或重签安装包。

### 用户语言规则

- 概述用一句话说明这次更新的主要体验变化，列出 3–5 项重要变更。
- 按事实归入“新增”“优化”“修复”，不把原有能力或未解决问题写成新改进。
- 用用户能理解的名称说明效果，例如“听写状态条”“独立小窗”“服务密钥”；不把内部代号、提交 SHA、测试数量或未发布实验放进亮点。
- 影响用户且尚未关闭的问题独立列在“已知问题”，只有取得实际关闭证据后才更新其状态，不因后续版本省略而删除。
- 平台、版本、构建和日期采用实际发布事实；不声称没有验证的速度、准确率或稳定性提升。

### 唯一采用路径

1. 下一次取得具体发布授权后，由原 macOS 发布负责人按实际目标版本、构建和日期更新并审定提案正文，同时核对已知问题状态。
2. 沿现有流程导出这一份无 frontmatter 的纯 Markdown 正文；同一正文同时用于现有 `--summary-file`、`--release-notes` 和 GitHub Release body，不另写第二套文案。
3. 原发布负责人按既有发布验收核对三处正文一致后，在该次授权内发布；官网继续从同源正式发布数据展示已审定正文。

本轮只交付提案与采用规则，尚未执行上述发布路径。

## 本地验证范围

本次文案收口仅更新 `COPY-PROPOSAL.md`、本文件与相邻文案断言；针对当前 1.8.1 提案的源码检查 5/0、skip 0，格式检查通过。manifest、签名 appcast、已发布 Release body、页面运行代码及生成资产均未修改。下述既有源码、静态、构建和实屏证据仅在未变范围内复用，本次不重建、不重复 GUI 验收或额外发起 CI。

初始 1.8.0 源码测试 9/0，相关静态同步检查 14/0，Vite 6.4.2 构建 exit 0。更新链接定位的局部修正后重新构建并核清单同步；无关数据断言按未变范围复用。

实际 Chrome 预览覆盖当前 canonical 正文和独立文案 fixture：桌面 1512×751、手机 400×860；手机页面宽度 400，列表及概述计算字号 16px。域名根页和 /macos/ 的 #whats-new 自动展开并定位更新区；#updates 保持可用。Enter 开合、aria-expanded、折叠内容 inert 与 Tab 跳过、展开后 Tab 进入完整说明链接均已验证。预览仅本机静态内容，提案页面明确注明未发布，未执行下载安装或改写线上内容。临时 viewport 已恢复、预览 tab 已关闭；服务经 Ctrl-C 收口，exit 130。

首次源码保全脚本因 stdin 编码编译失败，未执行写入，改为 ASCII 与 Unicode JSON 后继续。首次 Vite 默认配置加载因临时配置写入 EPERM 失败，使用已安装 Vite 的 --configLoader native 后成功，无新依赖。Browser 技能 bootstrap 因 classic-level native build 缺失受阻，改用已有 CUA，不重复 bootstrap。局部同步脚本一次在工具层解析失败、未执行写入；HTML trailing whitespace 以及中间产物与同步后字节不同的保全断言均已定位，修正后格式与同步检查通过，中间产物保留。首次实屏发现更新区已展开却未定位，已补定位并在根页与 macOS 地址实际复核。

正式发布在冻结前从 1.8.0 漂移到 1.8.1，已本地同步其公开 commit；两处生成 HTML 冲突通过正式快照重建解决，incoming manifest、公开 JSON、旧引用 bundle 与签名 appcast 字节均未改写。1.8.1 重新验证源码 10/0、静态同步 14/0、build exit 0，补桌面与 400px 正式正文和元信息实屏；此前键盘/inert/焦点证据仅按交互机制及焦点元素未变范围复用。1.8.0 原始候选 commit 26983ba、fixture、截图及中间输出保留，不伪装成当前 1.8.1 的正文。浅色桌面及窄屏、系统深色窄屏尾部均有实际截图；不扩称全站无障碍验收。两次预览服务均已 Ctrl-C / exit 130 收口。
