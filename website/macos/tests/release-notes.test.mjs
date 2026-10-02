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

test('historical 1.8.0 copy proposal has five verified highlights and keeps the unresolved issue', () => {
  const body=readFileSync(new URL('../COPY-PROPOSAL.md',import.meta.url),'utf8');
  const blocks=parseReleaseNotes(body);
  assert.ok(body.includes("\u9009\u533a\u66ff\u6362\u6216\u7f16\u8f91\u540e\u7684\u64a4\u9500\u5165\u53e3\u66f4\u6e05\u695a"));
  assert.ok(!body.includes("\u5199\u5165\u6216\u66ff\u6362\u540e\u7684\u64a4\u9500"));
  assert.deepEqual(blocks.filter(b=>b.type==='heading').map(b=>b.text), ['优化','修复','已知问题']);
  assert.equal(blocks.filter(b=>b.type==='list').slice(0,2).reduce((n,b)=>n+b.items.length,0),5);
  assert.match(blocks.at(-1).items[0],/仍在调查.*未修复/);
  assert.doesNotMatch(body,/SHA|PASS|gate|匿名日统计|实时听写|缩短等待|离线 ASR/);
});
