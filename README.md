# V_IME Releases - 公开分发镜像

V_IME 是一个跨平台的纯语音输入应用项目。主仓 [`imkida/V_IME_Android`](https://github.com/imkida/V_IME_Android) 为私有源码仓；本仓库作为对外分发的只读公开镜像，承载各平台安装包、更新检查 manifest、macOS Sparkle appcast，以及 GitHub Release 资产入口。

源码、签名密钥、构建脚本、私有配置不进入本仓。本仓只发布可公开访问的构建产物索引和发布说明。

## 仓库职责

- GitHub Releases 存放安装包、归档包、安装器等二进制资产。
- Git 文件存放 manifest、appcast、schema、发布规范和公开说明。
- 每个平台使用独立 tag 命名空间，避免版本号冲突。
- 每个公开下载资产必须提供 SHA-256 校验信息；有平台签名体系时同步记录签名证书或更新框架要求的签名元数据。

## 目录结构

```text
V_IME_releases/
├── README.md
├── android/
│   └── manifest.json
├── macos/
│   ├── manifest.json
│   └── 0.5.0/
│       └── 2026051703/
│           ├── SHA256SUMS.txt
│           ├── V_IME-0.5.0-2026051703-macos.dmg
│           └── V_IME-0.5.0-2026051703-macos.zip
├── schema/
│   └── release-manifest.schema.json
├── windows/
│   └── manifest.json               # 待接入
├── ios/
│   └── manifest.json               # 待接入：App Store / TestFlight 元数据
└── harmonyos/
    └── manifest.json               # 待接入
```

空目录不会提交到 Git；待接入平台会在首次发布时创建对应文件。

## Release 命名

各平台版本号独立递增，不强制对齐。tag 始终带平台前缀。

| 平台 | tag 示例 | 当前状态 | 主要资产 |
|---|---|---|---|
| Android | `android-v1.3.23` | 正在使用 | `.apk` |
| macOS | `macos-v0.5.0` | 内测中 | `.dmg` / `.zip` / Sparkle appcast |
| Windows | `windows-vX.Y.Z` | 内测中 | `.exe` / `.msi` / `.msix` |
| iOS | `ios-vX.Y.Z` | 内测中 | App Store / TestFlight 元数据 |
| HarmonyOS | `harmonyos-vX.Y.Z` | 适配中 | `.hap` 或商店分发元数据 |

二进制资产命名建议：

```text
V_IME-vX.Y.Z-<channel>.<ext>
V_IME-vX.Y.Z-<channel>-<arch>.<ext>
```

示例：

```text
V_IME-v1.3.23-release.apk
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
  --version-name 1.3.24 \
  --version-code 100 \
  --title "v1.3.24 - 修复说明" \
  --summary "本次更新摘要" \
  --tag android-v1.3.24 \
  --asset /path/to/V_IME-v1.3.24-release.apk \
  --certificate-sha256 <release-certificate-sha256> \
  --min-supported-version-code 1
```

脚本会自动计算本地资产的 SHA-256 和文件大小，并生成 GitHub Release asset URL。Android 会更新 `apkName`、`apkUrl`、`apkSha256`；其他平台会写入 `assets` 数组。

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

Android App 设置页“检查更新”会 fetch：

```text
https://raw.githubusercontent.com/imkida/V_IME_releases/main/android/manifest.json
```

安装包以 GitHub Release asset 形式发布，tag 命名规则为 `android-vX.Y.Z`。

| 用途 | 资产命名 | 说明 |
|---|---|---|
| 公开用户测试 / 日常安装 | `V_IME-vX.Y.Z-release.apk` | 使用 V_IME 长期 release keystore 签名 |
| 开发者整机自测 | `V_IME-vX.Y.Z-debug.apk` | Debug 签名，不要与 Release 包混装 |

同包名不同签名不可在同一台设备共存。Debug 和 Release 都使用 `applicationId = com.vime.android`，但签名指纹不同；强行覆盖会被系统拒绝，部分系统安装器会引导卸载重装，导致 DataStore、历史记录、用户词库与 Android Keystore 中的 API Key 全部丢失。

需要在 Debug 与 Release 之间切换时，先用 App 内“配置导出”备份，再卸载重装并重新导入。

## macOS 发布

macOS 优先使用 Sparkle 作为更新通道。当前 macOS beta manifest 位于：

```text
macos/manifest.json
```

发布前必须确认：

- App 使用 Developer ID 签名。
- 安装包完成 notarization。
- Sparkle enclosure 包含下载 URL、版本号、文件长度、EdDSA 签名和最低系统版本。
- `macos/manifest.json` 指向 GitHub Release 页面，并记录资产校验信息。

## Windows 发布

Windows manifest 应区分安装器类型和架构：

- `installerType`: `exe` / `msi` / `msix`
- `arch`: `x64` / `arm64` / `x86`
- `certificateSha256`: 代码签名证书 SHA-256 指纹
- `minSystemVersion`: 最低 Windows 版本

如果同一版本同时发布多种安装器，优先使用 `assets` 数组表达。

## iOS 发布

iOS 通常不把 `.ipa` 作为公开下载包直接镜像。推荐在 `ios/manifest.json` 中公开：

- App Store 或 TestFlight URL
- `versionName` 与 build number
- 最低 iOS 版本
- 审核状态或公开发布时间
- 权限、隐私、模型调用相关变更说明

只有在明确使用企业签名或受控测试分发时，才应记录 `.ipa` 下载资产；此类资产仍需包含 SHA-256 和签名来源说明。

## HarmonyOS 发布

HarmonyOS 首次接入时建议记录：

- `.hap` 或应用市场 URL
- bundle name / app id
- 证书指纹
- 设备架构或 API version 要求
- SHA-256 校验信息

## 发布检查清单

1. 使用目标平台的正式签名方式构建安装包。
2. 用 `npm run release:manifest` 计算每个公开资产的 SHA-256 并更新 manifest。
3. 创建带平台前缀的 GitHub Release tag。
4. 上传安装包、归档包或安装器到 Release assets。
5. 检查对应平台的 manifest 或 appcast。
6. 校验 JSON 语法和 manifest schema。
7. 用公开 URL 验证匿名用户可访问 Release 页面、下载资产和 raw manifest。
8. 在真实设备或虚拟机上验证更新检查路径。

## 历史

- v1.3.0 到 v1.3.9 早期版本曾发布在主仓 `imkida/V_IME_Android` 的 Release 页。主仓改为私有仓库后，匿名用户访问会得到 HTTP 404。本镜像仓自 `android-v1.3.10` 起承担对外分发，历史 v1.3.x 包随 `android-v1.3.9` 一同补存档于此供归档。

## 反馈

- 主仓 issue tracker：[`imkida/V_IME_Android` issues](https://github.com/imkida/V_IME_Android/issues)（私有，需邀请）
- 公开反馈渠道：暂无；联系作者请用主仓主页联系方式

## About

A voice-based input method driven by large language models, designed for the Android platform. 一个自语音输入应用（对，是应用而不是输入法），支持自定义 API 和全本地化数据存储，保护隐私安全。产品功能及交互都持续打磨，适配各种场景，提供多格式输出。能说，就坚决不打字：）

这个项目完全基于 VibeCoding 开发，是一次完整的无代码设计尝试。

## V_IME_Android

V_IME 是一个跨平台的纯语音输入应用项目。切换到 V_IME 后，在任意应用的文本框里按住麦克风说话，识别 + LLM 改写后的文字会直接落入目标文本框。

Android 端实现目前是整个 V_IME 家族中完成度最高的一支。

## 主要特性（主版本 V1.x）

- 五种改写模式：Verbatim（直出，跳过 LLM）/ Translation / Edit / Clean / Tidy，按需路由不同 prompt。
- 双 ASR 后端：OpenAI 兼容 `/v1/audio/transcriptions` + 阿里百炼 Qwen ASR（DashScope 专用客户端）。LLM 改写走 OpenAI 兼容 `/v1/chat/completions`。
- Quick Panel 应急面板（可选，默认关闭）：Numbers / Letters / Symbols 三层 keypad，每键直接 commit 不走 LLM，按当前文本框 inputType 自动选首层。
- 隐私保护：API Key 经 Android Keystore 加密后存入 DataStore，发请求那一刻才解密；密码框（`InputType` 含 password 标记）下静默拒绝写入。
- 本地历史：识别 + 改写结果落 Room，可查询、复用、清理。
- 轻量软键盘 UI：Jetpack Compose，含浅色 / 深色主题、音量表、partial ASR 显示。
- 暂时不做：完整 CJK 输入法兼容 / 智能用户候选词学习、离线识别、流式识别（流式版本在 `stream/main` 长期分支独立演进）、多端同步、iOS 版。
