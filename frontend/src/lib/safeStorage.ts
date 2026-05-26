const noopStorage = {
  getItem: (_key: string): null => null,
  setItem: (_key: string, _value: string): void => {},
  removeItem: (_key: string): void => {},
};

function getStorage(type: 'localStorage' | 'sessionStorage') {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch {
    return noopStorage;
  }
}

export function safeLocalStorage() {
  if (typeof window === 'undefined') return noopStorage;
  return getStorage('localStorage');
}

export function safeSessionStorage() {
  if (typeof window === 'undefined') return noopStorage;
  return getStorage('sessionStorage');
}
