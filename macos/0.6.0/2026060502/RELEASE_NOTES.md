# V_IME macOS 0.6.0 beta

- Version: `0.6.0`
- Build: `2026060502`
- Bundle ID: `com.vime.app.macos`
- Package: `V_IME-0.6.0-2026060502-macos.dmg`
- Channel: `beta`
- Date: 2026-06-05

## 用户更新说明

本次更新优化了菜单栏面板的布局和可读性，让常用入口更集中、更容易理解。

- 菜单栏面板更紧凑，状态、输出风格和快捷键说明更清晰。
- “转写风格”统一调整为“输出风格”，减少理解成本。
- 快捷键区域补充了语音输入、自动翻译、文本编辑和输出风格切换的简短说明。
- 未配置个人 API Key 时，仍可使用 V_IME 默认云端服务；配置个人 Key 后会优先使用个人服务。
- 继续使用 Developer ID 签名并完成 Apple notarization，适合小范围内测分发。

## 验证记录

- `xcodebuild test -project VIMEMacOS.xcodeproj -scheme VIMEMacOS -destination platform=macOS -derivedDataPath /private/tmp/vime-macos-derived-data CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`
  - Result: `TEST SUCCEEDED`
  - Tests: 408 passed, 3 skipped, 0 failed
- `scripts/probe-qwen-proxy.sh`
  - LLM: HTTP 200, nonempty
  - ASR: HTTP 200, nonempty
- Notarization:
  - Submission ID: `d63d30ba-dc1d-4deb-99e3-784c61a34005`
  - Status: `Accepted`
  - Staple validate: passed
- Installed app:
  - `/Applications/V_IME.app`
  - `CFBundleShortVersionString = 0.6.0`
  - `CFBundleVersion = 2026060502`
  - Default cloud service plist present

## Checksums

```text
9856cd513f467cff28819f162dfa3371a463bf4dc6b79833155d97c4f0fb8eee  V_IME-0.6.0-2026060502-macos.dmg
99e79d337cc485d220b2f90c29bb87e48c27c4ef996e242f35412a3e24115029  V_IME-0.6.0-2026060502-macos.zip
```

## 仍需真机观察

- 菜单栏面板在浅色 / 深色外观下的阅读舒适度。
- 右 Command 快捷键与组合键在日常使用中的误触发率。
- 默认云端服务在无个人 Key 情况下的稳定性与响应时长。
