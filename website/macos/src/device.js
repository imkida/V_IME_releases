// The Mac app cannot be installed from a phone or tablet; those visitors get a "send to Mac" path.
// iPadOS reports a desktop Macintosh user agent, so a touch-capable "Macintosh" counts as a tablet.
export function isMobileDevice(userAgent = '', maxTouchPoints = 0) {
  if (/iPhone|iPod|iPad|Android/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

export function isAndroidDevice(userAgent = '') {
  return /Android/i.test(userAgent);
}
