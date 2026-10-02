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

`COPY-PROPOSAL.md` 是初始 1.8.0 的历史文案提案，供格式和文案复核使用；不得用它替换已发布的 1.8.1。当前版本完全采用原发布负责人已审定的正式正文，不改 canonical manifest。撤销能力已按独立 P2 复核限定为“选区替换或编辑”。正式正文仍由原发布负责人审定，同一份无 frontmatter 的 Markdown 正文供现有 --summary-file、--release-notes 与 Release body；现有已签名 feed 不修改或重签。

## 本地验证范围

初始 1.8.0 源码测试 9/0，相关静态同步检查 14/0，Vite 6.4.2 构建 exit 0。更新链接定位的局部修正后重新构建并核清单同步；无关数据断言按未变范围复用。

实际 Chrome 预览覆盖当前 canonical 正文和独立文案 fixture：桌面 1512×751、手机 400×860；手机页面宽度 400，列表及概述计算字号 16px。域名根页和 /macos/ 的 #whats-new 自动展开并定位更新区；#updates 保持可用。Enter 开合、aria-expanded、折叠内容 inert 与 Tab 跳过、展开后 Tab 进入完整说明链接均已验证。预览仅本机静态内容，提案页面明确注明未发布，未执行下载安装或改写线上内容。临时 viewport 已恢复、预览 tab 已关闭；服务经 Ctrl-C 收口，exit 130。

首次源码保全脚本因 stdin 编码编译失败，未执行写入，改为 ASCII 与 Unicode JSON 后继续。首次 Vite 默认配置加载因临时配置写入 EPERM 失败，使用已安装 Vite 的 --configLoader native 后成功，无新依赖。Browser 技能 bootstrap 因 classic-level native build 缺失受阻，改用已有 CUA，不重复 bootstrap。局部同步脚本一次在工具层解析失败、未执行写入；HTML trailing whitespace 以及中间产物与同步后字节不同的保全断言均已定位，修正后格式与同步检查通过，中间产物保留。首次实屏发现更新区已展开却未定位，已补定位并在根页与 macOS 地址实际复核。

正式发布在冻结前从 1.8.0 漂移到 1.8.1，已本地同步其公开 commit；两处生成 HTML 冲突通过正式快照重建解决，incoming manifest、公开 JSON、旧引用 bundle 与签名 appcast 字节均未改写。1.8.1 重新验证源码 10/0、静态同步 14/0、build exit 0，补桌面与 400px 正式正文和元信息实屏；此前键盘/inert/焦点证据仅按交互机制及焦点元素未变范围复用。1.8.0 原始候选 commit 26983ba、fixture、截图及中间输出保留，不伪装成当前 1.8.1 的正文。浅色桌面及窄屏、系统深色窄屏尾部均有实际截图；不扩称全站无障碍验收。两次预览服务均已 Ctrl-C / exit 130 收口。
