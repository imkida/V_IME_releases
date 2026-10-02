// Feature copy checked against the public macOS page on 2026-09-27.
// Gesture details follow V_IME_MacOS/docs/ux/macos-flow.md.
// These are illustrative examples, not live microphone input or model output.
export const modes = [
  {
    name: '按住说话', gesture: '按住右 Command', key: '', action: '按住', context: '给团队的消息',
    spoken: '那个，明天的评审改到下午三点，大家提前看一下文档。',
    output: '明天的评审改到下午三点，大家提前看一下文档。',
    resultLabel: '已写入'
  },
  {
    name: '连续听写', gesture: '双击右 Command', key: '', action: '双击', context: '一段想法',
    spoken: '这次先把核心流程做顺，然后收集反馈，下一轮再完善细节。',
    output: '这次先把核心流程做顺，再收集反馈。下一轮继续完善细节。',
    resultLabel: '已写入'
  },
  {
    name: '中英互译', gesture: '右 Command + 逗号', key: ',', action: '组合键', context: '中文 ↔ English',
    spoken: '谢谢你的建议，我会在周五之前把修改后的方案发给你。',
    output: 'Thanks for your suggestions. I’ll send you the revised proposal by Friday.',
    resultLabel: '已写入英文'
  },
  {
    name: '编辑文本', gesture: '右 Command + 句号', key: '.', action: '组合键', context: '修改选中的文字',
    selected: '明天把文件发给我。',
    spoken: '改得更礼貌一些。',
    output: '方便的话，请在明天把文件发给我。谢谢！',
    resultLabel: '已修改'
  }
];

export const originalText = '那个，明天下午三点咱们过一下方案吧，文档我会提前发，主要看一下登录流程，支付这块这次先不看。';
export const outputStyles = [
  {
    name: '智能整理', short: '理清表达',
    output: '明天下午三点过一下方案，主要看登录流程，这次先不看支付。文档我会提前发。',
    focus: '主要看登录流程，这次先不看支付。'
  },
  {
    name: '保留语气', short: '轻微修正',
    output: '明天下午三点咱们过一下方案吧。文档我会提前发，主要看一下登录流程，支付这块这次先不看。',
    focus: '咱们过一下方案吧。'
  },
  {
    name: '逐字稿', short: '保留原文',
    output: originalText,
    focus: ''
  }
];
