#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPO = 'imkida/V_IME_releases';
const VALID_PLATFORMS = new Set(['android', 'macos', 'windows', 'ios', 'harmonyos']);
const VALID_INSTALLER_TYPES = new Set([
  'apk',
  'aab',
  'dmg',
  'zip',
  'pkg',
  'exe',
  'msi',
  'msix',
  'ipa',
  'hap',
  'app-store',
  'testflight',
  'store-link'
]);
const VALID_ARCHES = new Set(['universal', 'arm64', 'x86_64', 'x64', 'x86', 'armeabi-v7a', 'arm64-v8a']);
const SHA256_RE = /^[a-f0-9]{64}$/i;

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), '..');

main();

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printHelp();
    return;
  }

  try {
    const config = await normalizeConfig(args);
    const manifest = loadManifest(config);
    updateManifest(manifest, config);
    validateManifest(manifest);

    const output = `${JSON.stringify(manifest, null, 2)}\n`;
    if (config.dryRun) {
      process.stdout.write(output);
    } else {
      mkdirSync(dirname(config.manifestPath), { recursive: true });
      writeFileSync(config.manifestPath, output, 'utf8');
      console.log(`Updated ${relativeToRoot(config.manifestPath)}`);
    }
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const args = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const raw = arg.slice(2);
    const separator = raw.indexOf('=');
    const rawKey = separator === -1 ? raw : raw.slice(0, separator);
    const key = toCamelCase(rawKey);
    let value = separator === -1 ? undefined : raw.slice(separator + 1);

    if (value === undefined) {
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        value = next;
        index += 1;
      } else {
        value = true;
      }
    }

    if (args[key] === undefined) {
      args[key] = value;
    } else if (Array.isArray(args[key])) {
      args[key].push(value);
    } else {
      args[key] = [args[key], value];
    }
  }

  args._ = positionals;
  return args;
}

async function normalizeConfig(args) {
  const platform = requiredString(args.platform, '--platform').toLowerCase();
  if (!VALID_PLATFORMS.has(platform)) {
    throw new Error(`--platform must be one of: ${Array.from(VALID_PLATFORMS).join(', ')}`);
  }

  const channel = requiredString(args.channel, '--channel');
  if (!/^[a-z][a-z0-9._-]*$/.test(channel)) {
    throw new Error('--channel must match ^[a-z][a-z0-9._-]*$');
  }

  const assetPath = args.asset ? resolve(String(args.asset)) : undefined;
  if (assetPath && !existsSync(assetPath)) {
    throw new Error(`asset file does not exist: ${assetPath}`);
  }

  const assetName = optionalString(args.assetName) ?? (assetPath ? basename(assetPath) : optionalString(args.downloadName));
  const sha256 = optionalSha256(args.sha256, '--sha256') ?? (assetPath ? await sha256File(assetPath) : undefined);
  const sizeBytes = optionalInteger(args.sizeBytes, '--size-bytes') ?? (assetPath ? statSync(assetPath).size : undefined);
  const repo = optionalString(args.repo) ?? DEFAULT_REPO;
  const tag = optionalString(args.tag);
  const releaseUrl = optionalString(args.releaseUrl) ?? (tag ? `https://github.com/${repo}/releases/tag/${encodeUrlSegment(tag)}` : undefined);
  const assetUrl =
    optionalString(args.assetUrl) ??
    optionalString(args.downloadUrl) ??
    (tag && assetName ? `https://github.com/${repo}/releases/download/${encodeUrlSegment(tag)}/${encodeUrlSegment(assetName)}` : undefined);

  const summary = optionalString(args.summary) ?? readOptionalFile(args.summaryFile, '--summary-file');
  const title = optionalString(args.title);
  const appcastUrl = optionalString(args.appcastUrl);
  const storeUrl = optionalString(args.storeUrl);

  if (!title) {
    throw new Error('missing required --title');
  }
  if (!summary) {
    throw new Error('missing required --summary or --summary-file');
  }
  if (!releaseUrl) {
    throw new Error('missing required --tag or --release-url');
  }

  if (platform === 'android') {
    if (!assetName || !assetUrl || !sha256) {
      throw new Error('android releases require --asset, or --asset-name + --asset-url + --sha256');
    }
  } else if (!assetUrl && !appcastUrl && !storeUrl) {
    throw new Error('non-android releases require an asset URL, --appcast-url, or --store-url');
  }

  if (assetUrl && !sha256 && !appcastUrl && !storeUrl) {
    throw new Error('asset releases require --asset or --sha256');
  }

  const installerType = optionalString(args.installerType) ?? inferInstallerType(assetName ?? assetUrl ?? storeUrl);
  if (installerType && !VALID_INSTALLER_TYPES.has(installerType)) {
    throw new Error(`--installer-type must be one of: ${Array.from(VALID_INSTALLER_TYPES).join(', ')}`);
  }

  const arch = optionalString(args.arch);
  if (arch && !VALID_ARCHES.has(arch)) {
    throw new Error(`--arch must be one of: ${Array.from(VALID_ARCHES).join(', ')}`);
  }

  const manifestPath = resolve(repoRoot, optionalString(args.manifest) ?? join(platform, 'manifest.json'));

  return {
    platform,
    channel,
    versionName: requiredString(args.versionName, '--version-name'),
    versionCode: optionalInteger(args.versionCode, '--version-code'),
    buildNumber: optionalBuildNumber(args.buildNumber),
    title,
    summary,
    releaseUrl,
    assetName,
    assetUrl,
    sha256,
    sizeBytes,
    certificateSha256: optionalSha256(args.certificateSha256, '--certificate-sha256'),
    mandatory: optionalBoolean(args.mandatory, '--mandatory') ?? false,
    minSupportedVersionCode: optionalInteger(args.minSupportedVersionCode, '--min-supported-version-code'),
    minSupportedVersionName: optionalString(args.minSupportedVersionName),
    minSystemVersion: optionalString(args.minSystemVersion),
    appcastUrl,
    storeUrl,
    installerType,
    arch,
    sparkleEdDsaSignature: optionalString(args.sparkleEdDsaSignature) ?? optionalString(args.sparkleEddsaSignature),
    assetMode: optionalString(args.assetMode) ?? 'replace',
    productName: optionalString(args.productName),
    packageName: optionalString(args.packageName),
    bundleId: optionalString(args.bundleId),
    appId: optionalString(args.appId),
    manifestPath,
    dryRun: Boolean(args.dryRun)
  };
}

function loadManifest(config) {
  if (existsSync(config.manifestPath)) {
    return JSON.parse(readFileSync(config.manifestPath, 'utf8'));
  }

  return {
    formatVersion: 1,
    generatedAt: isoNow(),
    platform: config.platform,
    channels: {}
  };
}

function updateManifest(manifest, config) {
  manifest.formatVersion = 1;
  manifest.generatedAt = isoNow();
  manifest.channels ??= {};

  setIfProvided(manifest, 'platform', config.platform);
  setIfProvided(manifest, 'productName', config.productName);
  setIfProvided(manifest, 'packageName', config.packageName);
  setIfProvided(manifest, 'bundleId', config.bundleId);
  setIfProvided(manifest, 'appId', config.appId);

  const previous = manifest.channels[config.channel] ?? {};
  const base = {
    ...previous,
    versionName: config.versionName,
    title: config.title,
    summary: config.summary,
    releaseUrl: config.releaseUrl,
    mandatory: config.mandatory
  };

  setIfProvided(base, 'versionCode', config.versionCode);
  setIfProvided(base, 'buildNumber', config.buildNumber);
  setIfProvided(base, 'minSupportedVersionCode', config.minSupportedVersionCode);
  setIfProvided(base, 'minSupportedVersionName', config.minSupportedVersionName);
  setIfProvided(base, 'minSystemVersion', config.minSystemVersion);
  setIfProvided(base, 'certificateSha256', config.certificateSha256);
  setIfProvided(base, 'appcastUrl', config.appcastUrl);
  setIfProvided(base, 'storeUrl', config.storeUrl);
  setIfProvided(base, 'sparkleEdDsaSignature', config.sparkleEdDsaSignature);

  if (config.platform === 'android') {
    deleteKeys(base, ['assets', 'downloadName', 'downloadUrl', 'sha256', 'appcastUrl', 'storeUrl', 'installerType', 'arch', 'sparkleEdDsaSignature']);
    base.apkName = config.assetName;
    base.apkUrl = config.assetUrl;
    base.apkSha256 = config.sha256;
  } else if (config.assetUrl) {
    deleteKeys(base, ['apkName', 'apkUrl', 'apkSha256', 'downloadName', 'downloadUrl', 'sha256']);
    const asset = {
      name: config.assetName ?? config.assetUrl.split('/').pop(),
      url: config.assetUrl,
      sha256: config.sha256
    };
    setIfProvided(asset, 'sizeBytes', config.sizeBytes);
    setIfProvided(asset, 'installerType', config.installerType);
    setIfProvided(asset, 'arch', config.arch);
    setIfProvided(asset, 'minSystemVersion', config.minSystemVersion);
    setIfProvided(asset, 'certificateSha256', config.certificateSha256);
    setIfProvided(asset, 'sparkleEdDsaSignature', config.sparkleEdDsaSignature);

    if (config.assetMode === 'append') {
      const existingAssets = Array.isArray(previous.assets) ? previous.assets : [];
      base.assets = upsertAsset(existingAssets, asset);
    } else if (config.assetMode === 'replace') {
      base.assets = [asset];
    } else {
      throw new Error('--asset-mode must be replace or append');
    }
  }

  manifest.channels[config.channel] = removeUndefined(base);
}

function validateManifest(manifest) {
  if (manifest.formatVersion !== 1) {
    throw new Error('manifest.formatVersion must be 1');
  }
  if (!manifest.generatedAt || Number.isNaN(Date.parse(manifest.generatedAt))) {
    throw new Error('manifest.generatedAt must be an ISO date-time string');
  }
  if (!manifest.channels || typeof manifest.channels !== 'object' || Array.isArray(manifest.channels)) {
    throw new Error('manifest.channels must be an object');
  }

  for (const [name, channel] of Object.entries(manifest.channels)) {
    if (!/^[a-z][a-z0-9._-]*$/.test(name)) {
      throw new Error(`invalid channel name: ${name}`);
    }
    for (const field of ['versionName', 'title', 'summary', 'releaseUrl']) {
      if (!channel[field]) {
        throw new Error(`channels.${name}.${field} is required`);
      }
    }
    if (typeof channel.mandatory !== 'boolean') {
      throw new Error(`channels.${name}.mandatory must be boolean`);
    }
    if (!(channel.assets || (channel.apkUrl && channel.apkSha256) || (channel.downloadUrl && channel.sha256) || channel.appcastUrl || channel.storeUrl)) {
      throw new Error(`channels.${name} must include assets, apkUrl + apkSha256, downloadUrl + sha256, appcastUrl, or storeUrl`);
    }

    validateSha(channel.apkSha256, `channels.${name}.apkSha256`);
    validateSha(channel.sha256, `channels.${name}.sha256`);
    validateSha(channel.certificateSha256, `channels.${name}.certificateSha256`);

    if (channel.assets) {
      if (!Array.isArray(channel.assets) || channel.assets.length === 0) {
        throw new Error(`channels.${name}.assets must be a non-empty array`);
      }
      for (const [assetIndex, asset] of channel.assets.entries()) {
        const path = `channels.${name}.assets[${assetIndex}]`;
        for (const field of ['name', 'url', 'sha256']) {
          if (!asset[field]) {
            throw new Error(`${path}.${field} is required`);
          }
        }
        validateSha(asset.sha256, `${path}.sha256`);
        validateSha(asset.certificateSha256, `${path}.certificateSha256`);
      }
    }
  }
}

function upsertAsset(assets, nextAsset) {
  const next = [...assets];
  const index = next.findIndex((asset) => asset.name === nextAsset.name);
  if (index === -1) {
    next.push(nextAsset);
  } else {
    next[index] = nextAsset;
  }
  return next;
}

function sha256File(filePath) {
  return new Promise((resolveHash, rejectHash) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', rejectHash);
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
}

function inferInstallerType(value) {
  if (!value) {
    return undefined;
  }
  const extension = extname(String(value).split('?')[0]).replace('.', '').toLowerCase();
  return VALID_INSTALLER_TYPES.has(extension) ? extension : undefined;
}

function requiredString(value, label) {
  const normalized = optionalString(value);
  if (!normalized) {
    throw new Error(`missing required ${label}`);
  }
  return normalized;
}

function optionalString(value) {
  if (value === undefined || value === null || value === true) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function optionalSha256(value, label) {
  const normalized = optionalString(value);
  if (!normalized) {
    return undefined;
  }
  if (!SHA256_RE.test(normalized)) {
    throw new Error(`${label} must be a 64-character hex SHA-256`);
  }
  return normalized.toLowerCase();
}

function optionalInteger(value, label) {
  const normalized = optionalString(value);
  if (!normalized) {
    return undefined;
  }
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a positive integer`);
  }
  const number = Number(normalized);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(`${label} must be a positive safe integer`);
  }
  return number;
}

function optionalBuildNumber(value) {
  const normalized = optionalString(value);
  if (!normalized) {
    return undefined;
  }
  return /^\d+$/.test(normalized) ? Number(normalized) : normalized;
}

function optionalBoolean(value, label) {
  const normalized = optionalString(value);
  if (!normalized) {
    return undefined;
  }
  if (['true', '1', 'yes'].includes(normalized.toLowerCase())) {
    return true;
  }
  if (['false', '0', 'no'].includes(normalized.toLowerCase())) {
    return false;
  }
  throw new Error(`${label} must be true or false`);
}

function readOptionalFile(value, label) {
  const filePath = optionalString(value);
  if (!filePath) {
    return undefined;
  }
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`${label} file does not exist: ${resolved}`);
  }
  return readFileSync(resolved, 'utf8').trim();
}

function validateSha(value, label) {
  if (value && !SHA256_RE.test(value)) {
    throw new Error(`${label} must be a 64-character hex SHA-256`);
  }
}

function setIfProvided(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function deleteKeys(target, keys) {
  for (const key of keys) {
    delete target[key];
  }
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function toCamelCase(value) {
  return value.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase());
}

function encodeUrlSegment(value) {
  return encodeURIComponent(value).replace(/%2F/g, '/');
}

function isoNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function relativeToRoot(filePath) {
  return filePath.startsWith(repoRoot) ? filePath.slice(repoRoot.length + 1) : filePath;
}

function printHelp() {
  console.log(`Usage:
  npm run release:manifest -- --platform android --channel release --version-name 1.3.13 --version-code 89 --title "v1.3.13 - fixes" --summary "Release notes" --tag android-v1.3.13 --asset /path/V_IME-v1.3.13-release.apk --certificate-sha256 <sha256>

Required:
  --platform                  android | macos | windows | ios | harmonyos
  --channel                   release channel, for example release, debug, stable, beta
  --version-name              public version string
  --title                     release title
  --summary                   release summary, or use --summary-file
  --tag                       GitHub Release tag, or use --release-url

Asset input:
  --asset                     local asset path; SHA-256 and size are computed automatically
  --asset-name                asset name when no local file is available
  --asset-url                 explicit download URL
  --sha256                    explicit asset SHA-256 when no local file is available

Common options:
  --repo                      GitHub owner/repo, default ${DEFAULT_REPO}
  --manifest                  manifest path, default <platform>/manifest.json
  --mandatory                 true | false, default false
  --min-supported-version-code
  --min-supported-version-name
  --min-system-version
  --certificate-sha256
  --installer-type            apk | dmg | exe | msi | msix | ipa | hap | ...
  --arch                      universal | arm64 | x64 | x86 | ...
  --asset-mode                replace | append, default replace for non-Android assets
  --appcast-url               macOS Sparkle appcast URL
  --sparkle-ed-dsa-signature  Sparkle EdDSA signature
  --store-url                 App Store, TestFlight, or app marketplace URL
  --dry-run                   print the resulting manifest without writing it
`);
}
