# Vime Releases — 公开分发镜像

Vime 是一款**跨平台智能语音输入法**：说完即得可直接使用的文字，同时带一套完整的中文拼音键盘。主仓 [`imkida/V_IME_Android`](https://github.com/imkida/V_IME_Android) 为私有源码仓；本仓库作为对外分发的只读公开镜像，承载各平台安装包、更新检查 manifest、端侧模型清单、macOS Sparkle appcast，以及 GitHub Release 资产入口。

源码、签名密钥、构建脚本、私有配置不进入本仓。本仓只发布可公开访问的构建产物索引和发布说明。

> **命名口径**：用户可见的品牌名统一写作 `Vime`。仓库名 `V_IME_releases`、路径、GitHub URL、
> 已发布资产文件名（`V_IME-vX.Y.Z-*.apk` 等）、schema 常量属于技术标识，保持原样不改名。

## 仓库职责

- GitHub Releases 至少保留最近两个 macOS 公测版，作为安装包备用下载源。
- macOS 主下载可使用 `cn-shanghai` OSS 默认 HTTPS 域名；canonical manifest 不绑定具体云厂商字段，只记录公开 HTTPS URL。
- Git 文件存放 manifest、appcast、schema、发布规范和公开说明。
- 每个平台使用独立 tag 命名空间，避免版本号冲突。
- 每个公开下载资产必须提供 SHA-256 校验信息；有平台签名体系时同步记录签名证书或更新框架要求的签名元数据。

### 什么不进这个仓（公开仓边界）

本仓是公开只读镜像。判断标准：**这个东西需要凭证或私有上下文才能生成、执行或维护吗？**需要就不进。

- 安装包本体一律走 GitHub Release asset 或 OSS，不进 Git 历史。仓库体积应保持在索引量级；历史上 `macos/0.5.0`、`macos/0.6.0` 曾把 DMG/ZIP 提交进仓（26.7 MB），已从 HEAD 移除，对应资产仍在 Release `macos-v0.5.0` / `macos-v0.6.0`。
- 客户端源码、构建脚本、发布 lane 脚本、签名与公证配置、Sparkle 私钥、OSS 上传脚本与凭证。
- 内部交接材料：候选包验证记录、设备 smoke 数据、排查过程、私有仓 commit 引用。公开页只保留用户可读的发布说明。
- 该原则与仓库首段一致（"源码、签名密钥、构建脚本、私有配置不进入本仓"）；`scripts/` 下只放**发布控制文件的生成与校验**工具，不放上行到 OSS / Release 的脚本——那些属于客户端仓的发布 lane。

## 目录结构

```text
V_IME_releases/
├── README.md
├── android/
│   ├── manifest.json               # Android OTA 渠道清单（release / debug）
│   └── local-asr-models.json       # 端侧语音识别模型清单（按需下载）
├── macos/
│   └── manifest.json               # 安装包本体走 Release asset / OSS，不进 Git
├── docs/
│   ├── macos/
│   │   ├── index.html              # macOS 公测下载与更新说明页
│   │   └── beta/appcast.xml        # Sparkle appcast
│   ├── privacy/
│   │   └── index.html              # App Store 隐私政策页面
│   └── support/
│       └── index.html              # App Store 支持页面
├── schema/
│   └── release-manifest.schema.json
├── scripts/
│   └── update-manifest.mjs         # 无外部依赖的 manifest 更新脚本
├── windows/
│   └── manifest.json               # 未接入
├── ios/
│   └── manifest.json               # 未接入：App Store / TestFlight 元数据
└── harmonyos/
    └── manifest.json               # 未接入
```

空目录不会提交到 Git；待接入平台会在首次发布时创建对应文件。

## Release 命名

各平台版本号独立递增，不强制对齐。tag 始终带平台前缀。

| 平台 | tag 形态 | 当前状态（核验 2026-08-30） | 主要资产 |
|---|---|---|---|
| Android | `android-vX.Y.Z` | 正在使用：`release` 与 `debug` 双渠道 | `.apk` |
| macOS | `macos-vX.Y.Z` | 正在使用：公开公测 + Sparkle 自动更新 | `.dmg` / `.zip` / Sparkle appcast |
| iOS | `ios-vX.Y.Z` | 未接入本仓：走 App Store Connect / TestFlight | 后续记录 Store / TestFlight 元数据 |
| Windows | `windows-vX.Y.Z` | 未接入本仓 | `.exe` / `.msi` / `.msix` |
| HarmonyOS | `harmonyos-vX.Y.Z` | 未接入本仓 | `.hap` 或商店分发元数据 |

各渠道的当前版本以 manifest 为准，README 不作事实源：Android 见 [`android/manifest.json`](android/manifest.json)，macOS 见 [`macos/manifest.json`](macos/manifest.json)。

二进制资产命名（历史命名规则，不随品牌写法变化）：

```text
V_IME-vX.Y.Z-<channel>.<ext>
V_IME-vX.Y.Z-<channel>-<arch>.<ext>
```

示例：

```text
V_IME-v1.6.0-release.apk
V_IME-v0.5.0-beta-universal.dmg
V_IME-v1.4.0-stable-x64.msi
```

## Manifest 规范

平台 manifest 应尽量遵循 [`schema/release-manifest.schema.json`](schema/release-manifest.schema.json)。当前 schema 的 `formatVersion` 为 `1`。

通用字段：

| 字段 | 说明 |
|---|---|
| `formatVersion` | manifest 格式版本，当前固定为 `1` |
| `generatedAt` | 生成时间，ISO-8601 UTC 时间 |
| `platform` | 平台名：`android` / `macos` / `windows` / `ios` / `harmonyos` |
| `packageName` / `bundleId` / `appId` | 平台应用标识 |
| `channels` | 发布渠道对象 |

推荐渠道：

| 渠道 | 用途 |
|---|---|
| `stable` | 面向普通用户的稳定版本 |
| `beta` | 面向公开测试的预发布版本 |
| `debug` / `dev` | 面向开发者的自测版本 |

Android 当前客户端已经使用 `release` 和 `debug` 渠道名；为了兼容已发布版本，Android manifest 继续保留这两个渠道。新平台优先使用 `stable` / `beta` / `dev`。

每个渠道至少应包含：

- `versionName`
- `title`
- `summary`
- `releaseUrl`
- `mandatory`
- 至少一种下载入口：`assets`、`downloadUrl` + `sha256`、`apkUrl` + `apkSha256`、`appcastUrl` 或 `storeUrl`

## 发布脚本

本仓提供无外部依赖的 manifest 更新脚本：

```text
npm run release:manifest -- --help
```

Android 发布示例：

```text
npm run release:manifest -- \
  --platform android \
  --channel release \
  --version-name 1.6.1 \
  --version-code 139 \
  --title "v1.6.1 - 修复说明" \
  --summary "本次更新摘要" \
  --tag android-v1.6.1 \
  --asset /path/to/V_IME-v1.6.1-release.apk \
  --certificate-sha256 <release-certificate-sha256> \
  --min-supported-version-code 1
```

脚本会自动计算本地资产的 SHA-256 和文件大小。默认生成 GitHub Release asset URL；传入 `--asset-url-base` 时，主 URL 使用该 HTTPS 前缀，并把同 tag 的 GitHub asset 记录为 `mirrorUrl`。Android 会更新 `apkName`、`apkUrl`、`apkSha256`；其他平台会写入 `assets` 数组。

Windows 多安装器示例：

```text
npm run release:manifest -- \
  --platform windows \
  --channel stable \
  --version-name 1.4.0 \
  --title "v1.4.0 - Windows 首版" \
  --summary "Windows 稳定版首次公开发布" \
  --tag windows-v1.4.0 \
  --asset /path/to/V_IME-v1.4.0-stable-x64.msi \
  --installer-type msi \
  --arch x64 \
  --certificate-sha256 <code-signing-certificate-sha256>
```

如果同一个版本要追加 `exe`、`arm64` 等资产，使用 `--asset-mode append`。发布前可加 `--dry-run` 查看将写入的 manifest。

## Android 发布

Android App 设置页「检查更新」会 fetch：

```text
https://raw.githubusercontent.com/imkida/V_IME_releases/main/android/manifest.json
```

安装包以 GitHub Release asset 形式发布，tag 命名规则为 `android-vX.Y.Z`。

| 用途 | 资产命名 | 说明 |
|---|---|---|
| 公开用户 stable 安装 | `V_IME-vX.Y.Z-release.apk` | 使用 Vime 长期 release keystore 签名 |
| 公开用户尝鲜 / 开发者自测 | `V_IME-vX.Y.Z-debug.apk` | Debug 签名，不要与 Release 包混装 |

`debug` 渠道不是「内部包」：完整键盘、端侧语音识别这类新形态会先在 debug 渠道对公开用户开放，稳定后再进 `release` 渠道。两个渠道各自独立递增，`release` 通常滞后于 `debug`。

同包名不同签名不可在同一台设备共存。Debug 和 Release 都使用 `applicationId = com.vime.android`，但签名指纹不同；强行覆盖会被系统拒绝，部分系统安装器会引导卸载重装，导致 DataStore、历史记录、用户词库与 Android Keystore 中的 API Key 全部丢失。

需要在 Debug 与 Release 之间切换时，先用 App 内「配置导出」备份，再卸载重装并重新导入。

## Android 端侧语音模型分发

Android 的端侧语音识别运行时随安装包分发（**仅 arm64**），**识别模型不进包**，由 App 按需下载。

> **目前仅 `debug` 渠道。** 首个内含该运行时的包是 `1.7.0-dogfood.9` / versionCode 167；
> 清单里的模型条目也带 `minVersionCode` 门控。`release` 渠道当前停在 versionCode 138，
> **不含**端侧运行时，稳定渠道用户装到的包没有这项能力。

模型清单：

```text
android/local-asr-models.json
```

清单记录每个模型的 `downloadUrl`、`fallbackDownloadUrl`、`archiveSha256`、逐文件 `fileSha256`、`archiveBytes`（**压缩包字节数，不是解压后大小**；清单没有解压体积字段）、`minVersionCode` 与建议网络类型。

**主备托管方向相反，避免单点**：

| 资源 | 主源 | 备源 |
|---|---|---|
| 模型压缩包 | 阿里云 OSS | GitHub Release（tag `models-local-asr-v1`） |
| 模型清单 | GitHub raw | 阿里云 OSS |

模型体积较大（当前基线约 159 MB），清单里标注 `recommendedNetwork: wifi`。清单由主仓的发布工具生成后同步到本仓，不用 `release:manifest` 脚本维护。

## macOS 发布

macOS 优先使用 Sparkle 作为更新通道。当前 macOS beta manifest 位于：

```text
macos/manifest.json
```

发布前必须确认：

- App 使用 Developer ID 签名。
- 安装包完成 notarization。
- Sparkle enclosure 包含下载 URL、版本号、文件长度、EdDSA 签名和最低系统版本。
- `macos/manifest.json` 保留 GitHub Release tag 兼容入口，主资产可指向 OSS，并记录同字节 GitHub 备用地址和校验信息。
- Sparkle appcast URL 保持 GitHub Pages，不随资产托管位置变化；必须先验证 OSS 与 GitHub ZIP 字节一致，再发布 appcast。

macOS 公测下载、使用引导与更新说明页面：

```text
https://imkida.github.io/V_IME_releases/macos/
```

## Windows 发布

Windows 客户端是 Vime 的原始实现，目前已停更，本仓尚未接入其资产。若后续恢复发布，manifest 应区分安装器类型和架构：

- `installerType`: `exe` / `msi` / `msix`
- `arch`: `x64` / `arm64` / `x86`
- `certificateSha256`: 代码签名证书 SHA-256 指纹
- `minSystemVersion`: 最低 Windows 版本

如果同一版本同时发布多种安装器，优先使用 `assets` 数组表达。

## iOS 发布

iOS 走 App Store Connect / TestFlight，`.ipa` 不作为公开下载包镜像到本仓。后续在 `ios/manifest.json` 中公开：

- App Store 或 TestFlight URL
- `versionName` 与 build number
- 最低 iOS 版本
- 审核状态或公开发布时间
- 权限、隐私、模型调用相关变更说明

iOS App Store 隐私政策页面由 GitHub Pages 提供：

```text
https://imkida.github.io/V_IME_releases/privacy/
```

iOS App Store 支持页面：

```text
https://imkida.github.io/V_IME_releases/support/
```

只有在明确使用企业签名或受控测试分发时，才应记录 `.ipa` 下载资产；此类资产仍需包含 SHA-256 和签名来源说明。

## HarmonyOS 发布

HarmonyOS 首次接入时建议记录：

- `.hap` 或应用市场 URL
- bundle name / app id
- 证书指纹
- 设备架构或 API version 要求
- SHA-256 校验信息

## 发布检查清单

1. 使用目标平台的正式签名方式构建安装包。**Android 分发件必须 clean 构建**，不得使用增量构建产物。
2. 用 `npm run release:manifest` 计算每个公开资产的 SHA-256 并更新 manifest。
3. 创建带平台前缀的 GitHub Release tag。
4. 上传安装包、归档包或安装器到 Release assets。
5. 检查对应平台的 manifest 或 appcast。
6. macOS 同批重建 `docs/macos` 的静态兜底（`npm run release:page`），并运行 `npm test` 确认页面与 manifest 一致。
7. 校验 JSON 语法和 manifest schema。
8. 用公开 URL 验证匿名用户可访问 Release 页面、下载资产和 raw manifest。
9. 在真实设备或虚拟机上验证更新检查路径。

## 历史

- v1.3.0 到 v1.3.9 早期版本曾发布在主仓 `imkida/V_IME_Android` 的 Release 页。主仓改为私有仓库后，匿名用户访问会得到 HTTP 404。本镜像仓自 `android-v1.3.10` 起承担对外分发，历史 v1.3.x 包随 `android-v1.3.9` 一同补存档于此供归档。

## 反馈

- 主仓 issue tracker：[`imkida/V_IME_Android` issues](https://github.com/imkida/V_IME_Android/issues)（私有，需邀请）
- 公开反馈渠道：暂无；联系作者请用主仓主页联系方式

## About

Vime 是一款智能语音输入法：说完即得可直接使用的文字，同时带一套完整的中文拼音键盘，需要打字时不用切走。支持自定义 API 和全本地化数据存储，保护隐私安全。产品功能及交互都持续打磨，适配各种场景，提供多格式输出。能说，就坚决不打字：）

这个项目完全基于 VibeCoding 开发，是一次完整的无代码设计尝试。

### 主要能力（Android 端，完成度最高）

**语音线**

- 两档转写风格：`Verbatim`（逐字稿，跳过 LLM）/ `Clean`（智能整理，默认）。
- 三种 session 模式：`Normal` / `Translation`（中英互译）/ `Edit`（按语音指令改写选中文本）。
- 云端 ASR 支持 OpenAI 兼容接口、阿里百炼 Fun-ASR、火山引擎 BigASR；LLM 改写走 OpenAI 兼容 `/v1/chat/completions`。服务地址与 API Key 全部由用户自己填。
- 端侧语音识别运行时随包（仅 arm64，当前仅 debug 渠道），模型按需下载，用于**听写过程中的本地实时预览**；最终文本仍由云端产出，仍需自行配置云端服务。
- 实时预览（实验室，默认关闭）：听写时实时预览识别内容，结束后自动替换为整理结果。

**打字线**

- 完整中文拼音键盘：候选栏与展开面板、逐字筛选、模糊音、一键撤销。
- 自适应字频 / 词频学习；内置词库（专有名词规范化，默认关闭）+ 个人词库。
- Quick Panel：数字 / 字母 / 符号三层快捷键盘，按目标文本框类型自动选首层。

**隐私**

- 客户端直连用户自己配置的 Provider，**项目没有自建业务后端**。
- API Key 经 Android Keystore 加密存储，发请求那一刻才解密。
- 密码输入框下静默拒绝写入。
- 历史记录只存本机，可查询、复用、清理，也可整体关闭。

## macOS 下载主页

`docs/macos/index.html` 与 `docs/macos/assets/` 为已构建的静态网页，由 GitHub Pages 从 `main:/docs` 发布。页面在加载时读取本仓 `main/macos/manifest.json` 的 raw 地址，统一更新下载、校验、系统要求与版本说明；网络不可用时保留构建时已发布的版本，并在“其他下载与校验”中提示。

因此页面里的兜底版本会随发布漂移：**每次更新 `macos/manifest.json` 后必须同批重建 `docs/macos` 的静态兜底**（`assets/index-*.js` 内置的 manifest 快照与 `index.html` 的 `<noscript>` 下载链接），否则拉不到 manifest 的用户会拿到上一版包的说明与链接。重建是仓内命令，不需要页面源码仓：

```bash
npm run release:page            # 用 macos/manifest.json 刷新 docs/macos 的静态兜底
npm run release:page -- --check # 只报告漂移，不写文件
npm test                        # 断言兜底版本等于当前 manifest，且页面不含上一版版本号
```

网页更新通过 PR 提交构建后的 HTML、CSS、JavaScript 与实际使用的品牌 SVG，不提交客户端源码、设计审查材料或开发依赖。发布前运行 `npm test`，并以 `/V_IME_releases/macos/` 子目录验证资源、下载与安装引导。网站改版不修改安装包、发布清单或 Sparkle appcast。
