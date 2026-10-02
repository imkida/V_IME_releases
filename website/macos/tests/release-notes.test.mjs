import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseReleaseNotes } from '../src/release-notes.js';

test('Markdown body preserves overview, categories, bullets and known issues', () => {
  assert.deepEqual(parseReleaseNotes('# Vime for macOS 1.8.0\n\n更清楚的设置。\n\n## 优化\n\n- **设置**：更易查看。\n- 状态更直观。\n\n## 已知问题\n\n提示问题仍在调查。'), [
    {type:'paragraph',text:'更清楚的设置。'},
    {type:'heading',text:'优化'},
    {type:'list',items:['**设置**：更易查看。','状态更直观。']},
    {type:'heading',text:'已知问题'},
    {type:'paragraph',text:'提示问题仍在调查。'}
  ]);
});

test('one paragraph and numbered changes are content, not one giant list item', () => {
  assert.deepEqual(parseReleaseNotes('一段\n连续的说明。\n\n1. 第一项\n2. 第二项'), [
    {type:'paragraph',text:'一段 连续的说明。'},
    {type:'list',items:['第一项','第二项']}
  ]);
});

test('author HTML is plain text and the parser does not manufacture links or release claims', () => {
  const payload='<script>alert(1)</script>\n\n- [外部内容](https://example.com)';
  assert.deepEqual(parseReleaseNotes(payload), [
    {type:'paragraph',text:'<script>alert(1)</script>'},
    {type:'list',items:['[外部内容](https://example.com)']}
  ]);
});

test('frontmatter is rejected so YAML never becomes user-facing release text', () => {
  assert.throws(() => parseReleaseNotes('---\ntitle: 版本\n---\n正文'), /body only/);
});

test('current 1.8.1 copy proposal has four factual highlights and keeps the open known issue', () => {
  const body=readFileSync(new URL('../COPY-PROPOSAL.md',import.meta.url),'utf8');
  const blocks=parseReleaseNotes(body);
  assert.ok(body.startsWith('# Vime for macOS 1.8.1\n'));
  assert.deepEqual(blocks[0], {
    type:'metadata',
    text:'2026-10-02 · macOS 14 及以上 · build 2026100203'
  });
  assert.deepEqual(blocks[1], {
    type:'paragraph',
    text:'菜单和听写预览更清晰，浅色与深色外观下的显示更一致。'
  });
  assert.deepEqual(blocks.filter(b=>b.type==='heading').map(b=>b.text), ['优化','修复','已知问题']);
  const lists=blocks.filter(b=>b.type==='list');
  assert.equal(lists[0].items.length,3);
  assert.equal(lists[1].items.length,1);
  assert.match(lists[1].items[0],/切换浅色或深色外观时，预览文字颜色会及时更新/);
  assert.equal(lists[2].items[0],'纠错学习未出现提示的情况仍在调查，尚未确认解决。');
  assert.ok(body.includes('可直接覆盖安装'));
  assert.ok(body.includes('已有配置、服务密钥与听写历史保留'));
  assert.ok(body.includes('识别模型、智能整理默认策略、输入保护与撤销行为不变'));
  assert.doesNotMatch(body,/HUD|个人 Key|动态胶囊布局|SHA|PASS|gate|匿名日统计|缩短等待|离线 ASR|提速|提高识别准确率/);
});
