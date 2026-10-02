import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readRelease } from '../src/release-data.js';
import { parseReleaseNotes } from '../src/release-notes.js';

const snapshot=JSON.parse(readFileSync(new URL('../public/release.json',import.meta.url)));

test('a new manifest replaces version, date, download and structured notes together', () => {
  const next=structuredClone(snapshot);
  next.generatedAt='2026-10-02T16:00:00Z';
  Object.assign(next.channels.beta,{versionName:'1.8.2',buildNumber:2026100301,minSystemVersion:'15.0',summary:'# 新版本\n\n更清楚。\n\n## 修复\n- 新的发布说明。'});
  for(const asset of next.channels.beta.assets){
    asset.name='new.'+asset.installerType;
    asset.url='https://example.com/'+asset.name;
    asset.mirrorUrl='https://mirror.example.com/'+asset.name;
    asset.sha256='a'.repeat(64); asset.sizeBytes=12000000;
  }
  const result=readRelease(next);
  assert.equal(result.channel.versionName,'1.8.2');
  assert.equal(result.channel.buildNumber,2026100301);
  assert.equal(result.minSystemVersion,'15');
  assert.equal(result.date,'2026-10-03');
  assert.deepEqual(result.notes,parseReleaseNotes(next.channels.beta.summary));
  assert.deepEqual(result.dmg,next.channels.beta.assets[0]);
  assert.deepEqual(result.zip,next.channels.beta.assets[1]);
});

test('missing optional ZIP or mirror never manufactures a download URL', () => {
  const next=structuredClone(snapshot);
  next.channels.beta.assets=next.channels.beta.assets.filter(a=>a.installerType==='dmg');
  delete next.channels.beta.assets[0].mirrorUrl;
  const result=readRelease(next);
  assert.equal(result.zip,undefined); assert.equal(result.dmg.mirrorUrl,undefined);
});

test('an incomplete release is rejected before replacing working downloads', () => {
  const next=structuredClone(snapshot);
  next.channels.beta.assets[0].sha256='';
  assert.throws(()=>readRelease(next),/download metadata/);
  assert.throws(()=>readRelease({}),/release manifest/);
});

test('published 1.8.0 fixture retains every change and unresolved issue without stale special cases', () => {
  const historical=JSON.parse(readFileSync(new URL('./fixtures/release-1.8.0.json',import.meta.url)));
  const result=readRelease(historical);
  const expectedDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(historical.generatedAt));
  assert.equal(result.date,expectedDate);
  assert.deepEqual(result.notes,parseReleaseNotes(historical.channels.beta.summary));
  const renderedBody=result.notes.map(b=>b.text||b.items.join(' ')).join(' ');
  assert.match(renderedBody,/纠错学习.*本次不宣称已修复/);
  assert.equal(result.notes.find(b=>b.type==='list').items.length,6);
  assert.doesNotMatch(renderedBody,/# Vime macOS/);
});

test('current 1.8.1 publication preserves author metadata, overview and four changes', () => {
  const result=readRelease(snapshot);
  assert.equal(result.channel.versionName,'1.8.1');
  assert.equal(result.notes[0].type,'metadata');
  assert.match(result.notes[0].text,/2026-10-02.*macOS 14.*build 2026100203/);
  assert.equal(result.notes[1].type,'paragraph');
  assert.match(result.notes[1].text,/菜单更清晰.*实时听写预览/);
  assert.equal(result.notes.find(b=>b.type==='list').items.length,4);
  assert.match(result.notes.at(-1).text,/识别模型.*默认策略.*撤销行为不变/);
  assert.deepEqual(result.notes,parseReleaseNotes(snapshot.channels.beta.summary));
});
