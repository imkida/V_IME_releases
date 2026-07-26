import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'update-manifest.mjs');

test('OSS primary URL records a GitHub mirror without changing releaseUrl', () => {
  withFixture(({ artifact, manifest, summary }) => {
    const result = run([
      '--platform', 'macos',
      '--channel', 'beta',
      '--version-name', '1.4.0',
      '--build-number', '2026072703',
      '--title', 'VIME macOS beta',
      '--summary-file', summary,
      '--tag', 'macos-v1.4.0',
      '--release-url', 'https://github.com/imkida/V_IME_releases/releases/tag/macos-v1.4.0',
      '--repo', 'imkida/V_IME_releases',
      '--asset', artifact,
      '--asset-url-base', 'https://vime-public-releases-cn-shanghai.oss-cn-shanghai.aliyuncs.com/macos/1.4.0/2026072703/',
      '--manifest', manifest,
      '--dry-run'
    ]);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    const channel = output.channels.beta;
    assert.equal(
      channel.releaseUrl,
      'https://github.com/imkida/V_IME_releases/releases/tag/macos-v1.4.0'
    );
    assert.equal(
      channel.assets[0].url,
      'https://vime-public-releases-cn-shanghai.oss-cn-shanghai.aliyuncs.com/macos/1.4.0/2026072703/V_IME-1.4.0-2026072703-macos.dmg'
    );
    assert.equal(
      channel.assets[0].mirrorUrl,
      'https://github.com/imkida/V_IME_releases/releases/download/macos-v1.4.0/V_IME-1.4.0-2026072703-macos.dmg'
    );
  });
});

for (const [label, base, expected] of [
  ['HTTP', 'http://example.com/macos/1.4.0/2026072703/', 'must use HTTPS'],
  ['query', 'https://example.com/macos/1.4.0/2026072703/?token=x', 'without credentials, query, or fragment'],
  ['missing slash', 'https://example.com/macos/1.4.0/2026072703', 'must end with /']
]) {
  test(`rejects ${label} asset URL base`, () => {
    withFixture(({ artifact, manifest, summary }) => {
      const result = run([
        '--platform', 'macos',
        '--channel', 'beta',
        '--version-name', '1.4.0',
        '--title', 'VIME macOS beta',
        '--summary-file', summary,
        '--tag', 'macos-v1.4.0',
        '--asset', artifact,
        '--asset-url-base', base,
        '--manifest', manifest,
        '--dry-run'
      ]);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(expected));
    });
  });
}

test('download page exposes GitHub fallback only through mirrorUrl', () => {
  const page = readFileSync(path.join(ROOT, 'docs', 'macos', 'index.html'), 'utf8');
  assert.match(page, /id="github-dmg-link"[^>]*hidden/);
  assert.match(page, /if \(dmg\.mirrorUrl\)/);
  assert.match(page, /\$\("github-dmg-link"\)\.hidden = false/);
});

test('rejects an existing manifest with a signed mirror URL', () => {
  withFixture(({ artifact, manifest, summary }) => {
    const current = JSON.parse(readFileSync(manifest, 'utf8'));
    current.channels.stable = {
      versionName: '1.3.8',
      title: 'Existing beta',
      summary: 'Existing beta',
      releaseUrl: 'https://github.com/imkida/V_IME_releases/releases/tag/macos-v1.3.8',
      mandatory: false,
      assets: [{
        name: 'V_IME-1.3.8-2026071801-macos.dmg',
        url: 'https://example.com/V_IME-1.3.8-2026071801-macos.dmg',
        mirrorUrl: 'https://github.com/imkida/V_IME_releases/releases/download/macos-v1.3.8/V_IME-1.3.8-2026071801-macos.dmg?token=forbidden',
        sha256: 'a'.repeat(64)
      }]
    };
    writeFileSync(manifest, JSON.stringify(current));

    const result = run([
      '--platform', 'macos',
      '--channel', 'beta',
      '--version-name', '1.4.0',
      '--title', 'VIME macOS beta',
      '--summary-file', summary,
      '--tag', 'macos-v1.4.0',
      '--asset', artifact,
      '--manifest', manifest,
      '--dry-run'
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /mirrorUrl must use HTTPS without credentials, query, or fragment/);
  });
});

function withFixture(callback) {
  const root = mkdtempSync(path.join(tmpdir(), 'vime-release-manifest-test.'));
  try {
    const artifact = path.join(root, 'V_IME-1.4.0-2026072703-macos.dmg');
    const summary = path.join(root, 'summary.md');
    const manifest = path.join(root, 'manifest.json');
    writeFileSync(artifact, 'owned-synthetic-dmg');
    writeFileSync(summary, '用户可读更新说明');
    writeFileSync(manifest, JSON.stringify({
      formatVersion: 1,
      generatedAt: '2026-07-27T00:00:00Z',
      platform: 'macos',
      channels: {}
    }));
    callback({ artifact, manifest, summary });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8'
  });
}
