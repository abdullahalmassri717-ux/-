// A random id kept on this browser, sent once when a new organization signs up.
// It is not personal data; it only lets the platform admin notice when several
// "new" accounts come from the same device (a free trial taken again and again).
const KEY = 'daqa.device';

export function deviceId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[0-9a-zA-Z-]{8,64}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
