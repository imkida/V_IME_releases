import assert from 'node:assert/strict';
import test from 'node:test';
import { isAndroidDevice, isMobileDevice } from '../src/device.js';

const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const ipados = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const windows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

test('phones and tablets are mobile; desktops are not', () => {
  assert.equal(isMobileDevice(iphone, 5), true);
  assert.equal(isMobileDevice(android, 5), true);
  assert.equal(isMobileDevice(ipados, 5), true, 'iPadOS presents as Macintosh with touch points');
  assert.equal(isMobileDevice(ipados, 0), false, 'a real Mac has no touch points');
  assert.equal(isMobileDevice(windows, 0), false);
  assert.equal(isMobileDevice(windows, 10), false, 'touch-screen Windows stays desktop');
});

test('only Android user agents get the Android pointer', () => {
  assert.equal(isAndroidDevice(android), true);
  assert.equal(isAndroidDevice(iphone), false);
  assert.equal(isAndroidDevice(ipados), false);
});
