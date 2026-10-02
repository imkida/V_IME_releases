export const MANIFEST_URL = './release.json';

import { parseReleaseNotes } from './release-notes.js';

export function readRelease(manifest) {
  const channel = manifest.channels?.beta;
  const dmg = channel?.assets?.find(asset => asset.installerType === 'dmg');
  const zip = channel?.assets?.find(asset => asset.installerType === 'zip');
  const minSystemVersion = channel?.minSystemVersion || dmg?.minSystemVersion;
  const date = new Date(manifest.generatedAt);
  if (manifest.platform !== 'macos' || !channel?.versionName || !channel.buildNumber ||
      !channel.summary || !minSystemVersion || Number.isNaN(date.getTime()) || !dmg) {
    throw new Error('Incomplete macOS release manifest');
  }
  for (const asset of [dmg, zip].filter(Boolean)) {
    if (!asset.name || !/^https:\/\//.test(asset.url) || !/^[a-f\d]{64}$/i.test(asset.sha256) ||
        !(asset.sizeBytes > 0) || (asset.mirrorUrl && !/^https:\/\//.test(asset.mirrorUrl))) {
      throw new Error('Incomplete macOS download metadata');
    }
  }
  return {
    channel, dmg, zip,
    minSystemVersion: minSystemVersion.replace(/\.0$/, ''),
    date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(date),
    notes: parseReleaseNotes(channel.summary)
  };
}
