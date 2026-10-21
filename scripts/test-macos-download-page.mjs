import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { embeddedChannelSlot, readPublishedChannelFromBundle, readPublishedPage, refreshAndroidPage, syncDownloadPage } from './sync-download-page.mjs';
import { assertConsistentBuildIdentity } from './update-manifest.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'update-manifest.mjs');

test('versionCode is derived from buildNumber only where the platform uses it', () => {
  const android = { platform: 'android', buildNumber: 89 };
  assertConsistentBuildIdentity(android);
  assert.equal(android.versionCode, 89);

  // macOS reads buildNumber alone; a second release identity only invited OSS/GitHub drift.
  const macos = { platform: 'macos', buildNumber: 2026092722 };
  assertConsistentBuildIdentity(macos);
  assert.equal(macos.versionCode, undefined);
});

test('explicit versionCode must not contradict buildNumber', () => {
  assert.throws(
    () => assertConsistentBuildIdentity({
      platform: 'android',
      versionCode: 2026090202,
      buildNumber: 2026092722
    }),
    /--version-code \(2026090202\) must match --build-number \(2026092722\)/
  );
});

test('consistency holds when only one identity is supplied', () => {
  assert.doesNotThrow(() => assertConsistentBuildIdentity({ versionCode: 2026092722 }));
  assert.doesNotThrow(() => assertConsistentBuildIdentity({}));
});

test('macOS release script writes buildNumber without a versionCode', () => {
  withFixture(({ artifact, manifest, summary }) => {
    const result = run([
      '--platform', 'macos',
      '--channel', 'beta',
      '--version-name', '1.6.0',
      '--build-number', '2026092722',
      '--title', 'VIME macOS beta',
      '--summary-file', summary,
      '--tag', 'macos-v1.6.0',
      '--asset', artifact,
      '--manifest', manifest,
      '--dry-run'
    ]);
    assert.equal(result.status, 0, result.stderr);
    const channel = JSON.parse(result.stdout).channels.beta;
    assert.equal(channel.buildNumber, 2026092722);
    assert.ok(!('versionCode' in channel), 'macOS manifest must not carry versionCode');
  });
});

test('macOS release script rejects an explicit versionCode', () => {
  withFixture(({ artifact, manifest, summary }) => {
    const result = run([
      '--platform', 'macos',
      '--channel', 'beta',
      '--version-name', '1.6.0',
      '--build-number', '2026092722',
      '--version-code', '2026092722',
      '--title', 'VIME macOS beta',
      '--summary-file', summary,
      '--tag', 'macos-v1.6.0',
      '--asset', artifact,
      '--manifest', manifest,
      '--dry-run'
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /versionCode is not used on macOS/);
  });
});

test('macOS manifest on disk carries no versionCode', () => {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'macos', 'manifest.json'), 'utf8'));
  for (const [name, channel] of Object.entries(manifest.channels)) {
    assert.ok(
      !('versionCode' in channel),
      `macos/manifest.json channels.${name} must not carry versionCode`
    );
  }
});

test('published page embeds the current manifest as its offline fallback', () => {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'macos', 'manifest.json'), 'utf8'));
  const channel = manifest.channels.beta;
  const dmg = channel.assets.find((asset) => asset.installerType === 'dmg');
  const page = readPublishedPage(ROOT);

  assert.equal(page.generatedAt, manifest.generatedAt);
  assert.deepEqual(page.channel, channel);

  const noscript = page.html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1];
  const link = noscript.match(/<a href="([^"]+)">下载 ([^<]+)<\/a>/);
  assert.ok(link, 'noscript must keep a no-JavaScript download link');
  assert.equal(link[1], dmg.url);
  assert.equal(link[2], `${channel.versionName} beta`);
  const backup = noscript.match(/<a href="([^"]+)">备用下载<\/a>/);
  assert.ok(backup, 'noscript must keep the GitHub backup link');
  assert.equal(backup[1], dmg.mirrorUrl);
});

test('published channel reader handles Vite multiline summary literals', () => {
  const bundle = 'const platform="macos",channels={beta:{versionName:"1.8.0",summary:`发布说明\n{安装步骤}`,mandatory:!1}}';
  assert.deepEqual(readPublishedChannelFromBundle(bundle), {
    versionName: '1.8.0', summary: '发布说明\n{安装步骤}', mandatory: false
  });
});

test('published website reads the same-origin canonical release copy', () => {
  const canonical = readFileSync(path.join(ROOT, 'macos', 'manifest.json'), 'utf8');
  assert.equal(readFileSync(path.join(ROOT, 'docs', 'macos', 'release.json'), 'utf8'), canonical);
  const page = readPublishedPage(ROOT);
  assert.match(page.bundle, /="\.\/release\.json"/);
  assert.doesNotMatch(page.bundle, /raw\.githubusercontent\.com/);
});

test('domain root renders the homepage directly and sync repairs a redirect regression', () => {
  const html = readFileSync(path.join(ROOT, 'docs', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /http-equiv="refresh"/i);
  assert.match(html, /<div id="root"><\/div>/);
  for (const [, asset] of html.matchAll(/(?:src|href)="(\.\/macos\/assets\/[^"]+)"/g)) {
    assert.ok(readFileSync(path.join(ROOT, 'docs', asset)).length > 0, asset);
  }
  assert.equal(
    readFileSync(path.join(ROOT, 'docs', 'release.json'), 'utf8'),
    readFileSync(path.join(ROOT, 'macos', 'manifest.json'), 'utf8')
  );
  const sandbox = mkdtempSync(path.join(tmpdir(), 'vime-root-homepage-sync.'));
  try {
    seedSandbox(sandbox, readPublishedPage(ROOT));
    const entry = path.join(sandbox, 'docs', 'index.html');
    const redirect = '<meta http-equiv="refresh" content="0; url=./macos/">';
    writeFileSync(entry, redirect);
    assert.equal(syncDownloadPage({ repoRoot: sandbox, check: true }).changed, true);
    assert.equal(readFileSync(entry, 'utf8'), redirect, '--check must not write');
    syncDownloadPage({ repoRoot: sandbox });
    assert.equal(readFileSync(entry, 'utf8'), html);
    assert.equal(syncDownloadPage({ repoRoot: sandbox, check: true }).changed, false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('published page carries no previous release identity', () => {
  if (!isGitRepository()) {
    // Cannot read release history here; test 5 still pins the page to the manifest.
    return;
  }
  const previous = previousPublishedVersion();
  assert.ok(
    previous,
    'release history is readable but no earlier release identity was found; ' +
    'this check must not pass vacuously'
  );
  const page = readPublishedPage(ROOT);
  assert.notEqual(page.channel.buildNumber, previous.buildNumber);
  const downloadUrls = page.channel.assets.flatMap((asset) =>
    [asset.url, asset.mirrorUrl].filter(Boolean)
  );
  const previousTokens = [String(previous.buildNumber)];
  if (page.channel.versionName !== previous.versionName) {
    previousTokens.push(previous.versionName);
  }
  for (const token of previousTokens) {
    assert.ok(
      !page.html.includes(token) && downloadUrls.every((url) => !url.includes(token)),
      `published page still references the previous release identity ${token}; ` +
      'run npm run release:page and rerun the tests'
    );
  }
});

test('sync script reports no drift on the published page', () => {
  const result = syncDownloadPage({ repoRoot: ROOT, check: true });
  assert.equal(result.changed, false, `drift reported: ${result.messages.join('; ')}`);
});

test('sync script rebuilds a stale fallback byte for byte', () => {
  const page = readPublishedPage(ROOT);
  const staleChannel = {
    ...page.channel,
    versionName: '1.5.0',
    buildNumber: 2026090202,
    versionCode: 2026090202
  };
  const slot = embeddedChannelSlot(page.bundle);
  const staleBundle = page.bundle
    .replace(`"${page.generatedAt}"`, '"2026-09-01T17:02:07Z"')
    .replace(slot.text, JSON.stringify(staleChannel, null, 0));
  const dmg = page.channel.assets.find((asset) => asset.installerType === 'dmg');
  const staleMirrorUrl = 'https://github.com/imkida/V_IME_releases/releases/download/macos-v1.5.0/V_IME-1.5.0-2026090202-macos.dmg';
  const staleBundleName = 'index-stale-fixture.js';
  const staleHtml = page.html.replace(dmg.mirrorUrl, staleMirrorUrl)
    .replace(bundleNameOf(page.html), staleBundleName);

  const sandbox = mkdtempSync(path.join(tmpdir(), 'vime-download-page-sync.'));
  try {
    seedSandbox(sandbox, { html: staleHtml, bundle: staleBundle });
    writeFileSync(path.join(sandbox, 'docs', 'index.html'),
      staleHtml.replaceAll('="./assets/', '="./macos/assets/'));
    const result = syncDownloadPage({ repoRoot: sandbox });
    assert.equal(result.changed, true);
    assert.deepEqual(result.messages, [
      `  generatedAt 2026-09-01T17:02:07Z -> ${page.generatedAt}`,
      `  versionName 1.5.0 -> ${page.channel.versionName}`,
      `  buildNumber 2026090202 -> ${page.channel.buildNumber}`,
      `  noscript backup ${staleMirrorUrl} -> ${dmg.mirrorUrl}`,
      '  root homepage differs from the macOS page'
    ]);
    assert.equal(readFileSync(result.bundlePath, 'utf8'), page.bundle,
      'sync must reproduce the published bundle bytes under a fresh immutable URL');
    assert.notEqual(path.basename(result.bundlePath), staleBundleName);
    assert.equal(readFileSync(path.join(sandbox, 'docs', 'macos', 'assets', staleBundleName), 'utf8'),
      staleBundle, 'old cached bundles must not be overwritten');
    assert.equal(
      readFileSync(path.join(sandbox, 'docs', 'macos', 'index.html'), 'utf8'),
      page.html.replace(bundleNameOf(page.html), path.basename(result.bundlePath)),
      'sync must reproduce both published fallback links exactly'
    );
    assert.equal(syncDownloadPage({ repoRoot: sandbox, check: true }).changed, false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('release JSON drift fails the read-only check and is repaired by sync', () => {
  const page = readPublishedPage(ROOT);
  const sandbox = mkdtempSync(path.join(tmpdir(), 'vime-website-release-sync.'));
  try {
    seedSandbox(sandbox, page);
    const publicJson = path.join(sandbox, 'docs', 'macos', 'release.json');
    const stale = '{"platform":"macos","channels":{}}\n';
    writeFileSync(publicJson, stale);
    mkdirSync(path.join(sandbox, 'scripts'));
    const cli = path.join(sandbox, 'scripts', 'sync-download-page.mjs');
    writeFileSync(cli, readFileSync(path.join(ROOT, 'scripts', 'sync-download-page.mjs')));
    const result = spawnSync(process.execPath, [realpathSync(cli), '--check'], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /release\.json differs/);
    assert.equal(readFileSync(publicJson, 'utf8'), stale, '--check must not write');
    syncDownloadPage({ repoRoot: sandbox });
    assert.equal(readFileSync(publicJson, 'utf8'), readFileSync(path.join(ROOT, 'macos', 'manifest.json'), 'utf8'));
    assert.equal(syncDownloadPage({ repoRoot: sandbox, check: true }).changed, false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('Android page carries the canonical Android download data', () => {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'android', 'manifest.json'), 'utf8'));
  const html = readFileSync(path.join(ROOT, 'docs', 'android', 'index.html'), 'utf8');
  for (const name of ['release', 'debug']) {
    const channel = manifest.channels[name];
    assert.ok(html.includes(`data-android="${name}:apk" href="${channel.apkUrl}"`), `${name} download link`);
    assert.ok(html.includes(`data-android="${name}:sha" data-copy="${channel.apkSha256}"`), `${name} checksum`);
  }
  assert.equal(refreshAndroidPage(html, manifest), html);
  assert.throws(() => refreshAndroidPage(html.replace('data-android="debug:apk"', 'data-android="beta:apk"'), manifest),
    /no channels\.beta/);
});

test('an Android release refreshes the Android page without a second command', () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), 'vime-release-android-page.'));
  try {
    seedSandbox(sandbox, readPublishedPage(ROOT));
    mkdirSync(path.join(sandbox, 'android'));
    mkdirSync(path.join(sandbox, 'docs', 'android'));
    writeFileSync(path.join(sandbox, 'android', 'manifest.json'), readFileSync(path.join(ROOT, 'android', 'manifest.json')));
    writeFileSync(path.join(sandbox, 'docs', 'android', 'index.html'), readFileSync(path.join(ROOT, 'docs', 'android', 'index.html')));
    mkdirSync(path.join(sandbox, 'scripts'));
    for (const name of ['update-manifest.mjs', 'sync-download-page.mjs']) {
      writeFileSync(path.join(sandbox, 'scripts', name), readFileSync(path.join(ROOT, 'scripts', name)));
    }
    const apkUrl = 'https://example.com/android/V_IME-v9.9.9-dogfood.1-debug.apk';
    const result = spawnSync(process.execPath, [realpathSync(path.join(sandbox, 'scripts', 'update-manifest.mjs')),
      '--platform', 'android', '--channel', 'debug', '--version-name', '9.9.9-dogfood.1', '--version-code', '999',
      '--title', 'v9.9.9-dogfood.1 — 合成网页同步', '--summary', 'Synthetic release metadata test', '--tag', 'android-v9.9.9-dogfood.1',
      '--asset-name', 'V_IME-v9.9.9-dogfood.1-debug.apk', '--asset-url', apkUrl, '--sha256', 'a'.repeat(64),
      '--certificate-sha256', 'b'.repeat(64)],
    { encoding: 'utf8', cwd: sandbox });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Synced website pages/);
    const html = readFileSync(path.join(sandbox, 'docs', 'android', 'index.html'), 'utf8');
    assert.ok(html.includes(`data-android="debug:apk" href="${apkUrl}"`));
    assert.ok(html.includes('data-android="debug:version">v9.9.9<'));
    assert.ok(html.includes('data-android="debug:title">合成网页同步<'));
    assert.equal(syncDownloadPage({ repoRoot: sandbox, check: true }).changed, false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

function bundleNameOf(html) {
  return html.match(/<script[^>]+src="\.\/assets\/([^"]+\.js)"/)[1];
}

function seedSandbox(root, { html, bundle }) {
  const manifest = readFileSync(path.join(ROOT, 'macos', 'manifest.json'), 'utf8');
  mkdirSync(path.join(root, 'macos'), { recursive: true });
  mkdirSync(path.join(root, 'docs', 'macos', 'assets'), { recursive: true });
  writeFileSync(path.join(root, 'macos', 'manifest.json'), manifest);
  writeFileSync(path.join(root, 'docs', 'macos', 'index.html'), html);
  writeFileSync(path.join(root, 'docs', 'macos', 'release.json'), manifest);
  writeFileSync(path.join(root, 'docs', 'release.json'), manifest);
  writeFileSync(path.join(root, 'docs', 'index.html'), readFileSync(path.join(ROOT, 'docs', 'index.html'), 'utf8'));
  writeFileSync(path.join(root, 'docs', 'macos', 'assets', bundleNameOf(html)), bundle);
  mkdirSync(path.join(root, 'website', 'macos', 'public'), { recursive: true });
  writeFileSync(path.join(root, 'website', 'macos', 'public', 'release.json'), manifest);
  writeFileSync(path.join(root, 'website', 'macos', 'index.html'),
    readFileSync(path.join(ROOT, 'website', 'macos', 'index.html')));
}

test('the canonical macOS release command refreshes both sites and source without a second command', () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), 'vime-release-auto-page.'));
  try {
    seedSandbox(sandbox, readPublishedPage(ROOT));
    mkdirSync(path.join(sandbox, 'scripts'));
    for (const name of ['update-manifest.mjs', 'sync-download-page.mjs']) {
      writeFileSync(path.join(sandbox, 'scripts', name), readFileSync(path.join(ROOT, 'scripts', name)));
    }
    const artifact = path.join(sandbox, 'V_IME-1.8.11-2026101501-macos.dmg');
    writeFileSync(artifact, 'synthetic release, never published');
    const result = spawnSync(process.execPath, [realpathSync(path.join(sandbox, 'scripts', 'update-manifest.mjs')),
      '--platform', 'macos', '--channel', 'beta', '--version-name', '1.8.11',
      '--build-number', '2026101501', '--title', 'Synthetic website sync',
      '--summary', 'Synthetic release metadata test', '--tag', 'macos-v1.8.11',
      '--asset', artifact, '--asset-url-base', 'https://example.com/macos/1.8.11/2026101501/'],
    { encoding: 'utf8', cwd: sandbox });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Synced website pages/);
    const manifest = readFileSync(path.join(sandbox, 'macos/manifest.json'), 'utf8');
    for (const file of ['docs/release.json', 'docs/macos/release.json', 'website/macos/public/release.json']) {
      assert.equal(readFileSync(path.join(sandbox, file), 'utf8'), manifest);
    }
    const published = readPublishedPage(sandbox);
    assert.deepEqual(published.channel, JSON.parse(manifest).channels.beta);
    assert.equal(published.channel.buildNumber, 2026101501);
    assert.match(published.html, /example.com\/macos\/1.8.11\/2026101501/);
    assert.equal(syncDownloadPage({ repoRoot: sandbox, check: true }).changed, false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// The identity the page should no longer reference: the newest revision of the manifest
// that represents a different release. Commits that only correct fields of the current
// release (for example a versionCode fix) are skipped, and so are unparseable revisions.
function previousPublishedVersion() {
  let log;
  try {
    log = execFileSync(
      'git',
      ['log', '--format=%H', '--', 'macos/manifest.json'],
      { cwd: ROOT, encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }

  let current;
  try {
    current = identityOf(JSON.parse(readFileSync(path.join(ROOT, 'macos', 'manifest.json'), 'utf8')));
  } catch {
    return null;
  }

  for (const commit of log) {
    try {
      const candidate = identityOf(JSON.parse(execFileSync(
        'git',
        ['show', `${commit}:macos/manifest.json`],
        { cwd: ROOT, encoding: 'utf8' }
      )));
      if (candidate.versionName !== current.versionName
        || candidate.buildNumber !== current.buildNumber) {
        return candidate;
      }
    } catch {
      // Unparseable historical revision: keep looking further back.
    }
  }
  return null;
}

function identityOf(manifest) {
  const channel = manifest.channels.beta;
  return { versionName: channel.versionName, buildNumber: channel.buildNumber };
}

function isGitRepository() {
  const result = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0;
}

function withFixture(callback) {
  const root = mkdtempSync(path.join(tmpdir(), 'vime-download-page-test.'));
  try {
    const artifact = path.join(root, 'V_IME-1.6.0-2026092722-macos.dmg');
    const summary = path.join(root, 'summary.md');
    const manifest = path.join(root, 'manifest.json');
    writeFileSync(artifact, 'owned-synthetic-dmg');
    writeFileSync(summary, '用户可读更新说明');
    writeFileSync(manifest, JSON.stringify({
      formatVersion: 1,
      generatedAt: '2026-09-27T00:00:00Z',
      platform: 'macos',
      channels: {}
    }));
    callback({ artifact, manifest, summary });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}
