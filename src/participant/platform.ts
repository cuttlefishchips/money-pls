export interface PlatformInfo {
  userAgent: string;
  maxTouchPoints: number;
  standalone: boolean;
}

export function isAppleMobile({ userAgent, maxTouchPoints }: PlatformInfo): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

export function needsInstallFirst(platform: PlatformInfo): boolean {
  return isAppleMobile(platform) && !platform.standalone;
}

export function currentPlatform(): PlatformInfo {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone: nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
  };
}
