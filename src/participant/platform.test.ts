import { describe, expect, it } from 'vitest';
import { isAppleMobile, needsInstallFirst } from './platform';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_MODE =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

describe('needsInstallFirst', () => {
  it('asks iPhone browsers to add the app to the home screen first', () => {
    expect(needsInstallFirst({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5, standalone: false })).toBe(true);
    expect(needsInstallFirst({ userAgent: IPHONE_CHROME, maxTouchPoints: 5, standalone: false })).toBe(true);
  });

  it('lets the installed app start', () => {
    expect(needsInstallFirst({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5, standalone: true })).toBe(false);
  });

  it('treats an iPad in desktop mode as an Apple mobile device, but not a Mac', () => {
    expect(isAppleMobile({ userAgent: IPAD_DESKTOP_MODE, maxTouchPoints: 5, standalone: false })).toBe(true);
    expect(isAppleMobile({ userAgent: IPAD_DESKTOP_MODE, maxTouchPoints: 0, standalone: false })).toBe(false);
  });

  it('keeps the current flow on other browsers', () => {
    expect(needsInstallFirst({ userAgent: ANDROID_CHROME, maxTouchPoints: 5, standalone: false })).toBe(false);
  });
});
