#!/usr/bin/env node
// Rebuild the macOS download page's static fallback from macos/manifest.json.
//
// docs/macos/ publishes only the built artifact, so the page carries a minified snapshot of
// the manifest channel for visitors whose browser cannot reach raw.githubusercontent.com.
// That snapshot goes stale on every release, so this script rewrites it — plus the
// <noscript> download link — and is the "rebuild docs/macos" step of the release checklist.
//
// Usage:
//   node scripts/sync-download-page.mjs [--channel beta] [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    } else {
      console.log('docs/macos already matches macos/manifest.json');
    }
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

export function syncDownloadPage({ repoRoot: root, channel: channelName = 'beta', check = false }) {
  const manifest = JSON.parse(readFileSync(join(root, 'macos', 'manifest.json'), 'utf8'));
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
  const nextHtml = refreshNoscriptLink(html, channel, dmg, messages);
  const changed = nextBundle !== bundle || nextHtml !== html;

  if (changed && !check) {
    writeFileSync(bundlePath, nextBundle, 'utf8');
    writeFileSync(htmlPath, nextHtml, 'utf8');
  }

  return { changed, messages, htmlPath, bundlePath };
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

function refreshNoscriptLink(html, channel, dmg, messages) {
  const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/);
  if (!noscript) {
    throw new Error('docs/macos/index.html has no <noscript> fallback block');
  }
  const link = noscript[1].match(/<a href="([^"]+)">下载 ([^<]+)<\/a>/);
  if (!link) {
    throw new Error('docs/macos/index.html <noscript> has no download link');
  }
  const label = `${channel.versionName} beta`;
  if (link[1] === dmg.url && link[2] === label) {
    return html;
  }
  messages.push(`  noscript link ${link[2]} -> ${label}`);
  return replaceOnce(
    html,
    link[0],
    `<a href="${dmg.url}">下载 ${label}</a>`,
    '<noscript> download link'
  );
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
  return JSON.parse(deMinifyObject(embeddedChannelSlot(bundle).text));
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

export function deMinifyObject(text) {
  return text
    .replace(/!0/g, 'true')
    .replace(/!1/g, 'false')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
}

export function braceObjectAt(text, from) {
  let depth = 0;
  let start = null;
  let inString = false;
  let escaped = false;
  for (let i = from; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
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
