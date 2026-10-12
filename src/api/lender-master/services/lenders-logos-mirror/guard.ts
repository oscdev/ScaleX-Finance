const active = new Set<string>();

export async function withLogoGuard<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T | null> {
  if (active.has(key)) return null;
  active.add(key);
  try {
    return await fn();
  } finally {
    active.delete(key);
  }
}
