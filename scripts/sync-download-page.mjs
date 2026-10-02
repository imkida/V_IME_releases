#!/usr/bin/env node
// Publish the macOS page's same-origin release.json and fallback from macos/manifest.json.
//
// The same docs/ tree is deployed to every website host. Refresh its public JSON,
// embedded snapshot and <noscript> links together after each release.
//
// Usage:
//   node scripts/sync-download-page.mjs [--channel beta] [--check]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), '..');

// Only run the CLI when invoked directly, so tests can import the readers below.
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  try {
    const result = syncDownloadPage({
      repoRoot,
      channel: args.channel ?? 'beta',
      check: Boolean(args.check)
    });
    for (const line of result.messages) {
      console.log(line);
    }
    if (result.changed) {
      console.log(result.check
        ? 'docs/macos is out of sync with macos/manifest.json'
        : 'Synced docs/macos');
      if (result.check) process.exitCode = 1;
    } else {
      console.log('docs/macos already matches macos/manifest.json');
    }
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

export function syncDownloadPage({ repoRoot: root, channel: channelName = 'beta', check = false }) {
  const manifestText = readFileSync(join(root, 'macos', 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  const channel = manifest.channels?.[channelName];
  if (!channel) {
    throw new Error(`macos/manifest.json has no channels.${channelName}`);
  }
  const dmg = (channel.assets ?? []).find((asset) => asset.installerType === 'dmg');
  if (!dmg) {
    throw new Error(`channels.${channelName} has no dmg asset to link from <noscript>`);
  }

  const pageDir = join(root, 'docs', 'macos');
  const htmlPath = join(pageDir, 'index.html');
  const html = readFileSync(htmlPath, 'utf8');
  const bundlePath = join(pageDir, 'assets', bundleName(html));
  const bundle = readFileSync(bundlePath, 'utf8');

  const messages = [];
  const nextBundle = refreshEmbeddedManifest(bundle, manifest, channel, messages);
  const nextHtml = refreshNoscriptLinks(html, channel, dmg, messages);
  const publishedManifestPath = join(pageDir, 'release.json');
  const publishedManifest = existsSync(publishedManifestPath)
    ? readFileSync(publishedManifestPath, 'utf8') : null;
  const manifestChanged = publishedManifest !== manifestText;
  if (manifestChanged) messages.push('  release.json differs from macos/manifest.json');
  // The domain root renders the same page without an intermediate redirect.
  // Reuse the macOS assets and refresh both public manifest copies from one source.
  const rootHtmlPath = join(root, 'docs', 'index.html');
  const nextRootHtml = nextHtml.replaceAll('="./assets/', '="./macos/assets/');
  const rootHtmlChanged = !existsSync(rootHtmlPath)
    || readFileSync(rootHtmlPath, 'utf8') !== nextRootHtml;
  const rootManifestPath = join(root, 'docs', 'release.json');
  const rootManifestChanged = !existsSync(rootManifestPath)
    || readFileSync(rootManifestPath, 'utf8') !== manifestText;
  if (rootHtmlChanged) messages.push('  root homepage differs from the macOS page');
  if (rootManifestChanged) messages.push('  root release.json differs from macos/manifest.json');
  const changed = nextBundle !== bundle || nextHtml !== html || manifestChanged
    || rootHtmlChanged || rootManifestChanged;

  if (changed && !check) {
    writeFileSync(bundlePath, nextBundle, 'utf8');
    writeFileSync(htmlPath, nextHtml, 'utf8');
    writeFileSync(publishedManifestPath, manifestText, 'utf8');
    writeFileSync(rootHtmlPath, nextRootHtml, 'utf8');
    writeFileSync(rootManifestPath, manifestText, 'utf8');
  }

  return { changed, check, messages, htmlPath, bundlePath, publishedManifestPath, rootHtmlPath };
}

function refreshEmbeddedManifest(bundle, manifest, channel, messages) {
  const previousGeneratedAt = readPublishedGeneratedAt(bundle);
  const previousChannel = readPublishedChannelFromBundle(bundle);
  const drifted = [];
  if (previousGeneratedAt !== manifest.generatedAt) {
    drifted.push(`generatedAt ${previousGeneratedAt} -> ${manifest.generatedAt}`);
  }
  if (previousChannel.versionName !== channel.versionName) {
    drifted.push(`versionName ${previousChannel.versionName} -> ${channel.versionName}`);
  }
  if (previousChannel.buildNumber !== channel.buildNumber) {
    drifted.push(`buildNumber ${previousChannel.buildNumber} -> ${channel.buildNumber}`);
  }
  messages.push(...drifted.map((line) => `  ${line}`));

  let next = replaceOnce(
    bundle,
    `"${previousGeneratedAt}"`,
    `"${manifest.generatedAt}"`,
    'embedded generatedAt'
  );

  const updated = { ...previousChannel };
  for (const [key, value] of Object.entries(channel)) {
    updated[key] = value;
  }
  // Keys present before but gone from the manifest must not survive in the snapshot.
  for (const key of Object.keys(previousChannel)) {
    if (!(key in channel)) {
      delete updated[key];
    }
  }

  const slot = embeddedChannelSlot(next);
  return next.slice(0, slot.start)
    + JSON.stringify(updated, null, 0)
    + next.slice(slot.end);
}

function refreshNoscriptLinks(html, channel, dmg, messages) {
  const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/);
  if (!noscript) {
    throw new Error('docs/macos/index.html has no <noscript> fallback block');
  }
  const link = noscript[1].match(/<a href="([^"]+)">下载 ([^<]+)<\/a>/);
  if (!link) {
    throw new Error('docs/macos/index.html <noscript> has no download link');
  }
  const label = `${channel.versionName} beta`;
  let next = html;
  if (link[1] !== dmg.url || link[2] !== label) {
    messages.push(`  noscript link ${link[2]} -> ${label}`);
    next = replaceOnce(
      next,
      link[0],
      `<a href="${dmg.url}">下载 ${label}</a>`,
      '<noscript> download link'
    );
  }
  const backup = noscript[1].match(/<a href="([^"]+)">GitHub 备用下载与更新说明<\/a>/);
  if (!backup) {
    throw new Error('docs/macos/index.html <noscript> has no GitHub backup link');
  }
  if (backup[1] !== channel.releaseUrl) {
    messages.push(`  noscript backup ${backup[1]} -> ${channel.releaseUrl}`);
    next = replaceOnce(
      next,
      backup[0],
      `<a href="${channel.releaseUrl}">GitHub 备用下载与更新说明</a>`,
      '<noscript> GitHub backup link'
    );
  }
  return next;
}

function replaceOnce(text, search, replacement, label) {
  const index = text.indexOf(search);
  if (index < 0) {
    throw new Error(`could not locate ${label}`);
  }
  if (text.indexOf(search, index + search.length) >= 0) {
    throw new Error(`found more than one candidate for ${label}`);
  }
  return text.slice(0, index) + replacement + text.slice(index + search.length);
}

export function bundleName(html) {
  const match = html.match(/<script[^>]+src="\.\/assets\/([^"]+\.js)"/);
  if (!match) {
    throw new Error('docs/macos/index.html does not reference an assets/*.js bundle');
  }
  return match[1];
}

export function readPublishedPage(root) {
  const html = readFileSync(join(root, 'docs', 'macos', 'index.html'), 'utf8');
  const bundle = readFileSync(join(root, 'docs', 'macos', 'assets', bundleName(html)), 'utf8');
  return {
    html,
    bundle,
    generatedAt: readPublishedGeneratedAt(bundle),
    channel: readPublishedChannelFromBundle(bundle)
  };
}

export function readPublishedGeneratedAt(bundle) {
  const match = bundle.match(/"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)"/);
  if (!match) {
    throw new Error('no embedded generatedAt timestamp in the published bundle');
  }
  return match[1];
}

// The bundle keeps the manifest channel as a minified object literal, so it is located by
// its own first field and brace-matched rather than by the minifier's variable names.
// Keys may be quoted or bare depending on how the page was last built.
export function readPublishedChannelFromBundle(bundle) {
  // Vite emits JavaScript literals, including template strings for multiline summaries.
  const channel = runInNewContext(`(${embeddedChannelSlot(bundle).text})`, Object.create(null), { timeout: 1000 });
  return JSON.parse(JSON.stringify(channel));
}

export function embeddedChannelSlot(bundle) {
  const platformMarker = bundle.indexOf('="macos"');
  if (platformMarker < 0) {
    throw new Error('no embedded platform marker in the published bundle');
  }
  const anchor = bundle.slice(platformMarker).search(/\{(?:"versionName"|versionName):/);
  if (anchor < 0) {
    throw new Error('no embedded manifest snapshot in the published bundle');
  }
  return braceObjectAt(bundle, platformMarker + anchor);
}

export function braceObjectAt(text, from) {
  let depth = 0;
  let start = null;
  let quote = null;
  let escaped = false;
  for (let i = from; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
    } else if (['"', "'", '`'].includes(char)) quote = char;
    else if (char === '{') {
      depth += 1;
      if (depth === 1) start = i;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { start, end: i + 1, text: text.slice(start, i + 1) };
      }
    }
  }
  throw new Error('unbalanced embedded manifest object');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/sync-download-page.mjs [options]

Options:
  --channel <name>   manifest channel to publish, default beta
  --check            report drift without writing
  --help             show this help

Run it after every macos/manifest.json update, then run npm test.
`);
}
