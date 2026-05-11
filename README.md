# V_IME Releases — 公开分发镜像

V_IME 是一个**纯语音输入法**项目，主仓 [`imkida/V_IME_Android`](https://github.com/imkida/V_IME_Android) 为私有源码仓。本仓库（V_IME_releases）作为对外分发的**只读公开镜像**，承载所有平台的安装包、更新检查 manifest、Sparkle appcast 等运行时所需公开资产。

源码不在本仓；本仓只发布构建产物和元数据。

## 目录结构

```
V_IME_releases/
├── README.md                      ← 本文件
├── android/
│   └── manifest.json              ← Android App 检查更新 fetch 此 URL
├── macos/                         ← 内测中（macOS Sparkle appcast）
├── ios/                           ← 内测中
├── windows/                       ← 内测中
└── harmonyos/                     ← 适配中
```

## Android 安装包

最新装机包以 GitHub Release 形式发布：tag 命名规则 `android-vX.Y.Z`。

| 用途 | 资产命名 | 说明 |
|---|---|---|
| 公开用户测试 / 日常安装 | `V_IME-vX.Y.Z-release.apk` | 用 V_IME 长期 release keystore 签名 |
| 开发者整机自测 | `V_IME-vX.Y.Z-debug.apk` | Debug 签名，**不要**与 Release 包混装 |

⚠️ **同包名不同签名不可在同一台设备共存**。Debug 和 Release 都用 `applicationId = com.vime.android`，但签名指纹不同；强行覆盖会被系统拒绝，部分系统安装器会引导卸载重装，导致 DataStore、历史记录、用户词库与 Android Keystore 中的 API Key 全部丢失。

需要在 Debug 与 Release 之间切换时，先用 App 内"配置导出"备份，再卸载重装并重新导入。

## 更新检查（Android）

App 设置页"检查更新"会 fetch：

```
https://raw.githubusercontent.com/imkida/V_IME_releases/main/android/manifest.json
```

manifest 里 `apkUrl` 指向本仓库的 GitHub Release asset（`releases/download/android-vX.Y.Z/V_IME-vX.Y.Z-{debug,release}.apk`）。

## 跨平台 release 节奏

各平台版本号独立递增，不强制对齐。tag 始终带平台前缀以避免命名空间冲突：

| 平台 | tag 前缀示例 | 当前状态 |
|---|---|---|
| Android | `android-v1.3.10`、`android-v1.3.9` | 正在使用 |
| macOS | `macos-vX.Y.Z` | 规划中 |
| iOS | `ios-vX.Y.Z` | 规划中 |
| Windows | `windows-vX.Y.Z` | 规划中 |
| HarmonyOS | `harmonyos-vX.Y.Z` | 规划中 |

## 历史

- v1.3.0 → v1.3.9 早期版本曾经发布在主仓 `imkida/V_IME_Android` 的 Release 页，但因主仓改为私有仓库，匿名用户访问会得到 HTTP 404。本镜像仓自 `android-v1.3.10` 起承担对外分发，历史 v1.3.x 包随 `android-v1.3.9` 一同补存档于此供归档。

## 反馈

- 主仓 issue tracker：[`imkida/V_IME_Android` issues](https://github.com/imkida/V_IME_Android/issues)（私有，需邀请）
- 公开反馈渠道：暂无；联系作者请用主仓主页联系方式
————————————
About
A voice-based input method driven by large language models, designed for the Android platform.一个自语音输入应用（对，是应用而不是输入法），支持自定义API和全本地化数据存储，保护隐私安全。产品功能及交互都持续打磨，适配各种场景，提供多格式输出。能说，就坚决不打字：）

**这个项目完全基于 VibeCoding 开发，是一次完整的无代码设计尝试**

# V_IME_Android

V_IME 是一个**跨平台的纯语音输入应用**项目。切换到 V_IME 后，在任意应用的文本框里按住麦克风说话，识别 + LLM 改写后的文字会直接落入目标文本框。

 **Android 端**实现，目前是整个 V_IME 家族中完成度最高的一支。

## 主要特性（v1.1.2）

- **五种改写模式**：Verbatim（直出，跳过 LLM）/ Translation / Edit / Clean / Tidy，按需路由不同 prompt。
- **双 ASR 后端**：OpenAI 兼容 `/v1/audio/transcriptions` + 阿里百炼 Qwen ASR（DashScope 专用客户端）。LLM 改写走 OpenAI 兼容 `/v1/chat/completions`。
- **Quick Panel 应急面板**（可选，默认关闭）：Numbers / Letters / Symbols 三层 keypad，每键直接 commit 不走 LLM，按当前文本框 inputType 自动选首层。
- **隐私保护**：API Key 经 Android Keystore 加密后存入 DataStore，发请求那一刻才解密；密码框（`InputType` 含 password 标记）下静默拒绝写入。
- **本地历史**：识别 + 改写结果落 Room，可查询、复用、清理。
- **轻量软键盘 UI**：Jetpack Compose，含浅色 / 深色主题、音量表、partial ASR 显示。
- **暂时不做**：完整 CJK 输入法兼容 / 智能用户候选词学习、离线识别、流式识别（流式版本在 `stream/main` 长期分支独立演进）、多端同步、iOS 版。

---

