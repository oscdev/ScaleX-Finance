const active = new Set<string>();

export function acquireMirrorGuard(key: string): boolean {
  if (active.has(key)) return false;
  active.add(key);
  return true;
}

export function releaseMirrorGuard(key: string): void {
  active.delete(key);
}

export async function withMirrorGuard<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T | null> {
  if (!acquireMirrorGuard(key)) return null;
  try {
    return await fn();
  } finally {
    releaseMirrorGuard(key);
  }
}

export function mirrorGuardKeys(keys: string[]): string {
  return keys.join('|');
}
