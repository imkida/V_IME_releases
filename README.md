# V_IME Releases — 公开分发镜像

V_IME 是一个**纯语音输入法**项目，主仓 [`imkida/V_IME_Android`](https://github.com/imkida/V_IME_Android) 为私有源码仓。本仓库（V_IME_releases）作为对外分发的**只读公开镜像**，承载所有平台的安装包、更新检查 manifest、Sparkle appcast 等运行时所需公开资产。

源码不在本仓；本仓只发布构建产物和元数据。

## 目录结构

```
V_IME_releases/
├── README.md                      ← 本文件
├── android/
│   └── manifest.json              ← Android App 检查更新 fetch 此 URL
├── macos/                         ← 规划中（macOS Sparkle appcast）
├── ios/                           ← 规划中
├── windows/                       ← 规划中
└── harmonyos/                     ← 规划中
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
