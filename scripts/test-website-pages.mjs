import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const paths = ['/', '/macos/', '/android/', '/privacy/', '/support/', '/macos/privacy/', '/macos/support/'];

// SHA-256 of each complete <article>…</article> block, including whitespace,
// from origin/main at 80a0166a2213fa2190f633b4b27afbd5a638b18d. No Git needed at test time.
const legalArticleHashes = {
  'docs/privacy/index.html': 'de6063232bbca0e486fd3f712516bab9d5a0a6a751f12e8e6b5c65df766263a5',
  'docs/support/index.html': '05fa2ff594a97322eaaf1b6399deedb5da350238660ee1a845e5042e365ce875',
  'docs/macos/privacy/index.html': '6b250cddc9bfbec3b5cda798550dc5bdd6cb30a4fcff47c13bf7a3a617d37487',
  'docs/macos/support/index.html': '147b47281d4167d75e159cbfa7838aa858c6dfa34a22cb423bb361be91a353f8'
};

test('legal article bytes remain identical to the original pages', () => {
  for (const [path, expected] of Object.entries(legalArticleHashes)) {
    const articles = read(path).match(/<article>[\s\S]*?<\/article>/g) ?? [];
    assert.equal(articles.length, 1, path);
    assert.equal(createHash('sha256').update(articles[0]).digest('hex'), expected, path);
  }
});

// Each page's share card; the files ship from docs/macos/assets and are 1200×630 PNGs.
const shareImages = {
  '/': 'og-mac.png', '/macos/': 'og-mac.png', '/macos/privacy/': 'og-mac.png', '/macos/support/': 'og-mac.png',
  '/android/': 'og-android.png', '/privacy/': 'og-vime.png', '/support/': 'og-vime.png'
};

test('share cards exist as 1200×630 PNG files', () => {
  for (const name of new Set(Object.values(shareImages))) {
    const png = readFileSync(new URL('../docs/macos/assets/' + name, import.meta.url));
    assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG', name);
    assert.equal(png.readUInt32BE(16), 1200, name);
    assert.equal(png.readUInt32BE(20), 630, name);
  }
});

test('all public pages have canonical and sharing metadata and are listed for crawlers', () => {
  const sitemap = read('docs/sitemap.xml');
  for (const path of paths) {
    const html = read('docs' + path + 'index.html');
    const head = html.split('</head>')[0];
    const canonical = path === '/macos/' ? '/' : path;
    assert.match(html, /<html lang="zh-CN">/);
    assert.ok(head.includes(`<link rel="canonical" href="https://vimebot.ai${canonical}">`), path);
    assert.ok(head.includes(`<meta property="og:url" content="https://vimebot.ai${path}">`), path);
    assert.match(head, /<meta property="og:title" content="[^"]+">/);
    assert.match(head, /<meta property="og:description" content="[^"]+">/);
    assert.match(head, /<meta property="og:type" content="website">/);
    assert.match(head, /<meta property="og:site_name" content="Vime">/);
    assert.match(head, /<meta name="twitter:card" content="summary_large_image">/);
    const image = shareImages[path];
    assert.ok(head.includes(`<meta property="og:image" content="https://vimebot.ai/macos/assets/${image}">`), path);
    assert.ok(head.includes('<meta property="og:image:width" content="1200">'), path);
    assert.ok(head.includes('<meta property="og:image:height" content="630">'), path);
    assert.match(head, /<meta property="og:image:alt" content="[^"]+">/);
    assert.ok(sitemap.includes(`<loc>https://vimebot.ai${path}</loc>`), path);
  }
  assert.equal((sitemap.match(/<loc>/g) || []).length, paths.length);
  assert.equal(read('docs/robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://vimebot.ai/sitemap.xml\n');
});

test('legal pages share a static shell and link only Mac and iOS document counterparts', () => {
  for (const path of paths.slice(3)) {
    const html = read('docs' + path + 'index.html');
    const kind = path.includes('privacy') ? 'privacy' : 'support';
    const mac = path.startsWith('/macos/');
    assert.match(html, /<link rel="stylesheet" href="\/macos\/assets\/site-legal.css">/);
    assert.match(html, /<link rel="icon" href="\/macos\/assets\/app-icon-preview.svg"/);
    assert.match(html, /<a class="brand" href="\/"/);
    const tabs = html.match(/<nav class="plat document-platforms"[\s\S]*?<\/nav>/)[0];
    assert.ok(tabs.includes(`<a href="/macos/${kind}/"${mac ? ' aria-current="page"' : ''}>Mac</a>`));
    assert.ok(tabs.includes(`<a href="/${kind}/"${mac ? '' : ' aria-current="page"'}>iOS</a>`));
    assert.doesNotMatch(tabs, /Android/);
    assert.ok(html.includes(`<p class="document-scope">适用于 ${mac ? 'Vime for macOS' : 'Vime iOS App'}</p>`));
    assert.match(html, /<\/nav>\s*<p class="document-scope">[^<]+<\/p>\s*<article>/);
    assert.match(html, /京ICP备2026046839号-2/);
    assert.match(html, /\['vimebot.com', 'www.vimebot.com'\]/);
  }
  assert.ok(read('docs/macos/assets/site-legal.css').includes('@media (prefers-color-scheme:dark)'));
});
