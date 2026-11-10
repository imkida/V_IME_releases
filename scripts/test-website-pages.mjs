import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const paths = ['/', '/macos/', '/android/', '/privacy/', '/support/', '/macos/privacy/', '/macos/support/', '/android/privacy/', '/android/support/'];

// SHA-256 of each complete <article>…</article> block, including whitespace. iOS pages are the
// origin/main 80a0166a originals; the Mac pages were updated on 2026-11-11 for anonymous usage statistics.
// Any further policy text change must update these on purpose. No Git needed at test time.
const legalArticleHashes = {
  'docs/privacy/index.html': 'de6063232bbca0e486fd3f712516bab9d5a0a6a751f12e8e6b5c65df766263a5',
  'docs/support/index.html': '05fa2ff594a97322eaaf1b6399deedb5da350238660ee1a845e5042e365ce875',
  'docs/macos/privacy/index.html': 'fb532dcedb662a8ee786843785e177c0865ab5d011b5ec92195f632525a08a83',
  'docs/macos/support/index.html': '40dd0a38a2a84721d16bc3fe577f297e0b577f978dbc0c294bcf75e35f7fa881'
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
  '/android/': 'og-android.png', '/android/privacy/': 'og-android.png', '/android/support/': 'og-android.png', '/privacy/': 'og-vime.png', '/support/': 'og-vime.png'
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

test('legal pages share a static shell and link their Mac, Android and iOS counterparts', () => {
  for (const path of paths.slice(3)) {
    const html = read('docs' + path + 'index.html');
    const kind = path.includes('privacy') ? 'privacy' : 'support';
    const platform = path.startsWith('/macos/') ? 'mac' : path.startsWith('/android/') ? 'android' : 'ios';
    assert.match(html, /<link rel="stylesheet" href="\/macos\/assets\/site-legal.css">/);
    assert.match(html, /<link rel="icon" href="\/macos\/assets\/app-icon-preview.svg"/);
    assert.match(html, /<a class="brand" href="\/"/);
    const tabs = html.match(/<nav class="plat document-platforms"[\s\S]*?<\/nav>/)[0];
    const current = name => platform === name ? ' aria-current="page"' : '';
    assert.deepEqual(hrefs(tabs), [`/macos/${kind}/`, `/android/${kind}/`, `/${kind}/`]);
    assert.ok(tabs.includes(`<a href="/macos/${kind}/"${current('mac')}>Mac</a>`));
    assert.ok(tabs.includes(`<a href="/android/${kind}/"${current('android')}>Android</a>`));
    assert.ok(tabs.includes(`<a href="/${kind}/"${current('ios')}>iOS</a>`));
    const scope = { mac: 'Vime for macOS', android: 'Vime for Android', ios: 'Vime iOS App' }[platform];
    assert.ok(html.includes(`<p class="document-scope">适用于 ${scope}</p>`));
    assert.match(html, /<\/nav>\s*<p class="document-scope">[^<]+<\/p>\s*<article>/);
    assert.match(html, /京ICP备2026046839号-2/);
    assert.match(html, /\['vimebot.com', 'www.vimebot.com'\]/);
  }
  // Dark appearance now comes from the shared tokens the legal shell loads first.
  assert.ok(read('website/macos/src/tokens.css').includes('@media (prefers-color-scheme:dark)'));
});

// One design system across the React homepage and the static pages: a single token source,
// the same platform switcher and the same footer links (Android pages link their own privacy
// and support documents).
const legalPages = ['docs/privacy/index.html', 'docs/support/index.html', 'docs/macos/privacy/index.html', 'docs/macos/support/index.html',
  'docs/android/privacy/index.html', 'docs/android/support/index.html'];
const staticPages = ['docs/android/index.html', ...legalPages];
const fullFooter = ['/', '/android/', '/macos/privacy/', '/macos/support/', 'mailto:kida.wong@gmail.com', 'https://beian.miit.gov.cn/'];
const androidFooter = ['/', '/android/', '/android/privacy/', '/android/support/', 'mailto:kida.wong@gmail.com', 'https://beian.miit.gov.cn/'];
const hrefs = block => [...block.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
const siteFooter = html => html.slice(html.lastIndexOf('<footer'));

test('every page draws its colours, type and motion from the one shared token file', () => {
  const tokens = read('website/macos/src/tokens.css');
  assert.equal(read('docs/macos/assets/site-tokens.css'), tokens, 'run npm run release:page');
  assert.match(read('website/macos/src/styles.css'), /^(?:\/\*[\s\S]*?\*\/\s*)?@import '\.\/tokens\.css';/);
  const tokenNames = [...new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]))];
  assert.ok(tokenNames.length > 30, 'token file parsed');
  for (const path of ['website/macos/src/styles.css', 'docs/macos/assets/site-legal.css', ...staticPages]) {
    const text = read(path);
    for (const name of tokenNames) {
      assert.doesNotMatch(text, new RegExp(name + '\\s*:'), path + ' must not redefine ' + name);
    }
  }
  for (const path of staticPages) {
    const head = read(path).split('</head>')[0];
    // The shared tokens are the first style source, so every page style can use them.
    const sources = [...head.matchAll(/<style>|<link rel="stylesheet" href="([^"]+)">/g)].map(match => match[1] ?? '<style>');
    assert.equal(sources[0], '/macos/assets/site-tokens.css', path);
    assert.equal(sources.filter(source => source === '/macos/assets/site-tokens.css').length, 1, path);
  }
  for (const path of legalPages) {
    assert.match(read(path).split('</head>')[0], /localStorage\.getItem\('vime-theme'\)/, path + ' honours the saved appearance');
  }
});

test('every page shares the platform switcher and the footer links', () => {
  for (const path of staticPages) {
    const html = read(path);
    const plat = html.match(/<(div|nav) class="plat"[^>]*>([\s\S]*?)<\/\1>/)?.[2] ?? '';
    assert.deepEqual(hrefs(plat), ['/', '/android/'], path);
    assert.match(plat, /iOS<em>即将推出<\/em>/, path);
    const footer = siteFooter(html);
    assert.match(footer, /<div class="fb"><a href="[^"]+">Vime<\/a><span>由个人开发维护<\/span><\/div>/, path);
    const links = footer.match(/<div class="links">([\s\S]*?)<\/div>/)[1];
    assert.deepEqual(hrefs(links), path.includes('android') ? androidFooter : fullFooter, path);
  }
  const app = read('website/macos/src/App.jsx');
  const appFooter = app.slice(app.indexOf('<footer>'), app.indexOf('</footer>'));
  assert.deepEqual(hrefs(appFooter.match(/<div className="links">([\s\S]*?)<\/div>/)[1]), fullFooter);
  assert.deepEqual(hrefs(app.match(/<div className="plat"[^>]*>([\s\S]*?)<\/div>/)[1]), ['/', '/android/']);
});

// The Android documents describe the Android app only and point back to each other.
test('Android legal documents are self-contained', () => {
  const privacy = read('docs/android/privacy/index.html'), support = read('docs/android/support/index.html');
  assert.match(privacy, /<h1>Vime for Android 隐私政策<\/h1>/);
  assert.match(support, /<h1>Vime for Android 支持<\/h1>/);
  assert.ok(privacy.includes('<a href="/android/support/">Vime for Android 支持页面</a>'));
  assert.ok(support.includes('<a href="/android/privacy/">隐私政策</a>'));
  for (const html of [privacy, support]) assert.doesNotMatch(html.match(/<article>[\s\S]*<\/article>/)[0], /macOS|钥匙串|右 Command|Apple/);
});
