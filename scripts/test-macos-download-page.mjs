import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { embeddedChannelSlot, readPublishedPage, syncDownloadPage } from './sync-download-page.mjs';
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
  for (const token of [previous.versionName, String(previous.buildNumber)]) {
    assert.ok(
      !page.html.includes(token) && !page.bundle.includes(token),
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

  const sandbox = mkdtempSync(path.join(tmpdir(), 'vime-download-page-sync.'));
  try {
    seedSandbox(sandbox, { html: page.html, bundle: staleBundle });
    const result = syncDownloadPage({ repoRoot: sandbox });
    assert.equal(result.changed, true);
    assert.deepEqual(result.messages, [
      `  generatedAt 2026-09-01T17:02:07Z -> ${page.generatedAt}`,
      '  versionName 1.5.0 -> 1.7.0',
      '  buildNumber 2026090202 -> 2026093001'
    ]);
    assert.equal(
      readFileSync(path.join(sandbox, 'docs', 'macos', 'assets', bundleNameOf(page.html)), 'utf8'),
      page.bundle,
      'sync must reproduce the published bundle exactly'
    );
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
  writeFileSync(path.join(root, 'docs', 'macos', 'assets', bundleNameOf(html)), bundle);
}

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

  for (const commit of log.slice(1)) {
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
